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
 * (0.585 → 0.690 → 0.745 → 0.820 → 0.915) along the blue↔gold hue axis, the
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
 * Contrast of `tokens.bg.deep` (near-black) over the five fills, in order:
 * 4.27 / 6.7 / 9.4 / 11.9 / 16.5. Step 1 sits marginally under the WCAG 4.5
 * floor for small text — a deliberate trade, because lightening it to clear
 * 4.5 drops the worst adjacent CVD separation from 10.0 to 7.4. Anything that
 * needs more headroom on step 1 should raise text *weight or size*, never
 * lighten the fill.
 *
 * These colors are fills. As *text on the dark UI background* the two bottom
 * steps are too dark to be legible, so the surfaces below deliberately render
 * the color as an area (chip, ring, cell fill) and keep their labels on
 * `tokens.text.hi`.
 *
 * Deliberately quiet: this ladder carries NO XP/coins/Momentum. See the
 * mood_log migration for the "reflection has no score" rationale.
 */

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
  key: MoodLevelKey;
}

export const MOOD_LEVELS: readonly MoodLevel[] = [
  { value: 1, emoji: '😩', color: '#3874AD', key: 'terrible' },
  { value: 2, emoji: '🙁', color: '#5E98BD', key: 'bad' },
  { value: 3, emoji: '😐', color: '#9CB2AD', key: 'ok' },
  { value: 4, emoji: '🙂', color: '#F2B86C', key: 'good' },
  { value: 5, emoji: '😄', color: '#FAE563', key: 'great' },
];

/** Look up a level by value; falls back to the neutral midpoint. */
export function moodLevel(value: number): MoodLevel {
  return MOOD_LEVELS.find((l) => l.value === value) ?? MOOD_LEVELS[2];
}
