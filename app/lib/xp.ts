/**
 * XP curve, Momentum, and level math.
 * Mirrors the difficulty -> reward mapping used by the complete_task RPC.
 */

import type { DimensionId, SubId, TaskSub } from '@/lib/db/types';
import { DIMENSION_ORDER, SUBS_BY_DIM } from '@/theme/dimensions';

export type Difficulty = 1 | 2 | 3 | 4 | 5;

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  1: 'Trivial',
  2: 'Easy',
  3: 'Medium',
  4: 'Hard',
  5: 'Heroic',
};

/**
 * Per-star XP/coins reward table.
 *
 * Rebalanced from 5/15/40/100/250 (razão 50×) → 10/20/35/55/80 (razão 8×).
 * The old curve was too exponential — 4★ and 5★ tasks felt unreachable in
 * day-to-day use, even though the harder ones should still pay more. New
 * jumps are ~1.45-2× per tier, a gentle, consistent progression. XP and
 * coins stay 1:1 by current convention.
 *
 * Mirror of the SQL `public.base_xp_for_stars` helper — keep both in
 * lockstep (server is authoritative; this table is the optimistic preview).
 */
const REWARD_BY_DIFFICULTY: Record<Difficulty, { xp: number; coins: number }> = {
  1: { xp: 10, coins: 10 },
  2: { xp: 20, coins: 20 },
  3: { xp: 35, coins: 35 },
  4: { xp: 55, coins: 55 },
  5: { xp: 80, coins: 80 },
};

export const MOMENTUM_WINDOW_DAYS = 30;
export const MOMENTUM_DECAY = 0.9;

/**
 * Momentum bonus calibration — mirrors the constants in
 * supabase migration 20260514000002_complete_task_momentum_bonus.
 * If you tweak these, tweak both sides in lockstep so optimistic UI
 * matches what the RPC actually grants.
 */
export const MOMENTUM_BONUS_CAP = 0.25;
export const MOMENTUM_CAP_VALUE = 300;

export type MomentumTier = 'calm' | 'building' | 'strong' | 'peak';

/** Bucket a momentum value into a 4-tier qualitative label. */
export function momentumTier(value: number): MomentumTier {
  if (value >= MOMENTUM_CAP_VALUE) return 'peak';
  if (value >= 150) return 'strong';
  if (value >= 50) return 'building';
  return 'calm';
}

/** Bonus % (0..MOMENTUM_BONUS_CAP) derived from a per-sub momentum value. */
export function momentumBonus(value: number): number {
  const ramp =
    (Math.max(0, value) / MOMENTUM_CAP_VALUE) * MOMENTUM_BONUS_CAP;
  return Math.min(MOMENTUM_BONUS_CAP, ramp);
}

export interface DailyMomentumInput {
  /** Local-date key in YYYY-MM-DD form. */
  dateKey: string;
  subId: SubId;
  /** Base XP for this subattribute completion. */
  baseXp: number;
}

export interface SubattributeMomentum {
  subId: SubId;
  momentum: number;
}

export interface AttributeMomentum {
  dimensionId: DimensionId;
  momentum: number;
  subattributes: SubattributeMomentum[];
}

export function rewardForDifficulty(difficulty: Difficulty) {
  return REWARD_BY_DIFFICULTY[difficulty];
}

export function baseXpForDifficulty(difficulty: Difficulty): number {
  return REWARD_BY_DIFFICULTY[difficulty].xp;
}

function dateKeyAtAge(todayKey: string, age: number): string {
  const d = new Date(`${todayKey}T00:00:00`);
  d.setDate(d.getDate() - age);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

export function momentumBySubattribute(
  dailyEffort: DailyMomentumInput[],
  todayKey: string,
): Record<SubId, number> {
  const momentum = Object.fromEntries(
    DIMENSION_ORDER.flatMap((dimId) => SUBS_BY_DIM[dimId]).map((subId) => [
      subId,
      0,
    ]),
  ) as Record<SubId, number>;

  for (let age = 0; age < MOMENTUM_WINDOW_DAYS; age++) {
    const dayKey = dateKeyAtAge(todayKey, age);
    const weight = MOMENTUM_DECAY ** age;
    for (const item of dailyEffort) {
      if (item.dateKey !== dayKey) continue;
      momentum[item.subId] += item.baseXp * weight;
    }
  }

  for (const subId of Object.keys(momentum) as SubId[]) {
    momentum[subId] = Math.round(momentum[subId]);
  }
  return momentum;
}

export function attributeMomentum(
  dailyEffort: DailyMomentumInput[],
  todayKey: string,
): AttributeMomentum[] {
  const bySub = momentumBySubattribute(dailyEffort, todayKey);
  return DIMENSION_ORDER.map((dimensionId) => {
    const subattributes = SUBS_BY_DIM[dimensionId].map((subId) => ({
      subId,
      momentum: bySub[subId] ?? 0,
    }));
    const sum = subattributes.reduce((acc, sub) => acc + sub.momentum, 0);
    return {
      dimensionId,
      momentum: Math.round(sum / subattributes.length),
      subattributes,
    };
  });
}

export interface TaskRewardBreakdown {
  /** Per-sub rewards in the same order as the input list. */
  perSub: { sub_id: TaskSub['sub_id']; stars: Difficulty; xp: number; coins: number }[];
  /** Sum across subs. */
  total: { xp: number; coins: number };
  /** Sum of stars across subs. */
  totalStars: number;
}

export function rewardForTaskSubs(
  subs: TaskSub[],
): TaskRewardBreakdown {
  let totalXp = 0;
  let totalCoins = 0;
  let totalStars = 0;
  const perSub: TaskRewardBreakdown['perSub'] = [];
  for (const s of subs) {
    const base = REWARD_BY_DIFFICULTY[s.stars];
    const xp = base.xp;
    const coins = base.coins;
    perSub.push({ sub_id: s.sub_id, stars: s.stars, xp, coins });
    totalXp += xp;
    totalCoins += coins;
    totalStars += s.stars;
  }
  return {
    perSub,
    total: { xp: totalXp, coins: totalCoins },
    totalStars,
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
