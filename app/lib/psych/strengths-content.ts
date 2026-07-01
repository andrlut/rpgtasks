/**
 * Character Strengths — narrative content bundle (PT + EN).
 *
 * 24 strengths grouped under 6 virtues. Output is RANK-based (like
 * Schwartz): the ipsative centering surfaces which strengths are MORE
 * central to the person. The result screen highlights the top-5
 * "signature strengths" and shows the 6 virtues as centered bars.
 *
 * ORIGINAL (autoral) instrument inspired by the academic 24-strength /
 * 6-virtue taxonomy (Peterson & Seligman, 2004). No wording is taken from
 * the VIA-IS or any commercial strengths product; the "VIA" trademark is
 * not used. User-facing name: "Forças de Caráter" / "Character Strengths".
 */

export type VirtueSlug =
  | 'wisdom'
  | 'courage'
  | 'humanity'
  | 'justice'
  | 'temperance'
  | 'transcendence';

export type StrengthSlug =
  | 'creativity'
  | 'curiosity'
  | 'judgment'
  | 'love_of_learning'
  | 'perspective'
  | 'bravery'
  | 'perseverance'
  | 'honesty'
  | 'zest'
  | 'love'
  | 'kindness'
  | 'social_intelligence'
  | 'teamwork'
  | 'fairness'
  | 'leadership'
  | 'forgiveness'
  | 'humility'
  | 'prudence'
  | 'self_regulation'
  | 'appreciation_of_beauty'
  | 'gratitude'
  | 'hope'
  | 'humor'
  | 'spirituality';

export type StrengthsLocale = 'pt' | 'en';

interface StrengthContent {
  /** "Criatividade" / "Creativity", etc. */
  label: string;
  /** One-line definition. */
  oneLiner: string;
  /** What it looks like day-to-day when it's a top (signature) strength. */
  signature: string;
}

interface VirtueContent {
  label: string;
  oneLiner: string;
}

// ─── Which virtue each strength belongs to ──────────────────────────────────

export const VIRTUE_OF_STRENGTH: Record<StrengthSlug, VirtueSlug> = {
  creativity: 'wisdom',
  curiosity: 'wisdom',
  judgment: 'wisdom',
  love_of_learning: 'wisdom',
  perspective: 'wisdom',
  bravery: 'courage',
  perseverance: 'courage',
  honesty: 'courage',
  zest: 'courage',
  love: 'humanity',
  kindness: 'humanity',
  social_intelligence: 'humanity',
  teamwork: 'justice',
  fairness: 'justice',
  leadership: 'justice',
  forgiveness: 'temperance',
  humility: 'temperance',
  prudence: 'temperance',
  self_regulation: 'temperance',
  appreciation_of_beauty: 'transcendence',
  gratitude: 'transcendence',
  hope: 'transcendence',
  humor: 'transcendence',
  spirituality: 'transcendence',
};

// ─── Virtue accent colors (dark-theme tuned) ────────────────────────────────

export const VIRTUE_COLOR: Record<VirtueSlug, string> = {
  wisdom: '#5B8DEF',
  courage: '#E5646E',
  humanity: '#E86FA9',
  justice: '#4FB477',
  temperance: '#4FC4C4',
  transcendence: '#E6B450',
};

// ─── Strength narratives ────────────────────────────────────────────────────

const PT_STRENGTHS: Record<StrengthSlug, StrengthContent> = {
  creativity: {
    label: 'Criatividade',
    oneLiner: 'Achar caminhos novos e engenhosos que também funcionam na prática.',
    signature: 'Você costuma chegar em ideias que ninguém tinha pensado e transforma isso em algo que funciona de verdade.',
  },
  curiosity: {
    label: 'Curiosidade',
    oneLiner: 'Se interessar pelo que está acontecendo, explorar e descobrir.',
    signature: 'Você vive querendo saber mais, entra fundo no que te chama atenção e acha o mundo cheio de coisas interessantes.',
  },
  judgment: {
    label: 'Discernimento',
    oneLiner: 'Pensar bem nas coisas, olhar por todos os lados e não tirar conclusões apressadas.',
    signature: 'Você pesa os fatos com calma, considera os dois lados antes de decidir e não se deixa levar pela primeira impressão.',
  },
  love_of_learning: {
    label: 'Amor ao Aprendizado',
    oneLiner: 'Dominar novas habilidades e assuntos pelo prazer de aprender.',
    signature: 'Você aprende por gosto, se empolga ao dominar um assunto novo e sente que estudar é uma recompensa em si.',
  },
  perspective: {
    label: 'Perspectiva',
    oneLiner: 'Enxergar o quadro geral, dar bons conselhos e dar sentido ao mundo.',
    signature: 'As pessoas te procuram pra conversar porque você enxerga o todo e ajuda a colocar as coisas no lugar.',
  },
  bravery: {
    label: 'Bravura',
    oneLiner: 'Não recuar diante de ameaça, dor ou desconforto — e ficar do lado do que é certo mesmo quando custa caro.',
    signature: 'Quando algo importa, você age mesmo com medo: fala o que precisa ser dito, encara o que a maioria evita e defende quem não tem voz.',
  },
  perseverance: {
    label: 'Perseverança',
    oneLiner: 'Terminar o que se começa e seguir em frente mesmo quando o caminho fica difícil.',
    signature: 'Você não larga as coisas pela metade: mantém o ritmo depois que o entusiasmo passa e leva o que começou até o fim.',
  },
  honesty: {
    label: 'Autenticidade',
    oneLiner: 'Falar a verdade, ser genuíno e assumir os próprios sentimentos e atitudes.',
    signature: 'As pessoas sabem onde te encontrar: você diz o que pensa com franqueza, se mostra do mesmo jeito em qualquer lugar e assume seus erros.',
  },
  zest: {
    label: 'Vitalidade',
    oneLiner: 'Encarar a vida com energia e empolgação, sentindo-se vivo e ativado.',
    signature: 'Você vive com o motor ligado: se joga de corpo e alma nas coisas e contagia quem está por perto com sua energia.',
  },
  love: {
    label: 'Amor',
    oneLiner: 'Valorizar e cultivar vínculos próximos, dando e recebendo cuidado.',
    signature: 'As pessoas que você ama sabem disso pelo jeito que você aparece pra elas, não só pelo que você fala.',
  },
  kindness: {
    label: 'Bondade',
    oneLiner: 'Fazer o bem e ajudar os outros, mesmo sem que peçam.',
    signature: 'Você repara em quem precisa de uma mão e simplesmente estende a sua, sem esperar nada em troca.',
  },
  social_intelligence: {
    label: 'Inteligência Social',
    oneLiner: 'Ler os sentimentos e motivos das pessoas — e os seus próprios — e saber se ajustar.',
    signature: 'Você entra num ambiente e logo capta o clima, sabendo o que cada situação está pedindo de você.',
  },
  teamwork: {
    label: 'Trabalho em Equipe',
    oneLiner: 'Fazer sua parte num grupo com lealdade, somando com os outros em vez de puxar sozinho.',
    signature: 'O grupo pode contar com você: entrega o que combinou, cobre quem precisa e comemora as vitórias como time.',
  },
  fairness: {
    label: 'Senso de Justiça',
    oneLiner: 'Tratar todo mundo com o mesmo peso, sem deixar preferência ou preconceito decidir por você.',
    signature: 'As pessoas confiam no seu julgamento: você ouve os dois lados, aplica a mesma regra pra todos e não abre exceção por gostar de alguém.',
  },
  leadership: {
    label: 'Liderança',
    oneLiner: 'Organizar e animar um grupo pra fazer acontecer, mantendo as relações boas no caminho.',
    signature: 'O grupo se movimenta melhor com você por perto: você dá direção, distribui as tarefas e faz cada um se sentir parte do resultado.',
  },
  forgiveness: {
    label: 'Perdão',
    oneLiner: 'Soltar a mágoa de quem errou com você, sem alimentar rancor nem querer revanche.',
    signature: 'Quando alguém te magoa, você até sente, mas não fica remoendo — dá espaço pra pessoa recomeçar e segue leve.',
  },
  humility: {
    label: 'Humildade',
    oneLiner: 'Deixar suas conquistas falarem por si, sem precisar puxar os holofotes pra você.',
    signature: 'Você faz um bom trabalho e deixa que ele apareça sozinho — divide o crédito e admite o que ainda não sabe sem drama.',
  },
  prudence: {
    label: 'Prudência',
    oneLiner: 'Pensar antes de agir e de falar, evitando riscos desnecessários e do que depois se arrepende.',
    signature: 'Você pesa as opções com calma antes de decidir e escolhe bem as palavras, então raramente sai algo de que se arrepende.',
  },
  self_regulation: {
    label: 'Autorregulação',
    oneLiner: 'Manter o controle sobre o que você sente e faz, segurando os impulsos quando é preciso.',
    signature: 'Você mantém a cabeça no lugar sob pressão, segura os impulsos e cumpre seus hábitos mesmo quando a vontade some.',
  },
  appreciation_of_beauty: {
    label: 'Apreciação da Beleza',
    oneLiner: 'Reparar e se emocionar com a beleza, a excelência e o que é bem-feito.',
    signature: 'No dia a dia, você para diante de uma paisagem, de uma música ou de um trabalho bem-feito e sente algo genuíno mexer por dentro.',
  },
  gratitude: {
    label: 'Gratidão',
    oneLiner: 'Perceber e ser grato pelas coisas boas que acontecem na sua vida.',
    signature: 'No dia a dia, você percebe as coisas boas enquanto elas acontecem e faz questão de agradecer a quem contribui pra elas.',
  },
  hope: {
    label: 'Esperança',
    oneLiner: 'Esperar o melhor do futuro e agir pra que ele aconteça.',
    signature: 'No dia a dia, você aposta que as coisas vão dar certo e faz a sua parte pra construir esse futuro melhor.',
  },
  humor: {
    label: 'Humor',
    oneLiner: 'Gostar de rir e fazer os outros sorrirem; levar a vida com leveza.',
    signature: 'No dia a dia, você acha graça nas coisas, arranca sorrisos de quem está por perto e deixa o clima mais leve mesmo quando aperta.',
  },
  spirituality: {
    label: 'Propósito',
    oneLiner: 'Ter uma noção clara de propósito e de que sua vida faz parte de algo maior.',
    signature: 'No dia a dia, você sente que suas escolhas fazem sentido dentro de um propósito maior e isso te dá direção.',
  },
};

const EN_STRENGTHS: Record<StrengthSlug, StrengthContent> = {
  creativity: {
    label: 'Creativity',
    oneLiner: 'Finding fresh, inventive paths that also work in practice.',
    signature: 'You tend to land on ideas nobody else had and turn them into something that actually works.',
  },
  curiosity: {
    label: 'Curiosity',
    oneLiner: "Taking interest in what's happening, exploring and discovering.",
    signature: "You're always wanting to know more, dive deep into whatever catches your eye, and find the world full of interesting things.",
  },
  judgment: {
    label: 'Judgment',
    oneLiner: 'Thinking things through, looking at every angle, and not jumping to conclusions.',
    signature: "You weigh the facts calmly, consider both sides before deciding, and don't get swept up by first impressions.",
  },
  love_of_learning: {
    label: 'Love of Learning',
    oneLiner: 'Mastering new skills and subjects for the sheer joy of learning.',
    signature: 'You learn for the love of it, light up when you master a new topic, and treat studying as a reward in itself.',
  },
  perspective: {
    label: 'Perspective',
    oneLiner: 'Seeing the big picture, giving good counsel, and making sense of the world.',
    signature: 'People come to you to talk because you see the whole picture and help put things in their place.',
  },
  bravery: {
    label: 'Bravery',
    oneLiner: "Not backing down in the face of threat, pain or discomfort — and standing up for what's right even when it costs you.",
    signature: "When something matters, you act even while scared: you say the hard thing, face what most people avoid, and stand up for those who can't.",
  },
  perseverance: {
    label: 'Perseverance',
    oneLiner: 'Finishing what you start and keeping at it even when the going gets hard.',
    signature: "You don't leave things half-done: you keep going after the excitement fades and carry things through to the end.",
  },
  honesty: {
    label: 'Honesty',
    oneLiner: 'Speaking the truth, being genuine, and owning your feelings and actions.',
    signature: 'People know where they stand with you: you say what you think honestly, show up the same in every room, and own your mistakes.',
  },
  zest: {
    label: 'Zest',
    oneLiner: 'Approaching life with energy and excitement, feeling alive and switched on.',
    signature: 'You live with the engine running: you throw yourself body and soul into things and your energy rubs off on people around you.',
  },
  love: {
    label: 'Love',
    oneLiner: 'Valuing and nurturing close bonds, giving and receiving care.',
    signature: 'The people you love know it from how you show up for them, not just from what you say.',
  },
  kindness: {
    label: 'Kindness',
    oneLiner: 'Doing good and helping others, even when no one asks.',
    signature: 'You notice who needs a hand and just offer yours, without expecting anything back.',
  },
  social_intelligence: {
    label: 'Social Intelligence',
    oneLiner: 'Reading the feelings and motives of others — and your own — and knowing how to adjust.',
    signature: 'You walk into a room and quickly read the mood, sensing what each situation is asking of you.',
  },
  teamwork: {
    label: 'Teamwork',
    oneLiner: 'Doing your part in a group with loyalty, adding to others instead of going it alone.',
    signature: 'The group can count on you: you deliver what you promised, cover for whoever needs it, and celebrate wins as a team.',
  },
  fairness: {
    label: 'Fairness',
    oneLiner: 'Treating everyone by the same measure, without letting bias or favoritism decide for you.',
    signature: "People trust your judgment: you hear both sides, apply the same rule to everyone, and don't make exceptions just because you like someone.",
  },
  leadership: {
    label: 'Leadership',
    oneLiner: 'Organizing and energizing a group to get things done while keeping relationships good along the way.',
    signature: 'The group moves better with you around: you give direction, hand out tasks that make sense, and make each person feel part of the result.',
  },
  forgiveness: {
    label: 'Forgiveness',
    oneLiner: 'Letting go of the hurt from those who wronged you, without holding a grudge or wanting revenge.',
    signature: "When someone hurts you, you feel it, but you don't stew on it — you give people room to start over and move on lighter.",
  },
  humility: {
    label: 'Humility',
    oneLiner: 'Letting your accomplishments speak for themselves, without needing to pull the spotlight onto you.',
    signature: "You do good work and let it show on its own — you share credit and admit what you don't know without any fuss.",
  },
  prudence: {
    label: 'Prudence',
    oneLiner: "Thinking before you act or speak, steering clear of needless risks and things you'd later regret.",
    signature: 'You weigh your options calmly before deciding and pick your words with care, so you rarely end up regretting what you did.',
  },
  self_regulation: {
    label: 'Self-Regulation',
    oneLiner: 'Staying in control of what you feel and do, holding your impulses when it counts.',
    signature: 'You keep a level head under pressure, hold back your impulses, and stick to your habits even when the motivation fades.',
  },
  appreciation_of_beauty: {
    label: 'Appreciation of Beauty',
    oneLiner: 'Noticing and being moved by beauty, excellence, and skilled work.',
    signature: 'Day to day, you pause in front of a landscape, a song, or a piece of skilled work and feel something genuinely stir inside you.',
  },
  gratitude: {
    label: 'Gratitude',
    oneLiner: 'Being aware of and thankful for the good things that happen.',
    signature: 'Day to day, you notice the good things as they happen and make a point of thanking the people behind them.',
  },
  hope: {
    label: 'Hope',
    oneLiner: 'Expecting the best and working to make it happen.',
    signature: 'Day to day, you bet things will work out and put in the work to build that better future.',
  },
  humor: {
    label: 'Humor',
    oneLiner: 'Liking to laugh and bring smiles; taking life with a light touch.',
    signature: 'Day to day, you find the funny side of things, get smiles out of people around you, and lighten the mood even when things get tense.',
  },
  spirituality: {
    label: 'Meaning & Purpose',
    oneLiner: 'Having a clear sense of purpose and of belonging to something bigger.',
    signature: 'Day to day, you feel your choices fit inside a larger purpose, and that gives you direction.',
  },
};

// ─── Virtue narratives ──────────────────────────────────────────────────────

const PT_VIRTUES: Record<VirtueSlug, VirtueContent> = {
  wisdom: {
    label: 'Sabedoria e Conhecimento',
    oneLiner: 'As forças de quem gosta de entender: criatividade, curiosidade, discernimento, amor ao aprendizado e perspectiva.',
  },
  courage: {
    label: 'Coragem',
    oneLiner: 'As forças de quem segue em frente mesmo no aperto: bravura, perseverança, autenticidade e vitalidade.',
  },
  humanity: {
    label: 'Humanidade',
    oneLiner: 'As forças de quem se aproxima e cuida: amor, bondade e inteligência social.',
  },
  justice: {
    label: 'Justiça',
    oneLiner: 'As forças de quem sustenta a vida em grupo: trabalho em equipe, senso de justiça e liderança.',
  },
  temperance: {
    label: 'Temperança',
    oneLiner: 'As forças que te protegem do excesso: perdão, humildade, prudência e autorregulação.',
  },
  transcendence: {
    label: 'Transcendência',
    oneLiner: 'As forças que dão sentido: apreciação da beleza, gratidão, esperança, humor e propósito.',
  },
};

const EN_VIRTUES: Record<VirtueSlug, VirtueContent> = {
  wisdom: {
    label: 'Wisdom & Knowledge',
    oneLiner: 'The strengths of a mind that loves to understand — creativity, curiosity, judgment, love of learning, and perspective.',
  },
  courage: {
    label: 'Courage',
    oneLiner: 'The strengths that keep you moving when it gets hard — bravery, perseverance, honesty, and zest.',
  },
  humanity: {
    label: 'Humanity',
    oneLiner: 'The strengths of drawing close and caring — love, kindness, and social intelligence.',
  },
  justice: {
    label: 'Justice',
    oneLiner: 'The strengths that hold a community together — teamwork, fairness, and leadership.',
  },
  temperance: {
    label: 'Temperance',
    oneLiner: 'The strengths that guard you against excess — forgiveness, humility, prudence, and self-regulation.',
  },
  transcendence: {
    label: 'Transcendence',
    oneLiner: 'The strengths that give life meaning — appreciation of beauty, gratitude, hope, humor, and purpose.',
  },
};

const STRENGTHS: Record<StrengthsLocale, Record<StrengthSlug, StrengthContent>> = {
  pt: PT_STRENGTHS,
  en: EN_STRENGTHS,
};

const VIRTUES: Record<StrengthsLocale, Record<VirtueSlug, VirtueContent>> = {
  pt: PT_VIRTUES,
  en: EN_VIRTUES,
};

// ─── Public API ─────────────────────────────────────────────────────────────

export const VIRTUE_ORDER: VirtueSlug[] = [
  'wisdom',
  'courage',
  'humanity',
  'justice',
  'temperance',
  'transcendence',
];

export const STRENGTH_ORDER: StrengthSlug[] = [
  'creativity', 'curiosity', 'judgment', 'love_of_learning', 'perspective',
  'bravery', 'perseverance', 'honesty', 'zest',
  'love', 'kindness', 'social_intelligence',
  'teamwork', 'fairness', 'leadership',
  'forgiveness', 'humility', 'prudence', 'self_regulation',
  'appreciation_of_beauty', 'gratitude', 'hope', 'humor', 'spirituality',
];

export function getStrengthContent(
  slug: StrengthSlug,
  locale: StrengthsLocale,
): StrengthContent {
  return STRENGTHS[locale][slug];
}

export function getVirtueContent(
  slug: VirtueSlug,
  locale: StrengthsLocale,
): VirtueContent {
  return VIRTUES[locale][slug];
}

const STRENGTH_SLUGS = new Set<string>(STRENGTH_ORDER);
const VIRTUE_SLUGS = new Set<string>(VIRTUE_ORDER);

/** Parse a psych_score facet_id like "strengths:strength:curiosity". */
export function strengthFromFacetId(facetId: string): StrengthSlug | null {
  const m = facetId.match(/^strengths:strength:(.+)$/);
  if (!m || !STRENGTH_SLUGS.has(m[1])) return null;
  return m[1] as StrengthSlug;
}

/** Parse a psych_score facet_id like "strengths:virtue:wisdom". */
export function virtueFromFacetId(facetId: string): VirtueSlug | null {
  const m = facetId.match(/^strengths:virtue:(.+)$/);
  if (!m || !VIRTUE_SLUGS.has(m[1])) return null;
  return m[1] as VirtueSlug;
}

export function virtueColorOfStrength(slug: StrengthSlug): string {
  return VIRTUE_COLOR[VIRTUE_OF_STRENGTH[slug]];
}

/** Map a centered virtue score (roughly [-2, +2]) to [0, 1] for the bars. */
export function normalizeCenteredScore(score: number): number {
  return Math.max(0, Math.min(1, (score + 2) / 4));
}
