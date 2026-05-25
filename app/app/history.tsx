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

import { CalendarMonthModal } from '@/components/CalendarMonthModal';
import { CoinIcon } from '@/components/CoinIcon';
import { CompleteTaskSheet } from '@/components/CompleteTaskSheet';
import { ScreenBackground } from '@/components/ScreenBackground';
import { SubStack } from '@/components/SubStack';
import { MonthGrid } from '@/components/MonthGrid';
import { TaskActionSheet } from '@/components/TaskActionSheet';
import { TaskCard } from '@/components/TaskCard';
import { XPCoinFloat } from '@/components/XPCoinFloat';
import { dateKeyFromLocal, useDailySummary, useDayDetail } from '@/lib/api/history';
import { useCompleteTask, useUndoCompletion } from '@/lib/api/tasks';
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

/**
 * When the visible month changes, pick a sensible selection inside the
 * new month:
 *   - If the new month is the current month → today.
 *   - Else try to preserve the previously-selected day-of-month.
 *   - Else fall back to day 1 of the new month.
 */
function pickSelectionInMonth(month: Date, prevSelected: Date): Date {
  const now = new Date();
  if (
    month.getFullYear() === now.getFullYear() &&
    month.getMonth() === now.getMonth()
  ) {
    return startOfDay(now);
  }
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const target = Math.min(prevSelected.getDate(), lastDay);
  return new Date(month.getFullYear(), month.getMonth(), target);
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

  // Heatmap range follows the visible month — the MonthGrid only needs
  // entries for the month it renders, so we fetch a tight window.
  const monthRange = useMemo(
    () => ({ from: startOfMonth(visibleMonth), to: endOfMonth(visibleMonth) }),
    [visibleMonth],
  );

  const summary = useDailySummary(monthRange.from, monthRange.to);
  const day = useDayDetail(selected);
  const completeTask = useCompleteTask();
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

  // Month navigation from the grid header. Selection follows the new
  // month — picks the same day-of-month when valid, falls back to the
  // first day, or to today when the new month is the current one.
  const handlePrevMonth = () => {
    const next = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1);
    setVisibleMonth(next);
    setSelected(pickSelectionInMonth(next, selected));
  };
  const handleNextMonth = () => {
    const next = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);
    if (next.getTime() > Date.now()) return; // never enter a future month
    setVisibleMonth(next);
    setSelected(pickSelectionInMonth(next, selected));
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
            <View style={styles.dayStatsRow}>
              <View style={styles.dayStat}>
                <Text style={styles.dayStatValue}>{day.data?.totalXp ?? 0}</Text>
                <Text style={styles.dayStatLabel}>XP</Text>
              </View>
              <View style={styles.dayStat}>
                <Text style={styles.dayStatValue}>
                  {day.data?.completions.length ?? 0}
                </Text>
                <Text style={styles.dayStatLabel}>tasks</Text>
              </View>
              <View style={styles.dayStat}>
                <Text style={[styles.dayStatValue, { color: tokens.semantic.coin }]}>
                  {day.data?.totalCoins ?? 0}
                </Text>
                <Text style={styles.dayStatLabel}>coins</Text>
              </View>
            </View>

            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Completed</Text>
              {day.data && day.data.completions.length > 0 && (
                <Text style={styles.sectionMeta}>long-press to undo</Text>
              )}
            </View>
            {day.data && day.data.completions.length > 0 ? (
              <View style={styles.list}>
                {day.data.completions.map((c) => (
                  <Pressable
                    key={c.id}
                    onLongPress={() =>
                      handleUndoCompletion(c.id, c.taskTitle, c.xpGranted, c.coinsGranted)
                    }
                    delayLongPress={500}
                    style={({ pressed }) => [
                      styles.completionCard,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <View style={styles.completionIcon}>
                      <Ionicons name="checkmark" size={18} color={tokens.semantic.xp} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                      <Text style={styles.completionTitle} numberOfLines={1}>
                        {c.taskTitle}
                      </Text>
                      <View style={styles.completionMetaRow}>
                        <Text style={styles.completionStars}>
                          {c.totalStars}★
                        </Text>
                        <Text style={styles.completionTime}>
                          {new Date(c.completedAt).toLocaleTimeString(undefined, {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>
                      {c.subs.length > 0 && (
                        <View style={styles.chipsRow}>
                          <SubStack
                            subIds={c.subs.map((s) => s.sub_id)}
                            max={3}
                            size={20}
                          />
                        </View>
                      )}
                    </View>
                    <View style={styles.completionRewards}>
                      <View style={styles.rewardItem}>
                        <Ionicons name="flash" size={11} color={tokens.semantic.xp} />
                        <Text style={[styles.rewardText, { color: tokens.semantic.xp }]}>
                          +{c.xpGranted}
                        </Text>
                      </View>
                      <View style={styles.rewardItem}>
                        <CoinIcon size={11} />
                        <Text style={[styles.rewardText, { color: tokens.semantic.coin }]}>
                          +{c.coinsGranted}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : (
              <View style={styles.emptyBox}>
                <Text style={styles.emptySub}>
                  Nothing logged for this day{isToday ? ' yet' : ''}.
                </Text>
              </View>
            )}

            {day.data && day.data.openTasks.length > 0 && (
              <>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>
                    {isToday ? 'Still open today' : 'Forgot something?'}
                  </Text>
                  <Text style={styles.sectionMeta}>tap to log</Text>
                </View>
                <View style={styles.openList}>
                  {/* Reuse the home TaskCard so retro-logging supports
                      the same swipe / sheet / long-press flows. Tap on
                      the violet check = quick log with default subs;
                      swipe right = open per-sub adjust sheet; long-
                      press = action menu (adjust / edit). Skip is
                      omitted — pulando um dia passado não faz sentido. */}
                  {day.data.openTasks.map(({ task }) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onComplete={() => handleRetroQuickComplete(task)}
                      onSwipeComplete={() => setSheetTask(task)}
                      onLongPress={() => setActionTask(task)}
                      onEdit={() =>
                        router.push({ pathname: '/task-form', params: { id: task.id } })
                      }
                    />
                  ))}
                </View>
              </>
            )}
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
        onSkipToday={() => setActionTask(null)} /* skip omitted on past days */
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
  dayStatsRow: {
    flexDirection: 'row',
    gap: tokens.space[3],
    marginBottom: tokens.space[5],
  },
  dayStat: {
    flex: 1,
    backgroundColor: tokens.bg.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.border.base,
    paddingVertical: tokens.space[4],
    alignItems: 'center',
    gap: 2,
  },
  dayStatValue: {
    ...tokens.type.h2,
    color: tokens.text.hi,
  },
  dayStatLabel: {
    ...tokens.type.caption,
    color: tokens.text.mid,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionTitle: {
    ...tokens.type.eyebrow,
    color: tokens.text.mid,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: tokens.space[3],
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: tokens.space[5],
    marginBottom: tokens.space[3],
  },
  sectionMeta: {
    ...tokens.type.caption,
    color: tokens.text.dim,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  list: {
    gap: tokens.space[2],
  },
  // Slightly larger gap between cards so the swipe action zone has
  // breathing room on each side.
  openList: {
    gap: tokens.space[2],
  },
  loadingBox: {
    paddingVertical: tokens.space[6],
    alignItems: 'center',
  },
  emptyBox: {
    paddingVertical: tokens.space[5],
    paddingHorizontal: tokens.space[4],
    alignItems: 'center',
    backgroundColor: tokens.bg.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.border.base,
    borderStyle: 'dashed',
  },
  emptySub: {
    ...tokens.type.body,
    color: tokens.text.mid,
    textAlign: 'center',
  },
  completionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    backgroundColor: tokens.bg.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.border.base,
    padding: tokens.space[3],
  },
  completionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(61, 214, 140, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completionTitle: {
    ...tokens.type.body,
    color: tokens.text.hi,
    fontFamily: 'Manrope_700Bold',
  },
  completionMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
  },
  completionStars: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 12,
    color: tokens.semantic.coin,
  },
  completionTime: {
    ...tokens.type.caption,
    color: tokens.text.dim,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
    marginTop: 2,
  },
  completionRewards: {
    alignItems: 'flex-end',
    gap: 4,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  rewardText: {
    ...tokens.type.caption,
    fontFamily: 'Manrope_700Bold',
  },
  openCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    backgroundColor: tokens.bg.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.border.base,
    borderStyle: 'dashed',
    padding: tokens.space[3],
  },
  openCardPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.99 }],
  },
  openCardCheck: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(123, 92, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  openTitle: {
    ...tokens.type.body,
    color: tokens.text.base,
    fontFamily: 'Manrope_700Bold',
  },
  partialBadge: {
    ...tokens.type.caption,
    color: tokens.brand.violet2,
    fontFamily: 'Manrope_700Bold',
    backgroundColor: 'rgba(123, 92, 255, 0.16)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: tokens.radius.pill,
  },
  recurrenceNote: {
    ...tokens.type.caption,
    color: tokens.text.dim,
    fontStyle: 'italic',
  },
});
