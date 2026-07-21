import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { dateKeyFromLocal } from '@/lib/api/history';
import type { DimensionId } from '@/lib/db/types';
import { useT } from '@/lib/i18n';
import { useMetaLookup } from '@/lib/i18n/meta';
import type { WeekStart } from '@/lib/settings';
import { tokens } from '@/theme';
import { DIMENSION_META } from '@/theme/dimensions';

/** Everything one day cell renders, resolved by the caller per date key. */
export interface DayCellData {
  /** Cell fill — the day's mood color. Omit for an empty (bordered) cell. */
  bg?: string | null;
  /**
   * Ink for the day number, XP figure, note pip and rings when `bg` is set.
   * Must be the fill's own high-contrast ink (`MoodLevel.ink`) — a single
   * polarity cannot serve a ramp that spans light and dark fills. Omit to keep
   * the default light ink used on unfilled cells.
   */
  ink?: string | null;
  /** The day's XP total. The cell's headline figure; 0 renders nothing. */
  xp?: number;
  /** Dimensions the day touched, already deduped and ordered. */
  dims?: DimensionId[];
  /** Top-right pip — e.g. the mood entry carries a note or tags. */
  mark?: boolean;
  /** Appended to the composed accessibilityLabel, e.g. the mood name. */
  a11yNote?: string;
}

interface Props {
  monthDate: Date;
  selected: Date | null;
  onSelectDay: (d: Date) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  canGoNext: boolean;
  /** Per-day cell contents; null → empty (bordered) cell. */
  dataFor: (dateKey: string) => DayCellData | null;
  weekStart?: WeekStart;
}

/**
 * Cell height instead of `aspectRatio: 1`. A square cell (~37dp on a 360dp
 * phone) cannot carry a day number, a headline XP figure and a dot row
 * legibly; dropping the Atividade|Humor segmented control from the History
 * card freed roughly the 9dp per row this costs.
 *
 * The layout is no longer a centered stack — the day number is pinned to the
 * top-left corner, the XP owns the optical center as the cell's headline, and
 * the dot track is pinned to the bottom. So the budget is now about the
 * *clearances* around the centered figure, not a sum of rows.
 *
 * **The border is part of the budget.** RN `height` is border-box, and the
 * absolute children offset from the padding edge while `justifyContent`
 * centers the in-flow XP in the *content* box — so every figure below shifts
 * with the border width B. Content box = 46 − 2B: 44 unselected (B=1), 43
 * today (B=1.5), 42 selected (B=2). Coordinates are relative to that box:
 *
 *                              B=1        B=1.5       B=2
 *   dayNum   top 2, lh 11      2 … 13     2 … 13      2 … 13
 *   xpNum    centered, lh 16   14 … 30    13.5 … 29.5 13 … 29
 *   dotTrack bottom 2, h 8     34 … 42    32 … 40     30 … 38
 *
 * Clearance above the headline is therefore 1 / 0.5 / **0**dp — the selected
 * cell is exactly flush, not 2dp clear. That clearance at B=2 is the binding
 * constraint: (H − 4 − 16)/2 ≥ 13 gives **H ≥ 46**. So 46 is the floor
 * with zero slack, not "a little air" above a floor of 42 — at H=42 the
 * selected cell overlaps the corner number by 2dp. Raise H before adding
 * anything vertical, and re-derive if a border width changes.
 *
 * Nothing clips today: these are lineHeight boxes and the glyph ink is inset
 * within them. The cell clips (`overflow: 'hidden'`), which is why both
 * figures set `allowFontScaling={false}` and pin explicit lineHeights.
 */
const CELL_HEIGHT = 46;

/**
 * Six dimensions can fire in one day but the dot row has to survive the
 * narrowest cell we ship on. Budget, worst case (320dp phone, selected
 * cell): 320 − 32 (screen padding) − 2 (card border) − 32 (card padding)
 * = 254dp of grid; minus the 6 inter-cell gaps of 6dp = 218/7 = 31.1dp
 * per cell; minus the 2dp selection border per side = **27.1dp** inside.
 * The default (unselected, 1dp border) cell on a 360dp phone is 34.9dp.
 *
 * The track costs `n×5 + (n−1)×1 + 2×1.5` (see `dot`/`dotTrack`), so
 * four dots = 26dp and five = 32dp. Four is the real ceiling; a fifth
 * would silently lose ~60% of the outer dot to `overflow: 'hidden'` on
 * small screens. Days touching more than four pillars are rare, and the
 * accessibility label below still enumerates *every* dimension, so the
 * clipped ones are not lost to screen readers.
 *
 * **Why dots and not `DIMENSION_META[dim].iconName` glyphs.** Icons would be
 * a genuine second channel and therefore strictly better here, but they do
 * not fit. Same budget with a glyph of side S: `4S + 3×1 + 2×1.5 ≤ 27.1`
 * gives S ≤ 5.3dp on the worst cell and S ≤ 7.2dp on the common one. Ionicons
 * need roughly 12dp before `heart` / `fitness` / `sparkles` / `cash` /
 * `people` / `color-palette` are told apart — at 6dp they are all the same
 * smudge, and a smudge is worse than a clean dot because it *looks* like it
 * should be readable. Cutting to three icons only buys 7.4dp, still far
 * short. Cost is not the issue (Ionicons are font glyphs; ~250 per month view
 * is free) — legibility is. Revisit if the calendar ever gets a full-width
 * or two-column-per-cell layout.
 */
const MAX_DOTS = 4;

/**
 * The single month-grid heatmap for the whole app. A cell is one unified
 * read of the day rather than a single-channel swatch: background = mood,
 * centered headline figure = XP, bottom dots = which dimensions were
 * practiced, top-left corner = the date, top-right pip = "this day has a
 * note". Everything is delegated to `dataFor`, so callers stay in charge of
 * the semantics.
 */
export function DayHeatmap({
  monthDate,
  selected,
  onSelectDay,
  onPrevMonth,
  onNextMonth,
  canGoNext,
  dataFor,
  weekStart = 'sunday',
}: Props) {
  const { t, locale } = useT();
  const meta = useMetaLookup();
  const rows = useMemo(() => buildMonthRows(monthDate, weekStart), [monthDate, weekStart]);
  const todayKey = dateKeyFromLocal(new Date());
  const selectedKey = selected ? dateKeyFromLocal(selected) : null;
  const now = Date.now();

  // The catalog stores the 7 initials Sunday-first (it also feeds the
  // recurrence day picker); rotate when the user starts weeks on Monday.
  const base = t('recurrencePicker.weekdays').split(',');
  const weekdayLabels = weekStart === 'sunday' ? base : [...base.slice(1), base[0]];

  const intlTag = LOCALE_MAP[locale] ?? 'en-US';
  const monthLabel = useMemo(() => {
    const raw = monthDate.toLocaleDateString(intlTag, { month: 'long', year: 'numeric' });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, [monthDate, intlTag]);
  // One formatter for up to 42 cells — constructing it per cell is the
  // expensive part of composing the labels.
  const dayFmt = useMemo(
    () => new Intl.DateTimeFormat(intlTag, { day: 'numeric', month: 'long' }),
    [intlTag],
  );

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
        {weekdayLabels.map((l, i) => (
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
            const data = dataFor(key);
            const xp = data?.xp ?? 0;
            const dims = data?.dims ?? [];
            const isToday = key === todayKey;
            const isSelected = key === selectedKey;
            const isFuture = cell.getTime() > now;
            // Unfilled cells are the near-black page background, so they take
            // the light default. Filled cells must use the fill's own ink.
            const ink = (data?.bg && data.ink) || tokens.text.hi;

            const parts = [dayFmt.format(cell)];
            if (data?.a11yNote) parts.push(data.a11yNote);
            if (xp > 0) parts.push(t('a11y.dayCellXp', { xp }));
            if (dims.length > 0) {
              parts.push(dims.map((d) => meta.dim(d).label).join(t('format.listSeparator')));
            }
            // The corner pip is 5dp of pure visual shorthand. Announce it in
            // the cell's own label rather than as a nested a11y node: the
            // Pressable is the accessibility element, so a label on the pip
            // View alone would never be read out.
            if (data?.mark) parts.push(t('a11y.dayCellNote'));
            if (parts.length === 1) parts.push(t('a11y.dayCellEmpty'));

            return (
              <Pressable
                key={key}
                onPress={() => !isFuture && onSelectDay(cell)}
                disabled={isFuture}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={parts.join(' · ')}
                style={[
                  styles.cell,
                  data?.bg
                    ? { backgroundColor: data.bg, borderColor: 'transparent' }
                    : { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: tokens.border.base },
                  isToday && [styles.cellToday, { borderColor: ink }],
                  isSelected && [styles.cellSelected, { borderColor: ink }],
                  isFuture && styles.cellFuture,
                ]}
              >
                {/* allowFontScaling={false} on both figures: the cell is a
                    fixed 46dp box with `overflow: 'hidden'`, so an OS font
                    scale above ~1.1 would push the dot row out of frame
                    entirely rather than reflow. Same reasoning as the center
                    readout in components/HexRadar.tsx. */}
                <Text
                  allowFontScaling={false}
                  style={[
                    styles.dayNum,
                    data?.bg ? [styles.onColor, { color: ink }] : null,
                    isFuture && { opacity: 0.4 },
                  ]}
                >
                  {cell.getDate()}
                </Text>
                {xp > 0 && (
                  <Text
                    allowFontScaling={false}
                    numberOfLines={1}
                    style={[styles.xpNum, data?.bg ? { color: ink } : null]}
                  >
                    {formatXp(xp)}
                  </Text>
                )}
                {dims.length > 0 && (
                  <View style={styles.dotRow}>
                    <View style={styles.dotTrack}>
                      {dims.slice(0, MAX_DOTS).map((d) => (
                        <View
                          key={d}
                          style={[styles.dot, { backgroundColor: DIMENSION_META[d].color }]}
                        />
                      ))}
                    </View>
                  </View>
                )}
                {data?.mark && (
                  <View style={[styles.mark, data.bg ? { backgroundColor: ink } : null]} />
                )}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const LOCALE_MAP: Record<string, string> = { en: 'en-US', pt: 'pt-BR' };

/**
 * Compact XP: 940, 1k, 12k. **Three glyphs, hard ceiling.**
 *
 * Manrope ExtraBold digits are proportional, not tabular, so the ceiling has
 * to be derived from the *widest* digit, not an average. Advances measured
 * from the shipped `hmtx` (upem 2000): `1` = 0.454em, `9` = 0.622em, and the
 * worst, `0` = **0.674em**. So the widest 3-glyph total is "000"-shaped at
 * 3 × 0.674 = 2.022em, and the fit constraint against the 27.14dp inner width
 * of the worst cell we ship (320dp phone, selected, B=2) is
 *
 *   fontSize ≤ 27.14 / 2.022 = 13.42  →  **13dp**
 *
 * which is why `xpNum` is 13 and not 14. At 14 the average digit is 8.71dp
 * and "999" does fit at 26.1dp, but exact hundreds do not — "900" is 27.59dp
 * and 200/300/400/600/800 likewise overflow. With `numberOfLines={1}` those
 * ellipsize to a *wrong figure* ("90…"), which is worse than clipping. At 13
 * every 3-digit total fits with 0.85dp to spare.
 *
 * The old four-glyph "1.2k" would be 4 glyphs ≈ 28dp even at 13 and would get
 * clipped on both edges by `overflow: 'hidden'`. A coarser headline beats a
 * clipped one, and the exact total is one tap away in the day detail.
 */
function formatXp(xp: number): string {
  if (xp < 1000) return String(xp);
  return `${Math.round(xp / 1000)}k`;
}

function buildMonthRows(anyDay: Date, weekStart: WeekStart): (Date | null)[][] {
  const first = new Date(anyDay.getFullYear(), anyDay.getMonth(), 1);
  const lastDay = new Date(anyDay.getFullYear(), anyDay.getMonth() + 1, 0).getDate();
  const dow = first.getDay(); // 0=Sun..6=Sat
  const lead = weekStart === 'sunday' ? dow : (dow + 6) % 7;
  const cells: (Date | null)[] = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= lastDay; d++) {
    cells.push(new Date(anyDay.getFullYear(), anyDay.getMonth(), d));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  while (rows.length > 0 && rows[rows.length - 1].every((c) => c === null)) rows.pop();
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
    height: CELL_HEIGHT,
    borderRadius: 8,
    borderWidth: 1,
    // Centers the XP headline — the only in-flow child. The day number, the
    // dot track and the note pip are all absolutely positioned, so the
    // headline stays optically centered whether or not they are present.
    alignItems: 'center',
    justifyContent: 'center',
    // Clips the dot track rather than letting it bleed past the rounded
    // corners on narrow screens.
    overflow: 'hidden',
  },
  cellEmpty: { flex: 1, height: CELL_HEIGHT },
  // Pinned to the top-left corner, opposite the note pip. Near-black via
  // `inkOnColor` on any day that carries a mood fill; light here, because on
  // a day with no mood the cell IS the near-black background and black-on-
  // black is nothing. Explicit lineHeight, not the font's default box: it is
  // what makes the CELL_HEIGHT clearances above arithmetic, not a guess.
  dayNum: {
    position: 'absolute',
    top: 2,
    left: 3,
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    lineHeight: 11,
    color: tokens.text.hi,
  },
  // The headline. 13dp vs the old 9dp, and it owns the optical center of the
  // cell now that the day number moved to the corner. 13, not 14: see formatXp
  // for the width arithmetic — 14 overflows the worst cell on "900"-shaped
  // totals. lineHeight stays 16 either way, so the vertical budget on
  // CELL_HEIGHT is unaffected by the size.
  xpNum: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 13,
    lineHeight: 16,
    // Zero, not 0.2: the tracking is what pushes a 3-glyph figure past the
    // 27.14dp worst-case inner width. See formatXp.
    letterSpacing: 0,
    // Deliberately NOT a fixed color across the whole grid. A single hue
    // cannot survive five different mood fills — tokens.semantic.xp green on
    // the gold "good"/"great" fills, or any blue on the blue "terrible"/"bad"
    // ones, disappears. Nor can a single *neutral*: the ramp has monotonic
    // lightness, so near-black is right on steps 2–5 (6.07–14.91) and wrong on
    // step 1 (3.87). The fill supplies its own ink via `DayCellData.ink`; this
    // neutral is only for days with no mood, where the cell is the plain dark
    // background. Size and weight are what make the figure the headline.
    color: tokens.text.base,
  },
  onColor: { fontFamily: 'Manrope_800ExtraBold' },
  // Full-width row so the pill self-centers regardless of how many dots it
  // holds, while staying pinned to the bottom of the cell.
  dotRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 2,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  dotTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    // Geometry is load-bearing: see the MAX_DOTS budget above before
    // widening the gap or the padding.
    gap: 1,
    paddingHorizontal: 1.5,
    paddingVertical: 1.5,
    borderRadius: tokens.radius.pill,
    // Dark backing rather than a per-dot ring: a 1px ring on a 5dp dot eats
    // most of the color, and the six dimension hues span the same warm range
    // as the top of the mood ramp (wealth #FFC83D vs mood-"great" #FAE563,
    // body #FF8A3D vs mood-"good" #F2B86C). The track separates the whole
    // row from any fill behind it in one move.
    backgroundColor: tokens.bg.deep,
  },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  // Both rings take the cell's own ink at render time (`borderColor` is set
  // inline), for the same reason the figures do: no fixed color survives the
  // whole ramp. The two colors that read as obvious ring candidates are the
  // two worst choices — `brand.violet2` measures 1.05 on the "bad" fill
  // (identical luminance, and violet-vs-blue is exactly the pair protan/deutan
  // vision collapses, so both channels go at once), and `text.hi` measures
  // 1.16 on "great". Ink instead is ≥4.92 on every step by construction.
  //
  // That leaves border *width* as the only channel separating today from
  // selected, which is thin — but hue is genuinely unavailable here, and the
  // day-detail panel below the grid names the selected date outright, so the
  // ambiguity is cosmetic. Widths are also load-bearing geometry: 2 is the
  // most the selected cell can spend before the 4-dot track and the 3-glyph
  // headline stop fitting its inner width (see MAX_DOTS and formatXp).
  cellToday: { borderWidth: 1.5 },
  cellSelected: { borderWidth: 2 },
  cellFuture: { opacity: 0.3 },
  mark: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 5,
    height: 5,
    borderRadius: 3,
    // Default for unfilled cells; a filled cell overrides this with its ink,
    // because a white pip disappears on the light end of the ramp (#FAE563,
    // #F2B86C) and a near-black one disappears on the dark end (#3874AD).
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
});
