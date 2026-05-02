import type { DimensionId } from '@/lib/db/types';

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
      'The base layer. Sleep, hydration, nutrition, and recovery — everything else falls apart without this. Level it up by treating your body like the long-term asset it is.',
    examples: [
      'Drink 2L of water',
      'Sleep 8 hours',
      'Eat a real meal (no junk)',
      'Stretch / mobility 10 min',
    ],
  },
  strength: {
    label: 'Strength',
    color: tokens.dimension.strength,
    bg: tokens.dimensionBg.strength,
    iconName: 'fitness',
    tagline: 'Earned, not given.',
    description:
      'Physical training. Anything that builds muscle, stamina, power, or athletic capacity. The visible proof of consistency over time.',
    examples: [
      '20 push-ups',
      'Run 5km',
      'Lift weights',
      'Climb / sport / martial art',
    ],
  },
  mind: {
    label: 'Mind',
    color: tokens.dimension.mind,
    bg: tokens.dimensionBg.mind,
    iconName: 'sparkles',
    tagline: 'Sharpen the blade.',
    description:
      'Learning, focus, and mental clarity. Reading, deep work, study, meditation. Every level here compounds — what you learn this year multiplies what you can do next year.',
    examples: [
      'Read for 20 minutes',
      'Meditate 10 min',
      'Study or take a course',
      '90 min of deep, distraction-free work',
    ],
  },
  wealth: {
    label: 'Wealth',
    color: tokens.dimension.wealth,
    bg: tokens.dimensionBg.wealth,
    iconName: 'cash',
    tagline: 'Future-you needs this.',
    description:
      'Money habits — earning, saving, investing, tracking. Not about being rich, about being free. Small reps here are worth far more than big sporadic moves.',
    examples: [
      'Log today\'s expenses',
      'Review the budget',
      'Save / invest a fixed amount',
      'Ship something that earns money',
    ],
  },
  social: {
    label: 'Social',
    color: tokens.dimension.social,
    bg: tokens.dimensionBg.social,
    iconName: 'people',
    tagline: 'Don\'t solo this game.',
    description:
      'Relationships are the highest-yield long-term investment. Reaching out, showing up, listening, deepening bonds. Easy to skip; expensive to skip for years.',
    examples: [
      'Call / message a friend',
      'Have lunch with someone',
      'Show up to a gathering',
      'Help someone unprompted',
    ],
  },
  discipline: {
    label: 'Discipline',
    color: tokens.dimension.discipline,
    bg: tokens.dimensionBg.discipline,
    iconName: 'shield',
    tagline: 'The meta-skill.',
    description:
      'Showing up when you don\'t feel like it. Routines, consistency, doing the boring rep. Discipline isn\'t one habit — it\'s the muscle that keeps every other habit alive.',
    examples: [
      'Wake up at the planned time',
      'Stick to your routine',
      'Do the hardest task first',
      'No-screens hour before bed',
    ],
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
