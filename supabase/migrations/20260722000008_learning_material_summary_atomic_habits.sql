-- migration: 20260722000007_learning_material_summary_atomic_habits.sql
-- purpose: media-rich learning material #2 — Atomic Habits (Clear) confronted with
--          habit-formation science; NotebookLM podcast (en) + infographic (en) + cover
--
-- affected tables: learning_material (insert), learning_material_sub (insert),
--                  learning_material_media (insert)
-- new rpcs:        none
-- breaking?       no — content only
--
-- notes:
--   migrations are write-once; never edit after applying
--   assets uploaded to 'learning-media/atomic-habits/' and verified via storage ls
--   BEFORE this migration (audio.en.m4a 10.9MB AAC64 mono faststart, infographic
--   1080x1936 webp, cover 768x1374 webp)
--   released_at is SCHEDULED for 2026-07-24 12:00Z (Fri 09:00 BRT) — first use of
--   the drops release cadence; the feed only shows released_at <= now().

begin;

with m as (
  insert into public.learning_material
    (slug, type, dimension_id, topic, reading_minutes,
     title_pt, title_en, summary_pt, summary_en,
     body_pt, body_en,
     takeaways_pt, takeaways_en, signs_pt, signs_en,
     tracking_pt, tracking_en,
     hero_image_url, source_url, source_label_pt, source_label_en,
     released_at)
  values (
    'summary-atomic-habits', 'summary', 'craft', 'atomic-habits-book', 6,
    'Hábitos Atômicos — 66 dias, não 21',
    'Atomic Habits — 66 days, not 21',
    'O que a ciência sustenta no método de James Clear — e onde a matemática é marketing.',
    $t$What science actually supports in James Clear's method — and where the math is marketing.$t$,
    $body_pt$Em 1960, o cirurgião plástico Maxwell Maltz notou que seus pacientes levavam "no mínimo 21 dias" pra se acostumar com o rosto novo. A observação casual virou lenda de autoajuda: 21 dias pra formar qualquer hábito. Meio século depois, alguém finalmente mediu de verdade — e o número é outro. *Hábitos Atômicos* (Avery, 2018) é o livro que popularizou a versão moderna dessa ciência, e a melhor forma de lê-lo é separando três camadas: o que tem evidência, o que é bússola útil e o que é aritmética de marketing.

## 1. 66 dias, não 21 — e é uma curva, não um prazo

O estudo que substituiu o mito foi o de Phillippa Lally (University College London, 2010): 96 voluntários repetindo um comportamento novo no mesmo contexto por 12 semanas. A automaticidade média chegou aos **66 dias** — mas o intervalo real foi de **18 a 254**, dependendo da pessoa e da complexidade (beber um copo de água consolida rápido; 50 abdominais, não). E o formato importa mais que o número: o hábito cresce numa curva que sobe rápido no começo e vai achatando até o platô. Não existe um dia em que o alarme toca e o hábito "está pronto".

O achado mais útil do estudo é sobre falhar: **perder um dia isolado não derrubou a curva de ninguém**. A regra do Clear — "nunca falhe duas vezes seguidas" — é um dos raros conselhos de livro de hábito com respaldo experimental direto. O limite honesto: 96 pessoas, autorrelato, comportamentos simples. 66 é a média de uma curva modelada, não uma promessa individual.

## 2. Ambiente vence força de vontade

A base acadêmica mais sólida do livro vem de Wendy Wood e David Neal: hábito é uma associação **contexto → resposta** gravada pela repetição. Uma vez formado, é a percepção do ambiente que dispara o comportamento — sem deliberação, sem meta no meio do caminho. Nos estudos de diário de Wood, cerca de **43% do comportamento diário** se repete no mesmo contexto, geralmente enquanto a pessoa pensa em outra coisa.

A consequência prática é a parte mais aplicável do livro: pare de brigar com você e redesenhe o cenário.

:::list-icon
eye | **Deixa visível** — a deixa do hábito bom precisa estar na tua frente; deixa invisível o gatilho do ruim.
trending-down | **Mexe na fricção** — tira passos do comportamento que você quer (roupa de treino separada) e adiciona passos ao que quer evitar (deslogar do app).
flash | **Plano se-então** — "se acontecer X, faço Y" (Gollwitzer): a técnica com a evidência mais robusta de toda essa literatura.
:::

Bônus dos mesmos autores: quando o contexto muda sozinho — mudança de casa, emprego novo — as deixas antigas somem e abre uma janela rara pra trocar comportamento com menos resistência.

## 3. Identidade e sistemas — a parte que interessa (com uma ressalva)

A tese favorita do Clear é a que mais conversa com o Perceva: mudança duradoura começa por **quem você quer ser**, não pelo que quer alcançar — "cada ação é um voto pra sua identidade". É uma heurística poderosa, alinhada com a teoria social de Bandura, mas a evidência experimental direta ainda é emergente. Trate como bússola, não como lei.

:::quote{author="James Clear", source="Atomic Habits (2018)"}
Você não sobe ao nível das suas metas; você cai ao nível dos seus sistemas.
:::

Já o cartão de visita do livro — "1% melhor por dia = 37x melhor em um ano" — é aritmética correta (1,01³⁶⁵) aplicada a algo que não compõe geometricamente. Comportamento humano tem retornos decrescentes, platôs e recaídas; o 1% é metáfora de consistência, não matemática do progresso. E vale conhecer o contraponte de BJ Fogg: começar minúsculo e celebrar na hora resolve o problema de *começar*; sistemas e identidade resolvem o de *manter*. Os dois juntos são mais úteis que qualquer um sozinho.

No saldo, *Hábitos Atômicos* converge com a ciência mais do que os críticos admitem — peca no exagero de prazo e magnitude. Leia como manual de arquitetura de contexto, não como física do comportamento.

:::source[Atomic Habits — James Clear (Avery, 2018)](https://jamesclear.com/atomic-habits)$body_pt$,
    $body_en$In 1960, plastic surgeon Maxwell Maltz noticed his patients took "a minimum of about 21 days" to get used to their new face. That casual observation became self-help legend: 21 days to form any habit. Half a century later, someone finally measured it — and the number is different. *Atomic Habits* (Avery, 2018) is the book that popularized the modern version of this science, and the best way to read it is in three layers: what has evidence, what is a useful compass, and what is marketing arithmetic.

## 1. 66 days, not 21 — and it's a curve, not a deadline

The study that replaced the myth came from Phillippa Lally (University College London, 2010): 96 volunteers repeating a new behavior in the same context for 12 weeks. Automaticity took **66 days** on average — but the real range ran from **18 to 254**, depending on the person and the complexity (a glass of water consolidates fast; 50 sit-ups, not so much). The shape matters more than the number: habits grow along a curve that climbs quickly at first and flattens toward a plateau. There is no day when an alarm rings and the habit is "done".

The study's most useful finding is about failing: **missing a single day didn't dent anyone's curve**. Clear's rule — "never miss twice" — is one of the rare habit-book tips with direct experimental backing. The honest limits: 96 people, self-report, simple behaviors. 66 is the average of a modeled curve, not an individual promise.

## 2. Environment beats willpower

The book's most solid academic foundation comes from Wendy Wood and David Neal: a habit is a **context → response** association carved by repetition. Once formed, perceiving the environment triggers the behavior — no deliberation, no goal in the loop. In Wood's diary studies, about **43% of daily behavior** repeats in the same context, usually while people are thinking about something else.

The practical consequence is the book's most applicable part: stop fighting yourself and redesign the scene.

:::list-icon
eye | **Make it visible** — the cue for the good habit belongs in your face; make the bad habit's trigger invisible.
trending-down | **Move the friction** — remove steps from the behavior you want (gym clothes laid out) and add steps to the one you don't (log out of the app).
flash | **If-then plan** — "if X happens, I do Y" (Gollwitzer): the single most robust technique in this whole literature.
:::

A bonus from the same researchers: when context changes on its own — a move, a new job — the old cues vanish and a rare window opens to change behavior with less resistance.

## 3. Identity and systems — the interesting part (with one caveat)

Clear's favorite thesis is the one that speaks most directly to Perceva: lasting change starts with **who you want to be**, not what you want to achieve — "every action is a vote for your identity". It's a powerful heuristic, aligned with Bandura's social learning theory, but direct experimental evidence is still emerging. Treat it as a compass, not a law.

:::quote{author="James Clear", source="Atomic Habits (2018)"}
You do not rise to the level of your goals. You fall to the level of your systems.
:::

The book's calling card — "1% better every day = 37x better in a year" — is correct arithmetic (1.01³⁶⁵) applied to something that doesn't compound geometrically. Human behavior has diminishing returns, plateaus, and relapses; the 1% is a metaphor for consistency, not the math of progress. Also worth knowing BJ Fogg's counterpoint: starting tiny and celebrating immediately solves the *starting* problem; systems and identity solve the *keeping* one. Together they beat either alone.

On balance, *Atomic Habits* converges with the science more than critics admit — it overreaches on timing and magnitude. Read it as a manual of context architecture, not as the physics of behavior.

:::source[Atomic Habits — James Clear (Avery, 2018)](https://jamesclear.com/atomic-habits)$body_en$,
    array[
      'Hábito novo leva em média 66 dias (variando de 18 a 254) e cresce em curva — perder um dia não zera nada; falhar duas vezes seguidas é o alerta real.',
      'Cerca de 43% do seu dia roda no piloto automático disparado pelo contexto — redesenhar o ambiente rende mais que apertar a força de vontade.',
      $t$Identidade ("cada ação é um voto") é bússola valiosa, mas o "1% ao dia = 37x" é aritmética de marketing, não lei do comportamento.$t$
    ],
    array[
      $t$A new habit takes 66 days on average (ranging 18-254) and grows along a curve — one missed day resets nothing; missing twice in a row is the real alarm.$t$,
      $t$About 43% of your day runs on context-triggered autopilot — redesigning your environment beats squeezing willpower.$t$,
      $t$Identity ("every action is a vote") is a valuable compass, but "1% a day = 37x" is marketing arithmetic, not a law of behavior.$t$
    ],
    array[
      'Você repete o comportamento no mesmo horário e lugar sem precisar se convencer antes.',
      'Um dia perdido não vira uma semana perdida — você volta no dia seguinte sem drama.',
      'Você mudou o ambiente (o que fica visível, o que dá trabalho) em vez de só prometer esforço.'
    ],
    array[
      $t$You repeat the behavior at the same time and place without talking yourself into it.$t$,
      $t$A missed day doesn't become a missed week — you're back the next day, no drama.$t$,
      $t$You changed the environment (what's visible, what takes effort) instead of just promising effort.$t$
    ],
    'Esse resumo fica em Aprender, ligado aos subs Construir e Aprender. A ponte com o app é direta: o Momentum é a curva de automaticidade em ação — cada tarefa diária concluída é um voto, a barra mostra o hábito consolidando e tolera um dia perdido, igual à ciência. Escolhe um hábito minúsculo, cria a tarefa diária e assiste à curva subir.',
    $t$This summary lives in Learn, linked to the Build and Learn subs. The bridge to the app is direct: Momentum is the automaticity curve in action — every completed daily task is a vote, the bar shows the habit consolidating, and it tolerates a missed day, just like the science. Pick one tiny habit, create the daily task, and watch the curve climb.$t$,
    'https://uneqnpyzevosznwkmvvo.supabase.co/storage/v1/object/public/learning-media/atomic-habits/cover.webp',
    'https://jamesclear.com/atomic-habits',
    'Hábitos Atômicos — James Clear (Avery, 2018)',
    'Atomic Habits — James Clear (Avery, 2018)',
    '2026-07-24 12:00:00+00'
  )
  returning id
),
subs as (
  insert into public.learning_material_sub (material_id, sub_id)
  select m.id, s.sub_id from m, (values ('build'), ('learn')) as s(sub_id)
  returning material_id
)
insert into public.learning_material_media
  (material_id, kind, locale, path, duration_seconds, source, meta)
select m.id, x.kind, x.locale, x.path, x.duration_seconds, 'notebooklm', x.meta::jsonb
from m, (values
  ('audio', 'en', 'atomic-habits/audio.en.m4a', 1361,
   '{"title": "Why habits actually take 66 days"}'),
  ('infographic', 'en', 'atomic-habits/infographic.en.webp', null,
   '{"width": 1080, "height": 1936, "alt": "The architecture of habit systems: the 66-day curve vs the 21-day myth, the four laws, and environment design"}')
) as x(kind, locale, path, duration_seconds, meta);

commit;
