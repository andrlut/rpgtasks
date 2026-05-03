import { tokens } from './tokens';

interface CategoryMeta {
  label: string;
  color: string;
  bg: string;
  icon: string;
}

/**
 * Visual identity for quest_template categories. Falls back to a generic
 * brand-violet look for unknown categories so new strings don't crash.
 */
export const QUEST_CATEGORY_META: Record<string, CategoryMeta> = {
  fitness: {
    label: 'Fitness',
    color: tokens.dimension.strength,
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
