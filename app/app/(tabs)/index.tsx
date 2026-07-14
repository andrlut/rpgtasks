import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import { MoodCheckinPrompt } from '@/components/MoodCheckinPrompt';
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
import { TourModule } from '@/components/tour/TourModule';
import { emitTourEvent } from '@/lib/tour/eventBus';
import { buildM1Steps, M1_EVENTS } from '@/lib/tour/m1Steps';
import { buildM2Steps, M2_EVENTS } from '@/lib/tour/m2Steps';
import { buildM3Steps } from '@/lib/tour/m3Steps';
import { buildM4Steps } from '@/lib/tour/m4Steps';
import { buildM5Steps } from '@/lib/tour/m5Steps';
import { buildM6Steps } from '@/lib/tour/m6Steps';
import {
  useActiveTourStep,
  useIsCurrentTourModule,
  useTourStore,
} from '@/lib/tour/store';
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
  const navClearance = useBottomNavClearance();
  // While a bottom-positioned tour tooltip is visible, the Home scroll
  // needs extra room so the user can scroll content above the overlay
  // — but only just enough that the relevant section (e.g. M1 step 5
  // "Concluídas hoje" drawer) settles in the open space JUST above
  // the tooltip card. 160px ≈ card height minus the navbar already
  // baked into navClearance; matches the visible gap users expected
  // when testing M1 step 5.
  const activeTourStep = useActiveTourStep();
  // M2 step 1 spotlights the "Gerenciar tarefas" button — the very last
  // row of the scroll. It needs more bottom room than the M1 drawer
  // (which is mid-list) so the button clears the full tooltip card
  // height once we scroll to the end.
  const tourBottomBump =
    activeTourStep?.position === 'bottom'
      ? activeTourStep.module === 'M2'
        ? 245
        : 160
      : 0;
  const bottomClearance = navClearance + tourBottomBump;
  const isM1Current = useIsCurrentTourModule('M1');
  const isM2Current = useIsCurrentTourModule('M2');
  const isM3Current = useIsCurrentTourModule('M3');
  const isM4Current = useIsCurrentTourModule('M4');
  const isM5Current = useIsCurrentTourModule('M5');
  const isM6Current = useIsCurrentTourModule('M6');

  // M6 completes (or is skipped) → the always-runs Wrap-up. Guard on the
  // wrap module still being pending so an isolated M6 replay (which marks
  // wrap completed) just returns Home instead of replaying the closer.
  const finishM6 = () => {
    const wrapPending =
      (useTourStore.getState().modules.wrap?.status ?? 'pending') === 'pending';
    if (wrapPending) router.push('/tour/wrap');
    else router.navigate('/(tabs)');
  };

  // Tour auto-scroll on Home:
  //   - M2 step 1 targets the bottom-most "Gerenciar tarefas" button →
  //     scroll to the END so it settles in the gap above the tooltip.
  //   - M3 step 1 targets the quest chips strip near the TOP → scroll to
  //     the top so the strip is in view (the user may be scrolled down
  //     after finishing M2 on the create form).
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    if (activeTourStep?.module === 'M2') {
      const id = setTimeout(
        () => scrollRef.current?.scrollToEnd({ animated: true }),
        120,
      );
      return () => clearTimeout(id);
    }
    if (activeTourStep?.module === 'M3') {
      const id = setTimeout(
        () => scrollRef.current?.scrollTo({ y: 0, animated: true }),
        120,
      );
      return () => clearTimeout(id);
    }
  }, [activeTourStep?.module]);

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
        onSuccess: () => {
          emitTourEvent(M1_EVENTS.TASK_COMPLETED);
        },
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
    emitTourEvent(M1_EVENTS.TASK_LONG_PRESSED);
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
        ref={scrollRef}
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
                    onEdit={() => {
                      emitTourEvent(M1_EVENTS.TASK_TAPPED);
                      router.push({ pathname: '/task-form', params: { id: task.id } });
                    }}
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
                onToggle={(open) => {
                  if (open) emitTourEvent(M1_EVENTS.DRAWER_EXPANDED);
                }}
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
                onPress={() => {
                  emitTourEvent(M2_EVENTS.TASKS_NAVIGATED);
                  router.push('/tasks');
                }}
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

      <MoodCheckinPrompt enabled={!activeTourStep} />

      {/* Post-login tour — M1 (Tasks). Only renders when the user has
         tasks visible behind the spotlight and M1 is the current
         (first-unfinished) module — keeps later modules from leaking
         their tooltips onto Home before their turn. */}
      <TourModule
        module="M1"
        steps={buildM1Steps(t)}
        enabled={isM1Current && (allActiveTasks.data?.length ?? 0) > 0}
      />

      {/* M2 step 1 lives here (manage-tasks button). Tapping the real
         button fires TASKS_NAVIGATED + navigates; if the user instead
         taps Próximo / "Pular este passo" on the tooltip, walk them to
         /tasks ourselves so step 2 has its surface. */}
      <TourModule
        module="M2"
        steps={buildM2Steps(t)}
        enabled={isM2Current}
        onAdvanceToNextScreen={() => router.push('/tasks')}
      />

      {/* M3 step 1 lives here (quest chips strip). Tapping "+ Missões"
         fires QUESTS_NAVIGATED + navigates; Próximo / skip walks the
         user to /quests so step 2 has its surface. */}
      <TourModule
        module="M3"
        steps={buildM3Steps(t)}
        enabled={isM3Current}
        onAdvanceToNextScreen={() => router.push('/quests')}
      />

      {/* M4 step 1 lives here (Rewards bottom-nav tab). Switching to the
         Rewards tab fires REWARDS_NAVIGATED from that screen; Próximo /
         skip switches there ourselves so steps 2-3 have their surface. */}
      <TourModule
        module="M4"
        steps={buildM4Steps(t)}
        enabled={isM4Current}
        onAdvanceToNextScreen={() => router.navigate('/(tabs)/rewards')}
      />

      {/* M5 step 1 lives here (Eu/Hero bottom-nav tab). Switching to the
         Hero tab fires ME_NAVIGATED from that screen; Próximo / skip
         switches there ourselves so steps 2-5 have their surface. */}
      <TourModule
        module="M5"
        steps={buildM5Steps(t)}
        enabled={isM5Current}
        onAdvanceToNextScreen={() => router.navigate('/(tabs)/character')}
      />

      {/* M6 step 1 lives here (Learn bottom-nav tab). Switching to the
         Learn tab fires LEARN_NAVIGATED from that screen. Skipping at
         this step ends M6 → Wrap-up (finishM6). */}
      <TourModule
        module="M6"
        steps={buildM6Steps(t)}
        enabled={isM6Current}
        onAdvanceToNextScreen={() => router.navigate('/(tabs)/learning')}
        onComplete={finishM6}
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
