import type { DimensionId } from '@/lib/db/types';

import { tokens } from './tokens';

export const DIMENSION_META: Record<
  DimensionId,
  { label: string; color: string; bg: string; iconName: string }
> = {
  health: {
    label: 'Health',
    color: tokens.dimension.health,
    bg: tokens.dimensionBg.health,
    iconName: 'heart',
  },
  strength: {
    label: 'Strength',
    color: tokens.dimension.strength,
    bg: tokens.dimensionBg.strength,
    iconName: 'fitness',
  },
  mind: {
    label: 'Mind',
    color: tokens.dimension.mind,
    bg: tokens.dimensionBg.mind,
    iconName: 'sparkles',
  },
  wealth: {
    label: 'Wealth',
    color: tokens.dimension.wealth,
    bg: tokens.dimensionBg.wealth,
    iconName: 'cash',
  },
  social: {
    label: 'Social',
    color: tokens.dimension.social,
    bg: tokens.dimensionBg.social,
    iconName: 'people',
  },
  discipline: {
    label: 'Discipline',
    color: tokens.dimension.discipline,
    bg: tokens.dimensionBg.discipline,
    iconName: 'shield',
  },
};

export const DIMENSION_ORDER: DimensionId[] = [
  'health',
  'strength',
  'mind',
  'wealth',
  'social',
  'discipline',
];
