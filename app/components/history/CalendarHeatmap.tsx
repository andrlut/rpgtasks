import * as Haptics from 'expo-haptics';
import { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { WeekStart } from '@/lib/settings';
import { tokens } from '@/theme';

import { dayKey } from '@/lib/api/dedicacaoHistory';

interface Props {
  from: Date;
  to: Date;
  /** Pre-bucketed XP per day (key = local YYYY-MM-DD). */
  dailyTotals: Map<string, number>;
  /** Peak day's XP — drives color ramp. Pass 0 to render all cells as empty. */
  dailyMax: number;
  weekStart: WeekStart;
  onCellPress?: (date: Date, xp: number) => void;
  /** Optional accent — falls back to brand violet. Lets the heatmap re-skin
   *  when the screen is filtered to a single dim. */
  accent?: string;
}

const CELL = 12;
const GAP = 3;

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(d.getDate() + n);
  return out;
}

function startOfWeek(d: Date, weekStart: WeekStart): Date {
  const out = startOfDay(d);
  const dow = out.getDay();
  const offset = weekStart === 'sunday' ? dow : (dow + 6) % 7;
  out.setDate(out.getDate() - offset);
  return out;
}

/**
 * GitHub-style contribution heatmap. Weeks render as columns, days as rows
 * (top row = first day of the user's week per settings). Each cell is
 * colored by the share of that day's XP relative to the peak day in the
 * filtered window.
 *
 * Filters live in the parent; this component is a pure render of the
 * already-bucketed `dailyTotals`. When filters change, the parent re-runs
 * the aggregation and the heatmap reflects it.
 *
 * Always wraps in a horizontal ScrollView — the dimensions of "Mês" (4-5
 * weeks) fit on screen, "Trimestre" (12 weeks) too, but "Total" (52 weeks)
 * needs to scroll.
 */
export function CalendarHeatmap({
  from,
  to,
  dailyTotals,
  dailyMax,
  weekStart,
  onCellPress,
  accent = tokens.brand.violet2,
}: Props) {
  const gridStart = useMemo(
    () => startOfWeek(from, weekStart),
    [from, weekStart],
  );

  const weeks = useMemo(() => {
    // How many full weeks (columns) span the range? Inclusive of the
    // partial end-week so the last day shows up.
    const totalDays =
      Math.floor((startOfDay(to).getTime() - gridStart.getTime()) / 86400000) +
      1;
    const colCount = Math.max(1, Math.ceil(totalDays / 7));
    const out: { date: Date; key: string; inRange: boolean; xp: number }[][] = [];
    for (let w = 0; w < colCount; w++) {
      const col: { date: Date; key: string; inRange: boolean; xp: number }[] = [];
      for (let d = 0; d < 7; d++) {
        const date = addDays(gridStart, w * 7 + d);
        const key = dayKey(date);
        const inRange =
          date >= startOfDay(from) && date <= startOfDay(to);
        col.push({ date, key, inRange, xp: dailyTotals.get(key) ?? 0 });
      }
      out.push(col);
    }
    return out;
  }, [gridStart, to, from, dailyTotals]);

  // Color ramp — bucket XP into 4 visible levels above zero.
  const colorForXp = (xp: number, inRange: boolean): string => {
    if (!inRange) return 'transparent';
    if (xp <= 0) return 'rgba(255,255,255,0.05)';
    if (dailyMax <= 0) return 'rgba(255,255,255,0.05)';
    const ratio = xp / dailyMax;
    if (ratio <= 0.25) return `${accent}33`;
    if (ratio <= 0.5) return `${accent}66`;
    if (ratio <= 0.75) return `${accent}AA`;
    return accent;
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
    >
      <View style={styles.grid}>
        {weeks.map((col, ci) => (
          <View key={ci} style={styles.col}>
            {col.map((cell) => {
              const bg = colorForXp(cell.xp, cell.inRange);
              return (
                <Pressable
                  key={cell.key}
                  onPress={
                    cell.inRange
                      ? () => {
                          Haptics.selectionAsync().catch(() => {});
                          onCellPress?.(cell.date, cell.xp);
                        }
                      : undefined
                  }
                  style={({ pressed }) => [
                    styles.cell,
                    { backgroundColor: bg },
                    cell.inRange &&
                      cell.xp > 0 && {
                        borderColor: 'rgba(255,255,255,0.08)',
                        borderWidth: StyleSheet.hairlineWidth,
                      },
                    pressed && cell.inRange && { opacity: 0.6 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${cell.key} ${cell.xp} XP`}
                  hitSlop={1}
                />
              );
            })}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// Legend swatches sized to match the cells so the visual budget aligns.
export function HeatmapLegend({
  accent = tokens.brand.violet2,
  weekStart: _weekStart,
}: {
  accent?: string;
  weekStart?: WeekStart;
}) {
  const stops = [
    'rgba(255,255,255,0.05)',
    `${accent}33`,
    `${accent}66`,
    `${accent}AA`,
    accent,
  ];
  return (
    <View style={styles.legend}>
      <Text style={styles.legendText}>menos</Text>
      <View style={styles.legendCells}>
        {stops.map((c, i) => (
          <View
            key={i}
            style={[styles.legendCell, { backgroundColor: c }]}
          />
        ))}
      </View>
      <Text style={styles.legendText}>mais</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingVertical: 4,
  },
  grid: {
    flexDirection: 'row',
    gap: GAP,
  },
  col: {
    gap: GAP,
  },
  cell: {
    width: CELL,
    height: CELL,
    borderRadius: 3,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    marginTop: 6,
  },
  legendText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10,
    color: tokens.text.dim,
    letterSpacing: 0.3,
  },
  legendCells: {
    flexDirection: 'row',
    gap: 2,
  },
  legendCell: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
});
