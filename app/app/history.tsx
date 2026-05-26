import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useT } from '@/lib/i18n';

import { BucketTabsV2, type BucketTabSpec } from '@/components/BucketTabsV2';
import { CalendarMonthModal } from '@/components/CalendarMonthModal';
import { CompletedBucket, type CompletedItem } from '@/components/CompletedBucket';
import { CompleteTaskSheet } from '@/components/CompleteTaskSheet';
import { DayStatsCard } from '@/components/DayStatsCard';
import { ScreenBackground } from '@/components/ScreenBackground';
import { MonthGrid } from '@/components/MonthGrid';
import { TaskActionSheet } from '@/components/TaskActionSheet';
import { TaskCard } from '@/components/TaskCard';
import { XPCoinFloat } from '@/components/XPCoinFloat';
import { dateKeyFromLocal, useDailySummary, useDayDetail } from '@/lib/api/history';
import {
  dimensionForSub,
  useCompleteTask,
  useSkipTaskToday,
  useUndoCompletion,
  useUnskipTaskToday,
} from '@/lib/api/tasks';
import { useLoadedSettings } from '@/lib/settings';
import { compareOneShotsByFreshness, isInTrophyWindow } from '@/lib/trophy';
import { confirmAction, showInfo } from '@/lib/util/confirm';
import type { TaskSub, TaskWithSubs } from '@/lib/db/types';
import { rewardForTaskSubs } from '@/lib/xp';
import { tokens } from '@/theme';

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

/** First day of `d`'s month at 00:00 local. */
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Last day of `d`'s month at 23:59:59 local. */
function endOfMonth(d: Date): Date {
  const e = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  e.setHours(23, 59, 59, 999);
  return e;
}

/** True if `a` and `b` fall in the same year + month. */
function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDay(d: Date): string {
  const today = startOfDay(new Date());
  const target = startOfDay(d);
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === -1) return 'Yesterday';
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export default function HistoryScreen() {
  const router = useRouter();
  const { t } = useT();
  const [selected, setSelected] = useState<Date>(() => startOfDay(new Date()));
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [calendarOpen, setCalendarOpen] = useState(false);
  // Sheets + floats — mirror the home so retro-logging on a past day
  // feels identical to logging today.
  const [sheetTask, setSheetTask] = useState<TaskWithSubs | null>(null);
  const [actionTask, setActionTask] = useState<TaskWithSubs | null>(null);
  const [floats, setFloats] = useState<{ id: number; xp: number; coins: number }[]>([]);

  // Bucket tabs: Daily / Weekly / One-shot, identical to home. Lets
  // the user retroactively log a weekly task on any day of its week
  // (e.g. "I forgot to mark tennis on Thursday — let me put it on
  // Friday"). Without the bucket switcher, weekly tasks were hidden
  // because we only showed scheduled days.
  type BucketTab = 'daily' | 'weekly' | 'oneshot';
  const [activeTab, setActiveTab] = useState<BucketTab>('daily');

  // Heatmap range follows the visible month — the MonthGrid only needs
  // entries for the month it renders, so we fetch a tight window.
  const monthRange = useMemo(
    () => ({ from: startOfMonth(visibleMonth), to: endOfMonth(visibleMonth) }),
    [visibleMonth],
  );

  const settings = useLoadedSettings();
  const summary = useDailySummary(monthRange.from, monthRange.to);
  const day = useDayDetail(selected, settings.weekStart);
  const completeTask = useCompleteTask();
  const skipTask = useSkipTaskToday();
  const unskipTask = useUnskipTaskToday();
  const undoCompletion = useUndoCompletion();

  const isToday = isSameDay(selected, new Date());
  const canGoNext = !isToday;

  const handlePrev = () => {
    setSelected((d) => {
      const next = addDays(d, -1);
      // When the day step crosses a month boundary, drag the visible
      // month with it so the grid keeps the selected cell on-screen.
      if (!isSameMonth(next, visibleMonth)) {
        setVisibleMonth(startOfMonth(next));
      }
      return next;
    });
  };
  const handleNext = () => {
    if (!canGoNext) return;
    setSelected((d) => {
      const next = addDays(d, 1);
      if (!isSameMonth(next, visibleMonth)) {
        setVisibleMonth(startOfMonth(next));
      }
      return next;
    });
  };

  // Month navigation from the grid header. We DON'T touch `selected`
  // here — the user explicitly asked to let them keep the previous
  // selection while browsing months. They'll either tap a day cell or
  // use the day chevrons to move the active selection.
  const handlePrevMonth = () => {
    const next = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1);
    setVisibleMonth(next);
  };
  const handleNextMonth = () => {
    const next = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);
    if (next.getTime() > Date.now()) return; // never enter a future month
    setVisibleMonth(next);
  };

  const today = new Date();
  const canGoNextMonth =
    visibleMonth.getFullYear() < today.getFullYear() ||
    (visibleMonth.getFullYear() === today.getFullYear() &&
      visibleMonth.getMonth() < today.getMonth());

  const handleUndoCompletion = async (
    completionId: string,
    title: string,
    xp: number,
    coins: number,
  ) => {
    const ok = await confirmAction(
      'Undo this completion?',
      `"${title}" — you'll lose +${xp} XP and +${coins} coins.`,
      { okText: 'Undo', cancelText: 'Keep it', destructive: true },
    );
    if (!ok) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    undoCompletion.mutate(completionId, {
      onError: (err) => {
        const e = err as { message?: string };
        showInfo('Could not undo', e.message ?? 'Unknown error.');
      },
    });
  };

  /**
   * Retro-completion shared by tap (default subs) and swipe (sheet-
   * adjusted subs). `subs` defaults to the task's own subs; pass a
   * different array to log with custom stars.
   *
   * No confirm dialog anymore — tapping the card OR swiping it
   * is itself the consent action. Errors still surface as alerts;
   * users can undo by long-pressing a completion.
   */
  const fireRetroCompletion = (task: TaskWithSubs, subs: TaskSub[]) => {
    if (completeTask.isPending) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    const reward = rewardForTaskSubs(subs);
    const fid = Date.now();
    setFloats((prev) => [
      ...prev,
      { id: fid, xp: reward.total.xp, coins: reward.total.coins },
    ]);

    const stamp = new Date(selected);
    stamp.setHours(12, 0, 0, 0); // noon local — sidesteps day-boundary timezone wobble.
    completeTask.mutate(
      {
        task,
        subs,
        completedAt: stamp.toISOString(),
        completedLocalDate: dateKeyFromLocal(selected),
      },
      {
        onError: (err) => {
          const e = err as { message?: string };
          showInfo('Could not log', e.message ?? 'Unknown error.');
        },
      },
    );
  };

  const handleRetroQuickComplete = (task: TaskWithSubs) => {
    fireRetroCompletion(task, task.subs);
  };

  const handleSheetConfirm = (subs: TaskSub[]) => {
    if (!sheetTask) return;
    const task = sheetTask;
    setSheetTask(null);
    fireRetroCompletion(task, subs);
  };

  const handleActionAdjust = () => {
    if (!actionTask) return;
    const task = actionTask;
    setActionTask(null);
    setSheetTask(task);
  };

  const handleActionEdit = () => {
    if (!actionTask) return;
    const task = actionTask;
    setActionTask(null);
    router.push({ pathname: '/task-form', params: { id: task.id } });
  };

  // Retro skip: marks task_skip for the SELECTED day, not today. The
  // user-facing distinction matches the home behavior (swipe-left
  // pulls the task into the Skipped drawer with the option to unskip).
  const dayKey = dateKeyFromLocal(selected);
  const handleSwipeSkip = (task: TaskWithSubs) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    skipTask.mutate(
      { taskId: task.id, date: dayKey },
      {
        onSuccess: () => day.refetch(),
        onError: (err) => {
          const e = err as { message?: string };
          showInfo('Could not skip', e.message ?? 'Unknown error.');
        },
      },
    );
  };
  const handleUnskip = (taskId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    unskipTask.mutate(
      { taskId, date: dayKey },
      {
        onSuccess: () => day.refetch(),
        onError: (err) => {
          const e = err as { message?: string };
          showInfo('Could not unskip', e.message ?? 'Unknown error.');
        },
      },
    );
  };
  const handleActionSkip = () => {
    if (!actionTask) return;
    const task = actionTask;
    setActionTask(null);
    handleSwipeSkip(task);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenBackground>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={summary.isRefetching || day.isRefetching}
            onRefresh={() => {
              summary.refetch();
              day.refetch();
            }}
            tintColor={tokens.brand.violet2}
          />
        }
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            style={({ pressed }) => [
              styles.backBtn,
              pressed && { opacity: 0.7 },
            ]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
          >
            <Ionicons name="chevron-back" size={22} color={tokens.text.hi} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>HISTORY</Text>
            <Text style={styles.title}>Your trail</Text>
          </View>
          <Pressable
            onPress={() => setCalendarOpen(true)}
            style={({ pressed }) => [
              styles.calendarBtn,
              pressed && { opacity: 0.7 },
            ]}
            hitSlop={8}
          >
            <Ionicons name="calendar-outline" size={22} color={tokens.text.hi} />
          </Pressable>
        </View>

        <View style={styles.heatmapCard}>
          {summary.isLoading ? (
            <View style={styles.heatmapLoading}>
              <ActivityIndicator color={tokens.brand.violet2} />
            </View>
          ) : (
            <MonthGrid
              data={summary.data}
              monthDate={visibleMonth}
              selected={selected}
              onSelectDay={(d) => {
                setSelected(d);
                if (!isSameMonth(d, visibleMonth)) {
                  setVisibleMonth(startOfMonth(d));
                }
              }}
              onPrevMonth={handlePrevMonth}
              onNextMonth={handleNextMonth}
              canGoNext={canGoNextMonth}
            />
          )}
        </View>

        <View style={styles.dayNav}>
          <Pressable
            onPress={handlePrev}
            style={({ pressed }) => [styles.navBtn, pressed && styles.navBtnPressed]}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={20} color={tokens.text.hi} />
          </Pressable>

          <View style={styles.dayLabelWrap}>
            <Text style={styles.dayLabel}>{formatDay(selected)}</Text>
            {!isToday && (
              <Pressable onPress={() => setSelected(startOfDay(new Date()))}>
                <Text style={styles.todayLink}>Today</Text>
              </Pressable>
            )}
          </View>

          <Pressable
            onPress={handleNext}
            disabled={!canGoNext}
            style={({ pressed }) => [
              styles.navBtn,
              pressed && canGoNext && styles.navBtnPressed,
              !canGoNext && styles.navBtnDisabled,
            ]}
            hitSlop={8}
          >
            <Ionicons
              name="chevron-forward"
              size={20}
              color={canGoNext ? tokens.text.hi : tokens.text.faint}
            />
          </Pressable>
        </View>

        {day.isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={tokens.brand.violet2} />
          </View>
        ) : (
          <>
            <DayStatsCard
              xp={day.data?.totalXp ?? 0}
              completed={day.data?.completions.length ?? 0}
              skipped={day.data?.skipped.length ?? 0}
            />

            {/* Bucket tabs — same vocabulary as home. Lets the user
                see weekly/one-shot candidates without leaving the day. */}
            {(() => {
              const openByBucket: Record<BucketTab, TaskWithSubs[]> = {
                daily: [],
                weekly: [],
                oneshot: [],
              };
              for (const { task } of day.data?.openTasks ?? []) {
                if (task.recurrence.type === 'daily') {
                  openByBucket.daily.push(task);
                } else if (task.recurrence.type === 'one_shot') {
                  openByBucket.oneshot.push(task);
                } else {
                  openByBucket.weekly.push(task);
                }
              }
              // Trophy sort — recently-completed one-shots sink to the
              // bottom. `now` is the selected day so the window logic
              // is relative to what the user is browsing, not today.
              openByBucket.oneshot.sort((a, b) =>
                compareOneShotsByFreshness(a, b, selected),
              );
              const tabSpecs: BucketTabSpec<BucketTab>[] = [
                { value: 'daily', label: t('home.bucketTabs.daily'), count: openByBucket.daily.length },
                { value: 'weekly', label: t('home.bucketTabs.weekly'), count: openByBucket.weekly.length },
                { value: 'oneshot', label: t('home.bucketTabs.oneshot'), count: openByBucket.oneshot.length },
              ];
              const activeList = openByBucket[activeTab];
              const emptyKey: Record<BucketTab, string> = {
                daily: 'home.bucketTabs.emptyDaily',
                weekly: 'home.bucketTabs.emptyWeekly',
                oneshot: 'home.bucketTabs.emptyOneshot',
              };
              const doneItems: CompletedItem[] = (day.data?.completions ?? []).map((c) => {
                // Hydrate a minimal task shim from the completion snapshot —
                // CompletedBucket only reads task.id, title, primary_sub_id,
                // primary_dimension_id for rendering.
                const sub = c.subs[0]?.sub_id;
                const task: TaskWithSubs = {
                  id: c.taskId,
                  character_id: '',
                  title: c.taskTitle,
                  description: null,
                  task_type: 'daily',
                  recurrence: { type: 'daily' },
                  target_count: 1,
                  is_archived: false,
                  created_at: '',
                  updated_at: '',
                  template_id: null,
                  icon: null,
                  subs: c.subs,
                  primary_sub_id: sub ?? ('sleep' as never),
                  primary_dimension_id: sub
                    ? dimensionForSub(sub)
                    : ('health' as never),
                  total_stars: c.totalStars,
                };
                return { task, completionId: c.id };
              });
              const skippedItems: CompletedItem[] = (day.data?.skipped ?? []).map(
                (task) => ({ task }),
              );
              return (
                <>
                  <BucketTabsV2<BucketTab>
                    tabs={tabSpecs}
                    value={activeTab}
                    onChange={setActiveTab}
                  />

                  <View style={styles.openList}>
                    {activeList.length === 0 ? (
                      <Text style={styles.tabEmpty}>{t(emptyKey[activeTab])}</Text>
                    ) : (
                      activeList.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          dimmed={isInTrophyWindow(task, selected)}
                          onComplete={() => handleRetroQuickComplete(task)}
                          onSwipeComplete={() => setSheetTask(task)}
                          onSkip={() => handleSwipeSkip(task)}
                          onLongPress={() => setActionTask(task)}
                          onEdit={() =>
                            router.push({ pathname: '/task-form', params: { id: task.id } })
                          }
                        />
                      ))
                    )}

                    <CompletedBucket
                      items={doneItems}
                      title={t('home.completedBucket.daily')}
                      onUndo={(completionId) =>
                        handleUndoCompletion(
                          completionId,
                          day.data?.completions.find((c) => c.id === completionId)?.taskTitle ?? '',
                          day.data?.completions.find((c) => c.id === completionId)?.xpGranted ?? 0,
                          day.data?.completions.find((c) => c.id === completionId)?.coinsGranted ?? 0,
                        )
                      }
                      onExtra={(task) => handleRetroQuickComplete(task)}
                    />
                    <CompletedBucket
                      items={skippedItems}
                      title={t('home.skippedBucket.today')}
                      variant="skipped"
                      onUnskip={handleUnskip}
                    />
                  </View>
                </>
              );
            })()}

          </>
        )}
      </ScrollView>
      </ScreenBackground>

      <CalendarMonthModal
        visible={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        onSelectDay={setSelected}
        selected={selected}
      />

      {/* XP/coin float that pops out of the screen on each retro
          completion — same component the Home uses. */}
      {floats.map((f) => (
        <XPCoinFloat
          key={f.id}
          xp={f.xp}
          coins={f.coins}
          onDone={() =>
            setFloats((prev) => prev.filter((x) => x.id !== f.id))
          }
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
  content: {
    padding: tokens.space[4],
    paddingBottom: tokens.space[8],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: tokens.space[3],
    paddingTop: tokens.space[2],
    paddingBottom: tokens.space[4],
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: tokens.bg.surface,
    borderWidth: 1,
    borderColor: tokens.border.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: tokens.bg.surface,
    borderWidth: 1,
    borderColor: tokens.border.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    ...tokens.type.eyebrow,
    color: tokens.text.dim,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    ...tokens.type.h1,
    color: tokens.text.hi,
    marginTop: 2,
  },
  heatmapCard: {
    backgroundColor: tokens.bg.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.border.base,
    padding: tokens.space[4],
    marginBottom: tokens.space[5],
  },
  heatmapLoading: {
    paddingVertical: tokens.space[6],
    alignItems: 'center',
  },
  dayNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: tokens.space[4],
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: tokens.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: tokens.border.base,
  },
  navBtnPressed: {
    opacity: 0.6,
    transform: [{ scale: 0.95 }],
  },
  navBtnDisabled: {
    opacity: 0.4,
  },
  dayLabelWrap: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  dayLabel: {
    ...tokens.type.h2,
    color: tokens.text.hi,
  },
  todayLink: {
    ...tokens.type.caption,
    color: tokens.brand.violet2,
    fontFamily: 'Manrope_700Bold',
  },
  // Slightly larger gap between cards so the swipe action zone has
  // breathing room on each side.
  openList: {
    gap: tokens.space[2],
    marginTop: tokens.space[3],
  },
  tabEmpty: {
    ...tokens.type.caption,
    color: tokens.text.dim,
    fontStyle: 'italic',
    paddingVertical: tokens.space[4],
    textAlign: 'center',
  },
  loadingBox: {
    paddingVertical: tokens.space[6],
    alignItems: 'center',
  },
});
