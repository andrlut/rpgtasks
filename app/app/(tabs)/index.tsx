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
import { BucketTabsV2, type BucketTabSpec } from '@/components/BucketTabsV2';
import { CompleteTaskSheet } from '@/components/CompleteTaskSheet';
import { CompletedBucket, type CompletedItem } from '@/components/CompletedBucket';
import { QuestChipsStrip } from '@/components/QuestChipsStrip';
import { RewardStatsCard, XPStatsCard } from '@/components/StatsCards';
import { TaskActionSheet } from '@/components/TaskActionSheet';
import { TaskCard } from '@/components/TaskCard';
import { TodayAmbient } from '@/components/TodayAmbient';
import { TodayHeader } from '@/components/TodayHeader';
import { XPCoinFloat } from '@/components/XPCoinFloat';
import { useCharacter } from '@/lib/api/character';
import { useT } from '@/lib/i18n';
import { useTrackedReward } from '@/lib/api/rewards';
import { useLoadedSettings } from '@/lib/settings';
import {
  useActiveTasks,
  useCompleteTask,
  useHomeBuckets,
  useSkipTaskToday,
  useUndoCompletion,
  useUnskipTaskToday,
} from '@/lib/api/tasks';
import { useQuests } from '@/lib/api/quests';
import type { TaskSub, TaskWithSubs } from '@/lib/db/types';
import { formatHeroDate } from '@/lib/time';
import { compareOneShotsByFreshness, isInTrophyWindow } from '@/lib/trophy';
import { levelProgress, rewardForTaskSubs } from '@/lib/xp';
import { tokens } from '@/theme';

interface FloatItem {
  id: number;
  xp: number;
  coins: number;
}

type BucketTab = 'daily' | 'weekly' | 'oneshot';

/**
 * Tasks home — V3 "Today Hub" layout.
 *
 *   ┌──────────────────────────────────────────────┐
 *   │  ambient (violet halo + Topo Iris glyph)     │  absolute, z 0
 *   │                                              │
 *   │  SUN · MAY 24 · DECO      [📅] [⚔] [⚙]      │
 *   │                                              │
 *   │  Sunday, May 24                  [ring 6]    │
 *   │                                              │
 *   │  XP card  ──────  290/500   LV 3             │
 *   │  Reward card  ──  🎯 ...  61%   610          │
 *   │                                              │
 *   │  Daily 1 | Weekly 3 ▔▔▔ | One-shot 2         │
 *   │  [⚔ Sem açúcar 1/3] [+ Browse]               │
 *   │                                              │
 *   │  ┌── TaskCard list (gradient + sub tile) ─┐ │
 *   │  │ 🧘 Meditar 10 min       [✓]            │ │
 *   │  └────────────────────────────────────────┘ │
 *   └──────────────────────────────────────────────┘
 *
 * Three principles preserved from the user's brief:
 *   1. XP and tracked-reward bars stay visually independent — two
 *      separate cards, not one combined stats card.
 *   2. The summary line ("1 task to close the day") is gone — the
 *      ring is sufficient.
 *   3. Quest cards collapsed into discrete gold pill chips.
 */
export default function HomeScreen() {
  const router = useRouter();
  const { t } = useT();
  const settings = useLoadedSettings();
  const character = useCharacter();
  const buckets = useHomeBuckets(settings.weekStart);
  const allActiveTasks = useActiveTasks();
  const trackedReward = useTrackedReward();
  const quests = useQuests();
  const completeTask = useCompleteTask();
  const skipTask = useSkipTaskToday();
  const unskipTask = useUnskipTaskToday();
  const undoCompletion = useUndoCompletion();

  const [activeTab, setActiveTab] = useState<BucketTab>('daily');
  const [floats, setFloats] = useState<FloatItem[]>([]);
  const [actionTask, setActionTask] = useState<TaskWithSubs | null>(null);
  const [sheetTask, setSheetTask] = useState<TaskWithSubs | null>(null);
  const bottomClearance = useBottomNavClearance();

  // ── Mutation handlers ─────────────────────────────────────────────────
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

  const handleSwipeSkip = (task: TaskWithSubs) => {
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

  const handleUnskip = (taskId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    unskipTask.mutate(
      { taskId },
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
      allActiveTasks.refetch(),
    ]);
  };
  const isRefreshing =
    character.isRefetching || buckets.isRefetching || allActiveTasks.isRefetching;

  const data = buckets.data;

  // ── Type-flavored lists ───────────────────────────────────────────────
  const lists = useMemo<Record<BucketTab, TaskWithSubs[]>>(() => {
    if (!data) {
      return { daily: [], weekly: [], oneshot: [] };
    }
    const completedTodayIds = new Set(
      data.todayActivity.completed.map((c) => c.task.id),
    );
    const skippedTodayIds = new Set(
      data.todayActivity.skipped.map((t) => t.id),
    );
    const filterActedToday = (t: TaskWithSubs) =>
      !completedTodayIds.has(t.id) && !skippedTodayIds.has(t.id);

    const daily = data.today
      .filter((t) => t.recurrence.type === 'daily')
      .filter(filterActedToday);

    const weeklySeen = new Set<string>();
    const weekly: TaskWithSubs[] = [];
    const pushWeekly = (t: TaskWithSubs) => {
      if (weeklySeen.has(t.id)) return;
      if (t.recurrence.type !== 'weekly' && t.recurrence.type !== 'monthly') return;
      if (!filterActedToday(t)) return;
      weeklySeen.add(t.id);
      weekly.push(t);
    };
    data.today.forEach(pushWeekly);
    data.thisWeek.forEach(pushWeekly);

    // One-shots are pre-filtered by useHomeBuckets to skip
    // completed-today / skipped-today. Sort trophies (recently-
    // completed one-shots that linger as "marcos") to the bottom.
    const oneshot = [...data.oneTime].sort((a, b) =>
      compareOneShotsByFreshness(a, b),
    );

    return { daily, weekly, oneshot };
  }, [data]);

  // ── Completion buckets per tab ────────────────────────────────────────
  const completedTodayItems = useMemo<CompletedItem[]>(
    () =>
      (data?.todayActivity.completed ?? []).map((c) => ({
        task: c.task,
        completionId: c.latestCompletionId,
      })),
    [data?.todayActivity.completed],
  );

  const completedThisWeekItems = useMemo<CompletedItem[]>(
    () =>
      (data?.weekActivity.completed ?? []).map((c) => ({
        task: c.task,
        completionId: c.latestCompletionId,
      })),
    [data?.weekActivity.completed],
  );

  const completedOneShotItems = useMemo<CompletedItem[]>(
    () =>
      (data?.oneShotActivity.completed ?? []).map((c) => ({
        task: c.task,
        completionId: c.latestCompletionId,
      })),
    [data?.oneShotActivity.completed],
  );

  const skippedTodayItems = useMemo<CompletedItem[]>(
    () =>
      (data?.todayActivity.skipped ?? []).map((task) => ({ task })),
    [data?.todayActivity.skipped],
  );

  // ── Ring math + headline ──────────────────────────────────────────────
  // ringTotal = pending daily + completed daily today (the daily contract).
  // Tasks scheduled-for-today from weekly/monthly are excluded so the
  // ring matches the Daily tab content the user reads under it.
  const ringDoneDailyToday = useMemo(() => {
    if (!data) return 0;
    return data.todayActivity.completed.filter(
      (c) => c.task.recurrence.type === 'daily',
    ).length;
  }, [data]);
  const ringTotal = ringDoneDailyToday + lists.daily.length;

  const hero = formatHeroDate();
  const charXp = character.data?.character.total_xp ?? 0;
  const lp = levelProgress(charXp);

  const activeQuestCount = (quests.data ?? []).filter(
    (q) => q.quest.status === 'active',
  ).length;

  const tabSpecs: BucketTabSpec<BucketTab>[] = [
    { value: 'daily', label: t('home.bucketTabs.daily'), count: lists.daily.length },
    { value: 'weekly', label: t('home.bucketTabs.weekly'), count: lists.weekly.length },
    { value: 'oneshot', label: t('home.bucketTabs.oneshot'), count: lists.oneshot.length },
  ];

  const activeList = lists[activeTab];
  const activeEmptyKey: Record<BucketTab, string> = {
    daily: 'home.bucketTabs.emptyDaily',
    weekly: 'home.bucketTabs.emptyWeekly',
    oneshot: 'home.bucketTabs.emptyOneshot',
  };
  const completedBucketTitle =
    activeTab === 'daily'
      ? t('home.completedBucket.daily')
      : activeTab === 'weekly'
        ? t('home.completedBucket.weekly')
        : t('home.completedBucket.oneshot');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TodayAmbient />

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
        <TodayHeader
          displayName={character.data?.profile.display_name ?? t('home.defaultName')}
          weekdayLabel={hero.weekday}
          monthDayLabel={hero.monthDay}
          ringDone={ringDoneDailyToday}
          ringTotal={ringTotal}
          hasActiveQuests={activeQuestCount > 0}
          onHistoryPress={() => router.push('/history')}
          onQuestsPress={() => router.push('/quests')}
          onManagePress={() => router.push('/tasks')}
        />

        <XPStatsCard
          level={lp.level}
          xpInLevel={lp.xpInLevel}
          xpNeededForLevel={lp.xpNeededForLevel}
          onPress={() =>
            router.push({
              pathname: '/(tabs)/character',
              params: { pillar: 'praticada' },
            })
          }
        />

        {trackedReward && (
          <RewardStatsCard
            rewardName={trackedReward.name}
            iconName={trackedReward.icon}
            coins={trackedReward.currentCoins}
            totalCoins={trackedReward.totalCoins}
            onPress={() => router.push('/(tabs)/rewards')}
          />
        )}

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
          <>
            {/* Order under the hero (XP / Reward cards above): quests
                first, then the bucket selector, then the active list.
                Tasks at the bottom so the selector context is always
                visible when scanning the list. */}
            <QuestChipsStrip />

            <BucketTabsV2<BucketTab>
              tabs={tabSpecs}
              value={activeTab}
              onChange={setActiveTab}
            />

            <View style={styles.taskList}>
              {activeList.length === 0 ? (
                <Text style={styles.tabEmpty}>{t(activeEmptyKey[activeTab])}</Text>
              ) : (
                activeList.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    dimmed={isInTrophyWindow(task)}
                    onComplete={() => handleQuickComplete(task)}
                    onLongPress={() => handleLongPress(task)}
                    onSkip={() => handleSwipeSkip(task)}
                    onSwipeComplete={() => setSheetTask(task)}
                    onEdit={() =>
                      router.push({ pathname: '/task-form', params: { id: task.id } })
                    }
                  />
                ))
              )}

              <CompletedBucket
                items={
                  activeTab === 'weekly'
                    ? completedThisWeekItems
                    : activeTab === 'oneshot'
                      ? completedOneShotItems
                      : completedTodayItems
                }
                title={completedBucketTitle}
                onUndo={handleUndo}
                onExtra={(task) => handleQuickComplete(task)}
              />
              <CompletedBucket
                items={skippedTodayItems}
                title={t('home.skippedBucket.today')}
                variant="skipped"
                onUnskip={handleUnskip}
              />
            </View>

            <View style={styles.bottomActions}>
              <Pressable
                onPress={() => router.push('/history')}
                style={({ pressed }) => [
                  styles.bottomBtn,
                  pressed && styles.bottomBtnPressed,
                ]}
                accessibilityRole="button"
              >
                <Ionicons
                  name="calendar-outline"
                  size={16}
                  color={tokens.text.mid}
                />
                <Text style={styles.bottomBtnLabel}>
                  {t('tabs.history')}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => router.push('/tasks')}
                style={({ pressed }) => [
                  styles.bottomBtn,
                  pressed && styles.bottomBtnPressed,
                ]}
                accessibilityRole="button"
              >
                <Ionicons
                  name="settings-outline"
                  size={16}
                  color={tokens.text.mid}
                />
                <Text style={styles.bottomBtnLabel}>
                  {t('home.manageCta')}
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>

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
  taskList: {
    paddingHorizontal: tokens.space[4],
    paddingTop: tokens.space[2],
    gap: tokens.space[2],
  },
  tabEmpty: {
    ...tokens.type.caption,
    color: tokens.text.dim,
    fontStyle: 'italic',
    paddingVertical: tokens.space[4],
    textAlign: 'center',
  },
  // Bottom row at the end of the home scroll — Calendar (history) +
  // Manage tasks side by side. The Calendar is here so the user can
  // reach History without diving for the tiny top-right icon.
  bottomActions: {
    flexDirection: 'row',
    gap: tokens.space[2],
    paddingTop: tokens.space[3],
    paddingHorizontal: tokens.space[4],
  },
  bottomBtn: {
    flex: 1,
    paddingVertical: tokens.space[3] + 2,
    paddingHorizontal: tokens.space[3],
    backgroundColor: tokens.bg.surface2,
    borderWidth: 1,
    borderColor: tokens.border.base,
    borderRadius: tokens.radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.space[2],
  },
  bottomBtnPressed: {
    opacity: 0.7,
    borderColor: 'rgba(123, 92, 255, 0.3)',
    backgroundColor: tokens.bg.surface,
  },
  bottomBtnLabel: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 13,
    color: tokens.text.mid,
  },
});
