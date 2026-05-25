import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { dateKeyFromLocal, type DailySummaryEntry } from '@/lib/api/history';
import { getCurrentLocale } from '@/lib/i18n';
import { tokens } from '@/theme';

interface Props {
  /** Map keyed by `YYYY-MM-DD` local-day → that day's totals. */
  data: Map<string, DailySummaryEntry> | undefined;
  /** Currently visible month (any date inside the month). */
  monthDate: Date;
  /** Currently selected day. */
  selected: Date;
  /** Tapping a day cell. */
  onSelectDay: (d: Date) => void;
  /** Tapping the prev/next month chevrons. */
  onPrevMonth: () => void;
  onNextMonth: () => void;
  /** Whether the "next month" chevron should be disabled (e.g. we'd
   *  leave the current month into the future). */
  canGoNext: boolean;
}

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** XP → 0-4 intensity bucket. Matches the previous XpHeatmap calibration. */
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

const LOCALE_MAP: Record<string, string> = {
  en: 'en-US',
  pt: 'pt-BR',
};

/**
 * Full-month grid for the History screen — replaces the rolling 3-week
 * heatmap. 7 columns by 5-6 rows, with empty cells before day 1 and
 * after the last day so the month aligns under the weekday header.
 *
 * Header above the grid: prev chevron · "Mês AAAA" · next chevron.
 * Tapping a day cell selects it; the parent re-fetches that day's
 * detail. Tapping a chevron flips the visible month — the parent
 * window also re-fetches the daily-summary for the new range.
 *
 * No legend — the 5-shade gradient is self-explanatory and the screen
 * was running tight on vertical space.
 */
export function MonthGrid({
  data,
  monthDate,
  selected,
  onSelectDay,
  onPrevMonth,
  onNextMonth,
  canGoNext,
}: Props) {
  const rows = useMemo(() => buildMonthRows(monthDate), [monthDate]);
  const todayKey = dateKeyFromLocal(new Date());
  const selectedKey = dateKeyFromLocal(selected);
  const now = Date.now();

  const monthLabel = useMemo(() => {
    const tag = LOCALE_MAP[getCurrentLocale()] ?? 'en-US';
    const raw = monthDate.toLocaleDateString(tag, {
      month: 'long',
      year: 'numeric',
    });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, [monthDate]);

  return (
    <View>
      <View style={styles.headerRow}>
        <Pressable
          onPress={onPrevMonth}
          hitSlop={8}
          style={({ pressed }) => [
            styles.chev,
            pressed && styles.chevPressed,
          ]}
          accessibilityLabel="Previous month"
        >
          <Ionicons name="chevron-back" size={18} color={tokens.text.hi} />
        </Pressable>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <Pressable
          onPress={canGoNext ? onNextMonth : undefined}
          disabled={!canGoNext}
          hitSlop={8}
          style={({ pressed }) => [
            styles.chev,
            !canGoNext && styles.chevDisabled,
            pressed && canGoNext && styles.chevPressed,
          ]}
          accessibilityLabel="Next month"
        >
          <Ionicons
            name="chevron-forward"
            size={18}
            color={canGoNext ? tokens.text.hi : tokens.text.faint}
          />
        </Pressable>
      </View>

      <View style={styles.weekdayHeader}>
        {WEEKDAY_LABELS.map((l, i) => (
          <Text key={i} style={styles.weekdayLabel}>
            {l}
          </Text>
        ))}
      </View>

      {rows.map((week, rowIdx) => (
        <View key={rowIdx} style={styles.weekRow}>
          {week.map((cell, colIdx) => {
            if (!cell) {
              return <View key={colIdx} style={styles.cellEmpty} />;
            }
            const key = dateKeyFromLocal(cell);
            const xp = data?.get(key)?.totalXp ?? 0;
            const lvl = intensity(xp);
            const isToday = key === todayKey;
            const isSelected = key === selectedKey;
            const isFuture = cell.getTime() > now;
            return (
              <Pressable
                key={key}
                onPress={() => !isFuture && onSelectDay(cell)}
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
                  {cell.getDate()}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

/**
 * Build a 6-row × 7-col grid for the month containing `anyDay`. Empty
 * slots before day 1 and after the last day are returned as `null`.
 * Always returns 6 rows so the grid height doesn't jitter between
 * months. Trailing all-null rows are dropped.
 */
function buildMonthRows(anyDay: Date): (Date | null)[][] {
  const first = new Date(anyDay.getFullYear(), anyDay.getMonth(), 1);
  const lastDay = new Date(anyDay.getFullYear(), anyDay.getMonth() + 1, 0).getDate();
  const firstDow = first.getDay(); // 0 = Sun

  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= lastDay; d++) {
    cells.push(new Date(anyDay.getFullYear(), anyDay.getMonth(), d));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const rows: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }
  // Drop trailing rows that are entirely null (shouldn't happen with the
  // padding loop above, but defensive).
  while (rows.length > 0 && rows[rows.length - 1].every((c) => c === null)) {
    rows.pop();
  }
  return rows;
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  chev: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: tokens.bg.surface,
    borderWidth: 1,
    borderColor: tokens.border.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.94 }],
  },
  chevDisabled: {
    opacity: 0.4,
  },
  monthLabel: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 15,
    color: tokens.text.hi,
    letterSpacing: 0.3,
  },
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
  },
  cellEmpty: {
    flex: 1,
    aspectRatio: 1,
  },
  dayNum: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    color: tokens.text.hi,
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
});
