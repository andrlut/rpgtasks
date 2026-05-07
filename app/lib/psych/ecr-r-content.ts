/**
 * ECR-R — narrative content bundle (PT + EN).
 *
 * 2 dimensions (Anxiety + Avoidance) crossed at midpoint 4 yield 4
 * attachment styles. The result UI tells the user their style and
 * shows where they sit on each dimension.
 */

export type EcrScale = 'anxiety' | 'avoidance';

export type EcrStyle = 'secure' | 'preoccupied' | 'dismissive' | 'fearful';

export type EcrLocale = 'pt' | 'en';

interface ScaleContent {
  label: string;
  oneLiner: string;
}

interface StyleContent {
  /** "Seguro" / "Secure", etc. */
  label: string;
  /** One sentence summary. */
  headline: string;
  /** A few lines describing the pattern. */
  body: string;
  /** Concrete day-to-day implication. */
  dayToDay: string;
  /** Soft growth note — gentle, not prescriptive. */
  growth: string;
}

const PT_SCALES: Record<EcrScale, ScaleContent> = {
  anxiety: {
    label: 'Ansiedade',
    oneLiner:
      'Preocupação com abandono e hipersensibilidade a sinais de rejeição.',
  },
  avoidance: {
    label: 'Evitação',
    oneLiner:
      'Desconforto com proximidade e preferência por independência emocional.',
  },
};

const EN_SCALES: Record<EcrScale, ScaleContent> = {
  anxiety: {
    label: 'Anxiety',
    oneLiner:
      'Worry about abandonment and hypersensitivity to signs of rejection.',
  },
  avoidance: {
    label: 'Avoidance',
    oneLiner:
      'Discomfort with closeness and preference for emotional independence.',
  },
};

const PT_STYLES: Record<EcrStyle, StyleContent> = {
  secure: {
    label: 'Seguro',
    headline:
      'Você confia que pode receber e oferecer proximidade sem perder a si mesmo.',
    body:
      'Pessoas próximas não te ameaçam nem te deixam ansioso por padrão. Conforto na intimidade e capacidade de pedir ajuda andam juntos com sua independência. Conflitos são desconfortáveis mas não desestruturam.',
    dayToDay:
      'Sua relações tendem a ser estáveis. Você consegue dizer "preciso de você" e "preciso de espaço" no mesmo dia, sem virar drama.',
    growth:
      'Apego seguro não é estado fixo — pode oscilar em fases difíceis. Mantenha o que te trouxe até aqui: comunicação direta + atenção pra o que te alimenta nos vínculos.',
  },
  preoccupied: {
    label: 'Ansioso (Preocupado)',
    headline:
      'Você quer proximidade, mas vive com radar ligado pra sinais de afastamento.',
    body:
      'Conexão é oxigênio pra você. O custo é a vigilância: pequenos silêncios viram dúvida, demora vira medo. Costuma personalizar — quando o outro tá distante, deve ser comigo. Pode pedir reasseguramento mais do que gostaria.',
    dayToDay:
      'Você é a pessoa que relê conversas, antecipa rejeição, e sente alívio físico quando o outro responde. Conflitos pequenos podem virar grandes porque a perda potencial é real demais pra você.',
    growth:
      'A ansiedade não é falha de caráter — é um sistema de alarme bem calibrado pra mundo onde quem cuidava era inconstante. Práticas que ajudam: nomear o medo antes de agir nele, parceiros estáveis que você consegue testar, terapia com lente de apego.',
  },
  dismissive: {
    label: 'Evitante (Independente)',
    headline:
      'Você funciona melhor com bastante autonomia — proximidade intensa pesa.',
    body:
      'Independência é um valor central, não uma defesa. Você lida bem sozinho, prefere resolver as próprias coisas, e fica desconfortável quando o outro precisa de muita conexão. Pode minimizar a importância de relações pra preservar autonomia.',
    dayToDay:
      'Você é quem precisa de tempo só seu pra recarregar, evita conversas emocionais profundas, e sente alívio quando o outro tem vida própria. Pode notar que mantém pessoas a uma certa distância sem perceber.',
    growth:
      'Evitação não é frieza — é uma estratégia que protege quem aprendeu cedo que pedir ajuda não compensa. Práticas que ajudam: reparar quando alguém pede mais e você se afasta, testar pequena vulnerabilidade com pessoas de confiança, notar a diferença entre "preciso de espaço" e "to fugindo".',
  },
  fearful: {
    label: 'Temeroso (Desorganizado)',
    headline:
      'Você quer proximidade e foge dela — os dois sistemas ligados ao mesmo tempo.',
    body:
      'Apego temeroso é o lugar mais difícil dos quatro. Você quer conexão profunda mas tem medo de ser machucado, então oscila entre se aproximar e se proteger. Pode parecer "instável" pros outros, mas internamente é coerente: medo do outro lado da vontade.',
    dayToDay:
      'Você pode iniciar uma relação intensa, depois recuar quando ficar real demais. Pode confiar muito numa hora e desconfiar do nada. Conflito ativa os dois lados — vontade de fugir + medo de perder.',
    growth:
      'Temeroso costuma vir de histórias com proximidade que machucou — não é falha sua, é proteção que se generalizou. O caminho é lento e em geral pede acompanhamento (terapia com lente de trauma + apego). Estabilidade na relação atual ajuda mais do que insight.',
  },
};

const EN_STYLES: Record<EcrStyle, StyleContent> = {
  secure: {
    label: 'Secure',
    headline:
      'You trust that you can receive and offer closeness without losing yourself.',
    body:
      "People close to you don't threaten you or make you anxious by default. Comfort in intimacy and the ability to ask for help travel together with your independence. Conflicts are uncomfortable but don't destabilize you.",
    dayToDay:
      'Your relationships tend to be stable. You can say "I need you" and "I need space" the same day without turning it into drama.',
    growth:
      "Secure attachment isn't a fixed state — it can shift in hard phases. Keep what got you here: direct communication and attention to what feeds you in your bonds.",
  },
  preoccupied: {
    label: 'Anxious (Preoccupied)',
    headline:
      'You want closeness, but live with the radar on for signs of withdrawal.',
    body:
      "Connection is oxygen for you. The cost is vigilance: small silences become doubt, delays become fear. You tend to personalize — when the other is distant, it must be about me. You may seek reassurance more than you'd like.",
    dayToDay:
      'You\'re the person who rereads conversations, anticipates rejection, and feels physical relief when the other replies. Small conflicts can balloon because the potential loss feels too real.',
    growth:
      "Anxiety isn't a character flaw — it's an alarm system well-calibrated for a world where caregivers were inconsistent. What helps: naming the fear before acting on it, stable partners you can test, therapy with an attachment lens.",
  },
  dismissive: {
    label: 'Avoidant (Dismissive)',
    headline:
      'You work best with plenty of autonomy — intense closeness weighs on you.',
    body:
      "Independence is a core value, not a defense. You do well alone, prefer to handle your own things, and feel uncomfortable when others need a lot of connection. You may minimize the importance of relationships to preserve autonomy.",
    dayToDay:
      "You're the one who needs alone time to recharge, avoids deep emotional conversations, and feels relief when the other has their own life. You may notice you keep people at a certain distance without realizing it.",
    growth:
      "Avoidance isn't coldness — it's a strategy that protected someone who learned early that asking for help didn't pay off. What helps: noticing when someone asks for more and you pull away, testing small vulnerability with trusted people, telling apart \"I need space\" from \"I'm running.\"",
  },
  fearful: {
    label: 'Fearful (Disorganized)',
    headline:
      "You want closeness and flee from it — both systems firing at once.",
    body:
      "Fearful attachment is the hardest of the four. You want deep connection but fear being hurt, so you oscillate between approaching and protecting yourself. It may look 'unstable' from outside, but internally it's coherent: fear is the other side of wanting.",
    dayToDay:
      'You may start a relationship intensely, then pull back when it gets too real. You may trust deeply one moment and distrust out of nowhere. Conflict activates both sides — the urge to flee plus the fear of losing.',
    growth:
      'Fearful attachment usually comes from histories where closeness hurt — not your fault, just protection that generalized. The path is slow and usually asks for support (therapy with a trauma + attachment lens). Stability in your current relationship helps more than insight.',
  },
};

const SCALES: Record<EcrLocale, Record<EcrScale, ScaleContent>> = {
  pt: PT_SCALES,
  en: EN_SCALES,
};

const STYLES: Record<EcrLocale, Record<EcrStyle, StyleContent>> = {
  pt: PT_STYLES,
  en: EN_STYLES,
};

export function getScaleContent(
  scale: EcrScale,
  locale: EcrLocale,
): ScaleContent {
  return SCALES[locale][scale];
}

export function getStyleContent(
  style: EcrStyle,
  locale: EcrLocale,
): StyleContent {
  return STYLES[locale][style];
}

/**
 * Derive the attachment style from the two scale means. Cutoff = 4 (the
 * midpoint of 1..7). The cutoff is convention; users near 4 on either
 * axis are borderline and the result UI should soften the framing.
 */
export function styleFromScales(
  anxiety: number,
  avoidance: number,
): EcrStyle {
  const highAnx = anxiety >= 4;
  const highAvo = avoidance >= 4;
  if (!highAnx && !highAvo) return 'secure';
  if (highAnx && !highAvo) return 'preoccupied';
  if (!highAnx && highAvo) return 'dismissive';
  return 'fearful';
}

export function scaleFromFacetId(facetId: string): EcrScale | null {
  const m = facetId.match(/^ecr_r:scale:(anxiety|avoidance)$/);
  if (!m) return null;
  return m[1] as EcrScale;
}

export const ECR_STYLE_ORDER: EcrStyle[] = [
  'secure',
  'preoccupied',
  'dismissive',
  'fearful',
];
