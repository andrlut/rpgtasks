import type { DimensionId, SubId } from '@/lib/db/types';

import { tokens } from './tokens';

interface DimensionMeta {
  label: string;
  color: string;
  bg: string;
  iconName: string;
  tagline: string;
  description: string;
  examples: string[];
}

export const DIMENSION_META: Record<DimensionId, DimensionMeta> = {
  health: {
    label: 'Health',
    color: tokens.dimension.health,
    bg: tokens.dimensionBg.health,
    iconName: 'heart',
    tagline: 'Your body is the vessel.',
    description:
      'The base layer: sleep + nutrition. Recovery and fuel are what every other dimension stands on. Without these, the rest crumbles.',
    examples: [
      'Sleep 7+ hours',
      'Drink 2L of water',
      'Eat a real meal (no junk)',
      'No screens 1h before bed',
    ],
  },
  strength: {
    label: 'Strength',
    color: tokens.dimension.strength,
    bg: tokens.dimensionBg.strength,
    iconName: 'fitness',
    tagline: 'Earned, not given.',
    description:
      'Movement + dexterity. Cardio, lifting, sport, mobility. The visible proof of consistency over time.',
    examples: [
      '20 push-ups',
      'Run 5km',
      'Climb / sport / martial art',
      'Mobility 10 min',
    ],
  },
  mind: {
    label: 'Mind',
    color: tokens.dimension.mind,
    bg: tokens.dimensionBg.mind,
    iconName: 'sparkles',
    tagline: 'Sharpen the blade.',
    description:
      'Learn + contemplate. Reading, deep work, study, meditation, journaling. What you compound here multiplies what you can do everywhere else.',
    examples: [
      'Read for 20 minutes',
      'Meditate 10 min',
      'Study or take a course',
      '90 min of deep work',
    ],
  },
  wealth: {
    label: 'Wealth',
    color: tokens.dimension.wealth,
    bg: tokens.dimensionBg.wealth,
    iconName: 'cash',
    tagline: 'Future-you needs this.',
    description:
      'Money + career. Earning, saving, investing, shipping. Small reps here are worth far more than big sporadic moves.',
    examples: [
      "Log today's expenses",
      'Review the budget',
      'Save / invest a fixed amount',
      '90 min on a side project',
    ],
  },
  bonds: {
    label: 'Bonds',
    color: tokens.dimension.bonds,
    bg: tokens.dimensionBg.bonds,
    iconName: 'people',
    tagline: "Don't solo this game.",
    description:
      'Friends, family + romance. Highest-yield long-term investment. Easy to skip; expensive to skip for years.',
    examples: [
      'Call / message family',
      'Have lunch with a friend',
      'Quality time with partner',
      'Show up to a gathering',
    ],
  },
  craft: {
    label: 'Craft',
    color: tokens.dimension.craft,
    bg: tokens.dimensionBg.craft,
    iconName: 'color-palette',
    tagline: 'Make something.',
    description:
      'Play + build. Hobbies, creative work, side-projects. The dimension that makes life worth the grind everywhere else.',
    examples: [
      'Hobby session 30 min',
      'Ship something on a side project',
      'Practice an instrument',
      'Finish a creative piece',
    ],
  },
};

export const DIMENSION_ORDER: DimensionId[] = [
  'health',
  'strength',
  'mind',
  'wealth',
  'bonds',
  'craft',
];

interface SubMeta {
  label: string;
  iconName: string;
  dimensionId: DimensionId;
  description: string;
}

export const SUB_META: Record<SubId, SubMeta> = {
  sleep: {
    label: 'Sleep', iconName: 'moon', dimensionId: 'health',
    description: 'How well-rested you feel. Hours, consistency, recovery.',
  },
  nutrition: {
    label: 'Nutrition', iconName: 'restaurant', dimensionId: 'health',
    description: 'Quality of what you eat and drink. Real food, hydration, restraint.',
  },
  movement: {
    label: 'Movement', iconName: 'walk', dimensionId: 'strength',
    description: 'Cardio, lifting, walking — the raw amount you move your body.',
  },
  dexterity: {
    label: 'Dexterity', iconName: 'body', dimensionId: 'strength',
    description: 'Coordination, mobility, sport skill — how well your body moves.',
  },
  learn: {
    label: 'Learn', iconName: 'book', dimensionId: 'mind',
    description: 'Reading, study, deep work — what you absorb and get better at.',
  },
  contemplate: {
    label: 'Contemplate', iconName: 'leaf', dimensionId: 'mind',
    description: 'Meditation, journaling, prayer — practices that quiet and ground you.',
  },
  money: {
    label: 'Money', iconName: 'wallet', dimensionId: 'wealth',
    description: 'Saving, budgeting, investing — your relationship with money.',
  },
  career: {
    label: 'Career', iconName: 'briefcase', dimensionId: 'wealth',
    description: 'Building skills, shipping, advancing your craft of work.',
  },
  circle: {
    label: 'Friends & Family', iconName: 'people', dimensionId: 'bonds',
    description: 'Family and friends — the relationships that show up over years.',
  },
  romance: {
    label: 'Romance', iconName: 'heart', dimensionId: 'bonds',
    description: 'Your romantic partnership — depth, presence, affection.',
  },
  play: {
    label: 'Play', iconName: 'game-controller', dimensionId: 'craft',
    description: 'Hobbies and creative time done for joy, no goal attached.',
  },
  build: {
    label: 'Build', iconName: 'construct', dimensionId: 'craft',
    description: 'Side-projects and creative work made to ship or share.',
  },
};

/** Generic anchor labels for the 0-5 self-assessment scale. */
export const SUB_SCORE_LABELS: Record<number, string> = {
  0: 'Missing',
  1: 'Struggling',
  2: 'Below',
  3: 'OK',
  4: 'Strong',
  5: 'Mastery',
};

/** Subs grouped by their parent dim, in display order. */
export const SUBS_BY_DIM: Record<DimensionId, SubId[]> = {
  health:   ['sleep', 'nutrition'],
  strength: ['movement', 'dexterity'],
  mind:     ['learn', 'contemplate'],
  wealth:   ['money', 'career'],
  bonds:    ['circle', 'romance'],
  craft:    ['play', 'build'],
};
