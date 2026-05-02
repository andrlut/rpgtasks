import type { RewardCategory } from '@/lib/db/types';

import { tokens } from './tokens';

interface CategoryMeta {
  label: string;
  short: string;
  tagline: string;
  icon: string;
  color: string;
  bg: string;
}

export const REWARD_CATEGORY_META: Record<RewardCategory, CategoryMeta> = {
  indulgence: {
    label: 'Indulgences',
    short: 'Indulge',
    tagline: 'Quick treats. Earn it, enjoy it.',
    icon: 'flash',
    color: tokens.semantic.coin,
    bg: 'rgba(255, 200, 61, 0.16)',
  },
  good: {
    label: 'Goods',
    short: 'Goods',
    tagline: 'Save up. Buy the thing.',
    icon: 'bag-handle',
    color: tokens.brand.violet2,
    bg: 'rgba(155, 130, 255, 0.16)',
  },
  experience: {
    label: 'Experiences',
    short: 'Experiences',
    tagline: 'Memories, not stuff.',
    icon: 'sparkles',
    color: tokens.dimension.social,
    bg: 'rgba(77, 208, 255, 0.16)',
  },
};

export const REWARD_CATEGORY_ORDER: RewardCategory[] = [
  'indulgence',
  'good',
  'experience',
];
