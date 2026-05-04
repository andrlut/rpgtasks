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

import { CompactHeader } from '@/components/CompactHeader';
import { ScreenBackground } from '@/components/ScreenBackground';
import { TaskCard } from '@/components/TaskCard';
import { XPCoinFloat } from '@/components/XPCoinFloat';
import { useCharacter } from '@/lib/api/character';
import { useStreak } from '@/lib/api/streak';
import { useCompleteTask, useHomeBuckets } from '@/lib/api/tasks';
import type { TaskWithDimension } from '@/lib/db/types';
import {
  useHomeBucketsStore,
  useLoadHomeBuckets,
  type HomeBucket,
} from '@/lib/homeBuckets';
import { formatCompactDate } from '@/lib/time';
import { maybeConfirmHardCompletion } from '@/lib/util/confirmCompletion';
import {
  applyStreakMultiplier,
  levelProgress,
  rewardForDifficulty,
  type Difficulty,
} from '@/lib/xp';
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
  color: string;
}

const BUCKET_META: BucketMeta[] = [
  { id: 'today',      label: 'Today',     iconName: 'time',     color: tokens.brand.violet2 },
  { id: 'this_week',  label: 'This Week', iconName: 'calendar', color: '#4DD0FF' },
  { id: 'this_month', label: 'This Month',iconName: 'calendar-outline', color: tokens.semantic.coin },
  { id: 'one_time',   label: 'One-time',  iconName: 'flag',     color: '#FF8A3D' },
];

export default function HomeScreen() {
  const router = useRouter();
  const character = useCharacter();
  const buckets = useHomeBuckets();
  const streak = useStreak();
  const completeTask = useCompleteTask();
  useLoadHomeBuckets();
  const collapsed = useHomeBucketsStore((s) => s.collapsed);
  const toggleBucket = useHomeBucketsStore((s) => s.toggle);
  const [floats, setFloats] = useState<FloatItem[]>([]);
  // Per-task overrides for star difficulty, applied via swipe on the card.
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
    (data?.thisMonth.length ?? 0) +
    (data?.oneTime.length ?? 0);

  const tasksFor = (b: HomeBucket): TaskWithDimension[] => {
    if (!data) return [];
    if (b === 'today') return data.today;
    if (b === 'this_week') return data.thisWeek;
    if (b === 'this_month') return data.thisMonth;
    return data.oneTime;
  };

  // Pre-compute level progress so the header always renders something
  // sensible, even on first load when character hasn't resolved yet.
  const charXp = character.data?.character.total_xp ?? 0;
  const lp = levelProgress(charXp);

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
          <CompactHeader
            displayName={character.data?.profile.display_name ?? 'adventurer'}
            totalXp={charXp}
            level={lp.level}
            xpInLevel={lp.xpInLevel}
            xpNeededForLevel={lp.xpNeededForLevel}
            coins={character.data?.character.coins ?? 0}
            streakDays={streak.data?.currentStreak ?? 0}
            dateLabel={formatCompactDate()}
          />

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
          ) : totalPending === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="checkmark-circle" size={42} color={tokens.semantic.xp} />
              <Text style={styles.emptyTitle}>All clear.</Text>
              <Text style={styles.emptySub}>
                Nothing pending right now. Add a task to get started.
              </Text>
              <Pressable
                onPress={() => router.push('/tasks')}
                style={({ pressed }) => [
                  styles.emptyCta,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Ionicons name="add" size={18} color={tokens.text.hi} />
                <Text style={styles.emptyCtaText}>Manage tasks</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.bucketsList}>
              {BUCKET_META.map((meta) => {
                const items = tasksFor(meta.id);
                const isCollapsed = collapsed[meta.id];
                // Skip rendering empty This Week / This Month / One-time
                // sections — keeps the surface tight when nothing's pending.
                if (items.length === 0 && meta.id !== 'today') return null;
                return (
                  <BucketSection
                    key={meta.id}
                    meta={meta}
                    count={items.length}
                    collapsed={isCollapsed}
                    onToggle={() => toggleBucket(meta.id)}
                  >
                    {items.length === 0 ? (
                      <Text style={styles.bucketEmpty}>All clear for today.</Text>
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

              {/* Manage shortcut at the bottom — replaces the old "+ New task"
                  card since adoption from the catalog lives on /tasks. */}
              <Pressable
                onPress={() => router.push('/tasks')}
                style={({ pressed }) => [
                  styles.manageCta,
                  pressed && { opacity: 0.7 },
                ]}
                hitSlop={4}
              >
                <Ionicons name="list" size={16} color={tokens.brand.violet2} />
                <Text style={styles.manageCtaText}>Manage tasks</Text>
              </Pressable>
            </View>
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
  return (
    <View style={bucketStyles.wrap}>
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [
          bucketStyles.header,
          pressed && { opacity: 0.7 },
        ]}
      >
        <View style={bucketStyles.iconWrap}>
          <Ionicons name={meta.iconName} size={14} color={meta.color} />
        </View>
        <Text style={bucketStyles.label}>{meta.label}</Text>
        <View style={bucketStyles.countChip}>
          <Text style={bucketStyles.countText}>{count}</Text>
        </View>
        <View style={{ flex: 1 }} />
        <Ionicons
          name={collapsed ? 'chevron-down' : 'chevron-up'}
          size={16}
          color={tokens.text.dim}
        />
      </Pressable>
      {!collapsed && <View style={bucketStyles.body}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.bg.deep },
  scroll: { flex: 1 },
  scrollContent: {
    paddingBottom: tokens.layout.bottomNavClearance,
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
  emptyBox: {
    paddingVertical: tokens.space[10],
    alignItems: 'center',
    gap: tokens.space[2],
    paddingHorizontal: tokens.space[6],
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
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[3],
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.brand.violet,
    marginTop: tokens.space[4],
  },
  emptyCtaText: {
    ...tokens.type.body,
    color: tokens.text.hi,
    fontFamily: 'Manrope_700Bold',
  },
  bucketsList: {
    paddingHorizontal: tokens.space[3],
    gap: tokens.space[3],
  },
  bucketEmpty: {
    ...tokens.type.caption,
    color: tokens.text.dim,
    fontStyle: 'italic',
    paddingVertical: tokens.space[3],
    textAlign: 'center',
  },
  manageCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: tokens.space[3],
    paddingVertical: tokens.space[3],
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(123,92,255,0.4)',
    backgroundColor: 'rgba(123,92,255,0.08)',
  },
  manageCtaText: {
    ...tokens.type.body,
    color: tokens.brand.violet2,
    fontFamily: 'Manrope_700Bold',
  },
});

const bucketStyles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  iconWrap: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.bg.surface,
  },
  label: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 13,
    color: tokens.text.hi,
    letterSpacing: 0.2,
  },
  countChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: tokens.bg.surface,
    minWidth: 24,
    alignItems: 'center',
  },
  countText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    color: tokens.text.mid,
  },
  body: {
    gap: 8,
  },
});
