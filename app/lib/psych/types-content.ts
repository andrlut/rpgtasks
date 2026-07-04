/**
 * Jungian Types — narrative content bundle (PT + EN).
 *
 * 4 dichotomies, each split into 4 ORIGINAL bipolar facets (16 total), plus
 * 16 four-letter type narratives. Scored bipolar (see `type_bipolar`): each
 * facet mean on 1..5 leans pole A (>3) or pole B (<3); the dichotomy mean
 * (avg of its 4 facets) gives one letter; the 4 letters form the type code.
 * |mean - 3| = clarity of the preference (banded, client-side).
 *
 * ORIGINAL (autoral) instrument inspired by the PUBLIC-DOMAIN Jungian
 * dichotomies. This is NOT the MBTI / MBTI Step II. IP guardrails:
 *   - never the strings "MBTI"/"Myers-Briggs"/"Step I"/"Step II" in UI;
 *   - facet decomposition + names are ORIGINAL (never the Step II 20-facet
 *     names: Initiating/Receiving, Systematic/Casual, Tough/Tender, etc.);
 *   - type names are ORIGINAL (never Keirsey Guardian/Artisan/Rational/
 *     Idealist nor 16Personalities type names);
 *   - the intro screen carries a non-affiliation disclaimer.
 * The 4-letter codes are generic and used freely by 16Personalities/Truity.
 */

export type AxisSlug = 'energy' | 'perception' | 'decision' | 'organization';

export type TypeFacetSlug =
  | 'e_initiate' | 'e_process' | 'e_recharge' | 'e_engage'
  | 'p_trust' | 'p_focus' | 'p_interest' | 'p_novelty'
  | 'd_criterion' | 'd_stance' | 'd_react' | 'd_delivery'
  | 'o_closure' | 'o_conduct' | 'o_timing' | 'o_method';

export type TypeCode =
  | 'INTJ' | 'INTP' | 'ENTJ' | 'ENTP'
  | 'INFJ' | 'INFP' | 'ENFJ' | 'ENFP'
  | 'ISTJ' | 'ISFJ' | 'ESTJ' | 'ESFJ'
  | 'ISTP' | 'ISFP' | 'ESTP' | 'ESFP';

export type TypesLocale = 'pt' | 'en';

/** Clarity of a preference = how consistently the person leaned one pole.
 * NOT strength/skill/maturity — just consistency of answering. */
export type ClarityBand = 'slight' | 'noticeable' | 'marked' | 'distinct';

interface AxisContent {
  label: string;
  /** Pole A = the first letter (E/S/T/J). */
  poleA_label: string;
  /** Pole B = the second letter (I/N/F/P). */
  poleB_label: string;
}

interface FacetContent {
  poleA_label: string;
  poleB_label: string;
  poleA_words: string[];
  poleB_words: string[];
}

interface TypeContent {
  name: string;
  headline: string;
  narrative: string;
}

// ─── Axis structure (locale-independent) ────────────────────────────────────

export const AXIS_ORDER: AxisSlug[] = ['energy', 'perception', 'decision', 'organization'];

/** Pole A letter (high mean) and pole B letter (low mean) per dichotomy. */
export const AXIS_LETTERS: Record<AxisSlug, { a: string; b: string }> = {
  energy: { a: 'E', b: 'I' },
  perception: { a: 'S', b: 'N' },
  decision: { a: 'T', b: 'F' },
  organization: { a: 'J', b: 'P' },
};

export const FACET_AXIS: Record<TypeFacetSlug, AxisSlug> = {
  e_initiate: 'energy', e_process: 'energy', e_recharge: 'energy', e_engage: 'energy',
  p_trust: 'perception', p_focus: 'perception', p_interest: 'perception', p_novelty: 'perception',
  d_criterion: 'decision', d_stance: 'decision', d_react: 'decision', d_delivery: 'decision',
  o_closure: 'organization', o_conduct: 'organization', o_timing: 'organization', o_method: 'organization',
};

export const FACETS_BY_AXIS: Record<AxisSlug, TypeFacetSlug[]> = {
  energy: ['e_initiate', 'e_process', 'e_recharge', 'e_engage'],
  perception: ['p_trust', 'p_focus', 'p_interest', 'p_novelty'],
  decision: ['d_criterion', 'd_stance', 'd_react', 'd_delivery'],
  organization: ['o_closure', 'o_conduct', 'o_timing', 'o_method'],
};

// ─── Axis content ───────────────────────────────────────────────────────────

const PT_AXES: Record<AxisSlug, AxisContent> = {
  energy: { label: "Energia", poleA_label: "Externa", poleB_label: "Interna" },
  perception: { label: "Percepção", poleA_label: "Concreta", poleB_label: "Abstrata" },
  decision: { label: "Decisão", poleA_label: "Lógica", poleB_label: "Afetiva" },
  organization: { label: "Organização", poleA_label: "Estruturada", poleB_label: "Fluida" },
};

const EN_AXES: Record<AxisSlug, AxisContent> = {
  energy: { label: "Energy", poleA_label: "Outward", poleB_label: "Inward" },
  perception: { label: "Perception", poleA_label: "Concrete", poleB_label: "Abstract" },
  decision: { label: "Decision", poleA_label: "Logical", poleB_label: "Values-led" },
  organization: { label: "Organization", poleA_label: "Structured", poleB_label: "Fluid" },
};

// ─── Facet content ──────────────────────────────────────────────────────────

const PT_FACETS: Record<TypeFacetSlug, FacetContent> = {
  e_initiate: { poleA_label: "Puxa a conversa", poleB_label: "Espera o convite", poleA_words: ["dá o primeiro passo", "chega junto", "abre o papo"], poleB_words: ["deixa vir", "espera abrirem", "entra depois"] },
  e_process: { poleA_label: "Pensa falando", poleB_label: "Pensa por dentro", poleA_words: ["fala pra clarear", "raciocina em voz alta", "processa junto"], poleB_words: ["rumina calado", "resolve por dentro", "só depois fala"] },
  e_recharge: { poleA_label: "Rende na roda", poleB_label: "Rende no recolhimento", poleA_words: ["gente me anima", "carrega junto", "vazio cansa"], poleB_words: ["sozinho recupera", "silêncio restaura", "multidão cansa"] },
  e_engage: { poleA_label: "Entra na ação", poleB_label: "Recua pra observar", poleA_words: ["mão na massa", "age primeiro", "topa na hora"], poleB_words: ["observa antes", "sente o clima", "entra depois"] },
  p_trust: { poleA_label: "Confia nos fatos", poleB_label: "Confia nos palpites", poleA_words: ["dados concretos", "prova na mão", "pé no chão"], poleB_words: ["intuição", "faro pra padrão", "pressentimento"] },
  p_focus: { poleA_label: "Olha o que é", poleB_label: "Olha o que poderia ser", poleA_words: ["aqui e agora", "situação real", "o concreto"], poleB_words: ["possibilidades", "e se...", "olho no futuro"] },
  p_interest: { poleA_label: "Mão na massa", poleB_label: "Cabeça nas ideias", poleA_words: ["prático", "botar pra funcionar", "aprender fazendo"], poleB_words: ["teoria", "conceito", "porquê das coisas"] },
  p_novelty: { poleA_label: "Segue o testado", poleB_label: "Busca o inédito", poleA_words: ["o que funciona", "método comprovado", "receita certa"], poleB_words: ["novidade", "abordagem original", "caminho inédito"] },
  d_criterion: { poleA_label: "Decide pela razão", poleB_label: "Decide pelo impacto", poleA_words: ["lógica", "coerência", "causa e efeito"], poleB_words: ["impacto nas pessoas", "valores", "o que importa"] },
  d_stance: { poleA_label: "Aponta a falha", poleB_label: "Acolhe primeiro", poleA_words: ["análise", "olho crítico", "o que não fecha"], poleB_words: ["acolhimento", "empatia", "como a pessoa tá"] },
  d_react: { poleA_label: "Questiona pra testar", poleB_label: "Concorda pra somar", poleA_words: ["contra-argumento", "põe à prova", "desafia"], poleB_words: ["harmonia", "soma junto", "apoia a ideia"] },
  d_delivery: { poleA_label: "Firme na verdade", poleB_label: "Cuidadoso no toque", poleA_words: ["direto", "sem rodeio", "verdade na cara"], poleB_words: ["com jeito", "cuidado", "no tempo certo"] },
  o_closure: { poleA_label: "Fecha logo", poleB_label: "Deixa em aberto", poleA_words: ["decide", "conclui", "resolve"], poleB_words: ["explora", "adia", "mantém opções"] },
  o_conduct: { poleA_label: "Anda pelo mapa", poleB_label: "Anda pelo momento", poleA_words: ["planeja", "agenda", "combina antes"], poleB_words: ["improvisa", "flui", "decide na hora"] },
  o_timing: { poleA_label: "Começa cedo", poleB_label: "Rende no aperto", poleA_words: ["antecipa", "distribui", "adianta"], poleB_words: ["deixa pro fim", "acelera no prazo", "foca na reta final"] },
  o_method: { poleA_label: "Passo a passo", poleB_label: "Conforme surge", poleA_words: ["ordena", "sequência", "método"], poleB_words: ["tateia", "vai vendo", "molda no caminho"] },
};

const EN_FACETS: Record<TypeFacetSlug, FacetContent> = {
  e_initiate: { poleA_label: "Starts the talk", poleB_label: "Waits to be drawn in", poleA_words: ["makes the first move", "reaches out", "breaks the ice"], poleB_words: ["lets it come", "waits to be approached", "joins later"] },
  e_process: { poleA_label: "Thinks out loud", poleB_label: "Thinks inward", poleA_words: ["talks to clarify", "reasons aloud", "processes together"], poleB_words: ["mulls in silence", "sorts it inside", "speaks once ready"] },
  e_recharge: { poleA_label: "Charges in company", poleB_label: "Charges in solitude", poleA_words: ["people lift me", "recharges with others", "the quiet drains me"], poleB_words: ["alone restores me", "silence recharges", "crowds drain me"] },
  e_engage: { poleA_label: "Jumps into action", poleB_label: "Steps back to observe", poleA_words: ["dives in", "acts first", "in right away"], poleB_words: ["watches first", "reads the room", "eases in"] },
  p_trust: { poleA_label: "Trusts the facts", poleB_label: "Trusts the hunches", poleA_words: ["hard data", "proof in hand", "grounded"], poleB_words: ["gut feel", "nose for patterns", "hunch"] },
  p_focus: { poleA_label: "Sees what is", poleB_label: "Sees what could be", poleA_words: ["here and now", "what's real", "the concrete"], poleB_words: ["possibilities", "what if...", "eye on the future"] },
  p_interest: { poleA_label: "Hands on the thing", poleB_label: "Head in the ideas", poleA_words: ["practical", "make it work", "learn by doing"], poleB_words: ["theory", "concept", "the why behind it"] },
  p_novelty: { poleA_label: "Sticks to the tried", poleB_label: "Chases the novel", poleA_words: ["what works", "proven method", "sure recipe"], poleB_words: ["novelty", "fresh take", "uncharted path"] },
  d_criterion: { poleA_label: "Weighs the logic", poleB_label: "Weighs the impact", poleA_words: ["logic", "consistency", "cause and effect"], poleB_words: ["human impact", "values", "what matters"] },
  d_stance: { poleA_label: "Names the flaw", poleB_label: "Meets you first", poleA_words: ["analysis", "critical eye", "what doesn't add up"], poleB_words: ["warmth", "empathy", "how you're doing"] },
  d_react: { poleA_label: "Pushes back to test", poleB_label: "Goes along to build", poleA_words: ["counterpoint", "stress-test", "challenge"], poleB_words: ["harmony", "builds along", "backs the idea"] },
  d_delivery: { poleA_label: "Firm with the truth", poleB_label: "Gentle with the touch", poleA_words: ["direct", "no sugarcoating", "straight truth"], poleB_words: ["tactful", "careful", "the right moment"] },
  o_closure: { poleA_label: "Likes it settled", poleB_label: "Keeps it open", poleA_words: ["decides", "wraps up", "settles"], poleB_words: ["explores", "delays", "keeps options"] },
  o_conduct: { poleA_label: "Runs on a plan", poleB_label: "Runs on the moment", poleA_words: ["plans", "schedules", "sets ahead"], poleB_words: ["improvises", "goes with it", "decides on the spot"] },
  o_timing: { poleA_label: "Starts early", poleB_label: "Peaks under pressure", poleA_words: ["gets ahead", "spreads out", "starts sooner"], poleB_words: ["waits", "sprints at the end", "focuses near the deadline"] },
  o_method: { poleA_label: "Step by step", poleB_label: "As it emerges", poleA_words: ["orders it", "in sequence", "by method"], poleB_words: ["feels it out", "sees where it goes", "shapes as it goes"] },
};

// ─── Type narratives ────────────────────────────────────────────────────────

const PT_TYPES: Record<TypeCode, TypeContent> = {
  INTJ: {
    name: "O Cartógrafo do Longo Prazo",
    headline: "Você desenha o mapa inteiro antes de dar o primeiro passo — e o passo quase sempre acerta.",
    narrative: "Você enxerga padrões onde os outros veem ruído e transforma intuições vagas em planos com etapas, prazos e um destino claro. Pensa de dentro para fora: recolhe silenciosamente as pistas do mundo, roda tudo por dentro e só apresenta a conclusão quando ela já está firme, o que pode fazer as pessoas sentirem que você chega pronto demais, difícil de acompanhar. Sua exigência de coerência é uma força rara — mas a mesma régua que aponta a falha num sistema também aponta, sem pedir licença, nas pessoas que você ama. A tensão que carrega é esta: o mapa perfeito precisa de terreno real, e o terreno só se revela quando você aceita começar antes de ter certeza absoluta.",
  },
  INTP: {
    name: "O Construtor do Possível",
    headline: "Toda ideia é uma porta — e você precisa abrir todas antes de escolher a sala onde vai morar.",
    narrative: "Você é movido por uma curiosidade que não descansa: pega qualquer afirmação, vira do avesso e testa se ela se sustenta por dentro. Constrói modelos mentais elegantes, encontra a inconsistência que ninguém notou e sente um prazer quase físico quando uma peça finalmente encaixa na lógica maior. Relaciona-se pela ideia antes de pela emoção — quando alguém traz um problema, seu instinto é resolvê-lo, não acolhê-lo, o que às vezes soa mais frio do que você é por dentro. A tensão que te habita é a distância entre a teoria refinada e a ação: o mundo pede uma resposta hoje, mas você ainda quer abrir só mais uma porta.",
  },
  ENTJ: {
    name: "O Condutor da Travessia",
    headline: "Você não espera a ponte aparecer — você reúne as pessoas e constrói a travessia.",
    narrative: "Você transforma visão em movimento: onde há um objetivo grande e nebuloso, você o quebra em frentes, distribui responsáveis e imprime ritmo. Pensa em voz alta, decide rápido e não teme o atrito — para você, uma discussão franca é o caminho mais curto até a melhor decisão, e você respeita quem devolve o argumento à altura. Sua energia arrasta os outros, mas o mesmo passo que faz a equipe avançar pode atropelar quem precisa de tempo para processar antes de concordar. A tensão que te define é entre a eficiência e a paciência: nem todo resultado que importa cabe no cronograma, e algumas conquistas só amadurecem no compasso das pessoas, não no seu.",
  },
  ENTP: {
    name: "O Provocador de Ideias",
    headline: "Você acende dez possibilidades numa conversa — e a mais brilhante costuma nascer do atrito.",
    narrative: "Você pensa conversando: joga uma provocação, ouve o rebote, ajusta e, no meio da troca, chega a conexões que ninguém veria sozinho. Enxerga ângulos alternativos com facilidade natural, adora desmontar um consenso preguiçoso e transforma até o obstáculo num quebra-cabeça divertido de resolver. Sua mente pula rápido de um possível ao outro — o que gera faíscas de sobra, mas também deixa um rastro de projetos empolgantes começados e não terminados quando o brilho da novidade passa. A tensão que você carrega é entre a largura e a profundidade: o mundo abre infinitas portas fascinantes, e crescer, para você, é escolher atravessar algumas até o fim.",
  },
  INFJ: {
    name: "O Farol Silencioso",
    headline: "Enxerga o que ainda não foi dito e guia com uma luz que quase ninguém percebe estar acesa.",
    narrative: "Você combina uma leitura quase profética das pessoas com um compromisso profundo com aquilo que considera certo — capta padrões, intenções e sofrimentos que passam despercebidos aos outros, e transforma isso em cuidado direcionado. Pensa por camadas, buscando o significado por trás do significado, e prefere agir por convicção a agir por conveniência; quando fecha uma decisão interna, ela vem com raiz e propósito. Você se conecta de forma intensa, mas seletiva: poucas relações verdadeiras valem mais do que muitas superficiais. A tensão embutida é que sua profundidade também te isola — você entrega tanto do seu mundo interior aos ideais que carrega que às vezes esquece de pedir o mesmo cuidado que oferece, e o farol que ilumina os outros pode ficar às escuras por dentro.",
  },
  INFP: {
    name: "O Guardião do Sentido",
    headline: "Carrega um núcleo de valores tão vivo que nada que fira o que você acredita passa despercebido.",
    narrative: "Você vive a partir de uma bússola interna intransferível: aquilo que é autêntico, humano e coerente com quem você é vale mais do que qualquer aprovação externa. Sua imaginação é fértil e o mundo dos possíveis te encanta — você vê potenciais de bondade e beleza onde outros veem apenas o que já existe, e defende quem é subestimado com uma lealdade discreta e feroz. Nas relações, oferece uma escuta rara, sem julgamento, que faz as pessoas se sentirem finalmente vistas. A tensão embutida está entre o ideal e o real: como você sonha com um padrão elevado de sentido e integridade, a vida cotidiana — com seus compromissos mornos e concessões necessárias — pode parecer decepcionante, e você às vezes espera dentro da idealização em vez de agir no mundo imperfeito que tem à frente.",
  },
  ENFJ: {
    name: "O Tecelão de Pessoas",
    headline: "Faz cada um ao seu redor florescer — e sente na pele o crescimento que ajuda a acontecer.",
    narrative: "Você tem um dom raro para enxergar o melhor nas pessoas e depois ajudá-las a alcançá-lo, articulando propósito, calor humano e visão numa energia que naturalmente reúne gente em torno de algo maior. Lê emoções em tempo real, ajusta o tom sem esforço aparente e transforma grupos em times: onde você entra, o clima muda e as pessoas se sentem capazes. Suas decisões passam sempre pelo impacto humano — o que isso faz com quem eu amo e com quem depende de mim conta tanto quanto a lógica. A tensão embutida é que ao investir tanto no crescimento alheio, você pode se dissolver no cuidado: absorve o peso dos outros, mede o próprio valor pela colheita que planta neles, e corre o risco de esquecer que também precisa ser regado por alguém.",
  },
  ENFP: {
    name: "O Semeador de Possíveis",
    headline: "Onde os outros veem um caminho, você vê dez — e contagia todo mundo com a vontade de trilhá-los.",
    narrative: "Você é uma fonte inesgotável de entusiasmo e conexões inesperadas: capta faíscas de possibilidade em quase tudo e transforma ideias soltas em aventuras que arrastam as pessoas junto. Genuinamente curioso sobre gente, você cria intimidade rápido, celebra a singularidade de cada um e enxerga potenciais que a própria pessoa ainda não viu em si. Age guiado por valores e pela emoção do momento, misturando espontaneidade calorosa com uma fé teimosa no que ainda pode vir a ser. A tensão embutida mora na abundância: tantos começos empolgantes competem pela sua energia que o acabamento — a parte lenta, repetitiva e sem novidade — vira o seu ponto cego, e às vezes o próximo brilho te chama antes de o anterior ter virado realidade.",
  },
  ISTJ: {
    name: "O Fiador da Palavra Dada",
    headline: "Você constrói confiança do jeito mais raro: fazendo exatamente o que disse que faria.",
    narrative: "Você enxerga o mundo pelo que é concreto e verificável, e trata um compromisso como algo sagrado — se prometeu, entrega, e essa firmeza silenciosa vira o alicerce em que os outros se apoiam sem nem perceber. Sua memória para fatos, prazos e detalhes é uma âncora, e você prefere provar valor pela consistência do dia a dia do que por discursos. A tensão embutida é que a mesma lealdade ao que já funciona pode virar resistência ao novo — nem toda regra antiga merece ser mantida, e às vezes o cuidado com o certo esconde de você o quanto você também precisa ser cuidado. Seu crescimento mora em aprender que flexibilidade não é traição aos seus princípios.",
  },
  ISFJ: {
    name: "O Zelador do Vínculo",
    headline: "Você percebe o que ninguém pediu em voz alta — e cuida antes que vire falta.",
    narrative: "Você guarda os detalhes que fazem alguém se sentir visto: o café do jeito certo, a data que importa, o tom de voz que mudou. Prático e atento, você traduz afeto em gestos concretos e cria em volta de si um ambiente onde as pessoas simplesmente se sentem seguras — uma competência invisível justamente porque funciona bem demais. A tensão que você carrega é que cuidar tanto pode significar aparecer pouco: você absorve as necessidades dos outros até esquecer de nomear as suas, e o desconforto de pedir pode custar caro em silêncio. Seu florescimento começa quando você entende que receber também é uma forma de cuidar do vínculo.",
  },
  ESTJ: {
    name: "O Maestro do Concreto",
    headline: "Onde há confusão, você traça a linha, define o passo e coloca todo mundo em movimento.",
    narrative: "Você tem um talento raro para transformar intenção em execução: lê a situação real, decide com clareza e organiza pessoas e recursos em torno de um resultado tangível. Direto e confiável, você diz o que pensa, cumpre o que combina e prospera assumindo a responsabilidade que muitos evitam. A tensão embutida é que a mesma eficiência que resolve pode atropelar — nem tudo que é ineficiente é errado, e nem toda hesitação alheia é falta de comprometimento; às vezes é um sentimento pedindo espaço antes da solução. Seu crescimento está em perceber que perguntar 'como você está?' pode ser tão estruturante quanto perguntar 'o que falta fazer?'.",
  },
  ESFJ: {
    name: "O Elo da Comunidade",
    headline: "Você percebe quando o grupo balança — e move o mundo pra ninguém ficar de fora.",
    narrative: "Você lê o clima de um ambiente como quem lê o tempo, e age rápido para que as pessoas se sintam acolhidas, incluídas e no lugar certo. Caloroso e prático, você cuida do concreto que sustenta a convivência — o convite feito, a ponte reconstruída, a celebração organizada — e ganha energia genuína ao ver os outros bem. A tensão que você carrega é a dependência da harmonia: quando alguém desaprova, dói mais do que deveria, e o esforço de agradar a todos pode calar o que você mesmo precisa ou pensa. Seu florescimento começa quando você descobre que decepcionar às vezes é o preço de ser inteiro — e que o vínculo verdadeiro sobrevive à sua verdade.",
  },
  ISTP: {
    name: "O Desmontador Silencioso",
    headline: "Você entende o mundo abrindo-o com as próprias mãos.",
    narrative: "Você tem um talento raro para ler como as coisas funcionam por dentro — máquinas, sistemas, crises — e agir com uma calma quase cirúrgica quando tudo ao redor está pegando fogo. Pensa fazendo, não falando: enquanto os outros debatem, você já está com a peça na mão testando a hipótese. Relaciona-se por competência e espaço, oferecendo presença prática em vez de longos discursos afetivos. A tensão nasce aí — sua independência e economia de palavras podem passar por frieza, e o mesmo desapego que te deixa lúcido no caos às vezes te faz adiar o que exige vulnerabilidade em vez de conserto.",
  },
  ISFP: {
    name: "O Artífice do Instante",
    headline: "Você sente antes de nomear, e cria beleza sem pedir permissão.",
    narrative: "Você tem uma sensibilidade aguçada para textura, cor, som e clima emocional — percebe detalhes que passam despercebidos aos outros e os transforma em algo concreto e bonito. Age guiado por um senso interno de valores mais do que por regras externas: se não parece verdadeiro para você, você simplesmente não faz. Relaciona-se com uma lealdade calorosa e discreta, demonstrando afeto por gestos e presença em vez de declarações. A tensão está em que seu foco no agora e sua aversão a se impor podem deixar de lado planos longos e limites necessários — e sua profundidade emocional, quando guardada, às vezes se transforma num peso que ninguém ao redor percebe que você carrega.",
  },
  ESTP: {
    name: "O Piloto do Agora",
    headline: "Você lê a situação em tempo real e joga a jogada certa antes dos outros terminarem de pensar.",
    narrative: "Você tem um radar afiadíssimo para o que está realmente acontecendo à sua volta — pessoas, riscos, oportunidades — e a coragem de agir na hora, quando a janela está aberta. Aprende com o corpo e com o mundo, testando na prática em vez de estudar no papel, e prospera exatamente onde os outros travam: sob pressão, no improviso, no alto risco. Relaciona-se com energia magnética e franqueza direta, tornando qualquer ambiente mais vivo só por estar nele. A tensão aparece quando a sede de ação atropela a paciência: consequências de longo prazo, rotina e conversas mais lentas podem parecer entediantes demais para segurar sua atenção — e a mesma ousadia que abre portas às vezes bate em algumas antes de você olhar o mapa.",
  },
  ESFP: {
    name: "O Acendedor de Presença",
    headline: "Onde você chega, o ambiente respira mais fundo e todo mundo se sente convidado.",
    narrative: "Você tem um dom natural de transformar o comum em celebração — capta o clima de um grupo em segundos e sabe exatamente como fazer as pessoas se sentirem vistas, acolhidas e à vontade. Vive intensamente o presente, com os cinco sentidos abertos, e generosamente puxa os outros para dentro desse calor. Relaciona-se com afeto expansivo e uma leitura fina das emoções alheias, oferecendo alegria como quem oferece abrigo. A tensão está em que sua entrega ao agora e ao bem-estar de todos pode adiar o cuidado com o próprio futuro — e, por evitar tanto o conflito e o tédio, às vezes você deixa de dizer o que precisa, mantendo o brilho por fora mesmo quando por dentro pede uma pausa.",
  },
};

const EN_TYPES: Record<TypeCode, TypeContent> = {
  INTJ: {
    name: "The Long-Range Cartographer",
    headline: "You draw the whole map before taking the first step — and the step almost always lands.",
    narrative: "You see patterns where others see noise, turning vague hunches into plans with milestones, deadlines, and a clear destination. You think from the inside out: quietly gathering the world's clues, running them privately, and revealing a conclusion only once it's solid — which can make you seem to arrive fully-formed, hard to follow. Your demand for coherence is a rare strength, but the same ruler that flags a flawed system flags, unasked, the people you love. Your built-in tension is this: the perfect map needs real terrain, and terrain only reveals itself once you agree to begin before you're absolutely sure.",
  },
  INTP: {
    name: "The Builder of the Possible",
    headline: "Every idea is a door — and you have to open all of them before choosing which room to live in.",
    narrative: "You're driven by a restless curiosity: you take any claim, turn it inside out, and test whether it holds together from within. You build elegant mental models, spot the inconsistency no one else caught, and feel an almost physical pleasure when a piece finally clicks into the larger logic. You relate through ideas before emotions — when someone brings a problem, your instinct is to solve it, not to hold it, which can read colder than you actually are. The tension you live with is the gap between the refined theory and the act: the world wants an answer today, but you want to open just one more door.",
  },
  ENTJ: {
    name: "The Wayfinder-in-Chief",
    headline: "You don't wait for the bridge to appear — you gather people and build the crossing.",
    narrative: "You turn vision into motion: where there's a big, hazy goal, you break it into fronts, assign owners, and set a pace. You think out loud, decide fast, and don't fear friction — for you a frank argument is the shortest path to the best call, and you respect anyone who returns your reasoning in kind. Your energy pulls others forward, but the same stride that moves the team can trample whoever needs time to process before agreeing. The tension that defines you is efficiency versus patience: not every result that matters fits the schedule, and some wins only ripen at people's tempo, not yours.",
  },
  ENTP: {
    name: "The Spark-Chaser",
    headline: "You light ten possibilities in a single conversation — and the brightest usually comes from the friction.",
    narrative: "You think by talking: you toss out a provocation, hear the rebound, adjust, and mid-exchange arrive at connections no one would reach alone. You see alternative angles with natural ease, love dismantling a lazy consensus, and turn even an obstacle into a puzzle that's fun to crack. Your mind leaps fast from one possibility to the next — plenty of sparks, but also a trail of exciting projects started and left unfinished once the novelty's shine fades. The tension you carry is breadth versus depth: the world keeps opening infinite fascinating doors, and growing, for you, means choosing to walk a few of them all the way through.",
  },
  INFJ: {
    name: "The Silent Beacon",
    headline: "You see what hasn't been said yet, and you guide with a light almost no one notices is on.",
    narrative: "You pair an almost prophetic read on people with a deep loyalty to what you believe is right — sensing patterns, intentions, and quiet pain that slip past everyone else, then turning it into aimed, deliberate care. You think in layers, chasing the meaning behind the meaning, and you'd rather act from conviction than convenience; once something settles inside you, it settles with roots and purpose. You bond intensely but selectively: a few true connections outweigh many shallow ones. The built-in tension is that your depth also isolates you — you pour so much of your inner world into the ideals you carry that you forget to ask for the same care you give, and the beacon lighting others can go dark on the inside.",
  },
  INFP: {
    name: "The Keeper of Meaning",
    headline: "You carry a core of values so alive that nothing which betrays what you believe slips by unnoticed.",
    narrative: "You live from an inner compass no one can override: what's authentic, humane, and true to who you are matters more than any outside approval. Your imagination runs rich and the realm of what-could-be enchants you — you spot the potential for goodness and beauty where others see only what already exists, and you defend the overlooked with a quiet, ferocious loyalty. In relationships you offer a rare, non-judging attention that makes people feel finally seen. The built-in tension lives between the ideal and the real: because you dream of a high standard of meaning and integrity, ordinary life — with its lukewarm commitments and necessary compromises — can feel like a letdown, and you sometimes wait inside the ideal instead of acting in the imperfect world in front of you.",
  },
  ENFJ: {
    name: "The Weaver of People",
    headline: "You make everyone around you bloom — and you feel, firsthand, the growth you help set in motion.",
    narrative: "You have a rare gift for seeing the best in people and then helping them reach it, braiding purpose, warmth, and vision into an energy that naturally gathers others around something larger. You read emotion in real time, adjust your tone with no visible effort, and turn groups into teams: rooms shift when you enter them and people feel capable. Your decisions always run through human impact — what this does to the people I love and the people who count on me weighs as much as the logic. The built-in tension is that by investing so heavily in everyone's growth, you can dissolve into the caretaking: you absorb others' weight, measure your worth by the harvest you plant in them, and risk forgetting that you need watering too.",
  },
  ENFP: {
    name: "The Sower of Possibility",
    headline: "Where others see one road, you see ten — and you set everyone alight with the urge to walk them.",
    narrative: "You're a bottomless spring of enthusiasm and unexpected connections: you catch sparks of possibility in almost everything and turn loose ideas into adventures that sweep people along. Genuinely curious about people, you build closeness fast, celebrate what makes each person singular, and see potential in them they haven't spotted in themselves yet. You move on values and the emotion of the moment, blending warm spontaneity with a stubborn faith in what could still become. The built-in tension lives in the abundance: so many exciting beginnings compete for your energy that the finishing — the slow, repetitive, novelty-free part — becomes your blind spot, and sometimes the next shiny thing calls before the last one has turned real.",
  },
  ISTJ: {
    name: "The Keeper of the Word Given",
    headline: "You build trust the rarest way there is: by doing exactly what you said you'd do.",
    narrative: "You read the world through what's concrete and verifiable, and you treat a commitment as something close to sacred — if you promised it, you deliver it, and that quiet steadiness becomes the foundation others lean on without even noticing. Your memory for facts, deadlines, and detail is an anchor, and you'd rather prove your worth through day-to-day consistency than through speeches. The built-in tension is that the same loyalty to what already works can harden into resistance to what's new — not every old rule deserves keeping, and sometimes your care for doing right hides how much you also need to be cared for. Your growth lives in learning that flexibility isn't a betrayal of your principles.",
  },
  ISFJ: {
    name: "The Warden of Belonging",
    headline: "You notice what no one asked for out loud — and tend to it before it becomes an absence.",
    narrative: "You hold on to the small details that make a person feel seen: the coffee made just right, the date that matters, the shift in someone's tone. Practical and attentive, you translate affection into concrete acts and build an atmosphere around you where people simply feel safe — a competence that stays invisible precisely because it works so well. The tension you carry is that caring this much can mean showing up too little for yourself: you absorb everyone's needs until you forget to name your own, and the discomfort of asking can cost you a great deal in silence. Your flourishing begins when you realize that receiving is also a way of caring for the bond.",
  },
  ESTJ: {
    name: "The Marshal of the Doable",
    headline: "Where there's confusion, you draw the line, name the next step, and get everyone moving.",
    narrative: "You have a rare gift for turning intention into execution: you read the real situation, decide with clarity, and organize people and resources around a tangible result. Direct and dependable, you say what you think, deliver what you agreed to, and thrive by taking on the responsibility many people avoid. The built-in tension is that the same efficiency that solves can also steamroll — not everything inefficient is wrong, and not every hesitation in others is a lack of commitment; sometimes it's a feeling asking for room before the fix. Your growth lies in seeing that asking 'how are you?' can be just as structuring as asking 'what's left to do?'.",
  },
  ESFJ: {
    name: "The Heart of the Circle",
    headline: "You feel it the moment the group wobbles — and move mountains so no one is left out.",
    narrative: "You read the mood of a room the way others read the weather, and you move quickly so people feel welcomed, included, and in the right place. Warm and practical, you tend to the concrete things that hold a community together — the invitation extended, the bridge rebuilt, the celebration arranged — and you draw genuine energy from seeing others thrive. The tension you carry is a reliance on harmony: when someone disapproves, it stings more than it should, and the effort to please everyone can quietly mute what you yourself need or think. Your flourishing begins when you discover that disappointing someone is sometimes the price of being whole — and that a real bond survives your truth.",
  },
  ISTP: {
    name: "The Quiet Dismantler",
    headline: "You understand the world by taking it apart with your own hands.",
    narrative: "You have a rare gift for reading how things work from the inside — machines, systems, emergencies — and acting with an almost surgical calm while everything around you is on fire. You think by doing, not by talking: while others debate, you already have the part in hand, testing the hypothesis. You connect through competence and breathing room, offering practical presence instead of long emotional speeches. The tension lives right there — your independence and economy of words can read as coldness, and the same detachment that keeps you clear-headed in chaos can lead you to postpone what asks for vulnerability rather than a fix.",
  },
  ISFP: {
    name: "The Maker of the Moment",
    headline: "You feel before you name, and you make beauty without asking permission.",
    narrative: "You have a sharp sensitivity to texture, color, sound, and emotional weather — you catch details others miss and turn them into something concrete and beautiful. You act guided by an inner sense of values more than by outside rules: if it doesn't feel true to you, you simply won't do it. You connect through warm, understated loyalty, showing affection in gestures and presence rather than declarations. The tension is that your focus on the now and your reluctance to impose can leave long plans and needed boundaries unattended — and your emotional depth, when kept inside, sometimes becomes a weight no one around you realizes you're carrying.",
  },
  ESTP: {
    name: "The Live-Wire Pilot",
    headline: "You read the room in real time and make the right move before others finish thinking.",
    narrative: "You have a razor-sharp radar for what's actually happening around you — people, risks, openings — and the nerve to act the instant the window is open. You learn through your body and the world, testing in practice rather than studying on paper, and you thrive exactly where others freeze: under pressure, on the fly, in high stakes. You connect with magnetic energy and blunt honesty, making any room more alive just by being in it. The tension shows up when the hunger for action outruns patience: long-term consequences, routine, and slower conversations can feel too dull to hold your attention — and the same boldness that opens doors sometimes slams into a few before you've checked the map.",
  },
  ESFP: {
    name: "The Room-Lighter",
    headline: "Wherever you arrive, the room breathes deeper and everyone feels invited in.",
    narrative: "You have a natural gift for turning the ordinary into celebration — you read a group's mood in seconds and know exactly how to make people feel seen, welcomed, and at ease. You live the present intensely, with all five senses open, and you generously pull others into that warmth. You connect through expansive affection and a fine read of other people's emotions, offering joy the way someone offers shelter. The tension is that your devotion to the now and to everyone's well-being can postpone caring for your own future — and by avoiding conflict and boredom so much, you sometimes hold back what you need, keeping the shine on the outside even when inside you're asking for a pause.",
  },
};

const PT_CLARITY: Record<ClarityBand, string> = {
  slight: "Leve", noticeable: "Perceptível", marked: "Marcada", distinct: "Nítida",
};
const EN_CLARITY: Record<ClarityBand, string> = {
  slight: "Light", noticeable: "Noticeable", marked: "Marked", distinct: "Distinct",
};

const AXES: Record<TypesLocale, Record<AxisSlug, AxisContent>> = { pt: PT_AXES, en: EN_AXES };
const FACETS: Record<TypesLocale, Record<TypeFacetSlug, FacetContent>> = { pt: PT_FACETS, en: EN_FACETS };
const TYPES: Record<TypesLocale, Record<TypeCode, TypeContent>> = { pt: PT_TYPES, en: EN_TYPES };
const CLARITY: Record<TypesLocale, Record<ClarityBand, string>> = { pt: PT_CLARITY, en: EN_CLARITY };

// ─── Public API ─────────────────────────────────────────────────────────────

export function getAxisContent(axis: AxisSlug, locale: TypesLocale): AxisContent {
  return AXES[locale][axis];
}
export function getFacetContent(facet: TypeFacetSlug, locale: TypesLocale): FacetContent {
  return FACETS[locale][facet];
}
export function getTypeContent(code: TypeCode, locale: TypesLocale): TypeContent {
  return TYPES[locale][code];
}
export function getClarityLabel(band: ClarityBand, locale: TypesLocale): string {
  return CLARITY[locale][band];
}

const AXIS_SLUGS = new Set<string>(AXIS_ORDER);
const FACET_SLUGS = new Set<string>(Object.keys(FACET_AXIS));

export function axisFromFacetId(facetId: string): AxisSlug | null {
  const m = facetId.match(/^tipos:axis:(.+)$/);
  if (!m || !AXIS_SLUGS.has(m[1])) return null;
  return m[1] as AxisSlug;
}
export function facetFromFacetId(facetId: string): TypeFacetSlug | null {
  const m = facetId.match(/^tipos:facet:(.+)$/);
  if (!m || !FACET_SLUGS.has(m[1])) return null;
  return m[1] as TypeFacetSlug;
}

/** The letter for a dichotomy given its mean (>=3 → pole A, else pole B). */
export function letterForAxis(axis: AxisSlug, mean: number): string {
  return mean >= 3 ? AXIS_LETTERS[axis].a : AXIS_LETTERS[axis].b;
}

/** Build the 4-letter code from the four dichotomy means, in order. */
export function codeFromAxisMeans(means: Record<AxisSlug, number>): TypeCode {
  return AXIS_ORDER.map((ax) => letterForAxis(ax, means[ax])).join('') as TypeCode;
}

/** Clarity band from a dichotomy mean: how far from the 3.0 midpoint. */
export function clarityBand(mean: number): ClarityBand {
  const d = Math.abs(mean - 3);
  if (d >= 1.5) return 'distinct';
  if (d >= 1.0) return 'marked';
  if (d >= 0.5) return 'noticeable';
  return 'slight';
}

/** Map a bipolar mean (1..5, center 3) to [0, 1] for a centered bar. */
export function normalizeBipolar(mean: number): number {
  return Math.max(0, Math.min(1, (mean - 1) / 4));
}
