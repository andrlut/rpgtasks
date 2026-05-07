/**
 * Schwartz — narrative content bundle (PT + EN).
 *
 * Schwartz output is *rank-based*: every value matters to the user in
 * some degree, but the ipsative centering surfaces what matters MORE
 * and what matters LESS relative to the rest. So content is just a
 * label + one-line description per value (and per meta-value group).
 * No high/low buckets — narrative on the result screen frames the
 * ranking instead ("most central" / "you give up").
 */

export type SchwartzValue =
  | 'universalism_concern'
  | 'universalism_nature'
  | 'universalism_tolerance'
  | 'benevolence_caring'
  | 'benevolence_dependability'
  | 'humility'
  | 'achievement'
  | 'power_dominance'
  | 'power_resources'
  | 'face'
  | 'self_direction_thought'
  | 'self_direction_action'
  | 'stimulation'
  | 'hedonism'
  | 'security_personal'
  | 'security_societal'
  | 'tradition'
  | 'conformity_rules'
  | 'conformity_interpersonal';

export type SchwartzMeta =
  | 'self_transcendence'
  | 'self_enhancement'
  | 'openness_to_change'
  | 'conservation';

export type SchwartzLocale = 'pt' | 'en';

interface ValueContent {
  label: string;
  oneLiner: string;
}

interface MetaContent {
  label: string;
  oneLiner: string;
  /** The 4-6 child values, in display order. */
  values: SchwartzValue[];
}

const PT_VALUES: Record<SchwartzValue, ValueContent> = {
  universalism_concern: {
    label: 'Universalismo — Preocupação',
    oneLiner: 'Comprometimento com igualdade e justiça pra todos.',
  },
  universalism_nature: {
    label: 'Universalismo — Natureza',
    oneLiner: 'Cuidado com o meio ambiente e outras espécies.',
  },
  universalism_tolerance: {
    label: 'Universalismo — Tolerância',
    oneLiner: 'Aceitar e respeitar quem é diferente de você.',
  },
  benevolence_caring: {
    label: 'Benevolência — Cuidado',
    oneLiner: 'Devoção ao bem-estar das pessoas próximas.',
  },
  benevolence_dependability: {
    label: 'Benevolência — Confiabilidade',
    oneLiner: 'Ser membro confiável e leal do grupo próximo.',
  },
  humility: {
    label: 'Humildade',
    oneLiner: 'Reconhecer que você é apenas um entre tantos.',
  },
  achievement: {
    label: 'Conquista',
    oneLiner: 'Sucesso por meio de demonstrar competência.',
  },
  power_dominance: {
    label: 'Poder — Dominância',
    oneLiner: 'Influência e controle sobre as decisões dos outros.',
  },
  power_resources: {
    label: 'Poder — Recursos',
    oneLiner: 'Status que vem de dinheiro e bens materiais.',
  },
  face: {
    label: 'Imagem Pública',
    oneLiner: 'Manter respeito e evitar passar vergonha em público.',
  },
  self_direction_thought: {
    label: 'Autonomia — Pensamento',
    oneLiner: 'Liberdade pra formar suas próprias opiniões.',
  },
  self_direction_action: {
    label: 'Autonomia — Ação',
    oneLiner: 'Liberdade pra escolher seu próprio caminho.',
  },
  stimulation: {
    label: 'Estimulação',
    oneLiner: 'Aventura, novidade, riscos calculados.',
  },
  hedonism: {
    label: 'Hedonismo',
    oneLiner: 'Buscar prazer e gratificação na vida.',
  },
  security_personal: {
    label: 'Segurança — Pessoal',
    oneLiner: 'Estabilidade e proteção no seu ambiente próximo.',
  },
  security_societal: {
    label: 'Segurança — Social',
    oneLiner: 'Ordem e estabilidade na sociedade como um todo.',
  },
  tradition: {
    label: 'Tradição',
    oneLiner: 'Manter costumes culturais ou religiosos herdados.',
  },
  conformity_rules: {
    label: 'Conformidade — Regras',
    oneLiner: 'Obediência a leis, normas e autoridades.',
  },
  conformity_interpersonal: {
    label: 'Conformidade — Interpessoal',
    oneLiner: 'Não criar atrito ou aborrecer os outros.',
  },
};

const EN_VALUES: Record<SchwartzValue, ValueContent> = {
  universalism_concern: {
    label: 'Universalism — Concern',
    oneLiner: 'Commitment to equality and justice for all.',
  },
  universalism_nature: {
    label: 'Universalism — Nature',
    oneLiner: 'Caring for the environment and other species.',
  },
  universalism_tolerance: {
    label: 'Universalism — Tolerance',
    oneLiner: 'Accepting and respecting those who differ.',
  },
  benevolence_caring: {
    label: 'Benevolence — Caring',
    oneLiner: 'Devotion to the well-being of close ones.',
  },
  benevolence_dependability: {
    label: 'Benevolence — Dependability',
    oneLiner: 'Being a reliable, loyal member of the close group.',
  },
  humility: {
    label: 'Humility',
    oneLiner: 'Recognizing yourself as one among many.',
  },
  achievement: {
    label: 'Achievement',
    oneLiner: 'Success through demonstrating competence.',
  },
  power_dominance: {
    label: 'Power — Dominance',
    oneLiner: "Influence and control over others' decisions.",
  },
  power_resources: {
    label: 'Power — Resources',
    oneLiner: 'Status from money and material possessions.',
  },
  face: {
    label: 'Face',
    oneLiner: 'Maintaining respect and avoiding public embarrassment.',
  },
  self_direction_thought: {
    label: 'Self-Direction — Thought',
    oneLiner: 'Freedom to form your own opinions.',
  },
  self_direction_action: {
    label: 'Self-Direction — Action',
    oneLiner: 'Freedom to choose your own path.',
  },
  stimulation: {
    label: 'Stimulation',
    oneLiner: 'Adventure, novelty, calculated risk.',
  },
  hedonism: {
    label: 'Hedonism',
    oneLiner: 'Seeking pleasure and gratification in life.',
  },
  security_personal: {
    label: 'Security — Personal',
    oneLiner: 'Stability and safety in your immediate surroundings.',
  },
  security_societal: {
    label: 'Security — Societal',
    oneLiner: 'Order and stability in society at large.',
  },
  tradition: {
    label: 'Tradition',
    oneLiner: 'Maintaining inherited cultural or religious customs.',
  },
  conformity_rules: {
    label: 'Conformity — Rules',
    oneLiner: 'Obedience to laws, norms, and authority.',
  },
  conformity_interpersonal: {
    label: 'Conformity — Interpersonal',
    oneLiner: 'Not creating friction or upsetting others.',
  },
};

const PT_META: Record<SchwartzMeta, MetaContent> = {
  self_transcendence: {
    label: 'Auto-Transcendência',
    oneLiner: 'Cuidar dos outros e do mundo além de si.',
    values: [
      'universalism_concern',
      'universalism_nature',
      'universalism_tolerance',
      'benevolence_caring',
      'benevolence_dependability',
      'humility',
    ],
  },
  self_enhancement: {
    label: 'Auto-Promoção',
    oneLiner: 'Status, sucesso, recursos, imagem.',
    values: ['achievement', 'power_dominance', 'power_resources', 'face'],
  },
  openness_to_change: {
    label: 'Abertura à Mudança',
    oneLiner: 'Liberdade, novidade, prazer.',
    values: [
      'self_direction_thought',
      'self_direction_action',
      'stimulation',
      'hedonism',
    ],
  },
  conservation: {
    label: 'Conservação',
    oneLiner: 'Estabilidade, ordem, tradição.',
    values: [
      'security_personal',
      'security_societal',
      'tradition',
      'conformity_rules',
      'conformity_interpersonal',
    ],
  },
};

const EN_META: Record<SchwartzMeta, MetaContent> = {
  self_transcendence: {
    label: 'Self-Transcendence',
    oneLiner: 'Caring for others and the world beyond self.',
    values: PT_META.self_transcendence.values,
  },
  self_enhancement: {
    label: 'Self-Enhancement',
    oneLiner: 'Status, success, resources, image.',
    values: PT_META.self_enhancement.values,
  },
  openness_to_change: {
    label: 'Openness to Change',
    oneLiner: 'Freedom, novelty, pleasure.',
    values: PT_META.openness_to_change.values,
  },
  conservation: {
    label: 'Conservation',
    oneLiner: 'Stability, order, tradition.',
    values: PT_META.conservation.values,
  },
};

const VALUES: Record<SchwartzLocale, Record<SchwartzValue, ValueContent>> = {
  pt: PT_VALUES,
  en: EN_VALUES,
};

const META: Record<SchwartzLocale, Record<SchwartzMeta, MetaContent>> = {
  pt: PT_META,
  en: EN_META,
};

export function getValueContent(
  value: SchwartzValue,
  locale: SchwartzLocale,
): ValueContent {
  return VALUES[locale][value];
}

export function getMetaContent(
  meta: SchwartzMeta,
  locale: SchwartzLocale,
): MetaContent {
  return META[locale][meta];
}

/** Pull the value slug out of a `schwartz:value:<slug>` facet id. */
export function valueFromFacetId(facetId: string): SchwartzValue | null {
  const m = facetId.match(/^schwartz:value:([a-z_]+)$/);
  if (!m) return null;
  return m[1] as SchwartzValue;
}

/** Pull the meta slug out of a `schwartz:meta:<slug>` facet id. */
export function metaFromFacetId(facetId: string): SchwartzMeta | null {
  const m = facetId.match(/^schwartz:meta:([a-z_]+)$/);
  if (!m) return null;
  return m[1] as SchwartzMeta;
}

export const SCHWARTZ_META_ORDER: SchwartzMeta[] = [
  'self_transcendence',
  'self_enhancement',
  'openness_to_change',
  'conservation',
];
