/**
 * DISC — narrative content bundle (PT + EN).
 *
 * 4 behavioral factors (Dominância / Influência / Estabilidade /
 * Conformidade) scored as per-factor means on a 1..5 scale (see the
 * `disc_mean` scoring method). The result UI ranks the four means into a
 * primary + secondary style "blend" (12 codes) and shows where the user
 * sits on each factor.
 *
 * This is an ORIGINAL (autoral) instrument inspired by Marston's
 * public-domain DISC model — no wording is taken from any commercial DISC
 * product, and the profile names are freshly coined (not Geier's classic
 * pattern names). Uses the generic all-caps "DISC" throughout.
 */

export type DiscFactor = 'd' | 'i' | 's' | 'c';

/** Primary + (optional) secondary style. Opposite pairs (D↔S, I↔C) never
 * blend, so only these 12 codes are reachable. */
export type DiscBlendCode =
  | 'D' | 'DI' | 'DC'
  | 'I' | 'ID' | 'IS'
  | 'S' | 'SI' | 'SC'
  | 'C' | 'CD' | 'CS';

export type DiscLocale = 'pt' | 'en';

export type DiscLevel = 'low' | 'mid' | 'high';

interface FactorContent {
  /** "Dominância" / "Dominance", etc. */
  label: string;
  /** One-line factor definition shown on cards + bars. */
  oneLiner: string;
  /** What LOW on this factor looks like day-to-day (a different style, not a deficit). */
  low: string;
  /** Situational / balanced. */
  mid: string;
  /** What HIGH on this factor looks like day-to-day. */
  high: string;
}

interface BlendContent {
  /** Coined profile name, e.g. "O Timoneiro" / "The Helmsman". */
  name: string;
  /** One punchy sentence. */
  headline: string;
  /** 3-4 sentences: strengths + the built-in tension of the combo. */
  body: string;
}

// ─── Factor narratives ──────────────────────────────────────────────────────

const PT_FACTORS: Record<DiscFactor, FactorContent> = {
  d: {
    label: 'Dominância',
    oneLiner: 'Foco em resultado, controle e desafio — direto e decidido.',
    low: 'Ir pro embate direto não é seu jeito natural. Você tende a buscar consenso antes de bater o martelo, prefere que a decisão amadureça a forçar a barra, e não faz questão de estar no comando pra se sentir bem. Onde outra pessoa avança na marra, você contorna — e muita coisa se resolve sem ninguém precisar levantar a voz.',
    mid: 'Você assume o comando quando a situação pede, mas não faz questão de estar sempre no controle. Sabe ser direto numa hora que precisa de decisão rápida e recuar quando o momento é de ouvir. Costuma ler bem quando é hora de empurrar e quando é hora de deixar o processo correr.',
    high: 'Você vai direto ao ponto e gosta de estar no comando das próprias decisões. Desafio te acende, lentidão te irrita, e você prefere resolver logo a ficar remoendo. O lado que pesa: sua franqueza pode soar dura sem você perceber, e a pressa de decidir às vezes atropela quem precisava de mais tempo pra embarcar.',
  },
  i: {
    label: 'Influência',
    oneLiner: 'Foco em pessoas e entusiasmo — expressivo e sociável.',
    low: 'Vender uma ideia no entusiasmo não é o seu caminho — você confia mais no conteúdo do que na empolgação. Prefere um grupo pequeno a estar no centro das atenções, mede as palavras antes de falar, e não precisa de plateia pra saber que fez um bom trabalho. Onde outros contagiam pelo clima, você convence pela consistência.',
    mid: 'Você circula bem entre gente sem precisar ser o centro das atenções. Sabe puxar assunto e animar um grupo quando o momento pede, mas também fica à vontade quando é hora de baixar o tom e escutar. Usa o entusiasmo como ferramenta, não como piloto automático.',
    high: 'Você se acende no meio das pessoas e contagia o ambiente com facilidade. Fala com naturalidade, improvisa, gosta de reconhecimento e transforma um grupo qualquer em conversa. O lado que pesa: o entusiasmo às vezes atropela o detalhe, e a fome de aprovação pode te fazer dizer sim antes de checar se cabe no seu tempo.',
  },
  s: {
    label: 'Estabilidade',
    oneLiner: 'Foco em ritmo constante e cooperação — paciente e leal.',
    low: 'Rotina fixa e ritmo constante não são o que te sustenta — você lida bem com mudança e até se anima com ela. Muda de direção sem grande custo, tolera um clima tenso quando é necessário, e não precisa de tudo previsível pra funcionar. Onde outros seguram o passo, você acelera quando o cenário vira.',
    mid: 'Você valoriza estabilidade sem ficar preso a ela. Segura um ritmo constante quando o trabalho pede, mas se adapta quando o plano muda de verdade. Costuma ser a pessoa que mantém o time coeso, mas não a ponto de evitar todo atrito quando algo precisa ser dito.',
    high: 'Você é a base constante — paciente, leal, o ouvinte que o grupo procura quando as coisas apertam. Prefere previsibilidade, cuida da harmonia e sustenta o ritmo sem precisar de holofote. O lado que pesa: mudança brusca te desestabiliza mais do que aparenta, e evitar conflito às vezes te faz engolir o que precisava ser dito.',
  },
  c: {
    label: 'Conformidade',
    oneLiner: 'Foco em precisão, qualidade e o jeito certo de fazer.',
    low: "Seguir o manual à risca e revisar cada detalhe não é o que te move — você prefere andar logo a travar na busca do perfeito. Confia no instinto, tolera o 'bom o suficiente', e não se prende às regras quando elas atrapalham o resultado. Onde outros checam três vezes, você entrega e ajusta depois.",
    mid: "Você preza pela qualidade sem virar refém dela. Confere o que importa, pede dados quando a decisão é pesada, mas sabe soltar o 'suficiente' no que não vale o capricho extra. Costuma equilibrar bem o rigor com o prazo.",
    high: 'Você quer o jeito certo de fazer — analítico, preciso, do tipo que revisa antes de entregar. Pede dados, desconfia do improviso e não descansa enquanto a coisa não está redonda. O lado que pesa: a barra alta pode virar trava, e o medo de errar às vezes te segura numa decisão que já dava pra tomar.',
  },
};

const EN_FACTORS: Record<DiscFactor, FactorContent> = {
  d: {
    label: 'Dominance',
    oneLiner: 'Focus on results, control, and challenge — direct and decisive.',
    low: "Charging straight at conflict isn't your natural move. You tend to look for consensus before calling the shot, prefer to let a decision ripen rather than force it, and don't need to be in charge to feel right. Where someone else pushes through by force, you work around it — and a lot gets solved without anyone raising their voice.",
    mid: "You take the lead when the situation calls for it, but you don't insist on always being in control. You can be direct when a fast decision is needed and step back when it's time to listen. You usually read well when to push and when to let things run their course.",
    high: "You go straight to the point and like being in charge of your own calls. Challenge lights you up, slowness irritates you, and you'd rather settle things now than sit with them. The cost: your bluntness can land harder than you mean it to, and your rush to decide sometimes runs over people who needed more time to get on board.",
  },
  i: {
    label: 'Influence',
    oneLiner: 'Focus on people and enthusiasm — expressive and sociable.',
    low: "Selling an idea on pure enthusiasm isn't your route — you trust substance over hype. You'd rather have a small group than the spotlight, weigh your words before speaking, and don't need an audience to know you did good work. Where others win the room with energy, you win it with consistency.",
    mid: "You move well among people without needing to be the center of attention. You can spark a conversation and lift a group's mood when the moment asks for it, but you're also comfortable dialing it down and listening. You use enthusiasm as a tool, not as autopilot.",
    high: "You light up around people and lift the mood of a room almost effortlessly. You speak with ease, improvise, enjoy recognition, and turn any group into a conversation. The cost: your enthusiasm sometimes outruns the details, and the hunger for approval can have you saying yes before you've checked whether it fits your plate.",
  },
  s: {
    label: 'Steadiness',
    oneLiner: 'Focus on steady pace and cooperation — patient and loyal.',
    low: "A fixed routine and a steady pace aren't what keep you going — you handle change well and can even be energized by it. You switch direction without much cost, tolerate some tension when it's necessary, and don't need everything predictable to function. Where others keep an even pace, you speed up when the scene changes.",
    mid: "You value stability without being tied to it. You keep a steady pace when the work calls for it, but you adapt when the plan genuinely changes. You're often the one holding the team together, though not so much that you dodge every friction when something needs to be said.",
    high: "You're the steady base — patient, loyal, the listener the group turns to when things get tight. You prefer predictability, tend to the harmony, and hold the pace without needing the spotlight. The cost: sudden change unsettles you more than it shows, and avoiding conflict sometimes has you swallowing what needed to be said.",
  },
  c: {
    label: 'Conscientiousness',
    oneLiner: 'Focus on precision, quality, and the right way to do things.',
    low: "Following the manual to the letter and reviewing every detail isn't what drives you — you'd rather get moving than stall chasing perfect. You trust your gut, tolerate 'good enough,' and don't cling to rules when they get in the way of the outcome. Where others check three times, you ship and adjust later.",
    mid: "You care about quality without becoming its hostage. You double-check what matters, ask for data when the decision is heavy, but know how to let 'good enough' stand where extra polish isn't worth it. You tend to balance rigor and deadline well.",
    high: "You want the right way to do things — analytical, precise, the kind who reviews before handing anything off. You ask for data, distrust winging it, and don't rest until it's clean. The cost: the high bar can turn into a stall, and the fear of getting it wrong sometimes holds you on a decision you could already have made.",
  },
};

// ─── Blend profiles ─────────────────────────────────────────────────────────

const PT_BLENDS: Record<DiscBlendCode, BlendContent> = {
  D: {
    name: 'O Timoneiro',
    headline: 'Você pega o leme quando ninguém mais quer decidir, e cobra resultado de si antes de cobrar dos outros.',
    body: "Sua força é a clareza de rumo: diante de um problema, você aponta a direção e começa a se mover antes que a dúvida instale. Você trabalha rápido, sem rodeios, e prefere errar tentando a paralisar analisando. A tensão embutida é o ritmo: o que pra você é 'só decidir e ir' pode soar como atropelo pra quem precisa de mais contexto, e a impaciência com a lentidão às vezes queima etapas que valiam a pena. Aprender a soltar o leme de vez em quando é o que transforma controle em liderança de verdade.",
  },
  DI: {
    name: 'O Vanguardeiro',
    headline: 'Você abre a trilha na frente e ainda arrasta gente junto pelo entusiasmo.',
    body: 'Você une a vontade de vencer com o dom de mobilizar: não só sabe pra onde ir, como convence os outros a irem também. Em grupo você assume o comando de forma calorosa, vende a ideia com energia e cria movimento onde havia hesitação. A tensão é o improviso a mil por hora: a mesma ousadia que inspira pode virar prometer mais do que dá pra entregar, ou tocar cinco frentes e concluir nenhuma. Seu crescimento está em ancorar o carisma em foco, pra que o entusiasmo vire feito e não só faísca.',
  },
  DC: {
    name: 'O Estrategista',
    headline: 'Você quer vencer, mas só do jeito certo e com a jogada bem calculada.',
    body: 'Você combina a ambição de resultado com a exigência de precisão: decide rápido, mas sustentado por lógica, dados e um padrão alto de qualidade. Você confronta problemas de frente e não aceita solução meia-boca — se é pra fazer, é pra fazer certo e ganhar. A tensão nasce aí: a mesma exigência que te faz confiável pode virar dureza consigo e com os outros, e a impaciência do resultado às vezes briga com a cautela da revisão. Seu equilíbrio é lembrar que nem toda vitória precisa ser perfeita, e que gente não é planilha.',
  },
  I: {
    name: 'A Faísca',
    headline: 'Você entra num ambiente e o clima muda — as pessoas simplesmente acendem perto de você.',
    body: 'Seu talento é conexão: você fala com facilidade, contagia com otimismo e faz gente se sentir vista e animada. Você improvisa bem, transforma estranho em amigo e traz leveza pros lugares mais pesados. A tensão embutida é a necessidade de aprovação: quando o reconhecimento demora ou vem uma crítica, você sente como rejeição e pode perder o gás. Seu amadurecimento é aprender que seu brilho não depende da plateia — ele já está aceso mesmo quando ninguém aplaude.',
  },
  ID: {
    name: 'O Catalisador',
    headline: 'Você acende a plateia e, no calor do momento, já assume o comando pra fazer acontecer.',
    body: 'Você mistura o magnetismo social com uma vontade concreta de resultado: não basta empolgar, você quer ver a ideia sair do papel — e puxa a fila pra isso. As pessoas te seguem porque você combina calor humano com iniciativa, e você prospera onde há gente pra convencer e coisa pra conquistar. A tensão está na urgência: quando o entusiasmo encontra pressa, você pode passar por cima de quem ficou pra trás sem perceber. Crescer é dosar a empolgação com escuta, pra que ninguém sinta que virou só figurante do seu show.',
  },
  IS: {
    name: 'O Anfitrião',
    headline: 'Você aproxima as pessoas e faz cada uma se sentir em casa, no seu ritmo.',
    body: 'Você une o entusiasmo de conectar com a paciência de acolher: não só anima o grupo, como cuida pra que ninguém fique de fora. As pessoas confiam em você porque você é caloroso e constante ao mesmo tempo — a alegria não vem com pressa nem com cobrança. A tensão embutida é a dificuldade com atrito: por querer todo mundo bem, você às vezes evita a conversa difícil e engole o próprio incômodo. Seu crescimento é entender que harmonia verdadeira às vezes passa por um conflito honesto, e que dizer não também é uma forma de cuidar.',
  },
  S: {
    name: 'O Porto Seguro',
    headline: 'Você é o lugar calmo onde as pessoas ancoram quando o mar fica bravo.',
    body: 'Sua força é a constância: você mantém o ritmo, cumpre o combinado e está presente sem alarde, dia após dia. Você ouve de verdade, evita drama e cria em volta uma sensação de segurança que faz os outros respirarem. A tensão embutida é a resistência à mudança: quando tudo vira de cabeça pra baixo, você trava, e por evitar conflito acaba adiando o que precisava ser dito. Seu amadurecimento é aceitar que estabilidade não é imobilidade — às vezes ancorar bem é justamente saber levantar âncora na hora certa.',
  },
  SI: {
    name: 'O Tecelão',
    headline: 'Você entrelaça as pessoas com paciência até virarem um grupo de verdade.',
    body: 'Você une a lealdade constante com o gosto genuíno pela companhia dos outros: cuida do vínculo no longo prazo e ainda traz calor pro convívio. Você é o tipo que lembra dos detalhes de cada um, acolhe sem cobrar e mantém o tecido do grupo inteiro no lugar. A tensão está em se diluir: por priorizar a harmonia e a aprovação, você pode se colocar sempre por último e evitar bater de frente até quando devia. Crescer é reconhecer que suas próprias necessidades também fazem parte do tecido — e que se cuidar não desfaz o laço, fortalece.',
  },
  SC: {
    name: 'O Guardião',
    headline: 'Você mantém tudo de pé com paciência e capricho, sem precisar de holofote.',
    body: "Você combina a estabilidade de quem não abandona o barco com a precisão de quem faz bem feito: cumpre o que promete, no prazo e no padrão. É em você que as pessoas confiam as tarefas que não podem falhar, porque você é constante, cuidadoso e discreto. A tensão embutida é o excesso de zelo: o medo de errar somado à aversão à mudança pode te deixar preso na rotina segura, revisando demais e arriscando de menos. Seu crescimento é confiar que 'bom o suficiente' às vezes basta, e que nem toda novidade é uma ameaça.",
  },
  C: {
    name: 'O Cartógrafo',
    headline: 'Você mapeia o terreno com precisão antes de qualquer um dar o primeiro passo.',
    body: 'Sua força é a exatidão: você busca dados, entende o funcionamento por dentro e encontra o jeito certo de fazer antes de agir. Você é reservado, cauteloso e revisa com esmero — o que sai da sua mão sai confiável. A tensão embutida é a paralisia da precisão: o medo de errar pode virar análise infinita, e a exigência de qualidade às vezes trava a entrega ou soa como frieza pra quem está do lado. Seu amadurecimento é aceitar que nenhum mapa é perfeito e que, em certo ponto, o terreno só se revela quando você começa a andar.',
  },
  CD: {
    name: 'O Arquiteto',
    headline: 'Você projeta com rigor e ainda tem a firmeza pra levar o projeto até o fim.',
    body: 'Você une a precisão do analista com a determinação de quem quer resultado: não basta estar certo no papel, você quer ver de pé e sólido. Você planeja com cuidado, exige qualidade e assume o comando quando o padrão está em jogo. A tensão está no encontro de duas exigências: o rigor que quer revisar tudo briga com a pressa que quer entregar já, e essa cobrança dupla pode pesar tanto sobre você quanto sobre a equipe. Crescer é escolher onde a perfeição importa e onde ela só atrasa — e abrir espaço pro erro humano, inclusive o seu.',
  },
  CS: {
    name: 'O Relojoeiro',
    headline: 'Você ajusta cada peça com paciência até tudo funcionar em silêncio e no tempo certo.',
    body: 'Você combina o esmero da precisão com a calma da constância: trabalha com método, sem alarde, e sustenta a qualidade no longo prazo sem se cansar de fazer certo. É em você que se confia o cuidado invisível — aquilo que só se nota quando falta, e que com você não falta. A tensão embutida é a rigidez tranquila: o apego ao jeito certo somado à preferência por rotina pode te fechar pra improviso e pra mudança, mesmo quando ela seria bem-vinda. Seu crescimento é lembrar que às vezes o relógio precisa de um modelo novo, não só de mais ajuste fino.',
  },
};

const EN_BLENDS: Record<DiscBlendCode, BlendContent> = {
  D: {
    name: 'The Helmsman',
    headline: 'You take the wheel when nobody else wants to decide, and demand results of yourself before anyone else.',
    body: "Your strength is clarity of direction: facing a problem, you point the way and start moving before doubt sets in. You work fast, without detours, and would rather fail trying than freeze analyzing. The built-in tension is pace: what feels like 'just decide and go' to you can land as steamrolling to people who need more context, and impatience with slowness sometimes skips steps that mattered. Learning to hand off the wheel now and then is what turns control into real leadership.",
  },
  DI: {
    name: 'The Vanguard',
    headline: 'You cut the trail out front and pull people along with sheer momentum.',
    body: "You blend the drive to win with the gift of rallying: you don't just know where to go, you get others to come along. In a group you take charge warmly, sell the idea with energy, and create motion where there was hesitation. The tension is improvising at full speed: the same boldness that inspires can tip into promising more than you can deliver, or juggling five fronts and finishing none. Your growth lies in anchoring the charisma to focus, so enthusiasm becomes results and not just sparks.",
  },
  DC: {
    name: 'The Strategist',
    headline: 'You want to win, but only the right way, with the play well calculated.',
    body: "You pair result-driven ambition with a demand for precision: you decide fast, but backed by logic, data, and a high bar for quality. You face problems head-on and won't accept a half-baked fix — if it's worth doing, it's worth doing right and winning. The tension is born there: the same rigor that makes you dependable can harden into being tough on yourself and others, and the impatience for results sometimes clashes with the caution of review. Your balance is remembering that not every win has to be flawless, and that people aren't spreadsheets.",
  },
  I: {
    name: 'The Spark',
    headline: 'You walk into a room and the mood shifts — people just light up around you.',
    body: "Your talent is connection: you speak with ease, spread optimism, and make people feel seen and energized. You improvise well, turn strangers into friends, and bring lightness to the heaviest rooms. The built-in tension is the need for approval: when recognition is slow or a criticism lands, it feels like rejection and your fuel can drain. Your growth is learning that your shine doesn't depend on the audience — it's already lit even when nobody claps.",
  },
  ID: {
    name: 'The Catalyst',
    headline: 'You fire up the room and, in the heat of it, take charge to make it happen.',
    body: "You mix social magnetism with a concrete drive for results: firing people up isn't enough, you want the idea off the page — and you lead the charge for it. People follow you because you blend human warmth with initiative, and you thrive where there are people to win over and things to conquer. The tension is urgency: when enthusiasm meets haste, you can roll over whoever fell behind without noticing. Growth is tempering the excitement with listening, so no one feels they've become an extra in your show.",
  },
  IS: {
    name: 'The Host',
    headline: 'You bring people together and make each one feel at home, at their own pace.',
    body: "You blend the enthusiasm of connecting with the patience of welcoming: you don't just liven up the group, you make sure no one is left out. People trust you because you're warm and steady at once — the cheer comes without rush or pressure. The built-in tension is friction: wanting everyone okay, you sometimes dodge the hard conversation and swallow your own discomfort. Your growth is realizing that real harmony sometimes runs through an honest conflict, and that saying no is also a way of caring.",
  },
  S: {
    name: 'The Safe Harbor',
    headline: 'You are the calm place people anchor to when the sea gets rough.',
    body: "Your strength is steadiness: you keep the pace, honor commitments, and show up quietly, day after day. You truly listen, avoid drama, and create around you a sense of safety that lets others breathe. The built-in tension is resistance to change: when everything turns upside down you freeze, and by avoiding conflict you end up postponing what needed to be said. Your growth is accepting that stability isn't stillness — sometimes anchoring well means knowing exactly when to lift anchor.",
  },
  SI: {
    name: 'The Weaver',
    headline: 'You weave people together patiently until they become a real group.',
    body: "You blend steady loyalty with a genuine taste for others' company: you tend the bond over the long haul and bring warmth to the connection. You're the type who remembers everyone's little details, welcomes without demanding, and keeps the whole fabric of the group in place. The tension is dissolving yourself: prioritizing harmony and approval, you can always put yourself last and dodge confrontation even when it's warranted. Growth is recognizing that your own needs are part of the fabric too — and that caring for yourself doesn't unravel the bond, it strengthens it.",
  },
  SC: {
    name: 'The Guardian',
    headline: 'You keep everything standing with patience and care, no spotlight needed.',
    body: "You combine the steadiness of someone who never abandons ship with the precision of someone who does it right: you deliver what you promise, on time and up to standard. You're who people trust with the tasks that can't fail, because you're constant, careful, and low-key. The built-in tension is over-caution: the fear of erring plus an aversion to change can leave you stuck in the safe routine, over-reviewing and under-risking. Your growth is trusting that 'good enough' sometimes is enough, and that not every new thing is a threat.",
  },
  C: {
    name: 'The Cartographer',
    headline: 'You map the terrain precisely before anyone takes the first step.',
    body: "Your strength is exactness: you seek data, understand how things work from the inside, and find the right way before acting. You're reserved, cautious, and review with care — what leaves your hands comes out dependable. The built-in tension is the paralysis of precision: fear of erring can turn into endless analysis, and the demand for quality sometimes stalls delivery or reads as coldness to those beside you. Your growth is accepting that no map is perfect and that, past a point, the terrain only reveals itself once you start walking.",
  },
  CD: {
    name: 'The Architect',
    headline: 'You design with rigor and have the resolve to see the project through.',
    body: "You blend the analyst's precision with the drive for results: being right on paper isn't enough, you want it standing and solid. You plan carefully, demand quality, and take charge when the standard is on the line. The tension lies where two demands meet: the rigor that wants to review everything clashes with the urgency that wants to ship now, and that double pressure can weigh on you as much as on the team. Growth is choosing where perfection matters and where it only delays — and making room for human error, including your own.",
  },
  CS: {
    name: 'The Watchmaker',
    headline: 'You adjust each piece patiently until it all runs quietly and on time.',
    body: "You combine the care of precision with the calm of constancy: you work methodically, without fanfare, and sustain quality over the long run without tiring of doing it right. You're trusted with the invisible care — the kind you only notice when it's missing, and with you it never is. The built-in tension is quiet rigidity: attachment to the right way plus a preference for routine can close you off to improvisation and change, even when it would be welcome. Your growth is remembering that sometimes the watch needs a new design, not just more fine-tuning.",
  },
};

const FACTORS: Record<DiscLocale, Record<DiscFactor, FactorContent>> = {
  pt: PT_FACTORS,
  en: EN_FACTORS,
};

const BLENDS: Record<DiscLocale, Record<DiscBlendCode, BlendContent>> = {
  pt: PT_BLENDS,
  en: EN_BLENDS,
};

// ─── Situational portrait ("você no dia a dia") ─────────────────────────────
// Concrete, relatable moments keyed to each factor. The result surfaces the
// reactions of the user's PRIMARY factor — the "this is exactly me" read.

interface SituationContent {
  /** The moment / scenario. */
  prompt: string;
  /** One-line reaction per factor. */
  byFactor: Record<DiscFactor, string>;
}

const PT_SITUATIONS: SituationContent[] = [
  {
    prompt: 'Sob um prazo apertado',
    byFactor: {
      d: 'Você acelera, corta o supérfluo e vai direto pro que resolve.',
      i: 'Você mobiliza o grupo e transforma a correria num mutirão animado.',
      s: 'Você mantém a calma e segura o ritmo sem deixar o pânico contaminar.',
      c: 'Você prioriza pelo que é crítico e protege a qualidade do essencial.',
    },
  },
  {
    prompt: 'Numa discordância',
    byFactor: {
      d: 'Você vai direto ao ponto e defende sua posição sem rodeio.',
      i: 'Você tenta convencer no carisma e alivia a tensão com humor.',
      s: 'Você busca o meio-termo e evita que o clima azede.',
      c: 'Você traz fatos, aponta a inconsistência e argumenta pela lógica.',
    },
  },
  {
    prompt: 'Quando o plano muda de repente',
    byFactor: {
      d: 'Você reassume o controle rápido e redefine a direção.',
      i: 'Você embarca fácil — novidade te anima mais do que assusta.',
      s: 'Você estranha a virada e precisa de um tempo pra reancorar.',
      c: 'Você quer entender o porquê da mudança antes de aceitá-la.',
    },
  },
  {
    prompt: 'Ao decidir algo importante',
    byFactor: {
      d: 'Você decide rápido e confia no próprio julgamento.',
      i: 'Você sente as reações das pessoas e decide no embalo.',
      s: 'Você pondera, consulta quem confia e evita a pressa.',
      c: 'Você junta dados, pesa os cenários e só fecha com base sólida.',
    },
  },
  {
    prompt: 'Quando alguém erra',
    byFactor: {
      d: 'Você aponta o erro na hora, sem meias palavras.',
      i: 'Você suaviza, explica com jeito e mantém o astral.',
      s: 'Você releva, dá espaço e evita constranger.',
      c: 'Você mostra onde saiu do padrão e como corrigir.',
    },
  },
  {
    prompt: 'Num ambiente novo, cheio de gente',
    byFactor: {
      d: 'Você busca logo quem decide e o que está em jogo.',
      i: 'Você circula, puxa conversa e faz amigos em minutos.',
      s: 'Você observa das bordas até se sentir seguro pra entrar.',
      c: 'Você mapeia o lugar e as regras antes de se soltar.',
    },
  },
  {
    prompt: 'Ao começar um projeto',
    byFactor: {
      d: 'Você parte pra ação e ajusta o rumo no caminho.',
      i: 'Você imagina o resultado empolgante e vende a ideia.',
      s: 'Você prefere um passo firme de cada vez, sem sobressaltos.',
      c: 'Você planeja e estrutura antes de arrancar.',
    },
  },
  {
    prompt: 'Sob crítica',
    byFactor: {
      d: 'Você rebate e defende sua posição de frente.',
      i: 'Você sente como pessoal e busca reconquistar a aprovação.',
      s: 'Você absorve calado e leva um tempo pra digerir.',
      c: 'Você analisa se a crítica procede antes de reagir.',
    },
  },
  {
    prompt: 'No fundo, o que mais te assusta',
    byFactor: {
      d: 'Perder o controle da situação.',
      i: 'Ser rejeitado ou passar despercebido.',
      s: 'Mudança brusca e conflito aberto.',
      c: 'Errar ou entregar algo abaixo do padrão.',
    },
  },
];

const EN_SITUATIONS: SituationContent[] = [
  {
    prompt: 'Under a tight deadline',
    byFactor: {
      d: 'You speed up, cut the fluff, and go straight to what solves it.',
      i: 'You rally the group and turn the scramble into a lively team push.',
      s: 'You stay calm and hold the pace without letting panic spread.',
      c: 'You prioritize by what is critical and protect the quality of the essentials.',
    },
  },
  {
    prompt: 'In a disagreement',
    byFactor: {
      d: 'You go straight to the point and defend your stance without hedging.',
      i: 'You try to win it on charm and ease the tension with humor.',
      s: 'You look for the middle ground and keep the mood from souring.',
      c: 'You bring facts, name the inconsistency, and argue from logic.',
    },
  },
  {
    prompt: 'When the plan suddenly changes',
    byFactor: {
      d: 'You grab the wheel fast and reset the direction.',
      i: 'You roll with it easily — novelty excites you more than it scares you.',
      s: 'You feel thrown by the shift and need a moment to re-anchor.',
      c: 'You want to understand the why of the change before accepting it.',
    },
  },
  {
    prompt: 'Making an important decision',
    byFactor: {
      d: 'You decide fast and trust your own judgment.',
      i: "You read people's reactions and decide in the flow.",
      s: 'You weigh it, consult people you trust, and avoid rushing.',
      c: 'You gather data, weigh the scenarios, and only settle on solid ground.',
    },
  },
  {
    prompt: 'When someone slips up',
    byFactor: {
      d: 'You point out the mistake on the spot, no mincing words.',
      i: 'You soften it, explain gently, and keep the mood up.',
      s: 'You let it slide, give room, and avoid embarrassing anyone.',
      c: 'You show exactly where it left the standard and how to fix it.',
    },
  },
  {
    prompt: 'In a new, crowded setting',
    byFactor: {
      d: "You quickly find who's in charge and what's at stake.",
      i: 'You mingle, strike up conversations, and make friends in minutes.',
      s: 'You watch from the edges until you feel safe enough to step in.',
      c: 'You map the place and the rules before you loosen up.',
    },
  },
  {
    prompt: 'Starting a project',
    byFactor: {
      d: 'You jump into action and adjust course along the way.',
      i: 'You picture the exciting outcome and sell the idea.',
      s: 'You prefer one firm step at a time, no jolts.',
      c: 'You plan and structure before you take off.',
    },
  },
  {
    prompt: 'Under criticism',
    byFactor: {
      d: 'You push back and defend your position head-on.',
      i: 'You take it personally and work to win approval back.',
      s: 'You absorb it quietly and take a while to digest it.',
      c: 'You weigh whether the criticism holds before reacting.',
    },
  },
  {
    prompt: 'Deep down, what scares you most',
    byFactor: {
      d: 'Losing control of the situation.',
      i: 'Being rejected or going unnoticed.',
      s: 'Abrupt change and open conflict.',
      c: 'Getting it wrong or delivering below standard.',
    },
  },
];

const SITUATIONS: Record<DiscLocale, SituationContent[]> = {
  pt: PT_SITUATIONS,
  en: EN_SITUATIONS,
};

// ─── Growth edge (bridge to action) ─────────────────────────────────────────
// The training focus for the user's PRIMARY (leading) style — the shadow of
// their strongest factor. Feeds the "Como treinar isso" card.

const PT_GROWTH: Record<DiscFactor, string> = {
  d: 'Seu treino é a pausa: deixar o outro terminar antes de decidir, e trocar um pouco de velocidade por escuta.',
  i: 'Seu treino é o foco: ancorar o entusiasmo num compromisso e levar até o fim antes de abraçar o próximo.',
  s: 'Seu treino é a voz: dizer o que incomoda no momento certo e topar uma mudança pequena de propósito.',
  c: "Seu treino é soltar: aceitar o 'bom o suficiente' onde o capricho extra não muda o resultado.",
};

const EN_GROWTH: Record<DiscFactor, string> = {
  d: 'Your training edge is the pause: let the other person finish before you decide, and trade a little speed for listening.',
  i: 'Your training edge is focus: anchor the enthusiasm to one commitment and see it through before grabbing the next.',
  s: 'Your training edge is your voice: say what bothers you at the right moment, and take on a small change on purpose.',
  c: "Your training edge is letting go: accept 'good enough' where the extra polish won't change the outcome.",
};

const GROWTH: Record<DiscLocale, Record<DiscFactor, string>> = {
  pt: PT_GROWTH,
  en: EN_GROWTH,
};

// ─── Public API ─────────────────────────────────────────────────────────────

export const DISC_FACTOR_ORDER: DiscFactor[] = ['d', 'i', 's', 'c'];

/** Circumplex opposites — these never form a primary/secondary blend. */
const OPPOSITE: Record<DiscFactor, DiscFactor> = {
  d: 's',
  s: 'd',
  i: 'c',
  c: 'i',
};

/** Minimum lead (on the 1..5 mean scale) for a primary to stand alone
 * rather than showing a two-letter blend. */
const BLEND_GAP = 0.75;

export function getFactorContent(
  factor: DiscFactor,
  locale: DiscLocale,
): FactorContent {
  return FACTORS[locale][factor];
}

export function getBlendContent(
  code: DiscBlendCode,
  locale: DiscLocale,
): BlendContent {
  return BLENDS[locale][code];
}

/** Situational portrait rows (localized). Read `.byFactor[primary]` per row. */
export function getSituations(locale: DiscLocale): SituationContent[] {
  return SITUATIONS[locale];
}

/** Training edge for a factor — feeds the "Como treinar isso" bridge. */
export function getGrowthEdge(factor: DiscFactor, locale: DiscLocale): string {
  return GROWTH[locale][factor];
}

/** Parse a psych_score facet_id like "disc:factor:d" into its factor. */
export function factorFromFacetId(facetId: string): DiscFactor | null {
  const m = facetId.match(/^disc:factor:(d|i|s|c)$/);
  if (!m) return null;
  return m[1] as DiscFactor;
}

/** Bucket a per-factor mean (1..5) into low / mid / high. Midpoint is 3;
 * the ±0.5 band around it reads as "mid". */
export function levelFromScore(score: number): DiscLevel {
  if (score >= 3.5) return 'high';
  if (score <= 2.5) return 'low';
  return 'mid';
}

/** Map a per-factor mean (1..5) to [0, 1] for the spectrum bars. */
export function normalizeFactorScore(score: number): number {
  return Math.max(0, Math.min(1, (score - 1) / 4));
}

/**
 * Derive the primary+secondary style blend from the four factor means.
 * Secondary is the higher-scoring of the two factors ADJACENT to the
 * primary (the opposite factor never blends). If the primary leads its
 * best adjacent by >= BLEND_GAP, the pure primary style is returned.
 * Always yields one of the 12 valid DiscBlendCode values.
 */
export function blendFromScores(
  scores: Record<DiscFactor, number>,
): DiscBlendCode {
  const ranked = [...DISC_FACTOR_ORDER].sort((a, b) => scores[b] - scores[a]);
  const primary = ranked[0];
  const adjacent = DISC_FACTOR_ORDER.filter(
    (f) => f !== primary && f !== OPPOSITE[primary],
  );
  const secondary =
    scores[adjacent[0]] >= scores[adjacent[1]] ? adjacent[0] : adjacent[1];

  if (scores[primary] - scores[secondary] >= BLEND_GAP) {
    return primary.toUpperCase() as DiscBlendCode;
  }
  return (primary.toUpperCase() + secondary.toUpperCase()) as DiscBlendCode;
}

/** The primary factor of a blend code (its first letter). */
export function primaryFactorOfBlend(code: DiscBlendCode): DiscFactor {
  return code[0].toLowerCase() as DiscFactor;
}
