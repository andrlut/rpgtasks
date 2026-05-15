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
import { CompleteTaskSheet } from '@/components/CompleteTaskSheet';
import { ScreenBackground } from '@/components/ScreenBackground';
import { TaskActionSheet } from '@/components/TaskActionSheet';
import { TaskCard } from '@/components/TaskCard';
import { TodayActivityDrawer } from '@/components/TodayActivityDrawer';
import { XPCoinFloat } from '@/components/XPCoinFloat';
import { useCharacter } from '@/lib/api/character';
import { useT } from '@/lib/i18n';
import {
  useCompleteTask,
  useHomeBuckets,
  useSkipTaskToday,
  useUndoCompletion,
  useUnskipTaskToday,
} from '@/lib/api/tasks';
import type { TaskSub, TaskWithSubs } from '@/lib/db/types';
import {
  useHomeBucketsStore,
  useLoadHomeBuckets,
  type HomeBucket,
} from '@/lib/homeBuckets';
import { formatCompactDate } from '@/lib/time';
import { levelProgress, rewardForTaskSubs } from '@/lib/xp';
import { tokens } from '@/theme';

interface FloatItem {
  id: number;
  xp: number;
  coins: number;
}

interface BucketMeta {
  id: HomeBucket;
  labelKey: string;
  iconName: keyof typeof Ionicons.glyphMap;
  color: string;
}

const BUCKET_META: BucketMeta[] = [
  { id: 'today',      labelKey: 'home.buckets.today',     iconName: 'time',     color: tokens.brand.violet2 },
  { id: 'this_week',  labelKey: 'home.buckets.thisWeek',  iconName: 'calendar', color: '#4DD0FF' },
  { id: 'this_month', labelKey: 'home.buckets.thisMonth', iconName: 'calendar-outline', color: tokens.semantic.coin },
  { id: 'one_time',   labelKey: 'home.buckets.oneTime',   iconName: 'flag',     color: '#FF8A3D' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useT();
  const character = useCharacter();
  const buckets = useHomeBuckets();
  const completeTask = useCompleteTask();
  const skipTask = useSkipTaskToday();
  const unskipTask = useUnskipTaskToday();
  const undoCompletion = useUndoCompletion();
  useLoadHomeBuckets();
  const collapsed = useHomeBucketsStore((s) => s.collapsed);
  const toggleBucket = useHomeBucketsStore((s) => s.toggle);
  const [floats, setFloats] = useState<FloatItem[]>([]);
  /** Two stages of the long-press flow:
   *   actionTask → which task's action menu is open
   *   sheetTask  → which task's per-sub adjust popup is open (after picking
   *                "Adjust stars" from the action menu) */
  const [actionTask, setActionTask] = useState<TaskWithSubs | null>(null);
  const [sheetTask, setSheetTask] = useState<TaskWithSubs | null>(null);

  const fireCompletion = (task: TaskWithSubs, subs: TaskSub[]) => {
    if (completeTask.isPending) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    const reward = rewardForTaskSubs(subs);
    const fid = Date.now();
    setFloats((prev) => [
      ...prev,
      { id: fid, xp: reward.total.xp, coins: reward.total.coins },
    ]);

    completeTask.mutate(
      {
        task,
        subs,
      },
      {
        onError: (err) => {
          const e = err as { message?: string; code?: string; details?: string };
          console.error('[complete_task] failed', e);
          Alert.alert(
            t('home.actionErrors.complete'),
            [e.message, e.code, e.details].filter(Boolean).join('\n') ||
              t('home.actionErrors.unknown'),
          );
        },
      },
    );
  };

  const handleQuickComplete = (task: TaskWithSubs) => {
    fireCompletion(task, task.subs);
  };

  const handleLongPress = (task: TaskWithSubs) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setActionTask(task);
  };

  const handleSheetConfirm = (subs: TaskSub[]) => {
    if (!sheetTask) return;
    const task = sheetTask;
    setSheetTask(null);
    fireCompletion(task, subs);
  };

  const handleActionAdjust = () => {
    if (!actionTask) return;
    const task = actionTask;
    setActionTask(null);
    setSheetTask(task);
  };

  const handleActionSkip = () => {
    if (!actionTask) return;
    const task = actionTask;
    setActionTask(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    skipTask.mutate(
      { taskId: task.id },
      {
        onError: (err) => {
          const e = err as { message?: string };
          Alert.alert(
            t('home.actionErrors.skip'),
            e.message ?? t('home.actionErrors.unknown'),
          );
        },
      },
    );
  };

  const handleActionEdit = () => {
    if (!actionTask) return;
    const task = actionTask;
    setActionTask(null);
    router.push({ pathname: '/task-form', params: { id: task.id } });
  };

  const handleDrawerExtra = (task: TaskWithSubs) => {
    fireCompletion(task, task.subs);
  };

  const handleDrawerUndo = (completionId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    undoCompletion.mutate(completionId, {
      onError: (err) => {
        const e = err as { message?: string };
        Alert.alert(
          t('home.actionErrors.undo'),
          e.message ?? t('home.actionErrors.unknown'),
        );
      },
    });
  };

  const handleDrawerUnskip = (task: TaskWithSubs) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    unskipTask.mutate(
      { taskId: task.id },
      {
        onError: (err) => {
          const e = err as { message?: string };
          Alert.alert(
            t('home.actionErrors.unskip'),
            e.message ?? t('home.actionErrors.unknown'),
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
    ]);
  };
  const isRefreshing =
    character.isRefetching || buckets.isRefetching;

  const data = buckets.data;
  const totalPending =
    (data?.today.length ?? 0) +
    (data?.thisWeek.length ?? 0) +
    (data?.thisMonth.length ?? 0) +
    (data?.oneTime.length ?? 0);

  const tasksFor = (b: HomeBucket): TaskWithSubs[] => {
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
            displayName={character.data?.profile.display_name ?? t('home.defaultName')}
            totalXp={charXp}
            level={lp.level}
            xpInLevel={lp.xpInLevel}
            xpNeededForLevel={lp.xpNeededForLevel}
            coins={character.data?.character.coins ?? 0}
            dateLabel={formatCompactDate()}
            onHistoryPress={() => router.push('/history')}
          />

          {isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={tokens.brand.violet2} />
            </View>
          ) : hasError ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={32} color={tokens.semantic.danger} />
              <Text style={styles.errorText}>{t('home.error')}</Text>
            </View>
          ) : totalPending === 0 ? (
            <View style={styles.bucketsList}>
              <View style={styles.emptyBox}>
                <Ionicons
                  name="checkmark-circle"
                  size={42}
                  color={tokens.semantic.xp}
                />
                <Text style={styles.emptyTitle}>{t('home.empty.title')}</Text>
                <Text style={styles.emptySub}>{t('home.empty.body')}</Text>
                <Pressable
                  onPress={() => router.push('/tasks')}
                  style={({ pressed }) => [
                    styles.emptyCta,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Ionicons name="add" size={18} color={tokens.text.hi} />
                  <Text style={styles.emptyCtaText}>{t('home.empty.cta')}</Text>
                </Pressable>
              </View>
              {data && (
                <TodayActivityDrawer
                  activity={data.todayActivity}
                  onExtraComplete={handleDrawerExtra}
                  onUndoCompletion={handleDrawerUndo}
                  onUnskip={handleDrawerUnskip}
                />
              )}
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
                    label={t(meta.labelKey)}
                    count={items.length}
                    collapsed={isCollapsed}
                    onToggle={() => toggleBucket(meta.id)}
                  >
                    {items.length === 0 ? (
                      <Text style={styles.bucketEmpty}>{t('home.buckets.emptyToday')}</Text>
                    ) : (
                      items.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onComplete={() => handleQuickComplete(task)}
                          onLongPress={() => handleLongPress(task)}
                          onEdit={() =>
                            router.push({ pathname: '/task-form', params: { id: task.id } })
                          }
                        />
                      ))
                    )}
                  </BucketSection>
                );
              })}

              {data && (
                <TodayActivityDrawer
                  activity={data.todayActivity}
                  onExtraComplete={handleDrawerExtra}
                  onUndoCompletion={handleDrawerUndo}
                  onUnskip={handleDrawerUnskip}
                />
              )}

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
                <Text style={styles.manageCtaText}>{t('home.manageCta')}</Text>
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

      <CompleteTaskSheet
        visible={sheetTask !== null}
        task={sheetTask}
        onCancel={() => setSheetTask(null)}
        onConfirm={handleSheetConfirm}
      />

      <TaskActionSheet
        visible={actionTask !== null}
        taskTitle={actionTask?.title ?? ''}
        onCancel={() => setActionTask(null)}
        onAdjustStars={handleActionAdjust}
        onSkipToday={handleActionSkip}
        onEdit={handleActionEdit}
      />
    </SafeAreaView>
  );
}

interface BucketSectionProps {
  meta: BucketMeta;
  label: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function BucketSection({
  meta,
  label,
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
        <Text style={bucketStyles.label}>{label}</Text>
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
