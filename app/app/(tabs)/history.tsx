import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
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

import { DifficultyStars } from '@/components/DifficultyStars';
import { DimensionChip } from '@/components/DimensionChip';
import { XpHeatmap } from '@/components/XpHeatmap';
import { useDailySummary, useDayDetail } from '@/lib/api/history';
import { useCompleteTask, useUndoCompletion } from '@/lib/api/tasks';
import { confirmAction, showInfo } from '@/lib/util/confirm';
import type { TaskWithDimensions } from '@/lib/db/types';
import { describeRecurrence } from '@/lib/recurrence';
import { rewardForDifficulty } from '@/lib/xp';
import { tokens } from '@/theme';

const HEATMAP_WEEKS = 13;

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
  const [selected, setSelected] = useState<Date>(() => startOfDay(new Date()));

  // Heatmap range: anchor on `selected` so users browsing the past
  // can still see grid context.
  const heatmapRange = useMemo(() => {
    const end = startOfDay(new Date());
    const start = addDays(end, -(HEATMAP_WEEKS * 7 - 1));
    return { from: start, to: end };
  }, []);

  const summary = useDailySummary(heatmapRange.from, heatmapRange.to);
  const day = useDayDetail(selected);
  const completeTask = useCompleteTask();
  const undoCompletion = useUndoCompletion();

  const isToday = isSameDay(selected, new Date());
  const canGoNext = !isToday;

  const handlePrev = () => setSelected((d) => addDays(d, -1));
  const handleNext = () => {
    if (canGoNext) setSelected((d) => addDays(d, 1));
  };

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

  const handleRetroComplete = async (task: TaskWithDimensions) => {
    const reward = rewardForDifficulty(task.difficulty);
    const ok = await confirmAction(
      'Log retroactively?',
      `Mark "${task.title}" as done on ${formatDay(selected)}? You'll earn +${reward.xp} XP and +${reward.coins} coins.`,
      { okText: 'Log it', cancelText: 'Cancel' },
    );
    if (!ok) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    // Stamp at noon local time on the selected day — avoids ambiguity
    // at day boundaries.
    const stamp = new Date(selected);
    stamp.setHours(12, 0, 0, 0);
    completeTask.mutate(
      {
        taskId: task.id,
        expectedXp: reward.xp,
        expectedCoins: reward.coins,
        dimensions: task.dimensions,
        completedAt: stamp.toISOString(),
      },
      {
        onError: (err) => {
          const e = err as { message?: string };
          showInfo('Could not log', e.message ?? 'Unknown error.');
        },
      },
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
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
          <Text style={styles.eyebrow}>HISTORY</Text>
          <Text style={styles.title}>Your trail</Text>
        </View>

        <View style={styles.heatmapCard}>
          {summary.isLoading ? (
            <View style={styles.heatmapLoading}>
              <ActivityIndicator color={tokens.brand.violet2} />
            </View>
          ) : (
            <XpHeatmap
              data={summary.data}
              weeks={HEATMAP_WEEKS}
              selected={selected}
              onSelect={setSelected}
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
                        <DifficultyStars difficulty={c.difficulty} />
                        <Text style={styles.completionTime}>
                          {new Date(c.completedAt).toLocaleTimeString(undefined, {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>
                      {c.dimensions.length > 0 && (
                        <View style={styles.chipsRow}>
                          {c.dimensions.map((d) => (
                            <DimensionChip key={d} id={d} size="sm" pressable={false} />
                          ))}
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
                        <Ionicons name="ellipse" size={9} color={tokens.semantic.coin} />
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
                <View style={styles.list}>
                  {day.data.openTasks.map(({ task, completedThisDay }) => {
                    const r = rewardForDifficulty(task.difficulty);
                    const isPartial =
                      task.target_count > 1 && completedThisDay > 0;
                    const showRecurrenceNote =
                      task.recurrence.type !== 'daily' || task.target_count > 1;
                    return (
                      <Pressable
                        key={task.id}
                        onPress={() => handleRetroComplete(task)}
                        style={({ pressed }) => [
                          styles.openCard,
                          pressed && styles.openCardPressed,
                        ]}
                      >
                        <View style={styles.openCardCheck}>
                          <Ionicons name="add" size={18} color={tokens.brand.violet2} />
                        </View>
                        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                          <Text style={styles.openTitle} numberOfLines={1}>
                            {task.title}
                          </Text>
                          <View style={styles.completionMetaRow}>
                            <DifficultyStars difficulty={task.difficulty} />
                            {isPartial && (
                              <Text style={styles.partialBadge}>
                                {completedThisDay} / {task.target_count} done
                              </Text>
                            )}
                          </View>
                          {showRecurrenceNote && (
                            <Text style={styles.recurrenceNote} numberOfLines={1}>
                              {describeRecurrence(task.recurrence, task.target_count)}
                            </Text>
                          )}
                          {task.dimensions.length > 0 && (
                            <View style={styles.chipsRow}>
                              {task.dimensions.map((d) => (
                                <DimensionChip
                                  key={d}
                                  id={d}
                                  size="sm"
                                  pressable={false}
                                />
                              ))}
                            </View>
                          )}
                        </View>
                        <View style={styles.completionRewards}>
                          <View style={styles.rewardItem}>
                            <Ionicons name="flash" size={11} color={tokens.semantic.xp} />
                            <Text
                              style={[styles.rewardText, { color: tokens.semantic.xp }]}
                            >
                              +{r.xp}
                            </Text>
                          </View>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.bg.base },
  content: {
    padding: tokens.space[4],
    paddingBottom: tokens.layout.bottomNavClearance,
  },
  header: {
    paddingTop: tokens.space[2],
    paddingBottom: tokens.space[4],
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
