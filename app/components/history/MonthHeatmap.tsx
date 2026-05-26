import * as Haptics from 'expo-haptics';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { dayKey } from '@/lib/api/dedicacaoHistory';
import type { WeekStart } from '@/lib/settings';
import { tokens } from '@/theme';

interface Props {
  from: Date;
  to: Date;
  /** Pre-bucketed XP per day (key = local YYYY-MM-DD). */
  dailyTotals: Map<string, number>;
  /** Peak day's XP — drives the color ramp. */
  dailyMax: number;
  weekStart: WeekStart;
  onCellPress?: (date: Date, xp: number, hasEntries: boolean) => void;
  /** Optional accent — falls back to brand violet. */
  accent?: string;
  /** Currently highlighted day, if any. */
  selectedKey?: string | null;
}

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

const WEEKDAY_LABELS_SUN = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const WEEKDAY_LABELS_MON = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
const WEEKDAY_LABELS_EN_SUN = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const WEEKDAY_LABELS_EN_MON = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

interface Cell {
  date: Date;
  key: string;
  xp: number;
  inRange: boolean;
  isFuture: boolean;
}

/**
 * Finger-friendly day grid. Adapts to the input range:
 *
 *   - Up to 7 days  → 1 row of large cells.
 *   - Up to ~40 days → 5-6 rows × 7 cols (classic month view).
 *   - Longer ranges → N rows × 7 cols, scrolls within the parent scroll.
 *
 * Each cell is a flex-1 square (so they grow with screen width). The day
 * number sits inside; XP intensity is rendered as a translucent fill in
 * the accent color, scaled to the peak day in the filtered window.
 *
 * Replaces the previous GitHub-style heatmap whose 12px cells were
 * brutal to tap. Trade-off: long ranges (Trimestre, Total) get tall,
 * but the cells stay fingerable.
 */
export function MonthHeatmap({
  from,
  to,
  dailyTotals,
  dailyMax,
  weekStart,
  onCellPress,
  accent = tokens.brand.violet2,
  selectedKey,
}: Props) {
  const todayKey = dayKey(new Date());

  const { rows, weekdayLabels } = useMemo(() => {
    const gridStart = startOfWeek(from, weekStart);
    const gridEndExclusive = addDays(startOfWeek(to, weekStart), 7);
    const totalCells = Math.round(
      (gridEndExclusive.getTime() - gridStart.getTime()) / 86400000,
    );
    const rowCount = totalCells / 7;
    const now = startOfDay(new Date()).getTime();
    const fromDay = startOfDay(from).getTime();
    const toDay = startOfDay(to).getTime();

    const r: Cell[][] = [];
    for (let w = 0; w < rowCount; w++) {
      const row: Cell[] = [];
      for (let d = 0; d < 7; d++) {
        const date = addDays(gridStart, w * 7 + d);
        const ts = date.getTime();
        const key = dayKey(date);
        row.push({
          date,
          key,
          xp: dailyTotals.get(key) ?? 0,
          inRange: ts >= fromDay && ts <= toDay,
          isFuture: ts > now,
        });
      }
      r.push(row);
    }

    // Pick localized weekday labels. The 'pt' detection is rough — true
    // locale i18n would route through i18n catalogs, but for 7 letters
    // we can fall through Intl.DateTimeFormat by date.
    const sample = new Date(2024, 0, 7); // a Sunday
    const intlLong = new Intl.DateTimeFormat(undefined, { weekday: 'narrow' });
    const test = intlLong.format(sample);
    // If the device locale gives narrow PT/EN, use those; else default
    // to PT since the app is pt-first.
    const isEn = /^[ABCDEFGHIJKLMNOPQRSTUVWXYZ]$/.test(test);
    const labels = isEn
      ? weekStart === 'sunday'
        ? WEEKDAY_LABELS_EN_SUN
        : WEEKDAY_LABELS_EN_MON
      : weekStart === 'sunday'
        ? WEEKDAY_LABELS_SUN
        : WEEKDAY_LABELS_MON;

    return { rows: r, weekdayLabels: labels };
  }, [from, to, dailyTotals, weekStart]);

  const colorForXp = (xp: number): string => {
    if (xp <= 0) return 'transparent';
    if (dailyMax <= 0) return 'transparent';
    const ratio = xp / dailyMax;
    if (ratio <= 0.25) return `${accent}38`;
    if (ratio <= 0.5) return `${accent}66`;
    if (ratio <= 0.75) return `${accent}AA`;
    return accent;
  };

  return (
    <View>
      <View style={styles.weekdayHeader}>
        {weekdayLabels.map((l, i) => (
          <Text key={i} style={styles.weekdayLabel}>
            {l}
          </Text>
        ))}
      </View>
      {rows.map((row, ri) => (
        <View key={ri} style={styles.weekRow}>
          {row.map((cell) => {
            if (!cell.inRange) {
              return (
                <View key={cell.key} style={styles.cellEmpty}>
                  <Text style={styles.dayNumOut}>{cell.date.getDate()}</Text>
                </View>
              );
            }
            const fill = colorForXp(cell.xp);
            const isSelected = selectedKey === cell.key;
            const isToday = cell.key === todayKey;
            const hasEntries = cell.xp > 0;
            const textColor =
              cell.xp > 0 && cell.xp / Math.max(dailyMax, 1) > 0.6
                ? tokens.text.hi
                : tokens.text.base;
            return (
              <Pressable
                key={cell.key}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  onCellPress?.(cell.date, cell.xp, hasEntries);
                }}
                disabled={cell.isFuture}
                style={({ pressed }) => [
                  styles.cell,
                  {
                    backgroundColor: hasEntries
                      ? fill
                      : 'rgba(255,255,255,0.03)',
                    borderColor: hasEntries
                      ? 'rgba(255,255,255,0.06)'
                      : tokens.border.base,
                  },
                  isToday && { borderColor: tokens.semantic.coinLight },
                  isSelected && {
                    borderColor: accent,
                    borderWidth: 2,
                  },
                  cell.isFuture && { opacity: 0.3 },
                  pressed && { opacity: 0.7 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${cell.key} ${cell.xp} XP`}
              >
                <Text
                  style={[
                    styles.dayNum,
                    { color: textColor },
                    cell.isFuture && { opacity: 0.5 },
                  ]}
                >
                  {cell.date.getDate()}
                </Text>
                {hasEntries && (
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: accent },
                    ]}
                  />
                )}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

export function HeatmapLegend({
  accent = tokens.brand.violet2,
}: {
  accent?: string;
}) {
  const stops = ['transparent', `${accent}38`, `${accent}66`, `${accent}AA`, accent];
  return (
    <View style={styles.legend}>
      <Text style={styles.legendText}>menos</Text>
      <View style={styles.legendCells}>
        {stops.map((c, i) => (
          <View
            key={i}
            style={[
              styles.legendCell,
              {
                backgroundColor: c,
                borderColor:
                  c === 'transparent'
                    ? tokens.border.base
                    : 'rgba(255,255,255,0.08)',
              },
            ]}
          />
        ))}
      </View>
      <Text style={styles.legendText}>mais</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  weekdayHeader: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekdayLabel: {
    flex: 1,
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    color: tokens.text.dim,
    textAlign: 'center',
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
    position: 'relative',
  },
  cellEmpty: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.2,
  },
  dayNum: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    letterSpacing: 0.3,
  },
  dayNumOut: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    color: tokens.text.faint,
  },
  dot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    opacity: 0.9,
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
    width: 14,
    height: 14,
    borderRadius: 3,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
