import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AddCard } from '@/components/AddCard';
import { EmptyHero } from '@/components/EmptyHero';
import { HeroCard } from '@/components/HeroCard';
import { QuestChip } from '@/components/QuestChip';
import { ScreenBackground } from '@/components/ScreenBackground';
import { TaskCard } from '@/components/TaskCard';
import { XPCoinFloat } from '@/components/XPCoinFloat';
import { useCharacter } from '@/lib/api/character';
import { useQuests } from '@/lib/api/quests';
import { useStreak } from '@/lib/api/streak';
import { useCompleteTask, useHomeBuckets } from '@/lib/api/tasks';
import type { TaskWithDimension } from '@/lib/db/types';
import {
  useHomeBucketsStore,
  useLoadHomeBuckets,
  type HomeBucket,
} from '@/lib/homeBuckets';
import { formatLongDate, timeOfDayGreeting } from '@/lib/time';
import { maybeConfirmHardCompletion } from '@/lib/util/confirmCompletion';
import { applyStreakMultiplier, rewardForDifficulty, type Difficulty } from '@/lib/xp';
import { tokens } from '@/theme';

interface FloatItem {
  id: number;
  xp: number;
  coins: number;
}

interface BucketMeta {
  id: HomeBucket;
  label: string;
  iconName: keyof typeof Ionicons.glyphMap;
}

const BUCKET_META: BucketMeta[] = [
  { id: 'today', label: 'Today', iconName: 'sunny' },
  { id: 'this_week', label: 'This Week', iconName: 'calendar' },
  { id: 'one_time', label: 'One-time', iconName: 'flag' },
];

export default function HomeScreen() {
  const router = useRouter();
  const character = useCharacter();
  const buckets = useHomeBuckets();
  const streak = useStreak();
  const quests = useQuests();
  const completeTask = useCompleteTask();
  useLoadHomeBuckets();
  const collapsed = useHomeBucketsStore((s) => s.collapsed);
  const toggleBucket = useHomeBucketsStore((s) => s.toggle);
  const [floats, setFloats] = useState<FloatItem[]>([]);
  // Per-task overrides for star difficulty, applied via swipe on the card.
  // Cleared when the day rolls over (handled implicitly: tasks list refetches).
  const [diffOverrides, setDiffOverrides] = useState<Record<string, Difficulty>>({});

  const handleComplete = async (task: TaskWithDimension) => {
    if (completeTask.isPending) return;

    const selected: Difficulty = diffOverrides[task.id] ?? task.difficulty;

    // Optional confirm guard for hard tasks (Settings → Tasks & Progress).
    if (!(await maybeConfirmHardCompletion(selected, task.title))) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    const baseReward = rewardForDifficulty(selected);
    const reward = applyStreakMultiplier(baseReward, streak.data?.currentStreak ?? 0);
    const fid = Date.now();
    setFloats((prev) => [...prev, { id: fid, xp: reward.xp, coins: reward.coins }]);

    completeTask.mutate(
      {
        taskId: task.id,
        expectedXp: reward.xp,
        expectedCoins: reward.coins,
        dimensionId: task.dimension_id,
        selectedDifficulty: selected,
      },
      {
        onError: (err) => {
          const e = err as { message?: string; code?: string; details?: string };
          console.error('[complete_task] failed', e);
          Alert.alert(
            'Could not complete task',
            [e.message, e.code, e.details].filter(Boolean).join('\n') ||
              'Unknown error.',
          );
        },
      },
    );
  };

  const isLoading = character.isLoading || buckets.isLoading;
  const hasError = character.error || buckets.error;

  const handleRefresh = async () => {
    await Promise.all([
      character.refetch(),
      buckets.refetch(),
      streak.refetch(),
    ]);
  };
  const isRefreshing =
    character.isRefetching || buckets.isRefetching || streak.isRefetching;

  const data = buckets.data;
  const totalPending =
    (data?.today.length ?? 0) +
    (data?.thisWeek.length ?? 0) +
    (data?.oneTime.length ?? 0);

  const tasksFor = (b: HomeBucket): TaskWithDimension[] => {
    if (!data) return [];
    if (b === 'today') return data.today;
    if (b === 'this_week') return data.thisWeek;
    return data.oneTime;
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenBackground>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={tokens.brand.violet2}
              colors={[tokens.brand.violet2]}
            />
          }
        >
          {/* Date + greeting only — name lives in HeroCard below, no need to
            * repeat it here (and the QuestChip card was crowding it visually). */}
          <View style={styles.header}>
            <Text style={styles.dateText}>{formatLongDate()}</Text>
            <Text style={styles.greeting}>{timeOfDayGreeting()}</Text>
          </View>

          {isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={tokens.brand.violet2} />
            </View>
          ) : hasError ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={32} color={tokens.semantic.danger} />
              <Text style={styles.errorText}>
                Something went wrong loading your data. Pull to retry.
              </Text>
            </View>
          ) : (
            <>
              {character.data && (
                <HeroCard
                  displayName={character.data.profile.display_name}
                  totalXp={character.data.character.total_xp}
                  coins={character.data.character.coins}
                  streakDays={streak.data?.currentStreak ?? 0}
                />
              )}

              <View style={styles.questsBlock}>
                <QuestChip quests={quests.data} />
              </View>

              {/* Section bar — title + Manage shortcut */}
              <View style={styles.sectionBar}>
                <Text style={styles.sectionTitle}>Tasks</Text>
                <Pressable
                  onPress={() => router.push('/tasks')}
                  style={({ pressed }) => [
                    styles.manageBtn,
                    pressed && { opacity: 0.6 },
                  ]}
                  hitSlop={6}
                  accessibilityLabel="Manage tasks"
                >
                  <Ionicons name="list" size={14} color={tokens.brand.violet2} />
                  <Text style={styles.manageBtnText}>Manage</Text>
                </Pressable>
              </View>

              {totalPending === 0 ? (
                <View style={styles.zeroBox}>
                  <View style={styles.emptyBox}>
                    <EmptyHero tone="xp" />
                    <Text style={styles.emptyTitle}>All quests cleared.</Text>
                    <Text style={styles.emptySub}>
                      Take the rest, or queue up a new quest.
                    </Text>
                  </View>
                  <View style={styles.addCardWrap}>
                    <AddCard
                      label="New task"
                      sublabel="Add a habit or one-shot quest"
                      onPress={() => router.push('/task-form')}
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.bucketsList}>
                  {BUCKET_META.map((meta) => {
                    const items = tasksFor(meta.id);
                    const isCollapsed = collapsed[meta.id];
                    return (
                      <BucketSection
                        key={meta.id}
                        meta={meta}
                        count={items.length}
                        collapsed={isCollapsed}
                        onToggle={() => toggleBucket(meta.id)}
                      >
                        {items.length === 0 ? (
                          <Text style={styles.bucketEmpty}>
                            Nothing here.
                          </Text>
                        ) : (
                          items.map((task) => (
                            <TaskCard
                              key={task.id}
                              task={task}
                              selectedDifficulty={diffOverrides[task.id]}
                              onSelectDifficulty={(d) =>
                                setDiffOverrides((prev) => ({ ...prev, [task.id]: d }))
                              }
                              streakDays={streak.data?.currentStreak ?? 0}
                              onComplete={() => handleComplete(task)}
                              onEdit={() =>
                                router.push({ pathname: '/task-form', params: { id: task.id } })
                              }
                            />
                          ))
                        )}
                      </BucketSection>
                    );
                  })}
                  <AddCard
                    label="New task"
                    sublabel="Add a habit or one-shot quest"
                    onPress={() => router.push('/task-form')}
                  />
                </View>
              )}
            </>
          )}
        </ScrollView>
      </ScreenBackground>

      {floats.map((f) => (
        <XPCoinFloat
          key={f.id}
          xp={f.xp}
          coins={f.coins}
          onDone={() => setFloats((prev) => prev.filter((x) => x.id !== f.id))}
        />
      ))}
    </SafeAreaView>
  );
}

interface BucketSectionProps {
  meta: BucketMeta;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function BucketSection({
  meta,
  count,
  collapsed,
  onToggle,
  children,
}: BucketSectionProps) {
  // Empty + collapsed = render only the header to keep the surface tidy.
  // Empty + expanded = show the "Nothing here" hint via children.
  return (
    <View style={styles.bucket}>
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [
          styles.bucketHeader,
          pressed && { opacity: 0.7 },
        ]}
      >
        <View style={styles.bucketIconWrap}>
          <Ionicons name={meta.iconName} size={14} color={tokens.brand.violet2} />
        </View>
        <Text style={styles.bucketLabel}>{meta.label}</Text>
        <View style={styles.bucketCountChip}>
          <Text style={styles.bucketCountText}>{count}</Text>
        </View>
        <View style={{ flex: 1 }} />
        <Ionicons
          name={collapsed ? 'chevron-down' : 'chevron-up'}
          size={16}
          color={tokens.text.dim}
        />
      </Pressable>
      {!collapsed && <View style={styles.bucketBody}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: tokens.bg.deep,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: tokens.space[4],
    paddingBottom: tokens.layout.bottomNavClearance,
  },
  header: {
    paddingTop: tokens.space[2],
    paddingBottom: tokens.space[3],
  },
  dateText: {
    ...tokens.type.caption,
    color: tokens.text.dim,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: tokens.space[2],
  },
  greeting: {
    ...tokens.type.body,
    color: tokens.text.mid,
  },
  loadingBox: {
    paddingVertical: tokens.space[10],
    alignItems: 'center',
  },
  errorBox: {
    paddingVertical: tokens.space[8],
    alignItems: 'center',
    gap: tokens.space[3],
  },
  errorText: {
    ...tokens.type.body,
    color: tokens.text.mid,
    textAlign: 'center',
    paddingHorizontal: tokens.space[5],
  },
  sectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: tokens.space[6],
    marginBottom: tokens.space[3],
  },
  sectionTitle: {
    ...tokens.type.h2,
    color: tokens.text.hi,
  },
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: tokens.space[3],
    paddingVertical: 6,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(123,92,255,0.4)',
    backgroundColor: 'rgba(123,92,255,0.12)',
  },
  manageBtnText: {
    ...tokens.type.caption,
    color: tokens.brand.violet2,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 0.4,
  },
  questsBlock: {
    marginBottom: tokens.space[5],
  },
  bucketsList: {
    gap: tokens.space[3],
  },
  bucket: {
    backgroundColor: tokens.bg.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.border.base,
    overflow: 'hidden',
  },
  bucketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[3],
  },
  bucketIconWrap: {
    width: 26,
    height: 26,
    borderRadius: tokens.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(123,92,255,0.18)',
  },
  bucketLabel: {
    ...tokens.type.bodyLg,
    color: tokens.text.hi,
    fontFamily: 'Manrope_800ExtraBold',
  },
  bucketCountChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.bg.base,
    borderWidth: 1,
    borderColor: tokens.border.base,
    minWidth: 24,
    alignItems: 'center',
  },
  bucketCountText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
    color: tokens.text.mid,
  },
  bucketBody: {
    paddingHorizontal: tokens.space[3],
    paddingTop: tokens.space[2],
    paddingBottom: tokens.space[3],
    gap: tokens.space[3],
    borderTopWidth: 1,
    borderTopColor: tokens.border.divider,
  },
  bucketEmpty: {
    ...tokens.type.caption,
    color: tokens.text.dim,
    fontStyle: 'italic',
    paddingVertical: tokens.space[3],
    textAlign: 'center',
  },
  zeroBox: {
    marginTop: tokens.space[3],
  },
  addCardWrap: {
    marginTop: tokens.space[4],
  },
  emptyBox: {
    paddingVertical: tokens.space[8],
    alignItems: 'center',
    gap: tokens.space[2],
  },
  emptyTitle: {
    ...tokens.type.h2,
    color: tokens.text.hi,
    marginTop: tokens.space[2],
  },
  emptySub: {
    ...tokens.type.body,
    color: tokens.text.mid,
    textAlign: 'center',
    paddingHorizontal: tokens.space[6],
  },
});
