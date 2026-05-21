import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
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

import { useBottomNavClearance } from '@/components/BottomNavBar';
import { ActiveQuestsCard } from '@/components/ActiveQuestsCard';
import { CompactHeader } from '@/components/CompactHeader';
import { CompleteTaskSheet } from '@/components/CompleteTaskSheet';
import { CompletedBucket, type CompletedItem } from '@/components/CompletedBucket';
import { ManageTasksButton } from '@/components/ManageTasksButton';
import { ScreenBackground } from '@/components/ScreenBackground';
import { TaskActionSheet } from '@/components/TaskActionSheet';
import { TaskCard } from '@/components/TaskCard';
import { TodayRing } from '@/components/TodayRing';
import { XPCoinFloat } from '@/components/XPCoinFloat';
import { useCharacter } from '@/lib/api/character';
import { useT } from '@/lib/i18n';
import { useTrackedReward } from '@/lib/api/rewards';
import {
  useActiveTasks,
  useCompleteTask,
  useHomeBuckets,
  useSkipTaskToday,
  useUndoCompletion,
} from '@/lib/api/tasks';
import type { TaskSub, TaskWithSubs } from '@/lib/db/types';
import { formatCompactDate } from '@/lib/time';
import { levelProgress, rewardForTaskSubs } from '@/lib/xp';
import { tokens } from '@/theme';

interface FloatItem {
  id: number;
  xp: number;
  coins: number;
}

type BucketTab = 'today' | 'week' | 'recurring' | 'oneshot';

interface TabMeta {
  id: BucketTab;
  labelKey: string;
  emptyKey: string;
  iconName: keyof typeof Ionicons.glyphMap;
  accent: string;
}

const TAB_META: TabMeta[] = [
  {
    id: 'today',
    labelKey: 'home.bucketTabs.today',
    emptyKey: 'home.bucketTabs.emptyToday',
    iconName: 'sunny-outline',
    accent: tokens.brand.violet2,
  },
  {
    id: 'week',
    labelKey: 'home.bucketTabs.week',
    emptyKey: 'home.bucketTabs.emptyWeek',
    iconName: 'calendar-outline',
    accent: '#4DD0FF',
  },
  {
    id: 'recurring',
    labelKey: 'home.bucketTabs.recurring',
    emptyKey: 'home.bucketTabs.emptyRecurring',
    iconName: 'repeat',
    accent: tokens.semantic.xp,
  },
  {
    id: 'oneshot',
    labelKey: 'home.bucketTabs.oneshot',
    emptyKey: 'home.bucketTabs.emptyOneshot',
    iconName: 'flag-outline',
    accent: tokens.semantic.coin,
  },
];

/**
 * Tasks home — bucket-flavored layout (Variante A v2).
 *
 *   - today: daily + scheduled-today weekly/monthly that aren't done yet
 *   - week:  this-week / this-month period overflow
 *   - recurring: ALL non-one_shot active tasks (cadence overview)
 *   - oneshot: pending one-shot tasks
 *
 * Replaces the previous type-tabs (daily/weekly/one_shot/general) — same
 * underlying data (`useHomeBuckets`) plus `useActiveTasks` for the
 * recurring overview.
 */
export default function HomeScreen() {
  const router = useRouter();
  const { t } = useT();
  const character = useCharacter();
  const buckets = useHomeBuckets();
  const allActiveTasks = useActiveTasks();
  const trackedReward = useTrackedReward();
  const completeTask = useCompleteTask();
  const skipTask = useSkipTaskToday();
  const undoCompletion = useUndoCompletion();

  const [activeTab, setActiveTab] = useState<BucketTab>('today');
  const [floats, setFloats] = useState<FloatItem[]>([]);
  const [actionTask, setActionTask] = useState<TaskWithSubs | null>(null);
  const [sheetTask, setSheetTask] = useState<TaskWithSubs | null>(null);
  const bottomClearance = useBottomNavClearance();

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
      { task, subs },
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

  const handleUndo = (completionId: string) => {
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

  const isLoading = character.isLoading || buckets.isLoading;
  const hasError = character.error || buckets.error;

  const handleRefresh = async () => {
    await Promise.all([
      character.refetch(),
      buckets.refetch(),
      allActiveTasks.refetch(),
    ]);
  };
  const isRefreshing =
    character.isRefetching || buckets.isRefetching || allActiveTasks.isRefetching;

  const data = buckets.data;

  // ── Bucket lists (mutually exclusive) ─────────────────────────────────
  // Strict precedence: today > week > recurring. A task only appears in
  // one bucket — the one closest to "act on this now".
  //
  // - today:     `useHomeBuckets.today` (pending daily + scheduled-today
  //              weekly/monthly that aren't done yet)
  // - week:      thisWeek + thisMonth, MINUS today's items AND minus
  //              anything already completed today (so a 3x/week task
  //              I did once today doesn't pop into "this week" as if
  //              still pending — it counts as "covered for today")
  // - recurring: all non-one_shot active tasks NOT in today or week
  //              (cadences that are caught up — the user's habit list)
  // - oneshot:   pending one-shots
  const lists = useMemo<Record<BucketTab, TaskWithSubs[]>>(() => {
    if (!data) {
      return { today: [], week: [], recurring: [], oneshot: [] };
    }

    const todayIds = new Set(data.today.map((t) => t.id));
    const completedTodayIds = new Set(
      data.todayActivity.completed.map((c) => c.task.id),
    );

    // Week = thisWeek + thisMonth, deduped, excluding today's items and
    // tasks the user already completed at least once today.
    const week: TaskWithSubs[] = [];
    const seen = new Set<string>();
    const pushWeek = (t: TaskWithSubs) => {
      if (seen.has(t.id)) return;
      if (todayIds.has(t.id)) return;
      if (completedTodayIds.has(t.id)) return;
      seen.add(t.id);
      week.push(t);
    };
    data.thisWeek.forEach(pushWeek);
    data.thisMonth.forEach(pushWeek);
    const weekIds = new Set(week.map((t) => t.id));

    // Recurring = non-one_shot active tasks not surfaced above.
    const recurring = (allActiveTasks.data ?? []).filter(
      (t) =>
        t.recurrence.type !== 'one_shot' &&
        !todayIds.has(t.id) &&
        !weekIds.has(t.id),
    );

    return {
      today: data.today,
      week,
      recurring,
      oneshot: data.oneTime,
    };
  }, [data, allActiveTasks.data]);

  // Tasks completed today (regardless of bucket). Used by the "Done today"
  // collapsible at the bottom of the today bucket — rows are tappable to
  // undo, so we keep the latestCompletionId here.
  const completedTodayItems = useMemo<CompletedItem[]>(
    () =>
      (data?.todayActivity.completed ?? []).map((c) => ({
        task: c.task,
        completionId: c.latestCompletionId,
      })),
    [data?.todayActivity.completed],
  );

  // Counts shown in the tab chips. For today/week/oneshot it's pending; for
  // recurring it's the total number of cadences (active rate is the value).
  const counts = useMemo<Record<BucketTab, number>>(
    () => ({
      today: lists.today.length,
      week: lists.week.length,
      recurring: lists.recurring.length,
      oneshot: lists.oneshot.length,
    }),
    [lists],
  );

  const charXp = character.data?.character.total_xp ?? 0;
  const lp = levelProgress(charXp);
  const activeMeta = TAB_META.find((m) => m.id === activeTab) ?? TAB_META[0];
  const activeList = lists[activeTab];

  const completedBucketTitle =
    activeTab === 'today'
      ? t('home.completedBucket.today')
      : activeTab === 'week'
        ? t('home.completedBucket.week')
        : activeTab === 'recurring'
          ? t('home.completedBucket.recurring')
          : t('home.completedBucket.oneshot');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenBackground>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomClearance }]}
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
            trackedReward={trackedReward}
            onTrackedRewardPress={() => router.push('/(tabs)/rewards')}
          />

          <TodayRing
            done={completedTodayItems.length}
            total={completedTodayItems.length + lists.today.length}
          />

          <ActiveQuestsCard />

          {isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={tokens.brand.violet2} />
            </View>
          ) : hasError ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={32} color={tokens.semantic.danger} />
              <Text style={styles.errorText}>{t('home.error')}</Text>
            </View>
          ) : (
            <View style={styles.body}>
              <BucketTabs
                active={activeTab}
                counts={counts}
                onChange={setActiveTab}
                t={t}
              />

              <View style={styles.tabBody}>
                {activeList.length === 0 ? (
                  <Text style={styles.tabEmpty}>{t(activeMeta.emptyKey)}</Text>
                ) : (
                  <>
                    {activeTab === 'today' && (
                      <Text style={styles.sectionLabel}>{t('home.bucketTabs.nextUp')}</Text>
                    )}
                    {activeTab === 'recurring' && (
                      <Text style={styles.sectionLabel}>{t('home.bucketTabs.recurringLead')}</Text>
                    )}
                    {activeTab === 'oneshot' && (
                      <Text style={styles.sectionLabel}>{t('home.bucketTabs.oneshotLead')}</Text>
                    )}
                    {activeList.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onComplete={() => handleQuickComplete(task)}
                        onLongPress={() => handleLongPress(task)}
                        onEdit={() =>
                          router.push({ pathname: '/task-form', params: { id: task.id } })
                        }
                      />
                    ))}
                  </>
                )}

                {activeTab === 'today' && (
                  <CompletedBucket
                    items={completedTodayItems}
                    title={completedBucketTitle}
                    onUndo={handleUndo}
                  />
                )}
              </View>

              <View style={styles.manageWrap}>
                <ManageTasksButton onPress={() => router.push('/tasks')} />
              </View>
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

interface BucketTabsProps {
  active: BucketTab;
  counts: Record<BucketTab, number>;
  onChange: (next: BucketTab) => void;
  t: (key: string) => string;
}

function BucketTabs({ active, counts, onChange, t }: BucketTabsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={tabStyles.row}
    >
      {TAB_META.map((meta) => {
        const isActive = meta.id === active;
        const count = counts[meta.id];
        return (
          <Pressable
            key={meta.id}
            onPress={() => {
              if (!isActive) Haptics.selectionAsync().catch(() => {});
              onChange(meta.id);
            }}
            style={({ pressed }) => [
              tabStyles.tab,
              isActive && {
                backgroundColor: `${meta.accent}1F`,
                borderColor: `${meta.accent}55`,
              },
              pressed && { opacity: 0.85 },
            ]}
            hitSlop={4}
          >
            <Ionicons
              name={meta.iconName}
              size={14}
              color={isActive ? meta.accent : tokens.text.dim}
            />
            <Text
              style={[
                tabStyles.label,
                { color: isActive ? meta.accent : tokens.text.dim },
              ]}
              numberOfLines={1}
            >
              {t(meta.labelKey)}
            </Text>
            <View
              style={[
                tabStyles.countChip,
                isActive && { backgroundColor: `${meta.accent}33` },
              ]}
            >
              <Text
                style={[
                  tabStyles.countText,
                  { color: isActive ? meta.accent : tokens.text.dim },
                ]}
              >
                {count}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.bg.deep },
  scroll: { flex: 1 },
  scrollContent: {},
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
  body: {
    paddingHorizontal: tokens.space[3],
    gap: tokens.space[3],
  },
  tabBody: {
    gap: tokens.space[2],
  },
  sectionLabel: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: tokens.text.dim,
    paddingHorizontal: 4,
    paddingTop: 2,
  },
  tabEmpty: {
    ...tokens.type.caption,
    color: tokens.text.dim,
    fontStyle: 'italic',
    paddingVertical: tokens.space[4],
    textAlign: 'center',
  },
  manageWrap: {
    paddingTop: tokens.space[3],
    paddingHorizontal: 4,
  },
});

const tabStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 4,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: tokens.space[2],
    paddingHorizontal: tokens.space[3],
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.border.base,
    backgroundColor: tokens.bg.surface2,
    minHeight: 32,
  },
  label: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
    letterSpacing: 0.4,
  },
  countChip: {
    minWidth: 20,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 999,
    backgroundColor: tokens.bg.glass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    letterSpacing: 0.3,
  },
});
