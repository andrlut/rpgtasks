import type { DimensionId, SubId } from '@/lib/db/types';
import { DIMENSION_META, SUB_META } from '@/theme/dimensions';

import { translate, useT } from './index';

export interface TranslatedDimMeta {
  id: DimensionId;
  color: string;
  bg: string;
  iconName: string;
  label: string;
  tagline: string;
  description: string;
  examples: string[];
}

export interface TranslatedSubMeta {
  id: SubId;
  iconName: string;
  dimensionId: DimensionId;
  label: string;
  /** 1-line headline, always visible. */
  summary: string;
  /** Full paragraph: what does this domain cover. */
  definition: string;
  /** Day-to-day at 0-1 (concrete signs, no judgment). */
  low: string;
  /** Day-to-day at 2-3 (honestly mediocre, ambiguous). */
  mid: string;
  /** Day-to-day at 4-5 (concrete signs of flourishing). */
  high: string;
}

/**
 * Combine the static visual meta (color, bg, icon) with the locale-aware
 * text fields (label, tagline, description, examples).
 *
 * Use the hook variants in components — they re-render when the user toggles
 * the language. The plain `getDim*` / `getSub*` helpers exist for non-React
 * call sites (queries, derivation utilities) and read the current locale
 * once without subscribing.
 */

function dimFromTranslate(
  id: DimensionId,
  t: (key: string, opts?: Record<string, string | number | undefined>) => string,
): TranslatedDimMeta {
  const base = DIMENSION_META[id];
  // i18n-js looks up array values directly via t(...), so this returns the
  // already-translated array reference (still typed loosely as `unknown` by
  // the lib, but safe at runtime).
  const examples = (translate(`dimensions.${id}.examples`) as unknown as string[]) ?? [];
  return {
    id,
    color: base.color,
    bg: base.bg,
    iconName: base.iconName,
    label: t(`dimensions.${id}.label`),
    tagline: t(`dimensions.${id}.tagline`),
    description: t(`dimensions.${id}.description`),
    examples,
  };
}

function subFromTranslate(
  id: SubId,
  t: (key: string, opts?: Record<string, string | number | undefined>) => string,
): TranslatedSubMeta {
  const base = SUB_META[id];
  return {
    id,
    iconName: base.iconName,
    dimensionId: base.dimensionId,
    label: t(`subs.${id}.label`),
    summary: t(`subs.${id}.summary`),
    definition: t(`subs.${id}.definition`),
    low: t(`subs.${id}.low`),
    mid: t(`subs.${id}.mid`),
    high: t(`subs.${id}.high`),
  };
}

export function useDimMeta(id: DimensionId): TranslatedDimMeta {
  const { t } = useT();
  return dimFromTranslate(id, t);
}

export function useSubMeta(id: SubId): TranslatedSubMeta {
  const { t } = useT();
  return subFromTranslate(id, t);
}

/**
 * Convenience hook that returns lookup functions, useful when a component
 * needs meta for several dimensions/subs from a list. One hook call, many
 * lookups.
 */
export function useMetaLookup() {
  const { t } = useT();
  return {
    dim: (id: DimensionId) => dimFromTranslate(id, t),
    sub: (id: SubId) => subFromTranslate(id, t),
    score: (score: number) => t(`subScoreLabels.${score}`),
  };
}

/** Non-React access. Reads from the current locale. */
export function getDimMeta(id: DimensionId): TranslatedDimMeta {
  return dimFromTranslate(id, translate);
}

/** Non-React access. Reads from the current locale. */
export function getSubMeta(id: SubId): TranslatedSubMeta {
  return subFromTranslate(id, translate);
}

export function getSubScoreLabel(score: number): string {
  return translate(`subScoreLabels.${score}`);
}
