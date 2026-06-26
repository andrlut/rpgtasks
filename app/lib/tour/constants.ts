/**
 * Post-login product tour — module definitions and content.
 *
 * The tour is modular: each module is skippable and revisitable. State
 * is per-device for now (AsyncStorage); if we need cross-device sync
 * later, swap the persistence layer for a Supabase `profile.onboarding_modules`
 * JSONB column without changing the public hooks.
 */

import type { SubId } from '@/lib/db/types';

/** Identifier for every module in display order. Keep this stable —
 *  the store keys persisted to AsyncStorage are derived from these. */
export const TOUR_MODULES = [
  'M0',
  'M0_5',
  'M1',
  'M2',
  'M3',
  'M4',
  'M5',
  'M6',
  'wrap',
] as const;

export type TourModule = (typeof TOUR_MODULES)[number];

export type TourModuleStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'skipped';

/**
 * Curated 12 template IDs surfaced in M0.5 (one per sub, low-friction,
 * universal). Template IDs are stable across the sub-rename history
 * (e.g. `movement_30min` retained its id when `movement` sub became
 * `strength`).
 */
export const INITIAL_PICK_TEMPLATE_IDS: readonly string[] = [
  // health
  'sleep_7h',
  'nutrition_water_2l',
  // body
  'movement_30min',
  'dexterity_stretch_pre_sleep',
  // mind
  'learn_read_20min',
  'contemplate_meditate_10',
  // wealth
  'money_log_expenses',
  'career_skill_30min',
  // bonds
  'circle_message',
  'romance_intentional_date',
  // craft
  'play_hobby_30',
  'build_30min_project',
];

/**
 * Silent fallback when the user skips M0 or M0.5 — adopt these three
 * universal, low-friction templates so the Home isn't empty. Mix of
 * 3 dimensions, all under 20 min.
 */
export const SILENT_SEED_TEMPLATE_IDS: readonly string[] = [
  'dexterity_stretch_pre_sleep', // body
  'learn_read_20min', // mind
  'circle_message', // bonds
];

/**
 * Map of template id → primary sub. Used by the M0.5 card grid so we
 * don't need an extra DB roundtrip just to pick the right sub badge
 * color and counter logic. Kept in lockstep with INITIAL_PICK_TEMPLATE_IDS.
 */
export const INITIAL_PICK_SUBS: Record<string, SubId> = {
  sleep_7h: 'sleep',
  nutrition_water_2l: 'nutrition',
  movement_30min: 'strength',
  dexterity_stretch_pre_sleep: 'dexterity',
  learn_read_20min: 'learn',
  contemplate_meditate_10: 'contemplate',
  money_log_expenses: 'money',
  career_skill_30min: 'career',
  circle_message: 'circle',
  romance_intentional_date: 'romance',
  play_hobby_30: 'play',
  build_30min_project: 'build',
};

/** Required count for the M0.5 "Continue" button. */
export const INITIAL_PICK_TARGET = 3;
