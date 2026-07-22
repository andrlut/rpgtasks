-- Learning material: explainer — attachment styles & relationship satisfaction
-- Fills the under-covered `romance` sub (bonds dim) and connects to the app's
-- ECR-R Attachment instrument. Pipeline: planner -> researcher -> drafter ->
-- reviewer (PASSED, warns only). Idempotent by slug (INSERT; no prior row).

insert into public.learning_material (
  slug, type, dimension_id, topic, reading_minutes,
  title_pt, title_en,
  summary_pt, summary_en,
  body_pt, body_en,
  takeaways_pt, takeaways_en,
  signs_pt, signs_en,
  tracking_pt, tracking_en,
  source_url, source_label_pt, source_label_en,
  reasoning_log
) values (
  'attachment-styles-love',
  'explainer',
  'bonds',
  'attachment-styles-relationship-satisfaction',
  6,
  $t$Apego no amor: dois números, não um rótulo$t$,
  $t$Attachment in love: two numbers, not a label$t$,
  $t$O ECR-R te dá dois medidores contínuos, não uma caixa — e o que muda a relação é o gesto quando o alarme dispara, não o rótulo.$t$,
  $t$The ECR-R hands you two continuous dials, not a box — and what changes a relationship is the move when the alarm fires, not the label.$t$,
  $body_pt$Seu parceiro demora duas horas pra responder uma mensagem simples. Uma parte de você já montou três explicações — e as três terminam mal. Num outro relacionamento, com outra pessoa, você nem teria olhado o celular. Essa diferença não é frescura nem falta de amor. Ela tem nome, e você provavelmente já mediu sem perceber.

Se você respondeu o ECR-R aqui no app — as 36 perguntas sobre como você se sente perto de quem ama — recebeu de volta dois números, não um rótulo. Um de ansiedade (medo de ser abandonado), um de evitação (desconforto com intimidade e com depender do outro). A maioria das pessoas descarta os números e guarda só a palavra: "ah, sou ansioso", "sou meio evitativo". É exatamente aí que a ciência vira desculpa.

O que mais prevê a qualidade de uma relação não é o rótulo que você carrega — é o comportamento que ele descreve. Numa meta-análise de 132 estudos com **71 mil pessoas**, ansiedade e evitação previram menos satisfação: a sua e a do seu parceiro (Candel & Turliuc, 2019). Mas prever não é condenar. Muita gente insegura vive relações ótimas. A diferença mora no que você faz quando o alarme dispara.

## 1. Dois botões de volume, não quatro caixas

O ECR-R (sigla em inglês para "Experiências em Relacionamentos Próximos, revisado") não te encaixa num tipo. Ele mede duas coisas, e mede em grau, não em sim-ou-não.

O primeiro número é ansiedade de apego: o quanto você fica de olho em sinais de abandono. Quanto maior, mais o "meu parceiro ainda me quer?" fica ligado no fundo. O segundo é evitação: o quanto intimidade e depender do outro te dão desconforto. Quanto maior, mais você prefere resolver tudo sozinho.

As palavras que a internet adora — "ansioso", "evitativo", "seguro", "temeroso" — são só quadrantes desenhados depois, cruzando esses dois eixos. Quem criou a medida deixou isso claro: são dimensões contínuas, não diagnósticos (Fraley, Waller & Brennan, 2000). Ninguém é uma caixa. Você é um ponto em dois controles deslizantes — e ponto se move.

Por que isso importa na prática? Porque tratar o rótulo como identidade fixa te dá uma saída fácil ("sou assim") justo no lugar onde a mudança é possível. Como você sabe onde está? Seus dois números do ECR-R. Um alto, outro baixo, os dois altos, os dois baixos — cada combinação descreve um jeito diferente de reagir quando a relação aperta.

## 2. O alarme e o botão de mudo

Aqui está o mecanismo que os dois números escondem. Quando a relação dá sinal de ameaça — uma resposta seca, um silêncio, uma viagem — cada pessoa faz uma de duas coisas com o próprio sistema de alarme.

Quem pontua alto em ansiedade tende à hiperativação: sobe o volume do alarme. Na prática, isso é monitorar o clima o tempo todo, cobrar reasseguramento ("você me ama mesmo?"), grudar, e às vezes o que os pesquisadores chamam de protesto — provocar uma briga, mandar dez mensagens, ameaçar ir embora só pra ver se o outro corre atrás. Não é manipulação fria; é um alarme de incêndio tocando alto demais.

Quem pontua alto em evitação faz o oposto: desativação. Aperta o botão de mudo. Engole a própria necessidade, aumenta a distância, se convence de que "não preciso de ninguém". Parece calma, mas é o mesmo alarme — só que abafado (Mikulincer & Shaver, 2007).

Junte os dois numa relação e você tem a dança perseguir-recuar: um cobra, o outro se fecha, e cada movimento alimenta o do outro. Um estudo com 539 casais recém-casados mostrou que isso não soma, multiplica — dois parceiros inseguros se saem pior do que a conta simples previa, com mais queda de satisfação ao longo do tempo (Peters, Meltzer & McNulty, 2025).

E o efeito atinge os dois. Os pesquisadores separam o efeito ator — o quanto a sua insegurança derruba a sua própria satisfação — do efeito parceiro — o quanto ela derruba a satisfação de quem está do seu lado. Os dois são reais; o seu é maior, mas o que você faz respinga no outro (Candel & Turliuc, 2019). Curiosamente, entre os dois padrões, a evitação costuma pesar mais na qualidade da relação do que a ansiedade (Li & Chan, 2012).

> "Precisamos de vínculos emocionais com algumas poucas pessoas insubstituíveis para sermos física e mentalmente saudáveis — para sobreviver."

A frase é da psicóloga Sue Johnson. Ela ajuda a entender por que o alarme existe: ele não é defeito, é um sistema velho fazendo o trabalho de manter perto quem importa. Uma ressalva honesta: boa parte desses estudos usa autorrelato dos dois parceiros, o que pode inflar as correlações, e a cultura influencia o quanto cada padrão aparece. Os números são fortes, não são sentença.

## 3. Você não precisa trocar de rótulo

A pergunta óbvia é: "então preciso virar seguro primeiro?" Não. E essa é a parte que a psicologia de internet mais distorce.

Existe algo chamado segurança conquistada — pessoas que tiveram infância difícil e hoje funcionam de forma segura. É real, mas foi exagerado. Um estudo prospectivo de 23 anos achou que adultos "seguros conquistados", olhando pra trás, não tinham de fato mais registros de apego inseguro na infância do que os outros (Roisman et al., 2002). Traduzindo: mudança acontece, mas a história de "force a barra e vire seguro" tem menos apoio do que vendem. O apego é moderadamente estável — muda com a experiência, mas resiste mais que o humor (Fraley, 2002). Boa notícia embutida: você não precisa reconstruir sua identidade. Precisa mudar o gesto no momento em que o alarme toca.

Dois mitos a mais, rápido. Primeiro: "ansioso é a pessoa ciumenta". Um estudo de 2025 seguiu 322 jovens por um ano e o ciúme de redes sociais previu mais vigilância e menos satisfação — mas não houve ligação direta significativa entre traço de ansiedade e ciúme no acompanhamento (Métellus et al., 2025). Muitas vezes é o ambiente, não o seu traço. Segundo: "terapia de casal é mágica". A EFT, terapia focada na emoção, tem efeito grande antes-depois (d=0,93) e cerca de 70% dos casais saem sem sintomas — mas comparada a outras terapias sérias de casal, a vantagem é só média (d=0,44). Funciona; não é milagre exclusivo (meta-análise em Journal of Couple & Family Psychology, 2022).

Então o que fazer com os seus dois números? Não trocar de caixa. Interceptar o padrão:

:::list-icon
alert-circle | **Nomeie o alarme, não o parceiro.** "Tô me sentindo inseguro agora" abre conversa; "você nunca me dá atenção" fecha.
hand-left | **Peça direto em vez de testar.** Se você hiperativa, troque o protesto por um pedido claro: "preciso de dez minutos seus hoje".
chatbubbles | **Se você desativa, diga a necessidade em voz alta.** "Preciso de um tempo sozinho e volto" é distância com aviso, não abandono.
refresh | **Repare depois da ruptura.** O que cura não é nunca brigar — é voltar e reconectar depois. A reconexão é o músculo.
heart | **Refaça o ECR-R a cada poucos meses.** Os dois números se movem com a experiência; use-os como termômetro, não como sentença.
:::

---

Nada disso exige que você deixe de ser quem é. Os dois números do ECR-R não são um veredito sobre a sua capacidade de amar — são um mapa de onde o seu alarme dispara e do que ele te faz fazer. A pessoa segura não é a que nunca sente o alarme. É a que aprendeu a dizer "meu alarme tocou" antes de agir por ele. Esse gesto, repetido, é o que a ciência realmente mostra mudando relações — muito mais do que o rótulo que você marcou no teste.

:::source[Candel & Turliuc, 2019 · Personality and Individual Differences · meta-análise, N=71.011](https://www.sciencedirect.com/science/article/abs/pii/S0191886919302673)$body_pt$,
  $body_en$Your partner takes two hours to answer a simple text. Part of you has already written three explanations, and all three end badly. With someone else, in another relationship, you wouldn't have even glanced at your phone. That gap isn't drama or a lack of love. It has a name — and you've probably already measured it without realizing.

If you took the ECR-R in the app — the 36 questions about how you feel close to the people you love — you got back two numbers, not a label. One for anxiety (fear of being abandoned), one for avoidance (discomfort with closeness and depending on someone). Most people toss the numbers and keep the word: "oh, I'm anxious," "I'm kind of avoidant." That's exactly where the science turns into an excuse.

What predicts relationship quality most isn't the label you carry — it's the behavior it describes. In a meta-analysis of 132 studies covering **71,000 people**, both anxiety and avoidance predicted lower satisfaction: yours and your partner's (Candel & Turliuc, 2019). But predicting isn't sentencing. Plenty of insecure people are in great relationships. The difference lives in what you do when the alarm goes off.

## 1. Two volume dials, not four boxes

The ECR-R (Experiences in Close Relationships–Revised) doesn't sort you into a type. It measures two things, and it measures them by degree, not yes-or-no.

The first number is attachment anxiety: how closely you watch for signs of being abandoned. Higher means "does my partner still want me?" hums in the background more often. The second is avoidance: how much closeness and depending on someone else make you uncomfortable. Higher means you'd rather handle everything alone.

The words the internet loves — "anxious," "avoidant," "secure," "fearful" — are just quadrants drawn afterward by crossing those two axes. The people who built the measure said so plainly: these are continuous dimensions, not diagnoses (Fraley, Waller & Brennan, 2000). Nobody is a box. You're a point on two sliders — and points move.

Why does that matter day to day? Because treating the label as a fixed identity hands you an easy out ("that's just how I am") at the exact spot where change is possible. How do you know where you sit? Your two ECR-R numbers. One high, one low, both high, both low — each combination describes a different way of reacting when the relationship gets tight.

## 2. The alarm and the mute button

Here's the mechanism the two numbers hide. When the relationship signals a threat — a curt reply, a silence, a trip away — each person does one of two things with their own alarm system.

People who score high on anxiety tend toward hyperactivation: they turn the alarm up. In practice that's monitoring the mood constantly, fishing for reassurance ("do you actually love me?"), clinging, and sometimes what researchers call protest — picking a fight, firing off ten texts, threatening to leave just to see if the other person chases. It isn't cold manipulation; it's a smoke detector shrieking too loud.

People who score high on avoidance do the opposite: deactivation. They hit mute. They swallow the need, widen the distance, tell themselves "I don't need anyone." It looks like calm, but it's the same alarm — just muffled (Mikulincer & Shaver, 2007).

Put the two in one relationship and you get the pursue-withdraw dance: one presses, the other shuts down, and each move feeds the other. A study of 539 newlywed couples found this doesn't add up, it multiplies — two insecure partners do worse than simple arithmetic predicted, with steeper satisfaction decline over time (Peters, Meltzer & McNulty, 2025).

And it hits both people. Researchers separate the actor effect — how much your insecurity drags down your own satisfaction — from the partner effect — how much it drags down the satisfaction of the person next to you. Both are real; yours is bigger, but what you do splashes onto them (Candel & Turliuc, 2019). Oddly, of the two patterns, avoidance usually weighs on relationship quality more than anxiety does (Li & Chan, 2012).

> "We need emotional attachments with a few irreplaceable others to be physically and mentally healthy — to survive."

That line is from psychologist Sue Johnson, and it explains why the alarm exists at all: it isn't a flaw, it's an old system doing its job of keeping the people who matter close. One honest caveat: much of this research leans on both partners' self-reports, which can inflate the correlations, and culture shapes how strongly each pattern shows up. The numbers are strong, not a verdict.

## 3. You don't need to swap labels

The obvious question: "so I have to become secure first?" No. And this is the part pop psychology mangles most.

There's a thing called earned security — people who had a rough childhood and function securely today. It's real, but it's been oversold. A 23-year prospective study found that adults counted as "earned-secure," looking back, weren't actually more likely to have documented insecure attachment in infancy than anyone else (Roisman et al., 2002). Translation: change happens, but the "just will yourself secure" story has less support than it's sold with. Attachment is moderately stable — it shifts with experience, but it resists more than mood does (Fraley, 2002). The good news buried in that: you don't have to rebuild your identity. You have to change the move in the moment the alarm rings.

Two more quick myths. First: "anxious means the jealous one." A 2025 study followed 322 young adults for a year, and social-media jealousy predicted more surveillance and lower satisfaction — but there was no significant direct link between trait anxiety and jealousy at follow-up (Métellus et al., 2025). Often it's the environment, not your trait. Second: "couples therapy is magic." EFT — emotionally focused therapy — shows a large before-after effect (d=0.93), with about 70% of couples symptom-free at the end. But compared with other serious couples therapies, the edge is only medium (d=0.44). It works; it isn't a unique miracle (meta-analysis in Journal of Couple & Family Psychology, 2022).

So what do you do with your two numbers? Not swap boxes. Intercept the pattern:

:::list-icon
alert-circle | **Name the alarm, not the partner.** "I'm feeling insecure right now" opens a conversation; "you never pay attention to me" closes one.
hand-left | **Ask directly instead of testing.** If you hyperactivate, trade the protest for a clear request: "I need ten minutes with you today."
chatbubbles | **If you deactivate, say the need out loud.** "I need some time alone and I'll be back" is distance with a heads-up, not abandonment.
refresh | **Repair after the rupture.** What heals isn't never fighting — it's coming back and reconnecting after. Reconnection is the muscle.
heart | **Retake the ECR-R every few months.** Both numbers move with experience; use them as a thermometer, not a verdict.
:::

---

None of this asks you to stop being who you are. Your two ECR-R numbers aren't a verdict on your ability to love — they're a map of where your alarm fires and what it makes you do. The secure person isn't the one who never feels the alarm. It's the one who learned to say "my alarm just went off" before acting on it. That move, repeated, is what the science actually shows changing relationships — far more than the label you ticked on the test.

:::source[Candel & Turliuc, 2019 · Personality and Individual Differences · meta-analysis, N=71,011](https://www.sciencedirect.com/science/article/abs/pii/S0191886919302673)$body_en$,
  ARRAY[
    $t$O ECR-R te dá dois números contínuos — ansiedade e evitação — não um rótulo fixo; "ansioso" e "evitativo" são só quadrantes desenhados depois.$t$,
    $t$O que derruba a satisfação (a sua e a do parceiro) é o comportamento: hiperativar (cobrar, protestar) ou desativar (se fechar, se distanciar) quando o alarme dispara.$t$,
    $t$Você não precisa "virar seguro"; precisa nomear o alarme e trocar o gesto no momento — isso muda mais relações do que trocar de rótulo.$t$
  ]::text[],
  ARRAY[
    $t$The ECR-R gives you two continuous numbers — anxiety and avoidance — not a fixed label; "anxious" and "avoidant" are just quadrants drawn afterward.$t$,
    $t$What lowers satisfaction (yours and your partner's) is the behavior: hyperactivating (fishing, protesting) or deactivating (shutting down, distancing) when the alarm fires.$t$,
    $t$You don't have to "become secure"; you have to name the alarm and change the move in the moment — that shifts relationships more than swapping labels.$t$
  ]::text[],
  ARRAY[
    $t$Quando algo te incomoda, você diz "me senti inseguro" em vez de provocar briga ou sumir.$t$,
    $t$Depois de um atrito, vocês voltam e reconectam no mesmo dia, sem deixar apodrecer.$t$,
    $t$Você consegue pedir o que precisa direto — atenção ou espaço — sem testar o outro pra ver se ele adivinha.$t$
  ]::text[],
  ARRAY[
    $t$When something bothers you, you say "I felt insecure" instead of picking a fight or disappearing.$t$,
    $t$After friction, you come back and reconnect the same day instead of letting it fester.$t$,
    $t$You can ask for what you need directly — attention or space — without testing whether your partner will guess.$t$
  ]::text[],
  $t$Isso conversa direto com o seu sub de Romance, dentro de Vínculos. O ECR-R que você respondeu no app alimenta a sua Identidade Percebida — e você pode refazer o instrumento a cada poucos meses pra ver os dois números se moverem com a experiência. Compare a nota que você se dá em Romance (autoavaliação) com o que o ECR-R aponta: quando as duas começam a andar juntas, é sinal de que o padrão que você pratica está batendo com quem você quer ser.$t$,
  $t$This ties straight into your Romance sub, inside Bonds. The ECR-R you took in the app feeds your Perceived Identity — and you can retake the instrument every few months to watch both numbers move with experience. Compare the score you give yourself on Romance (self-assessment) with what the ECR-R points to: when the two start moving together, it's a sign the pattern you practice is lining up with who you want to be.$t$,
  'https://www.sciencedirect.com/science/article/abs/pii/S0191886919302673',
  $t$Candel & Turliuc, 2019 · Personality and Individual Differences · meta-análise, N=71.011$t$,
  $t$Candel & Turliuc, 2019 · Personality and Individual Differences · meta-analysis, N=71,011$t$,
  $log${
    "template_type": "explainer",
    "template_version": 2,
    "pipeline": "planner->researcher->drafter->reviewer",
    "review": {"passed": true, "fails": 0, "warns": 6, "warns_addressed": ["inline attribution added to headline 71k stat", "ansiedade/evitacao glossed at first mention", "EFT citation given journal+year (no verified first author in dossier)"]},
    "voice_principles_applied": [
      "Three ideas not seven (2 dials / mechanism / no-relabel recipe)",
      "Prose-led — only one body visual (list-icon recipe) plus source block and one blockquote",
      "Native PT and native EN written fresh, not translated",
      "Jargon defined on first mention (ECR-R, hyperactivation, deactivation, protest, actor/partner effect, earned security)",
      "Concrete examples anchor abstractions (unanswered text, ten-texts protest, need-ten-minutes request)",
      "Honest caveats woven in (self-report inflation, earned security overclaimed, EFT d=.44, jealousy context-driven)"
    ],
    "steps": [
      {"id": "hook", "answer": "Open on the unanswered-text scenario: the same trigger sparks catastrophizing in one relationship and indifference in another. That gap has a name you already measured via the ECR-R."},
      {"id": "thesis", "answer": "What predicts relationship quality is the behavior the label describes, not the label itself. Carried as a bold in-prose stat (132 studies, 71,000 people; both anxiety and avoidance predict lower satisfaction, yours and your partner's)."},
      {"id": "real_definition", "answer": "ECR-R = two CONTINUOUS dials (anxiety = threat-monitoring for abandonment; avoidance = discomfort with closeness/dependence), not four personality boxes. Labels are post-hoc quadrants, not diagnoses (Fraley, Waller & Brennan 2000)."},
      {"id": "stakes", "answer": "Insecurity lowers both partners satisfaction; in newlyweds two insecure partners interact multiplicatively, worse than additive (Peters, Meltzer & McNulty 2025). Actor effect > partner effect but partner effect is real (Candel & Turliuc 2019)."},
      {"id": "mechanism", "answer": "Threat triggers hyperactivation (turn the alarm up: monitoring, reassurance-seeking, clinging, protest) for high anxiety or deactivation (hit mute: suppress need, maximize distance) for high avoidance (Mikulincer & Shaver 2007). Together: pursue-withdraw dance. Avoidance weighs more than anxiety (Li & Chan 2012)."},
      {"id": "myth_busts", "answer": "1) Must become secure first — earned security real but overclaimed (Roisman 2002); attachment only moderately stable (Fraley 2002). 2) Anxious = jealous — 2025 longitudinal found no significant direct trait-anxiety-jealousy link at 1 yr (Metellus 2025). 3) Couples therapy is magic — EFT large pre-post (d=.93) but only medium vs other therapies (d=.44)."},
      {"id": "recipe", "answer": "list-icon with five moves: name the alarm not the partner; ask directly instead of testing; if you deactivate say the need aloud; repair after rupture; retake the ECR-R as a thermometer not a verdict."}
    ]
  }$log$::jsonb
);

insert into public.learning_material_sub (material_id, sub_id)
select id, 'romance' from public.learning_material where slug = 'attachment-styles-love';
