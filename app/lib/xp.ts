/**
 * XP curve and level math.
 * Mirrors the difficulty → reward mapping in supabase/migrations/0003_complete_task_rpc.sql.
 */

export type Difficulty = 1 | 2 | 3 | 4 | 5;

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  1: 'Trivial',
  2: 'Easy',
  3: 'Medium',
  4: 'Hard',
  5: 'Heroic',
};

const REWARD_BY_DIFFICULTY: Record<Difficulty, { xp: number; coins: number }> = {
  1: { xp: 5, coins: 5 },
  2: { xp: 15, coins: 15 },
  3: { xp: 40, coins: 40 },
  4: { xp: 100, coins: 100 },
  5: { xp: 250, coins: 250 },
};

export function rewardForDifficulty(difficulty: Difficulty) {
  return REWARD_BY_DIFFICULTY[difficulty];
}

// ──────────────────────────────────────────────────────────────────────────
// Streak multiplier (mirrors supabase/migrations/..._streak_multiplier.sql)
//
// +0.01 per consecutive day, capped at 2.0x (100 days). Apply to base
// XP/coins and round to the nearest integer.
// ──────────────────────────────────────────────────────────────────────────

export const STREAK_MULTIPLIER_CAP = 2.0;

export function streakMultiplier(streakDays: number): number {
  return Math.min(STREAK_MULTIPLIER_CAP, 1 + 0.01 * Math.max(0, streakDays));
}

export function applyStreakMultiplier(
  baseReward: { xp: number; coins: number },
  streakDays: number,
): { xp: number; coins: number } {
  const m = streakMultiplier(streakDays);
  return {
    xp: Math.round(baseReward.xp * m),
    coins: Math.round(baseReward.coins * m),
  };
}

/**
 * Quadratic curve: each level requires more XP than the last.
 * level 1 = 0, level 2 = 100, level 3 = 400, level 4 = 900, level 5 = 1600...
 *
 * Inverse: level = floor(sqrt(xp / 100)) + 1
 */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return (level - 1) ** 2 * 100;
}

export function levelForXp(xp: number): number {
  if (xp < 0) return 1;
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

/**
 * Returns progress toward next level as { xpInLevel, xpNeededForLevel, fraction }.
 */
export function levelProgress(xp: number) {
  const level = levelForXp(xp);
  const xpAtLevelStart = xpForLevel(level);
  const xpAtNextLevel = xpForLevel(level + 1);
  const xpInLevel = xp - xpAtLevelStart;
  const xpNeededForLevel = xpAtNextLevel - xpAtLevelStart;
  return {
    level,
    xpInLevel,
    xpNeededForLevel,
    fraction: xpNeededForLevel === 0 ? 0 : xpInLevel / xpNeededForLevel,
  };
}
