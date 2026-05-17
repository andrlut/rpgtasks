-- ============================================================================
-- Learning validation content — 6 articles produced via the new reasoning-
-- template pipeline, manually orchestrated by the maintainer + drafter agent
-- before the autonomous Claude Routine is plugged in.
--
-- 6 articles:
--   1) glossary-sleep        — REWRITE: translation fixes + reasoning_log
--   2) glossary-strength     — REWRITE: Zone 2 explained properly + reasoning_log
--   3) summary-why-we-sleep  — NEW: Walker (2017) summary, with Guzey audit caveat
--   4) summary-outlive       — NEW: Attia (2023) summary
--   5) news-...              — NEW: recent health/longevity news #1
--   6) news-...              — NEW: recent health/longevity news #2
--
-- The trigger from migration 0001 captures the prior state of Sleep + Strength
-- into learning_material_revision automatically before each UPDATE.
-- ============================================================================

begin;

-- Tag this batch with the editor identity so the revision trigger can record
-- it. Postgres `current_setting('app.edited_by', true)` reads this.
set local app.edited_by = 'maintainer';
set local app.edit_summary = 'Reasoning-template validation batch — Sleep+Strength rewrites + 2 summaries + 2 news';

-- ============================================================================
-- 1. SLEEP — rewrite with translation fixes and reasoning_log
-- Body is the previous high-quality body with PT-side translation pass +
-- structural reasoning_log added so the audit trail starts here.
-- ============================================================================

update public.learning_material set
  reading_minutes = 6,
  body_pt = $body$Sono é a única atividade do seu dia em que **não fazer nada é fazer tudo**. Cada noite o cérebro consolida memória, recalibra hormônios e literalmente lava subprodutos metabólicos. Cortar 1h por noite parece pequeno — em duas semanas, vira o mesmo déficit cognitivo de uma noite inteira em claro. E você não percebe.

:::stat[7-9h]
o que adultos saudáveis precisam por noite, segundo o consenso conjunto da AASM + Sleep Research Society (Watson et al., 2015)
:::

## O que entra aqui

Sono não é uma coisa só. Três dimensões pesam — e faltar em uma quebra as outras.

:::list-icon
moon | **Quantidade.** 7-9h por noite, com chão sólido em 7h.
sync | **Regularidade.** Dormir e acordar nos mesmos horários, fins de semana incluídos.
sparkles | **Qualidade.** REM + sono profundo intactos. Sono fragmentado conta menos que parece.
:::

A maioria das pessoas acerta uma e ignora as outras duas. Dormir 8h irregulares ou de baixa qualidade não substitui 7h regulares e profundas.

## Por que importa tanto

:::quote{author="Watson et al.", source="Consenso AASM, 2015"}
Adults should sleep 7 or more hours per night on a regular basis to promote optimal health.
:::

Não é higienismo. Dormir menos de 7h por noite, de forma consistente, está ligado a aumento de peso, diabetes, hipertensão, depressão, função imune prejudicada — e mortalidade mais cedo. Uma meta-análise de 16 estudos prospectivos com **1,38 milhão** de adultos mostra risco aumentado de morte tanto pra quem dorme pouco quanto pra quem dorme demais.

:::compare{leftTitle="O que parece", rightTitle="O que mostra a evidência"}
left | Eu funciono bem com 5-6h.
right | Após 14 noites em 6h, performance cognitiva cai ao nível de 1 noite em claro — e você perde a consciência da própria queda (Van Dongen, 2003).
:::

## A bagunça hormonal

Duas noites de 4h de sono já bastam pra derrubar leptina (sinal de saciedade) e subir grelina (sinal de fome). O resultado: você sente fome mesmo comendo o suficiente, e o desejo por comida açucarada sobe entre **33% e 45%**.

:::progress[val=28 of=100]
de aumento na grelina depois de só 2 noites de 4h de sono. Você não está com pouca força de vontade — está hackeado bioquimicamente.
:::

## O cérebro precisa lavar

Durante o sono profundo, o espaço entre células do cérebro expande cerca de 60% e a clearance de β-amilóide (proteína ligada ao Alzheimer) acelera. É o sistema glinfático — a "lavagem" diária do cérebro. Sem sono suficiente, o lixo se acumula.

*Caveat honesto:* a evidência mais forte vem de estudo em camundongos (Xie et al., 2013). A extrapolação humana é plausível mas indireta — um paper de 2024 reportou clearance *menor* durante o sono em camundongos, complicando a história.

:::callout{kind=warn}
Estar acordado por 17-19h produz o mesmo prejuízo cognitivo e motor que 0,05% de álcool no sangue. 24h em claro ≈ 0,10%, acima do limite legal de direção em vários países. Dirigir cansado **é** dirigir embriagado em termos de performance (Dawson & Reid, *Nature* 1997).
:::

## Café, álcool, temperatura

Os 3 ajustes com maior retorno por menor esforço:

:::list-icon
cafe | **Cafeína** tem meia-vida de 5-6h. 400mg às 16h ainda reduz seu sono em **mais de 1 hora**. Última xícara antes das 14h.
wine | **Álcool** te faz dormir mais rápido — e destrói o REM da segunda metade da noite. "Dormi bem com vinho" é ilusão; o sono ficou raso.
thermometer | **Temperatura** do quarto entre 16-19°C. Sono começa com queda de ~1°C na temperatura corporal. Quarto quente impede essa queda.
:::

## Wearables ajudam — com asterisco

Anel, relógio, app de telefone: todos detectam **bem** se você está dormindo ou acordado (sensibilidade >95%). Quase nenhum detecta bem **as fases** do sono — a precisão na detecção de fase varia entre 50% e 86% entre dispositivos. Use o número total de horas como dado real. Trate "8% de sono profundo" como aproximação grosseira, não verdade.

:::callout{kind=tip}
Se você não pode aumentar a duração agora, **aumente a regularidade**. Um estudo de 2024 com ~60 mil adultos do UK Biobank achou que a regularidade do horário de sono prediz mortalidade melhor que a duração total. 6,5h sempre no mesmo horário pode vencer 8h irregulares.
:::

## A receita mínima

:::list-icon
time | Mesmo horário pra deitar e acordar, todos os dias.
bed | Quarto entre 16-19°C, escuro total.
cafe | Sem cafeína 8h antes de dormir.
ban | Sem álcool nas 3h antes de dormir.
:::

:::source[Cappuccio et al., 2010 · meta-análise n=1,38M · *Sleep*](https://pubmed.ncbi.nlm.nih.gov/20469800/)$body$,

  body_en = $body$Sleep is the one thing in your day where **doing nothing is doing everything**. Every night the brain consolidates memory, recalibrates hormones, and literally washes out metabolic byproducts. Cutting 1h per night sounds small — within two weeks it's the same cognitive deficit as a full night without sleep. And you don't notice.

:::stat[7-9h]
what healthy adults need per night, per the joint AASM + Sleep Research Society consensus (Watson et al., 2015)
:::

## What this covers

Sleep isn't one thing. Three dimensions matter — and missing one breaks the others.

:::list-icon
moon | **Quantity.** 7-9h per night, with a solid floor at 7h.
sync | **Regularity.** Same bedtime and wake time, weekends included.
sparkles | **Quality.** REM + slow-wave intact. Fragmented sleep counts less than it looks.
:::

Most people nail one and ignore the other two. Eight irregular or low-quality hours don't replace seven regular, deep ones.

## Why it matters

:::quote{author="Watson et al.", source="AASM Consensus, 2015"}
Adults should sleep 7 or more hours per night on a regular basis to promote optimal health.
:::

This isn't hygiene-talk. Consistently sleeping under 7h is linked to weight gain, diabetes, hypertension, depression, impaired immunity — and earlier mortality. A meta-analysis of 16 prospective studies covering **1.38 million** adults shows increased risk of death at both ends (too little AND too much sleep).

:::compare{leftTitle="What it feels like", rightTitle="What the evidence shows"}
left | I function fine on 5-6h.
right | After 14 nights at 6h, cognitive performance drops to the level of 1 night with no sleep — and you lose awareness of your own decline (Van Dongen, 2003).
:::

## The hormonal mess

Two nights of 4h sleep are enough to drop leptin (the satiety signal) and raise ghrelin (the hunger signal). Result: you feel hungry even after eating enough, and craving for sweet, fatty food jumps **33-45%**.

:::progress[val=28 of=100]
ghrelin increase after just 2 nights of 4h sleep. You're not short on willpower — you're being chemically hacked.
:::

## The brain needs to wash itself

During deep sleep, interstitial space in the brain expands about 60% and clearance of β-amyloid (the protein linked to Alzheimer's) accelerates. That's the glymphatic system — the brain's daily "wash". Without enough sleep, the junk accumulates.

*Honest caveat:* strongest evidence is in mice (Xie et al., 2013). The human extrapolation is plausible but indirect — a 2024 paper actually reported *reduced* clearance during sleep in mice, complicating the story.

:::callout{kind=warn}
Being awake for 17-19h produces the same cognitive and motor impairment as 0.05% blood alcohol. 24h awake ≈ 0.10%, above the legal driving limit in many countries. Drowsy driving **is** drunk driving in performance terms (Dawson & Reid, *Nature* 1997).
:::

## Caffeine, alcohol, temperature

The 3 levers with the best return for the least effort:

:::list-icon
cafe | **Caffeine** has a 5-6h half-life. 400mg at 4pm still cuts your sleep by **over 1 hour**. Last cup before 2pm.
wine | **Alcohol** puts you to sleep faster — and destroys REM in the second half of the night. "I sleep well with wine" is illusion; the sleep got shallow.
thermometer | **Bedroom temperature** between 16-19°C. Sleep starts with a ~1°C drop in core body temp. A warm room blocks that drop.
:::

## Wearables help — with an asterisk

Ring, watch, phone app. They all detect **well** whether you're asleep or awake (>95% sensitivity). Almost none detect **stages** well — stage sensitivity ranges 50-86% across devices. Use total sleep time as real data. Treat "8% deep sleep" as rough estimate, not truth.

:::callout{kind=tip}
If you can't add duration right now, **add regularity**. A 2024 study with ~60k UK Biobank adults found regularity of sleep timing predicts mortality better than total duration. 6.5h at the same time every night may beat 8h irregularly.
:::

## The minimum recipe

:::list-icon
time | Same bedtime and wake time, every day.
bed | Bedroom at 16-19°C, fully dark.
cafe | No caffeine 8h before bed.
ban | No alcohol in the 3h before bed.
:::

:::source[Cappuccio et al., 2010 · meta-analysis n=1.38M · *Sleep*](https://pubmed.ncbi.nlm.nih.gov/20469800/)$body$,

  reasoning_log = $rlog${
    "template_type": "explainer",
    "template_version": 1,
    "steps": [
      {"id": "hook", "answer_pt": "Sono é onde 'não fazer nada' é fazer tudo. Reframe: o tempo dormindo não é tempo perdido, é o trabalho mais importante do dia."},
      {"id": "thesis", "answer_pt": "7-9h por noite é o piso baseado em evidência peer-reviewed (AASM + NSF). Esse é o stat block."},
      {"id": "real_definition", "answer_pt": "Sono = quantidade + regularidade + qualidade. As 3 dimensões formam um tripé — faltar em uma derruba as outras."},
      {"id": "stakes", "answer_pt": "Meta-análise Cappuccio 2010 com n=1,38M mostra mortalidade aumentada em ambos extremos (curto e longo)."},
      {"id": "mechanism", "answer_pt": "Hormônios (leptina/grelina) recalibram durante o sono; glinfático limpa β-amilóide (caveat: em camundongos). Drowsy=drunk em performance cognitiva (Dawson 1997)."},
      {"id": "myth_busts", "answer_pt": "1) 'Funciono em 5-6h' — Van Dongen mostra a queda imperceptível. 2) 'Alcool me ajuda dormir' — destrói REM. 3) 'Wearables medem fase com precisão' — não, 50-86% sensibilidade."},
      {"id": "recipe", "answer_pt": "4 ações: horário fixo · quarto 16-19°C escuro · cafeína cutoff 14h · álcool cutoff 3h antes."}
    ],
    "edits_from_prior_version": [
      "Translation pass on PT source block (\"meta-analysis n=1.38M\" → \"meta-análise n=1,38M\")",
      "Translation of 'AASM Consensus' attribution in PT quote → 'Consenso AASM'",
      "Translation of 'Walker' reference style to PT conventions",
      "Tightened the 14-night cliff phrasing"
    ]
  }$rlog$::jsonb
where slug = 'glossary-sleep';

-- ============================================================================
-- 2. STRENGTH — rewrite with Zone 2 explained properly + reasoning_log
-- The big fix from the prior version: Zone 2 was name-dropped but never
-- defined. New version dedicates a section to "what it is + why mitochondrial
-- density matters + how to know you're in it."
-- ============================================================================

update public.learning_material set
  reading_minutes = 7,
  body_pt = $body$Força não é vaidade, e cardio não é só pra emagrecer. Os dois juntos são, por uma margem larga, **a intervenção com maior retorno em longevidade documentada na ciência**. O problema: a maior parte da queda acontece em silêncio, e só vira problema quando já fica caro corrigir.

:::stat[5,04×]
maior risco de morte por qualquer causa em adultos sedentários vs. atletas elite. Efeito **maior** que fumar, diabetes ou hipertensão (Mandsager et al., JAMA 2018, n=122.007).
:::

## Por que importa tanto

:::quote{author="Mandsager et al.", source="JAMA Network Open, 2018"}
Cardiorespiratory fitness is inversely associated with long-term mortality with no observed upper limit of benefit.
:::

Traduzindo: **quanto mais em forma, menor o risco — sem teto observado**. Não existe um ponto em que melhorar o cardio para de ajudar.

E essa queda começa cedo:

:::progress[val=8 of=100]
da massa muscular perdida por década depois dos 30, se você não treina. A taxa **acelera** depois dos 60. O custo de não treinar agora só aparece daqui a 30 anos.
:::

## O sinal mais subestimado: aperto de mão

:::callout{kind=info}
A cada **5 kg de queda na força da mão**, o risco de morte por qualquer causa sobe **16%**. Sinal mais forte que pressão arterial sistólica. Estudo PURE com 139.691 adultos em 17 países (Leong et al., *Lancet* 2015).
:::

Por que um aperto de mão prediz mortalidade? Porque força de preensão é um **proxy** pra função muscular geral, status nutricional e capacidade neuromuscular. Não é o aperto que importa — é o que ele revela. Você consegue medir em casa: se você não consegue carregar duas sacolas de 5 kg de mercado por 2 minutos, vale começar a treinar.

## Zone 2 — o regime mais incompreendido

Esse é o termo mais malentendido em treinamento. Vou definir:

**O que Zone 2 é.** É a faixa de intensidade aeróbica em que o corpo ainda queima principalmente gordura como combustível, sem produzir mais lactato do que consegue limpar. Tecnicamente: lactato sanguíneo abaixo de ~2 mmol/L. Bem abaixo do limiar anaeróbico (~4 mmol/L).

**Por que importa.** É o estímulo que constrói **densidade mitocondrial** — a quantidade e qualidade das "usinas de energia" das suas células. Mitocôndria boa = você queima gordura melhor, recupera melhor, e produz menos subprodutos inflamatórios. **HIIT não substitui isso.** HIIT treina sistemas diferentes (potência, tolerância ao lactato). Zone 2 treina a **fundação**.

**Como saber se você está em Zone 2.** A regra prática do "teste da conversa":

:::compare{leftTitle="Você não está em Zone 2", rightTitle="Você está em Zone 2"}
left | Não consegue falar — só monossílabos. Respiração ofegante.
right | Conversa **difícil mas possível**. Frases inteiras, respiração elevada. Você "preferiria não conversar agora", mas dá.
:::

Em frequência cardíaca, fica em torno de 60-70% da máxima. Ritmo cardíaco mais preciso: ~180 menos sua idade (regra MAF do Maffetone, aproximada).

**Quanto fazer.** A literatura converge em 3h/semana como mínimo significativo. Pode ser caminhada rápida, bike fácil, natação confortável, remo em ritmo baixo. **Não precisa de academia.**

:::quote{author="Peter Attia", source="Outlive, 2023"}
If I could only prescribe one drug to improve your health and longevity, it would be exercise — and within that, the single most important type would be aerobic efficiency, what we call Zone 2.
:::

## A receita mínima (OMS 2020)

A literatura converge nesse mínimo pra adultos. Mais é melhor, com teto bem distante.

:::list-icon
barbell | **2-3× semana** de treino de força. ~10 séries por grupo muscular por semana. Perto da falha.
walk | **150-300 min/semana** de aeróbico moderado (Zone 2: caminhada rápida, bike, natação confortável).
heart | **75-150 min/semana** de aeróbico vigoroso ALÉM disso, se rola.
body | **10 min/dia** de mobilidade. Vale mais que 1h por mês.
:::

Fonte: diretrizes da OMS 2020 (Bull et al., *British Journal of Sports Medicine*). Esse é o **piso**, não o teto.

## Mitos que vale soltar

:::list-icon
close-circle | **"Mulher fica musculosa fazendo musculação"** — não. Hormônios femininos limitam. Você ganha definição e força, não volume excessivo.
close-circle | **"Cardio mata os ganhos"** — só com 5+ corridas longas por semana. 2-3 sessões de Zone 2 não interferem em hipertrofia (Wilson et al., 2012).
close-circle | **"10.000 passos por dia"** — marketing de pedômetro japonês dos anos 60. Mortalidade plateia em 6-8 mil passos pra 60+, 8-10 mil pra mais novos (Paluch et al., *Lancet Public Health* 2022).
close-circle | **"Soreness = treino bom"** — não. DOMS é só carga nova ou eccêntrica. Lifters em progresso muitas vezes não ficam doloridos.
:::

## Onde está a margem real

Se você está nos seus 20-30 e a queda parece distante, vale lembrar:

:::callout{kind=tip}
A curva de declínio do VO2 max é **rasa agora** (-3-6% por década) e **íngreme depois dos 70** (-20%+ por década). O que você constrói nessa década é o que segura a curva quando o tempo cobra. Treinar nos 20-30 é o melhor seguro disponível pra autonomia nos 60-70.
:::

:::source[Mandsager et al., 2018 · *JAMA Network Open* · n=122.007](https://jamanetwork.com/journals/jamanetworkopen/fullarticle/2707428)$body$,

  body_en = $body$Strength isn't vanity, and cardio isn't just for weight loss. Together, by a wide margin, they're **the highest-return intervention for longevity documented in science**. The catch: most of the decline happens silently, and only becomes a problem once it's expensive to fix.

:::stat[5.04×]
all-cause mortality risk in low-fit adults vs. elite-fit. A **larger** effect than smoking, diabetes, or hypertension (Mandsager et al., JAMA 2018, n=122,007).
:::

## Why it matters

:::quote{author="Mandsager et al.", source="JAMA Network Open, 2018"}
Cardiorespiratory fitness is inversely associated with long-term mortality with no observed upper limit of benefit.
:::

Translation: **the fitter you are, the lower your risk — no observed ceiling**. There's no point at which improving cardio stops helping.

And the decline starts early:

:::progress[val=8 of=100]
muscle mass lost per decade after age 30 if you don't train. The rate **accelerates** past 60. The cost of not training now only shows up 30 years from now.
:::

## The most underrated signal: grip strength

:::callout{kind=info}
Every **5 kg drop in hand grip strength**, all-cause mortality risk rises **16%**. A stronger signal than systolic blood pressure. PURE study, 139,691 adults across 17 countries (Leong et al., *Lancet* 2015).
:::

Why does a handshake predict mortality? Because grip strength is a **proxy** for whole-body muscle function, nutritional status, and neuromuscular capacity. The handshake isn't what matters — it's what it reveals. You can self-test at home: if you can't carry two 5 kg grocery bags for 2 minutes, that's a signal to start training.

## Zone 2 — the most misunderstood regime

This is the most misunderstood term in training. Let me define it:

**What Zone 2 is.** It's the aerobic intensity range where the body still burns primarily fat as fuel, without producing more lactate than it can clear. Technically: blood lactate below ~2 mmol/L. Well below the anaerobic threshold (~4 mmol/L).

**Why it matters.** This is the stimulus that builds **mitochondrial density** — the quantity and quality of your cells' "energy factories." Better mitochondria = you burn fat better, recover better, and produce fewer inflammatory byproducts. **HIIT does not replace this.** HIIT trains different systems (power, lactate tolerance). Zone 2 builds the **foundation**.

**How to know you're in Zone 2.** The practical "talk test":

:::compare{leftTitle="Not in Zone 2", rightTitle="In Zone 2"}
left | Can't talk — only monosyllables. Heavy breathing.
right | Conversation **difficult but possible**. Full sentences, elevated breathing. You'd "rather not chat right now" but you can.
:::

In heart rate terms: roughly 60-70% of max. More precise rule: ~180 minus your age (Maffetone's MAF rule, approximate).

**How much.** Literature converges on 3h/week as the meaningful minimum. Can be brisk walking, easy cycling, comfortable swimming, low-rate rowing. **No gym required.**

:::quote{author="Peter Attia", source="Outlive, 2023"}
If I could only prescribe one drug to improve your health and longevity, it would be exercise — and within that, the single most important type would be aerobic efficiency, what we call Zone 2.
:::

## The minimum recipe (WHO 2020)

The literature converges on this minimum for adults. More is better, with the ceiling far away.

:::list-icon
barbell | **2-3× per week** of strength training. ~10 sets per muscle group per week. Close to failure.
walk | **150-300 min/week** of moderate aerobic (Zone 2: brisk walk, bike, comfortable swim).
heart | **75-150 min/week** of vigorous aerobic ON TOP of that, if you can.
body | **10 min/day** of mobility. Beats 1h per month.
:::

Source: WHO 2020 guidelines (Bull et al., *British Journal of Sports Medicine*). This is the **floor**, not the ceiling.

## Myths worth dropping

:::list-icon
close-circle | **"Lifting makes women bulky"** — no. Female hormones cap the ceiling. You gain definition and strength, not excessive volume.
close-circle | **"Cardio kills gains"** — only with 5+ long runs per week. 2-3 Zone 2 sessions don't interfere with hypertrophy (Wilson et al., 2012).
close-circle | **"10,000 steps per day"** — marketing from a 1960s Japanese pedometer. Mortality plateaus around 6-8k steps for 60+, 8-10k for younger adults (Paluch et al., *Lancet Public Health* 2022).
close-circle | **"Soreness = good workout"** — no. DOMS is just new or eccentric load. Lifters making progress are often not sore.
:::

## Where the real margin is

If you're in your 20s-30s and the decline feels distant, worth remembering:

:::callout{kind=tip}
The VO2 max decline curve is **shallow now** (-3-6% per decade) and **steep after 70** (-20%+ per decade). What you build in this decade is what holds the curve when time comes calling. Training in your 20s-30s is the best available insurance for autonomy in your 60s-70s.
:::

:::source[Mandsager et al., 2018 · *JAMA Network Open* · n=122,007](https://jamanetwork.com/journals/jamanetworkopen/fullarticle/2707428)$body$,

  reasoning_log = $rlog${
    "template_type": "explainer",
    "template_version": 1,
    "steps": [
      {"id": "hook", "answer_pt": "Força+cardio = a intervenção com maior retorno em longevidade. Stakes invisíveis na juventude, caros depois."},
      {"id": "thesis", "answer_pt": "5,04x mortalidade entre sedentários e fit elite — efeito maior que fumar (Mandsager 2018). Stat block headline."},
      {"id": "real_definition", "answer_pt": "Não é sobre estética. Cardiorespiratory fitness + força são predictors de mortalidade mais fortes que quase qualquer fator modificável."},
      {"id": "stakes", "answer_pt": "VO2 max (Mandsager n=122k) + grip strength (Leong PURE n=139k). Dois biomarkers diferentes, mesma direção."},
      {"id": "mechanism", "answer_pt": "ZONE 2 SECTION RECONSTRUCTED — defines: (a) lactate < 2 mmol/L below anaerobic threshold, (b) builds mitochondrial density vs HIIT trains power/tolerance, (c) talk test as practical detection, (d) 180-age HR rule. Fixes the prior 'name-dropping without explanation' failure mode."},
      {"id": "myth_busts", "answer_pt": "4 mitos: mulher musculosa, cardio mata gains (Wilson 2012), 10k passos (Paluch 2022), soreness = bom."},
      {"id": "recipe", "answer_pt": "WHO 2020: 2-3x força, 150-300min Zone 2, 75-150min vigoroso, 10min/dia mobilidade. Esse é o PISO."}
    ],
    "edits_from_prior_version": [
      "Zone 2 section fully reconstructed: definition + mechanism + how-to-know + dose, instead of name-drop",
      "Added MAF heart rate rule (180-age) for practical detection",
      "Translation pass on PT source blocks",
      "Added self-test for grip strength (2 sacolas de 5 kg)",
      "Reading time bumped 6 → 7 min to reflect the deeper Zone 2 treatment"
    ]
  }$rlog$::jsonb
where slug = 'glossary-strength';

-- ============================================================================
-- 3. NEW: summary-why-we-sleep
-- Walker (2017) summary, with Guzey audit centrally framed.
-- Honest assessment of reception is a load-bearing section, not a footnote.
-- ============================================================================

with m as (
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
    'summary-why-we-sleep', 'summary', 'health', 'sleep-book', 7,
    'Why We Sleep — com lápis cético na mão',
    'Why We Sleep — read with a skeptic''s pencil',
    'O livro mais influente sobre sono — e o mais auditado da última década.',
    'The most influential sleep book — and the most audited of the past decade.',
    $body$Matthew Walker quer responder uma pergunta evolutivamente absurda: por que sono existe? Você não come, não se reproduz, não se defende. E mesmo assim 1/3 da sua vida é gasta nisso. *Why We Sleep* (Norton, 2017) é o argumento de que sono é manutenção biológica não-negociável — e que a vida moderna está em uma "epidemia silenciosa de privação de sono."

:::quote{author="Matthew Walker", source="Why We Sleep, intro p.3"}
The shorter your sleep, the shorter your life.
:::

Essa é a tese, e também a frase mais auditada do livro.

## A pergunta do autor

Por que dormimos? Walker organiza a resposta em duas máquinas paralelas: **NREM** (sono profundo) consolida memória factual e limpa subprodutos metabólicos via sistema glinfático; **REM** processa emoção, integra aprendizado motor, gera criatividade. Os dois trabalham juntos. Faltar um quebra os dois.

## 3 ideias que sustentam o livro

### 1. Dormir menos de 7h causa doença

**Claim**: sono curto "mais que dobra" risco de câncer; é causa primária de Alzheimer via falha em limpar β-amilóide.

**Evidência citada**: Whitehall II, Nurses' Health Study, classificação IARC de trabalho noturno, modelos animais de clearance de amilóide.

:::callout{kind=warn}
Esse é o ponto **mais contestado**. A meta-análise de 2018 com 1,5M+ pessoas não encontrou ligação significativa entre sono curto e câncer. A causalidade humana pro Alzheimer também não está provada — Bill Gates flaggou exatamente isso em sua resenha pública do livro. Walker apresenta correlação como causalidade ao longo do capítulo.
:::

### 2. A regra das 8 horas

**Claim**: adultos precisam de 8h; 2/3 dos adultos em países desenvolvidos não dormem o suficiente; sono perdido não se recupera.

**Realidade**: a National Sleep Foundation recomenda **7-9h como faixa**, não 8h como alvo. O estudo de Daniel Kripke (Archives of General Psychiatry, 2002, n=1,1M) achou a menor mortalidade entre 6,5-7,5h — e mortalidade *maior* acima de 8h. A relação é em U, não monotônica. Walker apresenta como reta descendente.

### 3. Sono é inseparável da memória

**Claim**: NREM consolida memória factual; REM consolida procedural e emocional.

**Evidência**: fMRI do próprio Walker mostrando ~40% de déficit em encoding hipocampal após privação.

:::callout{kind=tip}
Esta é **a parte mais bem sustentada do livro**. A arquitetura de duas fases e seu papel na memória é ciência mainstream — não exclusiva ao Walker. O número de 40% vem de estudo pequeno (n≈28), mas a direção replica.
:::

## A auditoria que ninguém pode mais ignorar

Em 2019, Alexey Guzey publicou uma auditoria detalhada do livro. Documentou, com citações:

:::list-icon
close-circle | **Citação fabricada**: Walker afirma que a OMS declarou "epidemia de perda de sono". A OMS nunca fez isso — Walker citou um filme da National Geographic.
close-circle | **Manipulação de gráfico**: capítulo 6 reproduz um gráfico de lesões vs duração de sono, mas apaga a barra de 5 horas que contradiz o argumento. O estatístico Andrew Gelman (Columbia) chamou isso de "território de má conduta de pesquisa."
close-circle | **Estatística matematicamente impossível**: "400-600% menos erros" repetida no livro, no *Lancet* e em *Neuron*.
close-circle | **Fatal Familial Insomnia** citada como prova de que "falta de sono mata". FFI é doença priônica; insônia é sintoma, não causa.
:::

A UC Berkeley investigou após queixa formal e fechou sem investigação completa. Walker fez algumas correções em edições posteriores mas nunca emitiu errata abrangente. Em 2020, um paper dele no *Neuron* foi retratado por duplicação com o *Lancet*.

## O que muda na sua vida se aceitar a tese

Mesmo com os asteriscos, a direção geral é boa ciência mainstream:

:::list-icon
time | Mire 7-9h por noite com regularidade — o ponto central permanece.
moon | Quarto fresco, escuro, sem tela uma hora antes.
cafe | Cafeína cutoff 8h antes de deitar.
ban | Álcool destrói REM — não te ajuda a "dormir bem".
:::

## Veredito

Vale ler — com lápis cético na mão. É a porta de entrada mais acessível pra levar sono a sério. Mas trate cada estatística de choque como **"direcionalmente provável, numericamente suspeita."** Coaches de sono relataram pacientes desenvolvendo *insônia* depois de ler o livro com medo — esse risco é real. Não deixe acontecer com você.

:::source[Walker, M. — Why We Sleep, Norton 2017 · ISBN 978-1501144318. Auditoria Guzey 2019](https://guzey.com/books/why-we-sleep/)$body$,
    $body$Matthew Walker set out to answer an evolutionarily absurd question: why does sleep exist? You can't eat, mate, or defend yourself. Yet 1/3 of your life is spent on it. *Why We Sleep* (Norton, 2017) argues that sleep is non-negotiable biological maintenance — and that modern life is in a "silent sleep loss epidemic."

:::quote{author="Matthew Walker", source="Why We Sleep, intro p.3"}
The shorter your sleep, the shorter your life.
:::

That's the thesis — and also the most audited sentence in the book.

## The author's question

Why do we sleep? Walker organizes the answer around two parallel machines: **NREM** (deep sleep) consolidates factual memory and clears metabolic waste via the glymphatic system; **REM** processes emotion, integrates motor learning, generates creativity. Both work together. Missing one breaks the other.

## 3 ideas that hold the book up

### 1. Sleeping under 7h causes disease

**Claim**: short sleep "more than doubles" cancer risk; it's a primary driver of Alzheimer's via failure to clear β-amyloid.

**Evidence cited**: Whitehall II, Nurses' Health Study, IARC classification of night shift work, animal amyloid-clearance studies.

:::callout{kind=warn}
This is **the most contested point**. A 2018 meta-analysis of 1.5M+ people found no significant link between short sleep and cancer. Causality for Alzheimer's in humans is also unproven — Bill Gates flagged exactly this in his published review of the book. Walker presents correlation as causation throughout the chapter.
:::

### 2. The 8-hour rule

**Claim**: adults need 8h; 2/3 of adults in developed countries fail to get enough; lost sleep can't be repaid.

**Reality**: the National Sleep Foundation recommends **7-9h as a range**, not 8h as a target. Daniel Kripke's study (Archives of General Psychiatry, 2002, n=1.1M) found the lowest mortality between 6.5-7.5h — and *higher* mortality above 8h. The relationship is a U-curve, not monotonic. Walker presents it as a straight downward line.

### 3. Sleep is inseparable from memory

**Claim**: NREM consolidates factual memory; REM consolidates procedural and emotional memory.

**Evidence**: Walker's own fMRI work showing ~40% deficits in hippocampal encoding after deprivation.

:::callout{kind=tip}
This is **the best-supported part of the book**. The two-stage architecture and its role in memory is mainstream science — not Walker-exclusive. The 40% figure comes from a small (n≈28) study but the direction has replicated.
:::

## The audit nobody can ignore anymore

In 2019, Alexey Guzey published a detailed audit of the book. Documented with citations:

:::list-icon
close-circle | **Fabricated citation**: Walker claims WHO declared a "sleep loss epidemic." WHO never did — Walker cited a National Geographic film.
close-circle | **Graph manipulation**: chapter 6 reproduces an injury-vs-sleep graph but deletes the 5-hour bar that contradicts the argument. Statistician Andrew Gelman (Columbia) called this "research misconduct territory."
close-circle | **Mathematically impossible stat**: "400-600% fewer errors" repeated in the book, in *Lancet*, and in *Neuron*.
close-circle | **Fatal Familial Insomnia** cited as proof that "lack of sleep kills." FFI is a prion disease; insomnia is a symptom, not the cause.
:::

UC Berkeley investigated after a formal complaint and closed without a full investigation. Walker made some corrections in later printings but never issued comprehensive errata. In 2020, his *Neuron* paper was retracted for duplication with his *Lancet* paper.

## What changes if you accept the thesis

Even with the asterisks, the broad direction is solid mainstream science:

:::list-icon
time | Aim for 7-9h per night with regularity — the central point stands.
moon | Cool, dark room, no screens 1h before bed.
cafe | Caffeine cutoff 8h before bed.
ban | Alcohol destroys REM — it doesn't help you "sleep well."
:::

## The verdict

Worth reading — with a skeptic's pencil. It's the most accessible on-ramp to taking sleep seriously. But treat every shock statistic as **"directionally probably true, numerically suspect."** Sleep coaches have reported patients developing *insomnia* after reading the book with fear — that risk is real. Don't let it happen to you.

:::source[Walker, M. — Why We Sleep, Norton 2017 · ISBN 978-1501144318. Guzey audit 2019](https://guzey.com/books/why-we-sleep/)$body$,
    array[
      'Sono é central — Walker acerta. Mas as estatísticas de choque dele estão entre as mais auditadas da década.',
      'Meta-análise de 2018 (n=1,5M+) não acha ligação entre sono curto e câncer. Walker afirma o contrário.',
      'Mortalidade vs sono é curva em U (Kripke 2002, n=1,1M), não reta descendente. Mais que 8h também aumenta risco.'
    ],
    array[
      'Sleep matters — Walker gets the direction right. But his shock statistics are among the most audited of the decade.',
      'A 2018 meta-analysis (n=1.5M+) finds no link between short sleep and cancer. Walker claims the opposite.',
      'Mortality vs sleep is a U-curve (Kripke 2002, n=1.1M), not a straight downward line. Over 8h also raises risk.'
    ],
    array[
      'Você consegue distinguir o que do livro é mainstream do que é overclaim do Walker.',
      'Você usa as recomendações como guia, não como dogma.',
      'Você não desenvolveu medo paralisante de não dormir "8h perfeitas."'
    ],
    array[
      'You can tell which parts of the book are mainstream vs which are Walker overclaims.',
      'You use the recommendations as guidance, not dogma.',
      'You haven''t developed paralyzing fear of not getting "the perfect 8 hours."'
    ],
    'Esse summary fica em Aprender, sob o sub Sono (Saúde). Lendo ele você calibra o que pegar dos próximos materiais sobre sono — nem tudo que parece autoridade resiste à auditoria. Walker continua sendo referência, com asteriscos.',
    'This summary lives in Learn under the Sleep sub (Health). Reading it calibrates what to take from future sleep materials — not everything that sounds authoritative survives audit. Walker remains a reference, with asterisks.',
    'https://guzey.com/books/why-we-sleep/',
    'Walker, Why We Sleep · Norton 2017 · Auditoria: Guzey 2019',
    'Walker, Why We Sleep · Norton 2017 · Audit: Guzey 2019',
    $rlog${
      "template_type": "summary",
      "template_version": 1,
      "steps": [
        {"id": "author_question", "answer_pt": "Por que sono existe? Por que estamos dormindo cada vez menos?"},
        {"id": "author_thesis", "answer_pt": "Sono é manutenção biológica não-negociável; sociedade está em epidemia silenciosa de privação. Stat block do livro: 'The shorter your sleep, the shorter your life.'"},
        {"id": "core_ideas", "answer_pt": "1) Sono curto causa doença (contestado, central no overclaim). 2) Regra das 8h (mal-interpretada, é faixa 7-9). 3) Sono = memória (bem sustentado, mainstream)."},
        {"id": "evidence", "answer_pt": "Auditoria Guzey 2019 documenta: citação fabricada (OMS), manipulação de gráfico (cap 6), stat impossível (400-600%), FFI mal usado. Berkeley fechou sem investigação completa. Paper Neuron retratado em 2020."},
        {"id": "actionable", "answer_pt": "Mire 7-9h regular. Quarto fresco e escuro. Cafeína cutoff 8h antes. Sem álcool 3h antes. A direção geral do Walker é boa, os números são suspeitos."},
        {"id": "verdict", "answer_pt": "Vale ler com lápis cético. Porta de entrada mais acessível pra levar sono a sério, MAS pode causar insônia em leitores ansiosos — risco real reportado por coaches."}
      ]
    }$rlog$::jsonb
  )
  returning id
)
insert into public.learning_material_sub (material_id, sub_id)
select id, 'sleep' from m;

-- ============================================================================
-- 4. NEW: summary-outlive
-- Attia (2023) — Medicine 3.0, Four Horsemen, Centenarian Decathlon, Zone 2.
-- Honest assessment includes class implications and rapamycin caveats.
-- Brief flag about 2026 Epstein/CBS situation in the verdict — messenger
-- separate from the science.
-- ============================================================================

with m as (
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
    'summary-outlive', 'summary', 'body', 'longevity-book', 7,
    'Outlive — a fronteira mais cara da longevidade',
    'Outlive — the most expensive frontier of longevity',
    'A síntese mais popular do caso pela "Medicina 3.0" — e onde ela tropeça.',
    'The most popular synthesis of the case for "Medicine 3.0" — and where it stumbles.',
    $body$Peter Attia escreveu *Outlive* (Harmony, 2023) pra responder uma frustração específica: por que a medicina moderna falha em prevenir as 4 doenças que matam 80% das pessoas em países desenvolvidos? Cardiovascular, câncer, neurodegenerativa, metabólica — os "Quatro Cavaleiros". A resposta dele se chama Medicine 3.0.

:::quote{author="Peter Attia", source="Outlive, Ch. 3, p.31"}
Medicine 3.0 places a far greater emphasis on prevention than treatment.
:::

## A pergunta do autor

Por que esperamos as doenças aparecerem pra tratá-las, quando 50% do risco já está acumulado décadas antes? Attia argumenta que estamos otimizando *tempo de vida* à custa de *healthspan* — os anos vividos com função física e cognitiva plena.

## 4 ideias que sustentam o livro

### 1. Os 4 Cavaleiros têm uma raiz comum

**Claim**: cardiovascular ateroesclerótica, câncer, Alzheimer e diabetes tipo 2 causam ~80% das mortes não-acidentais depois dos 50. A resistência à insulina seria a raiz das outras 3.

**Evidência**: estatísticas globais de mortalidade, ligações mecanísticas entre hiperinsulinemia e câncer/Alzheimer ("Diabetes Tipo 3").

:::callout{kind=info}
A premissa de "uma raiz só" é retoricamente forte mas reducionista. Eric Topol elogia essa seção como a melhor apresentação leiga que viu — mas o modelo apoB do Attia coincide com a prática mainstream em ~90% dos casos. A diferença é mais de intensidade que de fundamento.
:::

### 2. apoB e prevenção primordial

**Claim**: doença cardiovascular deve ser prevenida décadas antes do que os guidelines sugerem. Medir apoB (não só LDL-C) e Lp(a) em adultos jovens, e baixar "o mais cedo e o mais baixo possível."

**Evidência**: randomização mendeliana sobre exposição à LDL ao longo da vida.

**Contestado**: nenhum guideline major endossa os targets agressivos de Attia. O Skeptical Cardiologist e outros notam que a moldura "Medicine 2.0 ignora apoB" é exagerada — cardiologistas preventivos já usam apoB e Lp(a) rotineiramente.

### 3. Exercício é o "remédio" mais potente

**Claim**: capacidade cardiorrespiratória é o preditor modificável mais forte de mortalidade. Sair do quartil inferior de VO2 max pro superior ≈ 5× menos risco — efeito **maior** que parar de fumar.

**Receita**: ~80% Zone 2 / 20% VO2 max, mais treino de força pesado, mais estabilidade.

**Evidência**: Mandsager et al., *JAMA Network Open*, 2018, n=122.007.

:::callout{kind=warn}
A associação de mortalidade é robusta. A divisão **exata** 80/20 Zone 2 é extrapolada de treinamento de elite. Brad Stanfield e outros notam que evidência de RCT especificamente apoiando Zone 2 vs simplesmente mais cardio total é fina. A direção está certa; a dose precisa é opinião.
:::

### 4. O Decatlo Centenário

**Claim**: treine de trás pra frente — quais tarefas físicas você quer fazer na sua "Década Marginal" (os últimos 10 anos)? Carregar mala de 30 lbs, levantar do chão sem ajuda, pegar neto no colo. Como a função decai 10-15% por década depois dos 50, você precisa estar **2× mais em forma aos 50** do que vai precisar estar aos 80.

## Onde Attia tropeça

:::compare{leftTitle="O que ele defende", rightTitle="O que a evidência banca"}
left | Whole-body MRI de rotina pra rastrear câncer cedo.
right | Eric Topol critica explicitamente: leva a cascata de biópsias por incidentalomas, ansiedade, e zero ganho prospectivo de mortalidade comprovado.
:::

**Farmacologia**: rapamicina, metformina, SGLT2. Attia toma rapamicina off-label. Honestidade: rapamicina tem o sinal de extensão de vida cross-species mais forte de qualquer droga, **e zero dados humanos de outcome de longo prazo**. O ensaio PEARL (2024) foi largamente nulo em endpoints funcionais. Bryan Johnson notavelmente *parou* rapamicina citando efeitos colaterais.

**Acessibilidade**: a clínica do Attia (Early Medical) cobra na faixa de cinco a seis dígitos anuais e atende <100 pacientes. Críticos chamam de "saúde pra 0,1%". As prescrições de exercício, sono e nutrição democratizam; a camada de testes de biomarcadores + GP-concierge, não.

## O que muda na sua vida

Se você aceitar a tese:

:::list-icon
barbell | Treine força 2-3x/semana, perto da falha. Não opcional.
walk | Zone 2 — 3h/semana mínimo. Caminhada longa conta.
heart | Pergunte ao seu cardiologista sobre apoB e Lp(a) (não só LDL-C).
bed | Sono não é negociável. 7h é piso, não meta.
:::

## Veredito

Vale ler — uma vez, com ceticismo. *Outlive* é a melhor síntese mainstream do caso preventivo pra healthspan, especialmente nas seções de exercício e metabolismo. Os capítulos de screening agressivo e farmacologia são opinião informada, não consenso. Trate o modelo de clínica como aspiracional, não literal.

*Nota separada*: o nome de Attia apareceu nos arquivos Epstein liberados em 2026, e a CBS News rompeu o vínculo com ele em fevereiro. Isso afeta o mensageiro, não a ciência do livro — vale avaliar uma e outra coisa separadas.

:::source[Attia, P. — Outlive · Harmony 2023 · ISBN 978-0593236598. Review: Topol, Ground Truths](https://erictopol.substack.com/p/a-review-of-outlive)$body$,
    $body$Peter Attia wrote *Outlive* (Harmony, 2023) to answer a specific frustration: why does modern medicine fail to prevent the 4 diseases that kill 80% of people in developed countries? Cardiovascular, cancer, neurodegenerative, metabolic — the "Four Horsemen." His answer is called Medicine 3.0.

:::quote{author="Peter Attia", source="Outlive, Ch. 3, p.31"}
Medicine 3.0 places a far greater emphasis on prevention than treatment.
:::

## The author's question

Why do we wait for disease to appear before treating it, when 50% of the risk is already accumulated decades earlier? Attia argues we're optimizing *lifespan* at the expense of *healthspan* — the years lived with full physical and cognitive function.

## 4 ideas that hold the book up

### 1. The Four Horsemen share a root

**Claim**: atherosclerotic cardiovascular, cancer, Alzheimer's, and type 2 diabetes cause ~80% of non-accidental deaths after 50. Insulin resistance is the root of the other 3.

**Evidence**: global mortality stats, mechanistic links between hyperinsulinemia and cancer/Alzheimer's ("Type 3 Diabetes").

:::callout{kind=info}
The "single root" premise is rhetorically strong but reductive. Eric Topol praises this section as the best lay presentation he's seen — but Attia's apoB model overlaps with mainstream practice ~90% of the time. The difference is intensity, not foundation.
:::

### 2. apoB and primordial prevention

**Claim**: cardiovascular disease should be prevented decades earlier than guidelines suggest. Measure apoB (not just LDL-C) and Lp(a) in young adults, and drive it "as low as possible, as early as possible."

**Evidence**: Mendelian randomization on lifetime LDL exposure.

**Contested**: no major guideline endorses Attia's aggressive targets. The Skeptical Cardiologist and others note that "Medicine 2.0 ignores apoB" is overstated — preventive cardiologists already use apoB and Lp(a) routinely.

### 3. Exercise is the most potent "drug"

**Claim**: cardiorespiratory fitness is the strongest modifiable predictor of mortality. Moving from the lowest VO2 max quartile to the top ≈ 5× lower risk — **larger** than quitting smoking.

**Prescription**: ~80% Zone 2 / 20% VO2 max work, plus heavy strength training, plus stability.

**Evidence**: Mandsager et al., *JAMA Network Open*, 2018, n=122,007.

:::callout{kind=warn}
The mortality association is robust. The **exact** 80/20 Zone 2 split is extrapolated from elite training. Brad Stanfield and others note that RCT evidence specifically supporting Zone 2 vs more total cardio is thin. The direction is right; the precise dose is opinion.
:::

### 4. The Centenarian Decathlon

**Claim**: train backwards — what physical tasks do you want to do in your "Marginal Decade" (the last 10 years)? Carry a 30-lb suitcase, get off the floor unaided, pick up a grandchild. Since function declines 10-15% per decade after 50, you need to be **2× more fit at 50** than you'll need at 80.

## Where Attia stumbles

:::compare{leftTitle="What he advocates", rightTitle="What the evidence supports"}
left | Routine whole-body MRI to screen for cancer early.
right | Eric Topol criticizes this explicitly: leads to biopsy cascades from incidentalomas, anxiety, and zero proven prospective mortality benefit.
:::

**Pharmacology**: rapamycin, metformin, SGLT2. Attia takes rapamycin off-label. Honest read: rapamycin has the strongest cross-species lifespan signal of any drug, **and zero long-term human outcome data**. The PEARL trial (2024) was largely null on functional endpoints. Bryan Johnson notably *stopped* rapamycin citing side effects.

**Access**: Attia's clinic (Early Medical) runs in the five-to-six-figure annual range per patient, serves <100 patients. Critics call it "healthcare for the 0.1%." The exercise, sleep, nutrition prescriptions democratize; the biomarker testing + concierge GP layer doesn't.

## What changes in your life

If you accept the thesis:

:::list-icon
barbell | Strength training 2-3x/week, close to failure. Not optional.
walk | Zone 2 — 3h/week minimum. Long walks count.
heart | Ask your cardiologist about apoB and Lp(a) (not just LDL-C).
bed | Sleep is non-negotiable. 7h is the floor, not the goal.
:::

## The verdict

Worth reading — once, with skepticism. *Outlive* is the best mainstream synthesis of the prevention-first case for healthspan, especially the exercise and metabolic sections. The aggressive screening and pharmacology chapters are informed opinion, not consensus. Treat the clinic model as aspirational, not literal.

*Separate note*: Attia's name appeared in the released Epstein files in 2026, and CBS News ended its relationship with him in February. This affects the messenger, not the science of the book — weigh each separately.

:::source[Attia, P. — Outlive · Harmony 2023 · ISBN 978-0593236598. Review: Topol, Ground Truths](https://erictopol.substack.com/p/a-review-of-outlive)$body$,
    array[
      'Os 4 Cavaleiros + Medicina 3.0 + Decatlo Centenário são frames poderosos. Aceite os frames, questione a intensidade.',
      'Exercício é a melhor "droga" disponível pra healthspan. Zone 2 + força + estabilidade. Isso é mainstream, não polêmica.',
      'Screening agressivo + farmacologia (rapamicina) são opinião informada do Attia, não consenso. Trate com ceticismo.'
    ],
    array[
      'The Four Horsemen + Medicine 3.0 + Centenarian Decathlon are powerful frames. Accept the frames, question the intensity.',
      'Exercise is the best available "drug" for healthspan. Zone 2 + strength + stability. This is mainstream, not controversial.',
      'Aggressive screening + pharmacology (rapamycin) are Attia''s informed opinion, not consensus. Treat with skepticism.'
    ],
    array[
      'Você consegue distinguir os frames do livro (úteis) das prescrições específicas (debatíveis).',
      'Você aplica a parte de exercício sem precisar do pacote de testes laboratoriais caros.',
      'Você sabe que muitos cardiologistas já praticam 80% da Medicina 3.0 sem chamar assim.'
    ],
    array[
      'You can tell apart the book''s frames (useful) from its specific prescriptions (debatable).',
      'You apply the exercise part without needing the expensive lab panel.',
      'You know many cardiologists already practice 80% of Medicine 3.0 without calling it that.'
    ],
    'Esse summary fica em Aprender, sob Força (Corpo). Conecta com o explainer de Strength (Zone 2 explicado), e dá contexto pra próximas leituras de longevidade.',
    'This summary lives in Learn under Strength (Body). Connects with the Strength explainer (Zone 2 explained), and gives context for future longevity reads.',
    'https://erictopol.substack.com/p/a-review-of-outlive',
    'Attia, Outlive · Harmony 2023 · Review: Topol, Ground Truths',
    'Attia, Outlive · Harmony 2023 · Review: Topol, Ground Truths',
    $rlog${
      "template_type": "summary",
      "template_version": 1,
      "steps": [
        {"id": "author_question", "answer_pt": "Por que esperamos doenças aparecerem pra tratá-las? Por que healthspan é negligenciado em prol de lifespan?"},
        {"id": "author_thesis", "answer_pt": "Medicine 3.0: prevenção proativa orientada por healthspan, não lifespan. Quote canônica da Ch. 3."},
        {"id": "core_ideas", "answer_pt": "1) 4 Cavaleiros com raiz comum (insulina). 2) apoB e prevenção primordial. 3) Exercício como droga máxima. 4) Decatlo Centenário backwards-design."},
        {"id": "evidence", "answer_pt": "Mandsager 2018 (n=122k) pra exercício. Mendeliana pra apoB. Crítica: Topol no MRI agressivo, Stanfield no Zone 2 80/20 sem RCT, sem dados humanos pra rapamicina. PEARL 2024 nulo."},
        {"id": "actionable", "answer_pt": "Força 2-3x, Zone 2 3h+, apoB no checkup, sono 7h+. Exercício é o que democratiza."},
        {"id": "verdict", "answer_pt": "Vale 1 leitura com ceticismo. Frames são úteis, intensidades são opinião. Clínica = aspiracional. Nota separada: Epstein 2026 — mensageiro vs ciência."}
      ]
    }$rlog$::jsonb
  )
  returning id
)
insert into public.learning_material_sub (material_id, sub_id) values
  ((select id from m), 'strength'),
  ((select id from m), 'dexterity');

-- ============================================================================
-- 5. NEW: news-oral-glp1-2026
-- Orforglipron ATTAIN-MAINTAIN trial — May 12, 2026.
-- The first credible oral GLP-1 maintenance option after injectable GLP-1.
-- ============================================================================

with m as (
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
    'news-oral-glp1-2026-05', 'news', 'health', 'glp1-oral-maintenance', 3,
    'Pílula oral mantém perda de peso pós-Ozempic',
    'Oral pill maintains weight loss after Ozempic',
    'Primeira evidência sólida de que dá pra sair da agulha sem perder o resultado.',
    'First solid evidence you can step off the needle without losing the result.',
    $body$Pacientes que perderam peso com Ozempic / Wegovy / Mounjaro / Zepbound (semaglutida ou tirzepatida) viviam até agora com um dado desconfortável: parar a injeção semanal geralmente significa recuperar a maior parte do peso em meses. Um estudo fase 3 publicado em 12 de maio de 2026 na *Nature Medicine* mostra a primeira alternativa real: trocar a injeção semanal por uma **pílula oral diária** (orforglipron) preserva **75-80% da perda já conquistada**.

:::stat[75-80%]
da perda de peso preservada ao trocar injeção semanal por pílula diária — primeiro dado fase 3 dessa magnitude
:::

## O fato

ATTAIN-MAINTAIN: ensaio randomizado, duplo-cego, multicêntrico (Eli Lilly + Weill Cornell), publicado em *Nature Medicine* (DOI: 10.1038/s41591-026-04386-7) em 12 de maio de 2026. Participantes que já tinham emagrecido com semaglutida ou tirzepatida foram randomizados pra continuar com placebo ou trocar pra orforglipron oral diário.

## Por que é notícia

:::compare{leftTitle="O que assumíamos", rightTitle="O que o ensaio mostra"}
left | Parar GLP-1 = recuperar peso rápido. Pílulas orais existentes (rybelsus) eram fracas demais.
right | Orforglipron oral diário mantém 75-80% da perda. Primeiro oral com potência comparável.
:::

## Status de evidência

Top-tier. Fase 3, RCT duplo-cego, em revista peer-reviewed de primeiro nível (*Nature Medicine*).

:::callout{kind=info}
**Caveat honesto**: o autor líder declara consultoria paga com a Lilly (patrocinadora do estudo). Follow-up de >1 ano pós-troca ainda pendente. Pacientes vindos de tirzepatida (ação dupla) regrediram um pouco mais que vindos de semaglutida — efeito esperado e modesto.
:::

## O que continua verdade

GLP-1 ainda exige uso **crônico** pra manter o benefício. Não é "tomei um ciclo e terminei." Estilo de vida — proteína suficiente, treino de força pra preservar massa magra durante a perda, sono — continua sendo a fundação. **Esse remédio não substitui isso.**

## Implicação prática

Se você ou alguém perto está em GLP-1 injetável:

:::list-icon
medical | Orforglipron **não** tem aprovação ainda da FDA (decisão esperada pro fim de 2026).
chatbubble-ellipses | O dado é sólido o suficiente pra conversar com o médico sobre transição quando estiver disponível.
barbell | Atenção redobrada à preservação muscular durante a perda — força + proteína.
:::

Pra quem **não** está em GLP-1: nada muda. Treino de força + proteína + sono continuam sendo o que move o ponteiro.

:::source[Aronne LJ et al., 2026 · *Nature Medicine* · ATTAIN-MAINTAIN trial · DOI 10.1038/s41591-026-04386-7](https://www.nature.com/articles/s41591-026-04386-7)$body$,
    $body$Patients who lost weight on Ozempic / Wegovy / Mounjaro / Zepbound (semaglutide or tirzepatide) lived with an uncomfortable fact until now: stopping the weekly injection usually means regaining most of the weight within months. A phase 3 trial published May 12, 2026 in *Nature Medicine* shows the first real alternative: switching the weekly injection for a **once-daily oral pill** (orforglipron) preserves **75-80% of the loss**.

:::stat[75-80%]
of weight loss preserved when switching weekly injection for daily pill — first phase 3 data at this magnitude
:::

## The fact

ATTAIN-MAINTAIN: randomized, double-blind, multi-site trial (Eli Lilly + Weill Cornell), published in *Nature Medicine* (DOI: 10.1038/s41591-026-04386-7) on May 12, 2026. Participants who had already lost weight on semaglutide or tirzepatide were randomized to continue with placebo or switch to once-daily oral orforglipron.

## Why it's news

:::compare{leftTitle="What we assumed", rightTitle="What the trial shows"}
left | Stopping GLP-1 = rapid regain. Existing oral pills (Rybelsus) were too weak.
right | Once-daily oral orforglipron holds 75-80% of the loss. First oral with comparable potency.
:::

## Evidence status

Top-tier. Phase 3, double-blind RCT, in a first-rank peer-reviewed journal (*Nature Medicine*).

:::callout{kind=info}
**Honest caveat**: the lead author discloses paid consulting with Lilly (the trial sponsor). Follow-up >1 year post-switch still pending. Patients coming off tirzepatide (dual-action) regained slightly more than those off semaglutide — expected and modest effect.
:::

## What stays true

GLP-1s still require **chronic** use to keep the benefit. It's not "I did a cycle and I'm done." Lifestyle — adequate protein, strength training to preserve muscle mass during loss, sleep — remains the foundation. **This medication doesn't replace that.**

## Practical implication

If you or someone close is on injectable GLP-1:

:::list-icon
medical | Orforglipron is **not** FDA-approved yet (decision expected late 2026).
chatbubble-ellipses | The data is solid enough to discuss switching with a doctor when it becomes available.
barbell | Pay extra attention to muscle preservation during loss — strength training + protein.
:::

For everyone else: nothing changes. Strength training + protein + sleep still move the needle.

:::source[Aronne LJ et al., 2026 · *Nature Medicine* · ATTAIN-MAINTAIN trial · DOI 10.1038/s41591-026-04386-7](https://www.nature.com/articles/s41591-026-04386-7)$body$,
    array[
      'Primeira evidência sólida de pílula oral diária mantendo 75-80% da perda de peso pós-GLP-1 injetável.',
      'Aprovação FDA esperada pro fim de 2026. Conversa com médico, não decisão sozinho.',
      'Estilo de vida (força + proteína + sono) continua sendo o que move o ponteiro. Remédio não substitui isso.'
    ],
    array[
      'First solid evidence of a daily oral pill holding 75-80% of weight loss after injectable GLP-1.',
      'FDA approval expected late 2026. Doctor conversation, not solo decision.',
      'Lifestyle (strength + protein + sleep) still moves the needle. The medication doesn''t replace it.'
    ],
    array[
      'Você sabe diferenciar a notícia (real, sólida) do hype.',
      'Você sabe quando vale conversar com seu médico (e quando esperar).',
      'Você não trocou de medicação baseado num post de twitter.'
    ],
    array[
      'You can tell the real, solid news from the hype.',
      'You know when it''s worth discussing with your doctor (and when to wait).',
      'You haven''t switched medication based on a tweet.'
    ],
    'Esse news fica em Aprender, sob Nutrição (Saúde). A maior implicação prática é em como pessoas em GLP-1 preservam o resultado — conecta com tasks de "registrar refeições" e com nosso explainer de Nutrição.',
    'This news lives in Learn under Nutrition (Health). The biggest practical implication is how GLP-1 users keep the result — connects with "log meals" tasks and our Nutrition explainer.',
    'https://www.nature.com/articles/s41591-026-04386-7',
    'Aronne et al., 2026 · *Nature Medicine* · ATTAIN-MAINTAIN trial · n=razoável',
    'Aronne et al., 2026 · *Nature Medicine* · ATTAIN-MAINTAIN trial',
    $rlog${
      "template_type": "news",
      "template_version": 1,
      "steps": [
        {"id": "fact", "answer_pt": "Pílula oral diária (orforglipron) mantém 75-80% da perda de peso após troca de injeção semanal de GLP-1."},
        {"id": "novelty", "answer_pt": "Até agora, parar GLP-1 = regan rápido. Primeiro oral com potência comparável."},
        {"id": "evidence_status", "answer_pt": "Top-tier: Fase 3 RCT duplo-cego, Nature Medicine. Caveat: autor líder paid consultant da Lilly."},
        {"id": "implication", "answer_pt": "Pra usuários GLP-1: conversa futura com médico. Pra não-usuários: nada muda — estilo de vida ainda é o que move ponteiro."},
        {"id": "what_stays_true", "answer_pt": "GLP-1 ainda é crônico. Não substitui força + proteína + sono na preservação de massa magra."},
        {"id": "action_or_not", "answer_pt": "Não agir agora — aprovação FDA esperada pro fim de 2026. Mas dado é sólido o suficiente pra ficar no radar."}
      ]
    }$rlog$::jsonb
  )
  returning id
)
insert into public.learning_material_sub (material_id, sub_id) values
  ((select id from m), 'nutrition'),
  ((select id from m), 'strength');

-- ============================================================================
-- 6. NEW: news-loneliness-memory-2026
-- SHARE cohort study, April 2026 — calibrates the 2023 "loneliness as bad as
-- 15 cigarettes/day" narrative. Walks back rate-of-decline claim while
-- preserving the broader public-health concern.
-- ============================================================================

with m as (
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
    'news-loneliness-memory-2026-04', 'news', 'bonds', 'loneliness-cognition', 3,
    'Solidão piora memória — mas não acelera a queda',
    'Loneliness hurts memory — but doesn''t speed up its decline',
    'Estudo europeu de 7 anos com 10 mil idosos calibra a narrativa alarmista de 2023.',
    'A 7-year European study of 10k older adults calibrates the alarmist 2023 narrative.',
    $body$Desde a recomendação do Surgeon General dos EUA em 2023, virou senso comum dizer que solidão é "tão ruim quanto fumar 15 cigarros por dia" e que **acelera demência**. Um estudo longitudinal europeu de 7 anos com 10.217 adultos mais velhos, publicado em abril de 2026, dá uma correção honesta: pessoas solitárias **começam** com pior memória, mas a memória delas **não declina mais rápido** que a dos socialmente conectados.

:::stat[0]
diferença na **velocidade** do declínio de memória entre adultos solitários e conectados, em 7 anos de acompanhamento (n=10.217)
:::

## O fato

Estudo observacional na coorte SHARE (Survey of Health, Ageing and Retirement in Europe), publicado em *Aging & Mental Health* (DOI: 10.1080/13607863.2026.2624569). Universidades del Rosario, Karolinska e Valência.

## Por que é notícia

:::compare{leftTitle="A narrativa de 2023", rightTitle="O que o estudo mostra"}
left | Solidão acelera o declínio cognitivo, é "fumar 15 cigarros/dia", causa demência.
right | Solidão está associada a memória **basal pior** (no presente), mas não a **taxa de declínio** ao longo dos anos.
:::

Não é uma reversão total — é uma **calibração**. O dano é no presente, não uma bomba-relógio.

## Status de evidência

Observacional, não interventivo. Coorte longitudinal sólida (SHARE rastreia europeus desde 2004), 7 anos de follow-up, n grande.

:::callout{kind=info}
**Limitação honesta**: causalidade reversa é possível — problemas cognitivos sutis podem fazer pessoas se retraírem socialmente, o que apareceria como "solidão piora memória" nos dados. Os autores reconhecem isso explicitamente.
:::

## O que continua verdade

Solidão crônica continua ligada a depressão, doença cardiovascular e mortalidade geral. A WHO em 2025 atribuiu ~871.000 mortes/ano globalmente à conexão social fraca. O estudo só corrige **uma** afirmação específica (velocidade do declínio de memória), não a preocupação maior de saúde pública.

## Implicação prática

Investir em conexão social vale por **como seu cérebro funciona agora** — atenção, encoding, recall no presente — não como hedge contra Alzheimer daqui a 20 anos. Curiosamente, esse é um argumento **mais forte** pro curto prazo: o benefício é nessa semana, não em 2046.

:::list-icon
people | 1 contato semanal consistente com alguém que você gosta > 5 conexões dispersas.
call | Ligar (não mensagem) prediz melhor manutenção de vínculo.
calendar | Marcar com antecedência (recorrente) sobrevive melhor que "vamos marcar."
:::

:::source[Venegas-Sanabria LC et al., 2026 · *Aging & Mental Health* · SHARE cohort n=10.217](https://www.tandfonline.com/journals/camh20)$body$,
    $body$Since the 2023 US Surgeon General advisory, it became common wisdom to say loneliness is "as bad as smoking 15 cigarettes a day" and that it **accelerates dementia**. A 7-year longitudinal European study of 10,217 older adults, published April 2026, offers an honest correction: lonely people **start** with worse memory, but their memory **doesn't decline any faster** than that of the socially connected.

:::stat[0]
difference in the **rate** of memory decline between lonely and connected adults across 7 years of follow-up (n=10,217)
:::

## The fact

Observational study on the SHARE cohort (Survey of Health, Ageing and Retirement in Europe), published in *Aging & Mental Health* (DOI: 10.1080/13607863.2026.2624569). Universidad del Rosario, Karolinska Institute, Universitat de València.

## Why it's news

:::compare{leftTitle="The 2023 narrative", rightTitle="What the study shows"}
left | Loneliness accelerates cognitive decline, is "15 cigarettes/day", causes dementia.
right | Loneliness is associated with **lower baseline memory** (in the present), but not with a **faster decline rate** over years.
:::

It's not a full reversal — it's a **calibration**. The damage is in the present, not a time bomb.

## Evidence status

Observational, not interventional. Solid longitudinal cohort (SHARE has tracked Europeans since 2004), 7-year follow-up, large n.

:::callout{kind=info}
**Honest limitation**: reverse causation is possible — subtle cognitive issues might make people withdraw socially, which would appear as "loneliness causes lower memory" in the data. The authors acknowledge this explicitly.
:::

## What stays true

Chronic loneliness remains linked to depression, cardiovascular disease, and overall mortality. WHO in 2025 attributed ~871,000 deaths per year globally to weak social connection. This study corrects **one specific** claim (rate of memory decline), not the broader public-health concern.

## Practical implication

Investing in social connection is worth it for **how your brain works now** — attention, encoding, recall in the present — not as a hedge against Alzheimer's 20 years out. That's actually a **stronger** short-term argument: the benefit is this week, not in 2046.

:::list-icon
people | 1 consistent weekly contact with someone you like > 5 scattered connections.
call | Phone call (not text) predicts better relationship maintenance.
calendar | Scheduling ahead (recurring) survives better than "let''s schedule something."
:::

:::source[Venegas-Sanabria LC et al., 2026 · *Aging & Mental Health* · SHARE cohort n=10,217](https://www.tandfonline.com/journals/camh20)$body$,
    array[
      'Solidão **piora** memória atual — não acelera o declínio futuro.',
      'Estudo de 7 anos com 10k europeus corrige a narrativa alarmista de 2023.',
      'Investir em vínculos vale pelo presente (atenção, recall hoje), não como seguro contra Alzheimer daqui a 20 anos.'
    ],
    array[
      'Loneliness **hurts** present memory — it doesn''t speed up future decline.',
      'A 7-year study of 10k Europeans corrects the alarmist 2023 narrative.',
      'Investing in bonds pays off in the present (attention, recall today), not as Alzheimer''s insurance 20 years out.'
    ],
    array[
      'Você sabe que solidão hoje afeta seu cérebro hoje (atenção, recall).',
      'Você prioriza qualidade > frequência de contato.',
      'Você não usa esse estudo pra desvalorizar a importância de vínculos.'
    ],
    array[
      'You know loneliness today affects your brain today (attention, recall).',
      'You prioritize quality > frequency of contact.',
      'You don''t use this study to dismiss the importance of bonds.'
    ],
    'Esse news fica em Aprender, sob Amigos e Família (Vínculos). Conecta com tasks de "ligar pra alguém" e com tracking de regularidade de contato social.',
    'This news lives in Learn under Friends & Family (Bonds). Connects with "call someone" tasks and tracking of social contact regularity.',
    'https://www.tandfonline.com/journals/camh20',
    'Venegas-Sanabria et al., 2026 · *Aging & Mental Health* · SHARE n=10.217',
    'Venegas-Sanabria et al., 2026 · *Aging & Mental Health* · SHARE n=10,217',
    $rlog${
      "template_type": "news",
      "template_version": 1,
      "steps": [
        {"id": "fact", "answer_pt": "Estudo SHARE de 7 anos com n=10.217 não acha diferença na taxa de declínio de memória entre solitários e conectados."},
        {"id": "novelty", "answer_pt": "Calibra (não reverte) a narrativa de 2023 do US Surgeon General. Dano é no presente, não acelerador de declínio."},
        {"id": "evidence_status", "answer_pt": "Observacional longitudinal sólido. Limitação: causalidade reversa não pode ser excluída (autores reconhecem)."},
        {"id": "implication", "answer_pt": "Argumento pra vínculo é MAIS forte agora — benefício é nessa semana, não em 2046."},
        {"id": "what_stays_true", "answer_pt": "Solidão crônica continua ligada a depressão, CV, mortalidade. WHO 2025: 871k mortes/ano. Estudo só corrige UMA afirmação específica."},
        {"id": "action_or_not", "answer_pt": "Agir: priorizar qualidade > frequência. Recorrência > 'vamos marcar.' Ligação > mensagem."}
      ]
    }$rlog$::jsonb
  )
  returning id
)
insert into public.learning_material_sub (material_id, sub_id) values
  ((select id from m), 'circle'),
  ((select id from m), 'contemplate');

commit;
