/**
 * Mood check-in scale — the single source of truth for the 5-point valence
 * ladder shared by the check-in screen, the app-open prompt, and the Eu-tab
 * card. Five discrete levels (Daylio pattern; 5 points, odd so the midpoint
 * exists) rendered as emoji faces with a red → green color ramp reused as the
 * visual language everywhere the mood shows up.
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
  /** Level color — a red→green ramp; reused on input + future heatmap. */
  color: string;
  key: MoodLevelKey;
}

export const MOOD_LEVELS: readonly MoodLevel[] = [
  { value: 1, emoji: '😩', color: '#FF5C7A', key: 'terrible' },
  { value: 2, emoji: '🙁', color: '#FF9F43', key: 'bad' },
  { value: 3, emoji: '😐', color: '#FFC83D', key: 'ok' },
  { value: 4, emoji: '🙂', color: '#9BD64B', key: 'good' },
  { value: 5, emoji: '😄', color: '#3DD68C', key: 'great' },
];

/** Look up a level by value; falls back to the neutral midpoint. */
export function moodLevel(value: number): MoodLevel {
  return MOOD_LEVELS.find((l) => l.value === value) ?? MOOD_LEVELS[2];
}
