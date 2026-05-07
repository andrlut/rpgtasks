import { getCurrentLocale, useT } from './index';

import type { LanguageCode } from '@/lib/settings';

/**
 * Pick the locale variant of a catalog string (PT or EN).
 *
 * Catalogs (dimension, skill, reward_template, quest_template, dimension_sub)
 * carry both `<field>` (EN, source of truth) and `<field>_pt`. This helper
 * does the lookup with sensible fallbacks:
 *
 *   - PT-BR locale → return _pt if non-empty, else fall back to EN
 *   - any other locale → return EN
 *
 * Use the hook variants in components — they re-render when the user toggles
 * the language. The plain `localized*` helpers exist for non-React call
 * sites and read the current locale once without subscribing.
 */

function pick(en: string | null | undefined, pt: string | null | undefined, locale: LanguageCode): string {
  if (locale === 'pt' && pt && pt.trim().length > 0) return pt;
  return en ?? '';
}

function pickNullable(
  en: string | null | undefined,
  pt: string | null | undefined,
  locale: LanguageCode,
): string | null {
  if (locale === 'pt' && pt && pt.trim().length > 0) return pt;
  return en ?? null;
}

export function localized(en: string, pt: string | null | undefined): string {
  return pick(en, pt, getCurrentLocale());
}

export function localizedNullable(
  en: string | null,
  pt: string | null,
): string | null {
  return pickNullable(en, pt, getCurrentLocale());
}

/**
 * Hook variant. Returns a `pick(en, pt) => string` function bound to the
 * current locale. Caches against the locale so consumers can call it many
 * times without re-allocating.
 */
export function useLocalizedPick() {
  const { locale } = useT();
  return {
    pick: (en: string, pt: string | null | undefined) => pick(en, pt, locale),
    pickNullable: (en: string | null, pt: string | null) =>
      pickNullable(en, pt, locale),
  };
}
