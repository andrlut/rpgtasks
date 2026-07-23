/**
 * Perceva Premium — client-side constants for the P1 conversion layer.
 *
 * P1 has NO payment gateway (RevenueCat lands in P2), but since P1.1 the
 * free-tier limits and the instrument gate ARE enforced server-side (BEFORE
 * INSERT triggers — see migration 20260707000001_premium_free_limits_p1_1 and
 * limits.ts). This file holds the feature flags, hardcoded plan pricing
 * metadata and the instrument-gate membership that the paywall UI reads.
 */

/**
 * Master kill-switch for the purchase CTA. While `false` the "Assinar" button
 * renders disabled with a "Em breve" label — the funnel is visible in preview
 * but nothing is purchasable and "Restaurar compras" stays hidden. Flips to
 * `true` in P2 once RevenueCat is wired.
 */
export const PURCHASES_ENABLED: boolean = false;

/**
 * Learn premium-content flag — see the §4 investigation in the PR. The
 * `learning_material` table has no premium column yet, so no article is gated
 * in P1: the LearnCard `isPremiumContent` prop defaults to `false` and this
 * stays `false` until André's publishing pipeline adds the flag/column.
 */
export const PREMIUM_LEARN_ENABLED: boolean = false;

export type PlanId = 'annual' | 'monthly';

export interface PremiumPlan {
  id: PlanId;
  /** Pre-selected + carries the "4 meses grátis" badge. */
  highlighted: boolean;
}

/**
 * Plan catalog. Copy (price, equivalence, badge) lives in i18n under
 * `premium.plan.<id>` so each locale formats its own currency string; the
 * screen receives this array as its source of truth so P2 can swap it for a
 * RevenueCat offering without touching the layout. Annual is pre-selected.
 */
export const PREMIUM_PLANS: readonly PremiumPlan[] = [
  { id: 'annual', highlighted: true },
  { id: 'monthly', highlighted: false },
] as const;

/**
 * Psych instruments behind the paywall. The self-assessment instruments
 * (`avaliacao_v1` / `avaliacao_v2`) are intentionally absent — they stay 100%
 * free. Decision (Artur, 2026-07-06): all six deep instruments are premium.
 */
export const PREMIUM_INSTRUMENT_IDS: ReadonlySet<string> = new Set([
  'big_five_120',
  'schwartz_pvq',
  'ecr_r',
  'disc',
  'strengths',
  'tipos',
]);

export function isInstrumentPremium(instrumentId: string): boolean {
  return PREMIUM_INSTRUMENT_IDS.has(instrumentId);
}

/**
 * Maps a psych instrument id → the slug used for its premium-teaser i18n keys
 * (`premium.teaser.<slug>.{title,line}`) and, later, analytics events.
 */
export const INSTRUMENT_TEASER_SLUG: Record<string, string> = {
  big_five_120: 'bigFive',
  schwartz_pvq: 'schwartz',
  ecr_r: 'ecrR',
  disc: 'disc',
  strengths: 'strengths',
  tipos: 'types',
};

/**
 * Where the premium screen was opened from. Logged to console in P1 (see
 * `premium.tsx`); becomes an analytics event in P3. The `?source=` route
 * param is validated against this union before use.
 */
export type PremiumSource =
  | 'limit-modal'
  | 'badge'
  | 'instrument'
  | 'settings'
  | 'learn';

const PREMIUM_SOURCES: readonly PremiumSource[] = [
  'limit-modal',
  'badge',
  'instrument',
  'settings',
  'learn',
] as const;

export function normalizePremiumSource(
  raw: string | string[] | undefined,
): PremiumSource | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value && (PREMIUM_SOURCES as readonly string[]).includes(value)
    ? (value as PremiumSource)
    : null;
}
