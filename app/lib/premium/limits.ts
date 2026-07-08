/**
 * Free-tier creation limits (P1.1). Premium = unlimited. These mirror the
 * server-side `BEFORE INSERT` triggers added in the P1.1 migration — keep the
 * two in lockstep. "Active" = not archived (tasks/rewards) / not a terminal
 * status (quests) / user-owned (skills).
 */
export const FREE_LIMITS = {
  task: 10,
  reward: 5,
  skill: 3,
  quest: 3,
} as const;

export type LimitedEntity = keyof typeof FREE_LIMITS;

export interface EntityLimit {
  entity: LimitedEntity;
  /** Current active count for the free user. */
  count: number;
  /** The free-tier cap for this entity. */
  limit: number;
  /** Premium → no cap. */
  unlimited: boolean;
  /** Free user is at or over the cap — creation should be blocked. */
  atLimit: boolean;
  /** Free user is within the last ~20% (>=80% of cap) — drives the counter
   *  badge on the create button. Always false for premium. */
  near: boolean;
}

/**
 * Detects the server-side free-limit rejection raised by the P1.1 triggers
 * (`raise exception 'free_limit_reached' ... detail=<entity>, hint='free_limit'`)
 * and returns which entity hit the cap — so a create form's error handler can
 * pop the limit modal instead of surfacing a raw "erro desconhecido" / SQL
 * code. Returns null for any unrelated error.
 */
export function freeLimitEntity(err: unknown): LimitedEntity | null {
  const e = err as { message?: string; hint?: string; details?: string } | null;
  if (!e || (e.hint !== 'free_limit' && e.message !== 'free_limit_reached')) {
    return null;
  }
  const d = e.details;
  return d === 'task' || d === 'reward' || d === 'skill' || d === 'quest' ? d : null;
}

export function computeEntityLimit(
  entity: LimitedEntity,
  count: number,
  isPremium: boolean,
): EntityLimit {
  const limit = FREE_LIMITS[entity];
  const unlimited = isPremium;
  const nearThreshold = Math.ceil(limit * 0.8);
  return {
    entity,
    count,
    limit,
    unlimited,
    atLimit: !unlimited && count >= limit,
    near: !unlimited && count >= nearThreshold,
  };
}
