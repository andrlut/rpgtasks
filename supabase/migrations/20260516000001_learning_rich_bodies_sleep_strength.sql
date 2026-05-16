-- ============================================================================
-- Learning: rich-body rewrite of Sleep and Strength using the new directive
-- syntax (stat / quote / callout / compare / list-icon / progress / ex).
--
-- These two materials are the proof-of-concept for the "premium microlearning"
-- direction. Content is research-backed with proper citations:
--   - Sleep: AASM consensus, Cappuccio 2010 meta-analysis, Van Dongen 2003,
--            Dawson & Reid 1997, Spiegel 2004, Xie 2013, Drake 2013, Watson
--            2015, Windred 2024.
--   - Strength: Mandsager 2018, Volpi 2004, Leong 2015 (PURE), Attia 2023,
--               WHO 2020 guidelines, Wilson 2012.
--
-- Reading minutes bumped from 3 to 6 to reflect the longer, denser content.
-- Body length roughly tripled but reads faster thanks to the visual blocks
-- breaking up dense paragraphs.
-- ============================================================================

begin;

-- ─── SLEEP ────────────────────────────────────────────────────────────────

update public.learning_material set
  reading_minutes = 6,
  body_pt = $body$Sono é a única atividade do dia em que **não fazer nada é fazer tudo**. Cada noite o cérebro consolida memória, recalibra hormônios e literalmente lava subprodutos metabólicos. Cortar 1h por noite parece pequeno — em duas semanas, vira o mesmo déficit cognitivo de uma noite inteira em claro. E você não percebe.

:::stat[7-9h]
o que adultos saudáveis precisam por noite, segundo o consenso da AASM + Sleep Research Society (Watson et al., 2015)
:::

## O que entra aqui

Sono não é uma coisa só. Três dimensões pesam — e faltar em uma quebra as outras.

:::list-icon
moon | **Quantidade**. 7-9h por noite, com chão sólido em 7h.
sync | **Regularidade**. Dormir e acordar nos mesmos horários, fins de semana incluídos.
sparkles | **Qualidade**. REM + sono profundo intactos. Sono fragmentado conta menos que parece.
:::

A maioria das pessoas acerta uma e ignora as outras duas.

## Por que importa tanto

:::quote{author="Watson et al.", source="AASM Consensus, 2015"}
Adults should sleep 7 or more hours per night on a regular basis to promote optimal health.
:::

Não é higienismo. Dormir menos de 7h por noite, de forma consistente, está ligado a aumento de peso, diabetes, hipertensão, depressão, função imune prejudicada — e mortalidade mais cedo. Uma meta-análise de 16 estudos prospectivos com **1,38 milhão** de adultos mostra risco aumentado de morte tanto pra quem dorme pouco quanto pra quem dorme demais.

:::compare{leftTitle="O que parece", rightTitle="O que mostra a evidência"}
left | Eu funciono bem com 5-6h.
right | Após 14 noites em 6h, performance cognitiva cai ao nível de 1 noite em claro — e você perde a consciência da própria queda (Van Dongen, 2003).
:::

## A bagunça hormonal

Duas noites de 4h de sono já bastam pra derrubar leptina e subir grelina — você sente fome mesmo comendo o suficiente, e o desejo por comida açucarada sobe 33-45%.

:::progress[val=28 of=100]
de aumento na grelina (hormônio da fome) depois de só 2 noites de 4h de sono. Você não está com pouca força de vontade — está hackeado.
:::

## O cérebro precisa lavar

Durante o sono profundo, o espaço entre células do cérebro expande **~60%** e a clearance de β-amilóide (proteína ligada ao Alzheimer) acelera. É o sistema glinfático — a "lavagem" diária do cérebro. Sem sono suficiente, o lixo se acumula. *Caveat honesto*: a evidência mais forte vem de estudo em camundongos (Xie 2013); extrapolação humana é plausível mas indireta.

:::callout{kind=warn}
Estar acordado por 17-19h produz o mesmo prejuízo cognitivo que 0,05% de álcool no sangue. 24h em claro ≈ 0,10%, acima do limite legal de direção em vários países. Dirigir cansado **é** dirigir embriagado, em performance (Dawson & Reid, *Nature* 1997).
:::

## Café, álcool, temperatura

Os 3 ajustes com maior retorno por menor esforço:

:::list-icon
cafe | **Cafeína** tem meia-vida de 5-6h. 400mg às 16h ainda reduz seu sono em **mais de 1 hora**. Última xícara antes das 14h.
wine | **Álcool** te faz dormir mais rápido — e destrói o REM da segunda metade da noite. "Dormi bem com vinho" é ilusão; o sono ficou raso.
thermometer | **Temperatura** do quarto entre 16-19°C. Sono começa com queda de ~1°C na temperatura corporal — se o quarto tá quente, a queda não acontece.
:::

## Wearables ajudam — com asterisco

Anel, relógio, app de telefone. Todos detectam **bem** se você está dormindo ou acordado (sensibilidade >95%). Quase nenhum detecta bem **as fases** do sono — sensibilidade de fase varia 50-86% entre dispositivos. Use o número total de horas como dado real. Trate "sono profundo de 8%" como aproximação grosseira, não verdade.

:::callout{kind=tip}
Se você não pode aumentar a duração agora, **aumente a regularidade**. Um estudo de 2024 com ~60 mil adultos do UK Biobank achou que regularidade do horário de sono prediz mortalidade melhor que duração total. 6,5h sempre no mesmo horário pode vencer 8h irregulares.
:::

## A receita mínima

:::list-icon
time | Mesmo horário pra deitar e acordar, todos os dias.
bed | Quarto entre 16-19°C, escuro total.
cafe | Sem cafeína 8h antes de dormir.
ban | Sem álcool nas 3h antes de dormir.
:::

:::source[Cappuccio et al., 2010 · meta-analysis n=1.38M](https://pubmed.ncbi.nlm.nih.gov/20469800/)$body$,

  body_en = $body$Sleep is the one thing in your day where **doing nothing is doing everything**. Every night the brain consolidates memory, recalibrates hormones, and literally washes out metabolic byproducts. Cutting 1h per night sounds small — within two weeks it's the same cognitive deficit as a full night without sleep. And you don't notice.

:::stat[7-9h]
what healthy adults need per night, per the AASM + Sleep Research Society consensus (Watson et al., 2015)
:::

## What this covers

Sleep isn't one thing. Three dimensions matter — and missing one breaks the others.

:::list-icon
moon | **Quantity**. 7-9h per night, with a solid floor at 7h.
sync | **Regularity**. Same bedtime and wake time, weekends included.
sparkles | **Quality**. REM + slow-wave intact. Fragmented sleep counts less than it looks.
:::

Most people nail one and ignore the other two.

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

Two nights of 4h sleep are enough to drop leptin and raise ghrelin — you feel hungry even after eating enough, and craving for sweet, fatty food jumps 33-45%.

:::progress[val=28 of=100]
ghrelin (hunger hormone) increase after just 2 nights of 4h sleep. You're not low on willpower — you're being chemically hacked.
:::

## The brain needs to wash itself

During deep sleep, interstitial space in the brain expands **~60%** and clearance of β-amyloid (the protein linked to Alzheimer's) accelerates. That's the glymphatic system — the brain's daily "wash". Without enough sleep, the junk accumulates. *Honest caveat*: strongest evidence is in mice (Xie 2013); the human extrapolation is plausible but indirect.

:::callout{kind=warn}
Being awake for 17-19h produces the same cognitive impairment as 0.05% blood alcohol. 24h awake ≈ 0.10%, above the legal driving limit in many countries. Drowsy driving **is** drunk driving, in terms of performance (Dawson & Reid, *Nature* 1997).
:::

## Caffeine, alcohol, temperature

The 3 levers with the best return for the least effort:

:::list-icon
cafe | **Caffeine** has a 5-6h half-life. 400mg at 4pm still cuts your sleep by **over 1 hour**. Last cup before 2pm.
wine | **Alcohol** puts you to sleep faster — and destroys REM in the second half of the night. "I sleep well with wine" is illusion; the sleep got shallow.
thermometer | **Bedroom temperature** between 16-19°C. Sleep starts with a ~1°C drop in core body temp — if the room is too warm, the drop doesn't happen.
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

:::source[Cappuccio et al., 2010 · meta-analysis n=1.38M](https://pubmed.ncbi.nlm.nih.gov/20469800/)$body$
where slug = 'glossary-sleep';

-- ─── STRENGTH ─────────────────────────────────────────────────────────────

update public.learning_material set
  reading_minutes = 6,
  body_pt = $body$Força não é vaidade, e cardio não é só pra emagrecer. Os dois juntos são, por uma margem larga, **a intervenção com maior retorno em longevidade documentada na ciência**. O problema: a maior parte da queda acontece em silêncio, e só vira problema quando já fica caro corrigir.

:::stat[5,04×]
maior risco de morte por qualquer causa em adultos com fitness baixo vs. atletas elite. Efeito **maior** que fumar, diabetes ou hipertensão (Mandsager et al., JAMA 2018, n=122.007).
:::

## Por que importa tanto

:::quote{author="Mandsager et al.", source="JAMA Network Open, 2018"}
Cardiorespiratory fitness is inversely associated with long-term mortality with no observed upper limit of benefit.
:::

Traduzindo: **quanto mais em forma, menor o risco — sem teto observado**. Não existe ponto em que melhorar o cardio para de ajudar.

E essa queda começa cedo:

:::progress[val=8 of=100]
da massa muscular perdida por década depois dos 30, se você não treina. A taxa **acelera** depois dos 60. O custo de não treinar nos 30 só aparece nos 60.
:::

## O sinal mais subestimado: aperto de mão

:::callout{kind=info}
A cada **5 kg de queda na força da mão**, o risco de morte por qualquer causa sobe **16%**. Sinal mais forte que pressão arterial sistólica. Estudo PURE com 139.691 adultos em 17 países (Leong et al., *Lancet* 2015).
:::

Por que um aperto de mão prediz mortalidade? Porque força de preensão é um proxy pra função muscular geral, status nutricional e capacidade neuromuscular. Não é o aperto que importa — é o que ele revela.

## Zone 2 — o regime mais subestimado

:::compare{leftTitle="O que parece", rightTitle="O que é"}
left | Treino só vale se doer. Se dá pra conversar, é mole demais — perda de tempo.
right | Zone 2 é "conversa difícil mas possível". É onde a fundação aeróbica e a densidade mitocondrial são construídas. Não no HIIT.
:::

A regra prática: 3h/semana de Zone 2 — caminhada rápida, bike fácil, natação confortável. Não precisa ser na academia.

:::quote{author="Peter Attia", source="Outlive, 2023"}
If I could only prescribe one drug to improve your health and longevity, it would be exercise — and within that, the single most important type would be aerobic efficiency, what we call Zone 2.
:::

## A receita mínima

A literatura converge nesse mínimo pra adultos. Mais é melhor, até um teto bem distante.

:::list-icon
barbell | **2-3× semana** de treino de força. ~10 séries por grupo muscular por semana. Perto da falha.
walk | **150-300 min/semana** de aeróbico moderado (caminhada rápida, bike, natação).
heart | **75-150 min/semana** de aeróbico vigoroso ALÉM disso, se rola.
body | **10 min/dia** de mobilidade. Vale mais que 1h por mês.
:::

Fonte: diretrizes da OMS 2020 (Bull et al., *Br J Sports Med*). Esse é o **piso**, não o teto.

## Mitos que vale soltar

:::list-icon
close-circle | **"Mulher fica musculosa fazendo musculação"** — não. Hormônios femininos limitam. Você ganha definição e força, não volume excessivo.
close-circle | **"Cardio mata os ganhos"** — só com 5+ corridas longas por semana. 2-3 sessões de Zone 2 não interferem em hipertrofia.
close-circle | **"10.000 passos por dia"** — marketing de pedômetro japonês dos anos 60. Mortalidade plateia em 6-8 mil passos pra 60+, 8-10 mil pra mais novos.
close-circle | **"Soreness = treino bom"** — não. DOMS é só carga nova ou eccêntrica. Lifters em progresso muitas vezes não ficam doloridos.
:::

## Onde está a margem real

Se você está nos seus 20-30 e a queda parece distante, vale lembrar:

:::callout{kind=tip}
A curva de declínio do VO2 max é **rasa agora** (-3-6% por década) e **íngreme depois dos 70** (-20%+ por década). O que você constrói agora é o que segura a curva quando o tempo cobra. Treinar nos 20-30 é o melhor seguro disponível pra ter autonomia nos 60-70.
:::

:::source[Mandsager et al., 2018 · JAMA Network Open · n=122.007](https://jamanetwork.com/journals/jamanetworkopen/fullarticle/2707428)$body$,

  body_en = $body$Strength isn't vanity, and cardio isn't just for weight loss. Together, by a wide margin, they're **the highest-return intervention for longevity documented in science**. The catch: most of the decline happens silently, and only becomes a problem once it's expensive to fix.

:::stat[5.04×]
all-cause mortality risk in low-fit adults vs. elite-fit. A **larger** effect than smoking, diabetes, or hypertension (Mandsager et al., JAMA 2018, n=122,007).
:::

## Why it matters

:::quote{author="Mandsager et al.", source="JAMA Network Open, 2018"}
Cardiorespiratory fitness is inversely associated with long-term mortality with no observed upper limit of benefit.
:::

Translation: **the fitter you are, the lower your risk — no ceiling observed**. There's no point at which improving cardio stops helping.

And the decline starts early:

:::progress[val=8 of=100]
muscle mass lost per decade after age 30 if you don't train. The rate **accelerates** past 60. The cost of not training in your 30s only shows up in your 60s.
:::

## The most underrated signal: grip strength

:::callout{kind=info}
Every **5 kg drop in hand grip strength**, all-cause mortality risk rises **16%**. A stronger signal than systolic blood pressure. PURE study, 139,691 adults across 17 countries (Leong et al., *Lancet* 2015).
:::

Why does a handshake predict mortality? Because grip strength is a proxy for whole-body muscle function, nutritional status, and neuromuscular capacity. The handshake isn't what matters — it's what it reveals.

## Zone 2 — the most underrated regime

:::compare{leftTitle="What it seems like", rightTitle="What it is"}
left | Training only counts if it hurts. If you can chat, it's too easy — a waste of time.
right | Zone 2 is "hard conversation but possible". It's where aerobic foundation and mitochondrial density are built. Not in HIIT.
:::

The practical rule: 3h/week of Zone 2 — brisk walking, easy bike, comfortable swim. Doesn't have to be at the gym.

:::quote{author="Peter Attia", source="Outlive, 2023"}
If I could only prescribe one drug to improve your health and longevity, it would be exercise — and within that, the single most important type would be aerobic efficiency, what we call Zone 2.
:::

## The minimum recipe

The literature converges on this minimum for adults. More is better, up to a ceiling that's far away.

:::list-icon
barbell | **2-3× per week** of strength training. ~10 sets per muscle group per week. Close to failure.
walk | **150-300 min/week** of moderate aerobic (brisk walk, bike, swim).
heart | **75-150 min/week** of vigorous aerobic ON TOP of that, if you can.
body | **10 min/day** of mobility. Beats 1h per month.
:::

Source: WHO 2020 guidelines (Bull et al., *Br J Sports Med*). This is the **floor**, not the ceiling.

## Myths worth dropping

:::list-icon
close-circle | **"Lifting makes women bulky"** — no. Female hormones cap the ceiling. You gain definition and strength, not excessive volume.
close-circle | **"Cardio kills gains"** — only with 5+ long runs per week. 2-3 Zone 2 sessions don't interfere with hypertrophy.
close-circle | **"10,000 steps per day"** — marketing from a 1960s Japanese pedometer. Mortality plateaus around 6-8k steps for 60+, 8-10k for younger adults.
close-circle | **"Soreness = good workout"** — no. DOMS is just new or eccentric load. Lifters making progress are often not sore.
:::

## Where the real margin is

If you're in your 20s-30s and the decline feels distant, worth remembering:

:::callout{kind=tip}
The VO2 max decline curve is **shallow now** (-3-6% per decade) and **steep after 70** (-20%+ per decade). What you build now is what holds the curve when time comes calling. Training in your 20s-30s is the best available insurance for autonomy in your 60s-70s.
:::

:::source[Mandsager et al., 2018 · JAMA Network Open · n=122,007](https://jamanetwork.com/journals/jamanetworkopen/fullarticle/2707428)$body$
where slug = 'glossary-strength';

commit;
