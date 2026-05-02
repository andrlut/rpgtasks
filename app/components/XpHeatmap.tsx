import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  dateKeyFromLocal,
  type DailySummaryEntry,
} from '@/lib/api/history';
import { tokens } from '@/theme';

interface Props {
  /** Map keyed by `YYYY-MM-DD` local-day → that day's totals. */
  data: Map<string, DailySummaryEntry> | undefined;
  /** Number of weeks to render, ending on the week containing today.
   * Defaults to 5 (the last 4 weeks + the current week). */
  weeks?: number;
  /** Currently selected day (local date). */
  selected: Date;
  /** Tapping any cell. */
  onSelect: (d: Date) => void;
}

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** XP → 0-4 intensity bucket. Tuned for early-stage habit tracker. */
function intensity(xp: number): 0 | 1 | 2 | 3 | 4 {
  if (xp <= 0) return 0;
  if (xp < 30) return 1;
  if (xp < 100) return 2;
  if (xp < 200) return 3;
  return 4;
}

const LEVEL_COLOR: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'transparent',
  1: 'rgba(123, 92, 255, 0.22)',
  2: 'rgba(123, 92, 255, 0.45)',
  3: 'rgba(123, 92, 255, 0.72)',
  4: tokens.brand.violet,
};

/**
 * Compact 5-week × 7-day grid ending on the current week.
 * Columns are days of the week (Sun-Sat). Rows are weeks (oldest at top,
 * current week at the bottom). Cells flex to the available width so they
 * scale with the container.
 */
export function XpHeatmap({ data, weeks = 5, selected, onSelect }: Props) {
  const rows = useMemo(() => buildRows(weeks), [weeks]);
  const todayKey = dateKeyFromLocal(new Date());
  const selectedKey = dateKeyFromLocal(selected);

  return (
    <View>
      <View style={styles.weekdayHeader}>
        {WEEKDAY_LABELS.map((l, i) => (
          <Text key={i} style={styles.weekdayLabel}>
            {l}
          </Text>
        ))}
      </View>

      {rows.map((week, rowIdx) => (
        <View key={rowIdx} style={styles.weekRow}>
          {week.map((d) => {
            const key = dateKeyFromLocal(d);
            const xp = data?.get(key)?.totalXp ?? 0;
            const lvl = intensity(xp);
            const isToday = key === todayKey;
            const isSelected = key === selectedKey;
            const isFuture = d.getTime() > Date.now();
            return (
              <Pressable
                key={key}
                onPress={() => !isFuture && onSelect(d)}
                disabled={isFuture}
                style={[
                  styles.cell,
                  {
                    backgroundColor: LEVEL_COLOR[lvl],
                    borderColor: lvl === 0 ? tokens.border.base : 'transparent',
                  },
                  isToday && styles.cellToday,
                  isSelected && styles.cellSelected,
                  isFuture && styles.cellFuture,
                ]}
              >
                <Text style={[styles.dayNum, isFuture && { opacity: 0.4 }]}>
                  {d.getDate()}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}

      <View style={styles.legendRow}>
        <Text style={styles.legendText}>Less</Text>
        {[0, 1, 2, 3, 4].map((l) => (
          <View
            key={l}
            style={[
              styles.legendCell,
              {
                backgroundColor: LEVEL_COLOR[l as 0 | 1 | 2 | 3 | 4],
                borderColor: l === 0 ? tokens.border.base : 'transparent',
              },
            ]}
          />
        ))}
        <Text style={styles.legendText}>More</Text>
      </View>
    </View>
  );
}

/**
 * Build `weeks` rows of 7 days each. Last row is the week containing
 * today. Earlier rows go backwards.
 */
function buildRows(weeks: number): Date[][] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Sunday of the current week
  const currentWeekStart = new Date(today);
  currentWeekStart.setDate(today.getDate() - today.getDay());

  // Sunday of the oldest week we want to show
  const start = new Date(currentWeekStart);
  start.setDate(currentWeekStart.getDate() - (weeks - 1) * 7);

  const rows: Date[][] = [];
  const cursor = new Date(start);
  for (let w = 0; w < weeks; w++) {
    const row: Date[] = [];
    for (let d = 0; d < 7; d++) {
      row.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    rows.push(row);
  }
  return rows;
}

const styles = StyleSheet.create({
  weekdayHeader: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekdayLabel: {
    flex: 1,
    ...tokens.type.caption,
    color: tokens.text.dim,
    fontSize: 10,
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
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNum: {
    ...tokens.type.caption,
    color: tokens.text.hi,
    fontSize: 11,
    fontFamily: 'Manrope_700Bold',
  },
  cellToday: {
    borderColor: tokens.text.hi,
    borderWidth: 1.5,
  },
  cellSelected: {
    borderColor: tokens.semantic.coin,
    borderWidth: 2,
  },
  cellFuture: {
    opacity: 0.3,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 5,
    marginTop: 8,
  },
  legendText: {
    ...tokens.type.caption,
    color: tokens.text.dim,
    fontSize: 10,
  },
  legendCell: {
    width: 12,
    height: 12,
    borderRadius: 3,
    borderWidth: 1,
  },
});
