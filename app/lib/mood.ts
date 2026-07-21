/**
 * Mood check-in scale — the single source of truth for the 5-point valence
 * ladder shared by the check-in screen, the app-open prompt, the Eu-tab card,
 * the history calendar and the Insights bands. Five discrete levels (Daylio
 * pattern; 5 points, odd so the midpoint exists) rendered as emoji faces with
 * a blue → gold color ramp reused as the visual language everywhere the mood
 * shows up.
 *
 * ## Why blue → gold and not red → green
 *
 * The app's primary user has a red-green color vision deficiency. The previous
 * ramp (#FF5C7A → #FF9F43 → #FFC83D → #9BD64B → #3DD68C) collapsed under
 * protanopia: its worst adjacent pair, "ok"↔"good", measured ΔE 1.0 — the same
 * color — and it failed the separation floor for normal vision too.
 *
 * This ramp was derived in OKLCH with **strictly monotonic lightness**
 * (0.546 → 0.654 → 0.745 → 0.820 → 0.915) along the blue↔gold hue axis, the
 * one axis that survives both protan and deutan simulation. Worst adjacent
 * pair is now ΔE 10.0 protan / 10.0 tritan; the extremes are ΔE 42. Because
 * lightness rises monotonically, the ladder still reads in order with *no* hue
 * perception at all — hue is a second channel here, never the only one.
 *
 * The hex values are the output of a validated search, not taste. Changing any
 * of them re-opens the CVD problem; re-run a CVD validator before touching one.
 *
 * ## Ink on the fills
 *
 * A monotonic-lightness ramp spans light *and* dark fills by construction, so
 * no single ink polarity serves all five. Each level therefore carries its own
 * `ink` — whichever of near-black / white measures higher against that fill.
 * Contrast of each ink over its own fill, in order:
 *
 *   step 1  #3874AD  white       4.92
 *   step 2  #5E98BD  bg.deep     6.07
 *   step 3  #9CB2AD  bg.deep     8.50
 *   step 4  #F2B86C  bg.deep    10.73
 *   step 5  #FAE563  bg.deep    14.91
 *
 * Every step clears the WCAG 4.5 floor for small text, so nothing here needs a
 * weight/size exemption. Do not hardcode `tokens.bg.deep` as ink on a mood
 * fill: on step 1 it measures 3.87, below even the 4.5 floor's large-text
 * relaxation. Use `level.ink`.
 *
 * (An earlier revision of this table read 4.27 / 6.7 / 9.4 / 11.9 / 16.5 and
 * was labelled `tokens.bg.deep`. Those figures are correct for pure #000000,
 * which is not what ships — `tokens.bg.deep` is #0A0E26. Recompute against the
 * actual token if you revisit this.)
 *
 * These colors are fills. As *text on the dark UI background* the two bottom
 * steps are too dark to be legible, so the surfaces below deliberately render
 * the color as an area (chip, ring, cell fill) and keep their labels on
 * `tokens.text.hi`. Where a fill sits *behind* an emoji face, prefer the color
 * as a ring over a solid disc — emoji faces are themselves yellow and vanish
 * on steps 3–5 (1.06–1.65).
 *
 * Deliberately quiet: this ladder carries NO XP/coins/Momentum. See the
 * mood_log migration for the "reflection has no score" rationale.
 */

import { tokens } from '@/theme';

export const MOOD_MIN = 1;
export const MOOD_MAX = 5;

export type MoodValue = 1 | 2 | 3 | 4 | 5;

/** i18n key suffix under `mood.levels`. */
export type MoodLevelKey = 'terrible' | 'bad' | 'ok' | 'good' | 'great';

export interface MoodLevel {
  value: MoodValue;
  emoji: string;
  /** Level fill — a blue→gold ramp with monotonic lightness. Fill, not ink. */
  color: string;
  /**
   * Text/marks drawn ON `color`. Per-level because the ramp spans light and
   * dark fills; see "Ink on the fills" above for the measured table.
   */
  ink: string;
  key: MoodLevelKey;
}

// Pure white, not `tokens.text.hi` (#F2F3FF): text.hi measures 4.46 on step 1
// and misses the 4.5 floor by 0.04. This value is a contrast result, not a
// theme role, which is why it is a literal.
const INK_LIGHT = '#FFFFFF';
const INK_DARK = tokens.bg.deep;

export const MOOD_LEVELS: readonly MoodLevel[] = [
  { value: 1, emoji: '😩', color: '#3874AD', ink: INK_LIGHT, key: 'terrible' },
  { value: 2, emoji: '🙁', color: '#5E98BD', ink: INK_DARK, key: 'bad' },
  { value: 3, emoji: '😐', color: '#9CB2AD', ink: INK_DARK, key: 'ok' },
  { value: 4, emoji: '🙂', color: '#F2B86C', ink: INK_DARK, key: 'good' },
  { value: 5, emoji: '😄', color: '#FAE563', ink: INK_DARK, key: 'great' },
];

/** Look up a level by value; falls back to the neutral midpoint. */
export function moodLevel(value: number): MoodLevel {
  return MOOD_LEVELS.find((l) => l.value === value) ?? MOOD_LEVELS[2];
}
