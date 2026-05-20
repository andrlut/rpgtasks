import type { DimensionId, SubId } from '@/lib/db/types';

import { tokens } from './tokens';

/**
 * Visual metadata for the 6 dimensions. Text fields (label, tagline,
 * description, examples) live in the i18n catalogs and are read via
 * `useDimMeta` / `getDimMeta` from `@/lib/i18n/meta`.
 */
interface DimensionMeta {
  color: string;
  bg: string;
  iconName: string;
}

export const DIMENSION_META: Record<DimensionId, DimensionMeta> = {
  health: {
    color: tokens.dimension.health,
    bg: tokens.dimensionBg.health,
    iconName: 'heart',
  },
  body: {
    color: tokens.dimension.body,
    bg: tokens.dimensionBg.body,
    iconName: 'fitness',
  },
  mind: {
    color: tokens.dimension.mind,
    bg: tokens.dimensionBg.mind,
    iconName: 'sparkles',
  },
  wealth: {
    color: tokens.dimension.wealth,
    bg: tokens.dimensionBg.wealth,
    iconName: 'cash',
  },
  bonds: {
    color: tokens.dimension.bonds,
    bg: tokens.dimensionBg.bonds,
    iconName: 'people',
  },
  craft: {
    color: tokens.dimension.craft,
    bg: tokens.dimensionBg.craft,
    iconName: 'color-palette',
  },
};

export const DIMENSION_ORDER: DimensionId[] = [
  'health',
  'body',
  'mind',
  'wealth',
  'bonds',
  'craft',
];

interface SubMeta {
  iconName: string;
  dimensionId: DimensionId;
}

export const SUB_META: Record<SubId, SubMeta> = {
  sleep: { iconName: 'moon', dimensionId: 'health' },
  nutrition: { iconName: 'restaurant', dimensionId: 'health' },
  strength: { iconName: 'barbell', dimensionId: 'body' },
  dexterity: { iconName: 'flash', dimensionId: 'body' },
  learn: { iconName: 'book', dimensionId: 'mind' },
  contemplate: { iconName: 'leaf', dimensionId: 'mind' },
  money: { iconName: 'wallet', dimensionId: 'wealth' },
  career: { iconName: 'briefcase', dimensionId: 'wealth' },
  circle: { iconName: 'people', dimensionId: 'bonds' },
  romance: { iconName: 'heart', dimensionId: 'bonds' },
  play: { iconName: 'game-controller', dimensionId: 'craft' },
  build: { iconName: 'construct', dimensionId: 'craft' },
};

/** Subs grouped by their parent dim, in display order. */
export const SUBS_BY_DIM: Record<DimensionId, SubId[]> = {
  health:   ['sleep', 'nutrition'],
  body:     ['strength', 'dexterity'],
  mind:     ['learn', 'contemplate'],
  wealth:   ['money', 'career'],
  bonds:    ['circle', 'romance'],
  craft:    ['play', 'build'],
};
