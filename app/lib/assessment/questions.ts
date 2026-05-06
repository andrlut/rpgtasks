import type { SubId } from '@/lib/db/types';

/**
 * Questionnaire catalog — 12 subs × 2 questions = 24 total.
 *
 * Each pair follows the same pattern:
 *   Q1 — comportamento: frequência ancorada em janela natural (semana / mês)
 *        com critério mínimo concreto (20 min movement, 30 min build, etc.).
 *        Quem cumpre o critério está minimamente no jogo daquela skill.
 *   Q2 — resultado funcional: outcome com referente observável no dia a dia.
 *        Atua como teto natural contra overdo (treina demais e se machuca,
 *        poupa demais e vive ansioso, etc.).
 *
 * Internally each option maps to 1..5. The user only sees the textual labels
 * — numbers are kept invisible to reduce middle-of-the-scale satisficing.
 *
 * Math (mirror of the SQL RPC submit_questionnaire):
 *   per question: normalized = (raw - 1) / 4   [reverse: raw = 6 - raw first]
 *   per sub:      score = floor(mean(normalized) * 5)   [0..5]
 *
 * NOTE: Q1 thresholds (20 min, 30 min, etc.) are tentative and will be
 * reconciled with the population-data skill tiers being designed in parallel.
 * When those land, we may tighten the cutoffs here to match the lowest tier
 * of each sub's skills. The structure of this file does not need to change.
 */

export type QuestionSource =
  | 'WHO-5'
  | 'PERMA'
  | 'Gallup'
  | 'WheelOfLife'
  | 'custom';

export interface Question {
  /** Stable identifier — never rename, used by raw answer rows in DB. */
  id: string;
  /** Statement or question shown to the user. */
  prompt: string;
  /** 5 textual options, in ascending order from raw=1 to raw=5. */
  options: [string, string, string, string, string];
  /** When true, raw is inverted (5 = worst) before normalization. */
  reverse?: boolean;
  /** Which sub this question contributes to. Currently 1-pra-1, 2 per sub. */
  sub_id: SubId;
  /** Inspiration / lineage for transparency. Most are custom adaptations. */
  source: QuestionSource;
}

// ─── Catalog ───────────────────────────────────────────────────────────────
// 12 pairs, in the same dim/sub order used everywhere else (see DIMENSION_ORDER).
// RAW preserves the literal id union for QuestionId; QUESTIONS is exposed as
// readonly Question[] so consumers can read optional fields like `reverse`
// without TS narrowing them away.

const RAW_QUESTIONS = [
  // ── Health / Sleep ──────────────────────────────────────────────────────
  {
    id: 'sleep_consistent',
    sub_id: 'sleep',
    source: 'custom',
    prompt:
      'Em uma semana típica, em quantas noites você dorme 7 horas ou mais?',
    options: [
      'Nenhuma ou quase nenhuma',
      '1-2 noites',
      '3-4 noites',
      '5-6 noites',
      'Quase toda noite',
    ],
  },
  {
    id: 'sleep_rested',
    sub_id: 'sleep',
    source: 'WHO-5',
    prompt:
      'Acordo descansado e sustento minha energia ao longo do dia, sem precisar de cafeína pra funcionar.',
    options: [
      'Quase nunca',
      'Raramente',
      'Mais ou menos',
      'Maioria dos dias',
      'Quase todo dia',
    ],
  },

  // ── Health / Nutrition ──────────────────────────────────────────────────
  {
    id: 'nutrition_real_meals',
    sub_id: 'nutrition',
    source: 'custom',
    prompt:
      'Em uma semana típica, em quantos dias você faz refeições reais (sem fast food, sem pular refeição)?',
    options: [
      '0-1 dias',
      '2 dias',
      '3-4 dias',
      '5-6 dias',
      'Praticamente todos',
    ],
  },
  {
    id: 'nutrition_relationship',
    sub_id: 'nutrition',
    source: 'custom',
    prompt:
      'Minha relação com comida é tranquila — sem culpa, sem obsessão, sem compulsão.',
    options: [
      'Discordo totalmente',
      'Discordo',
      'Mais ou menos',
      'Concordo',
      'Concordo totalmente',
    ],
  },

  // ── Body / Strength ─────────────────────────────────────────────────────
  {
    id: 'strength_frequency',
    sub_id: 'strength',
    source: 'custom',
    prompt:
      'Em uma semana típica, em quantos dias você faz atividade física que tira do sedentarismo (treino de força, cardio, esporte) por 20+ minutos?',
    options: [
      'Nunca ou quase nunca',
      '1 dia',
      '2 dias',
      '3-4 dias',
      '5+ dias',
    ],
  },
  {
    id: 'strength_capable',
    sub_id: 'strength',
    source: 'custom',
    prompt:
      'Meu corpo se sente forte e capaz no dia a dia — subo escada, carrego peso, jogo um esporte sem travar.',
    options: [
      'Nem um pouco',
      'Pouco',
      'Mais ou menos',
      'Bastante',
      'Totalmente',
    ],
  },

  // ── Body / Dexterity ────────────────────────────────────────────────────
  {
    id: 'dexterity_practice',
    sub_id: 'dexterity',
    source: 'custom',
    prompt:
      'Em uma semana típica, em quantos dias você dedica 10+ minutos a mobilidade, alongamento ou postura consciente?',
    options: ['Nunca', '1 dia', '2 dias', '3-4 dias', '5+ dias'],
  },
  {
    id: 'dexterity_painfree',
    sub_id: 'dexterity',
    source: 'custom',
    prompt:
      'Me movo sem dor, com boa amplitude e coordenação — não trinco, não travo, não compenso.',
    options: [
      'Nem um pouco',
      'Pouco',
      'Mais ou menos',
      'Bastante',
      'Totalmente',
    ],
  },

  // ── Mind / Learn ────────────────────────────────────────────────────────
  {
    id: 'learn_frequency',
    sub_id: 'learn',
    source: 'custom',
    prompt:
      'Em uma semana típica, em quantos dias você dedica 20+ minutos a leitura ou estudo intencional?',
    options: ['Nunca', '1 dia', '2-3 dias', '4-5 dias', 'Quase todo dia'],
  },
  {
    id: 'learn_applied',
    sub_id: 'learn',
    source: 'custom',
    prompt:
      'O que aprendo encontra uso — aplico, ensino ou conecto com algo que faço.',
    options: [
      'Quase nunca',
      'Raramente',
      'Às vezes',
      'Frequentemente',
      'Quase sempre',
    ],
  },

  // ── Mind / Contemplate ──────────────────────────────────────────────────
  {
    id: 'contemplate_practice',
    sub_id: 'contemplate',
    source: 'custom',
    prompt:
      'Em uma semana típica, em quantos dias você faz pausa consciente, meditação ou journaling por 5+ minutos?',
    options: ['Nunca', '1 dia', '2-3 dias', '4-5 dias', 'Quase todo dia'],
  },
  {
    id: 'contemplate_anchored',
    sub_id: 'contemplate',
    source: 'PERMA',
    prompt:
      'Em momentos de estresse, consigo me ancorar — não saio do eixo facilmente.',
    options: [
      'Quase nunca',
      'Raramente',
      'Mais ou menos',
      'Maioria das vezes',
      'Quase sempre',
    ],
  },

  // ── Wealth / Money ──────────────────────────────────────────────────────
  {
    id: 'money_savings_months',
    sub_id: 'money',
    source: 'custom',
    prompt:
      'Nos últimos 12 meses, em quantos meses sobrou dinheiro pra você poupar ou investir?',
    options: ['Nenhum', '1-3 meses', '4-6 meses', '7-9 meses', '10+ meses'],
  },
  {
    id: 'money_no_anxiety',
    sub_id: 'money',
    source: 'custom',
    prompt:
      'Dinheiro não é fonte constante de ansiedade — tenho colchão e respiro com tranquilidade.',
    options: [
      'Discordo totalmente',
      'Discordo',
      'Neutro',
      'Concordo',
      'Concordo totalmente',
    ],
  },

  // ── Wealth / Career ─────────────────────────────────────────────────────
  {
    id: 'career_deep_work',
    sub_id: 'career',
    source: 'Gallup',
    prompt:
      'Em uma semana típica, em quantos dias você consegue blocos de 60+ minutos de deep work em algo que importa pra sua carreira?',
    options: ['Nenhum', '1 dia', '2 dias', '3-4 dias', '5+ dias'],
  },
  {
    id: 'career_energy_left',
    sub_id: 'career',
    source: 'custom',
    prompt:
      'Sobra energia minha pra vida fora do trabalho — não chego em casa zerado.',
    options: [
      'Quase nunca',
      'Raramente',
      'Mais ou menos',
      'Maioria dos dias',
      'Quase todo dia',
    ],
  },

  // ── Bonds / Circle ──────────────────────────────────────────────────────
  {
    id: 'circle_meaningful_convos',
    sub_id: 'circle',
    source: 'custom',
    prompt:
      'Em uma semana típica, quantas vezes você tem uma conversa significativa (não só logística) com família ou amigos?',
    options: [
      'Nenhuma',
      '1 vez',
      '2-3 vezes',
      '4-5 vezes',
      'Praticamente todo dia',
    ],
  },
  {
    id: 'circle_close',
    sub_id: 'circle',
    source: 'PERMA',
    prompt:
      'Me sinto genuinamente próximo das pessoas importantes pra mim — alguém me conhece de verdade.',
    options: [
      'Discordo totalmente',
      'Discordo',
      'Mais ou menos',
      'Concordo',
      'Concordo totalmente',
    ],
  },

  // ── Bonds / Romance ─────────────────────────────────────────────────────
  // The romance pair is intentionally inclusive of single-by-choice users:
  // Q2 phrasing "satisfeito com como está" lets a content single person
  // anchor at 4-5 even with a low Q1, capping their score at 2-3 — which
  // is honest: low investment in this dim, even if life is good elsewhere.
  {
    id: 'romance_frequency',
    sub_id: 'romance',
    source: 'custom',
    prompt:
      'Em um mês típico, com que frequência você tem momentos reais de conexão romântica (parceria, encontros, intimidade, presença)?',
    options: [
      'Nenhuma vez',
      '1 vez',
      '2-3 vezes',
      '4-7 vezes',
      'Mais que isso',
    ],
  },
  {
    id: 'romance_satisfied',
    sub_id: 'romance',
    source: 'PERMA',
    prompt:
      'Minha vida romântica está em um lugar bom — me sinto satisfeito com como está hoje.',
    options: [
      'Discordo totalmente',
      'Discordo',
      'Neutro',
      'Concordo',
      'Concordo totalmente',
    ],
  },

  // ── Craft / Play ────────────────────────────────────────────────────────
  {
    id: 'play_frequency',
    sub_id: 'play',
    source: 'custom',
    prompt:
      'Em uma semana típica, quantas vezes você tem momentos só pra curtir um hobby/jogo/criativo, sem objetivo, sem produzir nada?',
    options: [
      'Nenhuma',
      '1 vez',
      '2-3 vezes',
      '4-5 vezes',
      'Quase todo dia',
    ],
  },
  {
    id: 'play_recharges',
    sub_id: 'play',
    source: 'PERMA',
    prompt:
      'Curtir hobby ou brincar me recarrega de verdade — termino mais leve, não mais cansado.',
    options: [
      'Discordo totalmente',
      'Discordo',
      'Neutro',
      'Concordo',
      'Concordo totalmente',
    ],
  },

  // ── Craft / Build ───────────────────────────────────────────────────────
  {
    id: 'build_frequency',
    sub_id: 'build',
    source: 'custom',
    prompt:
      'Em uma semana típica, em quantos dias você dedica 30+ minutos a um projeto pessoal (criativo, técnico, manual)?',
    options: ['Nenhum', '1 dia', '2 dias', '3-4 dias', '5+ dias'],
  },
  {
    id: 'build_ships',
    sub_id: 'build',
    source: 'custom',
    prompt:
      'Termino e compartilho coisas que começo — não acumulo só projetos abandonados.',
    options: [
      'Quase nunca',
      'Raramente',
      'Às vezes',
      'Frequentemente',
      'Quase sempre',
    ],
  },
] as const satisfies readonly Question[];

export type QuestionId = (typeof RAW_QUESTIONS)[number]['id'];

export const QUESTIONS: readonly Question[] = RAW_QUESTIONS;

/** Fast lookup by id. */
export const QUESTIONS_BY_ID = new Map(QUESTIONS.map((q) => [q.id, q]));

/** Group questions by sub. Two per sub, in catalog order. */
export const QUESTIONS_BY_SUB: Record<SubId, Question[]> = QUESTIONS.reduce(
  (acc, q) => {
    (acc[q.sub_id] ??= []).push(q);
    return acc;
  },
  {} as Record<SubId, Question[]>,
);
