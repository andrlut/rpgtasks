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
  /** Number of weeks to render, ending on the week containing today. */
  weeks?: number;
  /** Currently selected day (local date). */
  selected: Date;
  /** Tapping any cell. */
  onSelect: (d: Date) => void;
}

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/**
 * Map an XP total to a 0-4 intensity bucket. Tuned for an early-stage
 * habit tracker — most "active" days will land between 30-200 XP.
 */
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

const CELL = 14;
const GAP = 4;
const COL_STRIDE = CELL + GAP;
const WEEKDAY_COL_WIDTH = 20;

export function XpHeatmap({ data, weeks = 13, selected, onSelect }: Props) {
  const grid = useMemo(() => buildGrid(weeks), [weeks]);
  const todayKey = dateKeyFromLocal(new Date());
  const selectedKey = dateKeyFromLocal(selected);

  // For each week column, decide if it should print a month label —
  // true if this week contains the 1st of a month, OR it's the very
  // first column of the grid.
  const monthLabels = useMemo(() => {
    return grid.weekColumns.map((week, colIdx) => {
      const firstDayOfMonth = week.find((d) => d.getDate() === 1);
      if (firstDayOfMonth) {
        return firstDayOfMonth.toLocaleString(undefined, { month: 'short' });
      }
      if (colIdx === 0 && week[0]) {
        return week[0].toLocaleString(undefined, { month: 'short' });
      }
      return null;
    });
  }, [grid.weekColumns]);

  return (
    <View>
      {/* Month strip: aligned with the grid columns via the same left
          offset (weekday column + small gap). */}
      <View style={styles.monthRow}>
        {monthLabels.map((label, colIdx) => (
          <View key={colIdx} style={styles.monthCell}>
            {label ? <Text style={styles.monthLabel}>{label}</Text> : null}
          </View>
        ))}
      </View>

      <View style={styles.gridRow}>
        <View style={styles.weekdayColumn}>
          {WEEKDAY_LABELS.map((l, i) => (
            <Text key={i} style={styles.weekdayLabel}>
              {l}
            </Text>
          ))}
        </View>

        <View style={styles.weeksWrap}>
          {grid.weekColumns.map((week, colIdx) => (
            <View key={colIdx} style={styles.weekCol}>
              {week.map((d, rowIdx) => {
                const key = dateKeyFromLocal(d);
                const xp = data?.get(key)?.totalXp ?? 0;
                const lvl = intensity(xp);
                const isToday = key === todayKey;
                const isSelected = key === selectedKey;
                const isFuture = d.getTime() > Date.now();
                return (
                  <Pressable
                    key={rowIdx}
                    onPress={() => !isFuture && onSelect(d)}
                    disabled={isFuture}
                    style={[
                      styles.cell,
                      {
                        backgroundColor: LEVEL_COLOR[lvl],
                        borderColor:
                          lvl === 0 ? tokens.border.base : 'transparent',
                      },
                      isToday && styles.cellToday,
                      isSelected && styles.cellSelected,
                      isFuture && styles.cellFuture,
                    ]}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </View>

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
 * Build a grid of `weeks` columns × 7 rows ending on the current week.
 * Row 0 = Sunday, row 6 = Saturday. Always returns full weeks (every
 * cell is a real Date — no nulls for the requested window).
 */
function buildGrid(weeks: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // End on the Saturday of the current week.
  const endSaturday = new Date(today);
  endSaturday.setDate(today.getDate() + (6 - today.getDay()));
  // Start on the Sunday `weeks - 1` weeks before that Saturday.
  const start = new Date(endSaturday);
  start.setDate(endSaturday.getDate() - (weeks * 7 - 1));

  const weekColumns: Date[][] = [];
  const cursor = new Date(start);
  for (let w = 0; w < weeks; w++) {
    const col: Date[] = [];
    for (let r = 0; r < 7; r++) {
      col.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weekColumns.push(col);
  }
  return { weekColumns };
}

const styles = StyleSheet.create({
  monthRow: {
    flexDirection: 'row',
    // Match the grid's left offset so labels line up over their column.
    marginLeft: WEEKDAY_COL_WIDTH,
    marginBottom: 6,
    height: 12,
  },
  monthCell: {
    width: COL_STRIDE,
    alignItems: 'flex-start',
    overflow: 'visible',
  },
  monthLabel: {
    ...tokens.type.caption,
    color: tokens.text.mid,
    fontSize: 10,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 0.3,
    // Allow longer month names (e.g. "Sept") to bleed into the next
    // column without clipping — the next column doesn't have a label.
    width: COL_STRIDE * 2,
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  weekdayColumn: {
    width: WEEKDAY_COL_WIDTH,
  },
  weekdayLabel: {
    ...tokens.type.caption,
    color: tokens.text.dim,
    fontSize: 9,
    height: COL_STRIDE,
    lineHeight: COL_STRIDE,
    textAlign: 'center',
    width: WEEKDAY_COL_WIDTH - 4,
  },
  weeksWrap: {
    flexDirection: 'row',
  },
  weekCol: {
    marginRight: GAP,
  },
  cell: {
    width: CELL,
    height: CELL,
    borderRadius: 3,
    marginBottom: GAP,
    borderWidth: 1,
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
    opacity: 0.25,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 10,
    paddingRight: 2,
  },
  legendText: {
    ...tokens.type.caption,
    color: tokens.text.dim,
    fontSize: 10,
  },
  legendCell: {
    width: 11,
    height: 11,
    borderRadius: 2,
    borderWidth: 1,
  },
});
