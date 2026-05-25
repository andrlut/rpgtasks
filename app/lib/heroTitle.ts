import type { DimensionId } from '@/lib/db/types';

/**
 * 5-tier rank ladder for the hero header eyebrow. Tied to total level
 * (not per-dim level) because the eyebrow shows the user's overall
 * standing — the dim label that prefixes it expresses *which* identity
 * is leading the way.
 *
 * Breakpoints (inclusive):
 *   apprentice   1-5
 *   journeyman   6-15
 *   adept        16-30
 *   expert       31-50
 *   master       51+
 */
export type HeroTier =
  | 'apprentice'
  | 'journeyman'
  | 'adept'
  | 'expert'
  | 'master';

export function heroTier(level: number): HeroTier {
  if (level <= 5) return 'apprentice';
  if (level <= 15) return 'journeyman';
  if (level <= 30) return 'adept';
  if (level <= 50) return 'expert';
  return 'master';
}

const TIER_LABELS_PT: Record<HeroTier, string> = {
  apprentice: 'Aprendiz',
  journeyman: 'Aventureiro',
  adept: 'Adepto',
  expert: 'Especialista',
  master: 'Mestre',
};

const TIER_LABELS_EN: Record<HeroTier, string> = {
  apprentice: 'Apprentice',
  journeyman: 'Journeyman',
  adept: 'Adept',
  expert: 'Expert',
  master: 'Master',
};

export function tierLabel(tier: HeroTier, locale: 'pt' | 'en'): string {
  return (locale === 'pt' ? TIER_LABELS_PT : TIER_LABELS_EN)[tier];
}

/**
 * Compose the eyebrow title text. Caller passes the localized dim label
 * (from metaLookup.dim) so this helper stays free of i18n coupling.
 *
 * Example output (en): "Body Apprentice", "Mind Master"
 * Example output (pt): "Corpo Aprendiz", "Mente Mestre"
 *
 * Returns just the tier label if no dim is provided (new account state).
 */
export function heroTitle(
  level: number,
  dimLabel: string | null,
  locale: 'pt' | 'en',
): string {
  const tier = tierLabel(heroTier(level), locale);
  return dimLabel ? `${dimLabel} ${tier}` : tier;
}

/** Re-exported for symmetry — call sites can stay tidy. */
export type { DimensionId };
