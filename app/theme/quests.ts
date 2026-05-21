import type { SubId } from '@/lib/db/types';

import { DIMENSION_META, SUB_META } from './dimensions';
import { tokens } from './tokens';

interface CategoryMeta {
  label: string;
  color: string;
  bg: string;
  icon: string;
}

/**
 * Sub-name → CategoryMeta derived from `SUB_META.dimensionId` →
 * `DIMENSION_META`. Built once at module load so callers don't recompute.
 */
function subCategory(subId: SubId, label: string): CategoryMeta {
  const sub = SUB_META[subId];
  const dim = DIMENSION_META[sub.dimensionId];
  return {
    label,
    color: dim.color,
    bg: dim.bg,
    icon: sub.iconName,
  };
}

/**
 * Visual identity for quest_template categories. Two naming conventions
 * coexist in the catalog:
 *   - Legacy (pre-v3, PR #148): dimension-named — fitness, mind, wealth, etc.
 *   - V3 catalog: sub-named — sleep, nutrition, strength, learn, etc.
 * Both resolve here. Unknown categories fall back to brand-violet.
 */
export const QUEST_CATEGORY_META: Record<string, CategoryMeta> = {
  // ── v3 sub-named categories (12) ──────────────────────────────────────
  sleep: subCategory('sleep', 'Sleep'),
  nutrition: subCategory('nutrition', 'Nutrition'),
  strength: subCategory('strength', 'Strength'),
  dexterity: subCategory('dexterity', 'Dexterity'),
  learn: subCategory('learn', 'Learn'),
  contemplate: subCategory('contemplate', 'Contemplate'),
  money: subCategory('money', 'Money'),
  career: subCategory('career', 'Career'),
  circle: subCategory('circle', 'Circle'),
  romance: subCategory('romance', 'Romance'),
  play: subCategory('play', 'Play'),
  build: subCategory('build', 'Build'),

  // ── Legacy dimension-named categories (pre-v3) ───────────────────────
  fitness: {
    label: 'Fitness',
    color: tokens.dimension.body,
    bg: 'rgba(255, 138, 61, 0.16)',
    icon: 'fitness',
  },
  mind: {
    label: 'Mind',
    color: tokens.dimension.mind,
    bg: 'rgba(176, 123, 255, 0.18)',
    icon: 'sparkles',
  },
  health: {
    label: 'Health',
    color: tokens.dimension.health,
    bg: 'rgba(255, 107, 122, 0.16)',
    icon: 'heart',
  },
  wealth: {
    label: 'Wealth',
    color: tokens.dimension.wealth,
    bg: 'rgba(255, 200, 61, 0.16)',
    icon: 'cash',
  },
  bonds: {
    label: 'Bonds',
    color: tokens.dimension.bonds,
    bg: 'rgba(77, 208, 255, 0.16)',
    icon: 'people',
  },
  craft: {
    label: 'Craft',
    color: tokens.dimension.craft,
    bg: 'rgba(46, 196, 182, 0.16)',
    icon: 'color-palette',
  },
};

export function getQuestCategoryMeta(category: string): CategoryMeta {
  return (
    QUEST_CATEGORY_META[category] ?? {
      label: category,
      color: tokens.brand.violet2,
      bg: 'rgba(123, 92, 255, 0.16)',
      icon: 'flag',
    }
  );
}

/** Display order for category groupings on the board — keeps it scannable. */
export const QUEST_CATEGORY_ORDER: string[] = [
  // v3 first
  'sleep', 'nutrition', 'strength', 'dexterity',
  'learn', 'contemplate', 'money', 'career',
  'circle', 'romance', 'play', 'build',
  // Legacy after
  'health', 'fitness', 'mind', 'wealth', 'bonds', 'craft',
];
