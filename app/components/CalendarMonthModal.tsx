import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { dateKeyFromLocal, useDailySummary } from '@/lib/api/history';
import { tokens } from '@/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Called when user picks a day. The modal closes itself afterwards. */
  onSelectDay: (d: Date) => void;
  /** Day to highlight as the active selection. */
  selected: Date;
}

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function startOfMonth(d: Date): Date {
  const x = new Date(d);
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfMonth(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  x.setHours(23, 59, 59, 999);
  return x;
}

function addMonths(d: Date, n: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function CalendarMonthModal({ visible, onClose, onSelectDay, selected }: Props) {
  // Track which month is currently being browsed. Defaults to the
  // selected day's month each time the modal opens.
  const [cursorMonth, setCursorMonth] = useState<Date>(() => startOfMonth(selected));

  // Re-anchor when modal re-opens
  useMemo(() => {
    if (visible) setCursorMonth(startOfMonth(selected));
  }, [visible, selected]);

  // Fetch the visible month's daily summary (one query per month browsed).
  const monthRange = useMemo(
    () => ({ from: startOfMonth(cursorMonth), to: endOfMonth(cursorMonth) }),
    [cursorMonth],
  );
  const summary = useDailySummary(monthRange.from, monthRange.to);

  const grid = useMemo(() => buildMonthGrid(cursorMonth), [cursorMonth]);
  const today = new Date();

  const monthLabel = cursorMonth.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  const handleSelect = (d: Date) => {
    onSelectDay(d);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
            hitSlop={8}
          >
            <Ionicons name="close" size={22} color={tokens.text.hi} />
          </Pressable>
          <Text style={styles.title}>Calendar</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.monthNav}>
          <Pressable
            onPress={() => setCursorMonth((m) => addMonths(m, -1))}
            style={({ pressed }) => [styles.navBtn, pressed && { opacity: 0.6 }]}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={20} color={tokens.text.hi} />
          </Pressable>
          <Text style={styles.monthLabel}>{monthLabel}</Text>
          <Pressable
            onPress={() => setCursorMonth((m) => addMonths(m, 1))}
            style={({ pressed }) => [styles.navBtn, pressed && { opacity: 0.6 }]}
            hitSlop={8}
            disabled={cursorMonth.getMonth() === today.getMonth() && cursorMonth.getFullYear() === today.getFullYear()}
          >
            <Ionicons
              name="chevron-forward"
              size={20}
              color={
                cursorMonth.getMonth() === today.getMonth() &&
                cursorMonth.getFullYear() === today.getFullYear()
                  ? tokens.text.faint
                  : tokens.text.hi
              }
            />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.weekdayHeader}>
            {WEEKDAY_LABELS.map((l, i) => (
              <Text key={i} style={styles.weekdayLabel}>
                {l}
              </Text>
            ))}
          </View>

          {grid.map((week, wi) => (
            <View key={wi} style={styles.weekRow}>
              {week.map((cell, ci) => {
                if (!cell) {
                  return <View key={ci} style={styles.cellPlaceholder} />;
                }
                const key = dateKeyFromLocal(cell);
                const entry = summary.data?.get(key);
                const xp = entry?.totalXp ?? 0;
                const isToday = isSameDay(cell, today);
                const isSelected = isSameDay(cell, selected);
                const isFuture = cell.getTime() > today.getTime() && !isToday;
                return (
                  <Pressable
                    key={key}
                    onPress={() => !isFuture && handleSelect(cell)}
                    disabled={isFuture}
                    style={[
                      styles.cell,
                      xp > 0 && styles.cellHasActivity,
                      isToday && styles.cellToday,
                      isSelected && styles.cellSelected,
                      isFuture && styles.cellFuture,
                    ]}
                  >
                    <Text style={styles.cellDay}>{cell.getDate()}</Text>
                    {xp > 0 && (
                      <View style={styles.cellDot} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          ))}

          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, styles.cellToday]} />
              <Text style={styles.legendText}>Today</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, styles.cellSelected]} />
              <Text style={styles.legendText}>Selected</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, styles.cellHasActivity]} />
              <Text style={styles.legendText}>Activity</Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

/**
 * Build a 6×7 grid for the month containing `anchor`. Returns null for
 * leading/trailing cells outside the month, so the caller can render them
 * as empty slots and keep the day numbers aligned to weekday columns.
 */
function buildMonthGrid(anchor: Date): (Date | null)[][] {
  const first = startOfMonth(anchor);
  const last = endOfMonth(anchor);
  const leading = first.getDay(); // 0=Sun..6=Sat
  const totalCells = leading + last.getDate();
  const rows = Math.ceil(totalCells / 7);
  const grid: (Date | null)[][] = [];
  let dayCounter = 1;
  for (let r = 0; r < rows; r++) {
    const row: (Date | null)[] = [];
    for (let c = 0; c < 7; c++) {
      const cellIndex = r * 7 + c;
      if (cellIndex < leading || dayCounter > last.getDate()) {
        row.push(null);
      } else {
        row.push(new Date(anchor.getFullYear(), anchor.getMonth(), dayCounter));
        dayCounter += 1;
      }
    }
    grid.push(row);
  }
  return grid;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.bg.base },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[3],
    borderBottomWidth: 1,
    borderBottomColor: tokens.border.base,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.bg.surface,
  },
  title: {
    ...tokens.type.h3,
    color: tokens.text.hi,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[3],
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: tokens.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    ...tokens.type.h3,
    color: tokens.text.hi,
    textTransform: 'capitalize',
  },
  scroll: {
    paddingHorizontal: tokens.space[4],
    paddingBottom: tokens.space[8],
  },
  weekdayHeader: {
    flexDirection: 'row',
    marginBottom: tokens.space[2],
  },
  weekdayLabel: {
    flex: 1,
    ...tokens.type.caption,
    color: tokens.text.dim,
    fontSize: 11,
    textAlign: 'center',
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 0.3,
  },
  weekRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  cell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: tokens.border.base,
    backgroundColor: tokens.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellPlaceholder: {
    flex: 1,
    aspectRatio: 1,
  },
  cellHasActivity: {
    backgroundColor: 'rgba(123, 92, 255, 0.18)',
    borderColor: 'rgba(123, 92, 255, 0.35)',
  },
  cellToday: {
    borderColor: tokens.text.hi,
    borderWidth: 2,
  },
  cellSelected: {
    borderColor: tokens.semantic.coin,
    borderWidth: 2,
  },
  cellFuture: {
    opacity: 0.3,
  },
  cellDay: {
    ...tokens.type.body,
    color: tokens.text.hi,
    fontFamily: 'Manrope_700Bold',
  },
  cellDot: {
    position: 'absolute',
    bottom: 5,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: tokens.brand.violet,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: tokens.space[5],
    marginTop: tokens.space[6],
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendSwatch: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: tokens.border.base,
    backgroundColor: tokens.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendText: {
    ...tokens.type.caption,
    color: tokens.text.mid,
  },
});
