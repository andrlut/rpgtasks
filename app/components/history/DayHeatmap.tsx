import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { dateKeyFromLocal } from '@/lib/api/history';
import { getCurrentLocale, useT } from '@/lib/i18n';
import { tokens } from '@/theme';

export interface DayCellStyle {
  /** Fill color for the day cell. */
  bg: string;
  /** True when the fill is saturated → use dark day-number for contrast. */
  onColor?: boolean;
}

interface Props {
  monthDate: Date;
  selected: Date | null;
  onSelectDay: (d: Date) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  canGoNext: boolean;
  /** Per-day fill; null → empty (bordered) cell. */
  colorFor: (dateKey: string) => DayCellStyle | null;
  /** Optional dot marker (e.g. day carries a note/tag). */
  markFor?: (dateKey: string) => boolean;
}

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const LOCALE_MAP: Record<string, string> = { en: 'en-US', pt: 'pt-BR' };

/**
 * The single month-grid heatmap for the whole app. Coloring is delegated to
 * `colorFor`, so the same component renders the activity (XP) view, the mood
 * view, or anything else — replacing the old per-purpose MonthGrid /
 * MoodMonthGrid duplicates.
 */
export function DayHeatmap({
  monthDate,
  selected,
  onSelectDay,
  onPrevMonth,
  onNextMonth,
  canGoNext,
  colorFor,
  markFor,
}: Props) {
  const { t } = useT();
  const rows = useMemo(() => buildMonthRows(monthDate), [monthDate]);
  const todayKey = dateKeyFromLocal(new Date());
  const selectedKey = selected ? dateKeyFromLocal(selected) : null;
  const now = Date.now();

  const monthLabel = useMemo(() => {
    const tag = LOCALE_MAP[getCurrentLocale()] ?? 'en-US';
    const raw = monthDate.toLocaleDateString(tag, { month: 'long', year: 'numeric' });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, [monthDate]);

  return (
    <View>
      <View style={styles.headerRow}>
        <Pressable
          onPress={onPrevMonth}
          hitSlop={8}
          style={({ pressed }) => [styles.chev, pressed && styles.chevPressed]}
          accessibilityLabel={t('a11y.prevMonth')}
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
          accessibilityLabel={t('a11y.nextMonth')}
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
            if (!cell) return <View key={colIdx} style={styles.cellEmpty} />;
            const key = dateKeyFromLocal(cell);
            const style = colorFor(key);
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
                  style
                    ? { backgroundColor: style.bg, borderColor: 'transparent' }
                    : { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: tokens.border.base },
                  isToday && styles.cellToday,
                  isSelected && styles.cellSelected,
                  isFuture && styles.cellFuture,
                ]}
              >
                <Text
                  style={[
                    styles.dayNum,
                    style?.onColor ? styles.dayNumOnColor : null,
                    isFuture && { opacity: 0.4 },
                  ]}
                >
                  {cell.getDate()}
                </Text>
                {markFor?.(key) && <View style={styles.mark} />}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function buildMonthRows(anyDay: Date): (Date | null)[][] {
  const first = new Date(anyDay.getFullYear(), anyDay.getMonth(), 1);
  const lastDay = new Date(anyDay.getFullYear(), anyDay.getMonth() + 1, 0).getDate();
  const firstDow = first.getDay();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= lastDay; d++) {
    cells.push(new Date(anyDay.getFullYear(), anyDay.getMonth(), d));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  while (rows.length > 0 && rows[rows.length - 1].every((c) => c === null)) rows.pop();
  return rows;
}

/** XP → 0-4 intensity bucket (matches the old MonthGrid calibration). */
export function xpIntensity(xp: number): 0 | 1 | 2 | 3 | 4 {
  if (xp <= 0) return 0;
  if (xp < 30) return 1;
  if (xp < 100) return 2;
  if (xp < 200) return 3;
  return 4;
}

const XP_LEVEL_COLOR: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'transparent',
  1: 'rgba(123, 92, 255, 0.22)',
  2: 'rgba(123, 92, 255, 0.45)',
  3: 'rgba(123, 92, 255, 0.72)',
  4: tokens.brand.violet,
};

/** Activity colorFor helper — violet XP ramp. */
export function xpColorFor(xp: number): DayCellStyle | null {
  const lvl = xpIntensity(xp);
  if (lvl === 0) return null;
  return { bg: XP_LEVEL_COLOR[lvl], onColor: lvl >= 3 };
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
  chevPressed: { opacity: 0.7, transform: [{ scale: 0.94 }] },
  chevDisabled: { opacity: 0.4 },
  monthLabel: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 15,
    color: tokens.text.hi,
    letterSpacing: 0.3,
  },
  weekdayHeader: { flexDirection: 'row', marginBottom: 6 },
  weekdayLabel: {
    flex: 1,
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    color: tokens.text.dim,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  weekRow: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  cell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellEmpty: { flex: 1, aspectRatio: 1 },
  dayNum: { fontFamily: 'Manrope_700Bold', fontSize: 11, color: tokens.text.hi },
  dayNumOnColor: { color: tokens.bg.deep, fontFamily: 'Manrope_800ExtraBold' },
  cellToday: { borderColor: tokens.text.hi, borderWidth: 1.5 },
  cellSelected: { borderColor: tokens.semantic.coin, borderWidth: 2 },
  cellFuture: { opacity: 0.3 },
  mark: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
});
