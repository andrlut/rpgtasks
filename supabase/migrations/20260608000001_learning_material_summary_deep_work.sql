-- migration: 20260608000001_learning_material_summary_deep_work.sql
-- purpose: publish one new Learning material — a bilingual SUMMARY of
--          Cal Newport's "Deep Work" (sub=build, dim=craft).
--
-- affected tables: public.learning_material (1 insert),
--                  public.learning_material_sub (1 link → 'build')
-- new rpcs:        none
-- breaking?        no
--
-- notes:
--   migrations são write-once; nunca editar depois de aplicar
--   produced by the autonomous learning-publisher pipeline
--   (planner → researcher → drafter → reviewer). Reviewer PASSED with
--   3 warn-level notes; Leroy + Ericsson :::source blocks added per review.

begin;

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
    'summary-deep-work', 'summary', 'craft', 'deep-work', 6,
    'Deep Work — o foco como vantagem',
    'Deep Work — focus as an edge',
    'A defesa mais clara do foco profundo como vantagem profissional — e onde Newport força a barra.',
    'The clearest case for deep focus as a career edge — and where Newport overreaches.',
    $body$Atenção é cara. Cal Newport escreveu *Deep Work* (Grand Central, 2016) a partir de uma incômoda observação: a maior parte do trabalho de conhecimento virou um borrão de e-mail, chat e reunião — raso, reativo e fácil de replicar. A tese do livro é direta: a capacidade de focar sem distração numa tarefa cognitivamente exigente está ficando ao mesmo tempo **rara** e **valiosa**. Quem treina esse músculo colhe uma vantagem econômica desproporcional.

> Deep work is becoming both rare and increasingly valuable — and those who cultivate it will thrive.

## 1. Foco é um multiplicador — e a troca de tarefas é cara

O inimigo do trabalho profundo tem nome: **resíduo de atenção**. Quando você troca de uma tarefa para outra, parte da sua atenção fica grudada na anterior — você senta para escrever, mas metade da cabeça ainda está naquele e-mail de 30 segundos atrás. Esse arrasto degrada a performance na tarefa seguinte, mesmo depois que você "terminou" a primeira.

O termo vem de Sophie Leroy (2009), que mostrou em experimentos que o desempenho cai quando as pessoas alternam entre tarefas sem fechá-las direito. A implicação prática é dura: um dia recortado em dez interrupções não rende um décimo de um bloco contínuo — rende muito menos, porque cada retomada paga o pedágio do resíduo. É por isso que o trabalho raso é tão mais caro do que parece: ele não só ocupa tempo, ele contamina o tempo ao redor.

:::source[Leroy, S. (2009) · Organizational Behavior and Human Decision Processes, 109(2)](https://doi.org/10.1016/j.obhdp.2009.04.002)

## 2. Profundidade vira habilidade via prática deliberada

Foco sustentado não é só conforto — é o mecanismo pelo qual você fica bom em algo. Newport apoia isso na ideia de **prática deliberada**: o aprimoramento de elite não vem de repetir o que você já domina, mas de praticar de forma esforçada, com feedback, sempre no limite da sua capacidade atual. É treinar a parte que dói, não a que flui. E isso exige foco profundo — você não pratica deliberadamente checando notificações.

O termo vem de K. Anders Ericsson (1993). Mas é aqui que Newport força a barra, e a honestidade pede o contraponto:

:::callout{kind=warn}
A prática deliberada importa — mas explica **menos** do que Newport sugere. Uma meta-análise de Macnamara e colegas atribuiu à prática deliberada só cerca de **12% da variância** na performance entre domínios (e bem menos em alguns, como profissões). Talento, contexto e timing pesam o resto. Foco profundo é necessário; não é suficiente.
:::

A leitura sóbria: profundidade é a melhor alavanca que **você controla**. Não é a única coisa que decide o resultado.

:::source[Ericsson et al. (1993) · Psychological Review, 100(3)](https://doi.org/10.1037/0033-295X.100.3.363)

:::source[Macnamara et al., Psychological Science (2014)](https://journals.sagepub.com/doi/10.1177/0956797614535810)

## 3. Quatro formas de agendar profundidade

Newport sabe que "foque mais" é um conselho vazio sem uma estrutura. Ele oferece quatro filosofias — escolha a que cabe na sua vida, não a mais heroica.

:::list-icon
ban | **Monástica** — isole-se quase por completo do raso. Bom para quem tem um único produto a defender. Anote: corte e-mail e reuniões a ponto de virar inacessível.
sync | **Bimodal** — divida o calendário em estações: semanas (ou meses) de reclusão profunda, alternadas com períodos abertos. Anote: reserve uma semana por mês só para o trabalho difícil.
time | **Rítmica** — um bloco profundo fixo, todo dia, virado hábito. A mais realista para um adulto com trabalho. Anote: bloqueie 90 min toda manhã antes de abrir o e-mail.
sparkles | **Jornalística** — mergulhe na profundidade sempre que abrir uma brecha na agenda. Poderosa, mas exige um músculo de foco já treinado. Anote: ao ver 40 min livres, entre direto na tarefa difícil, sem aquecer.
:::

Para a maioria, a rítmica vence. Ela não depende de heroísmo nem de uma agenda vazia — depende de um gatilho diário repetido até virar automático. É o mesmo princípio do hábito: o horário fixo remove a decisão.

Newport ainda propõe **"drenar o raso"** (*drain the shallows*) — encolher de forma agressiva o tempo gasto em tarefas logísticas, para abrir espaço aos blocos profundos. Menos reuniões, e-mail em lotes, um teto explícito de horas rasas por dia.

No fim, *Deep Work* é uma tese de um botão só: proteja a atenção e o resto melhora. O exagero está em sugerir que profundidade quase garante maestria — a evidência mostra que ela ajuda muito, não que ela basta. Vale ler como um manual de **defesa do foco** num mundo desenhado para fragmentá-lo, não como uma promessa de excelência.$body$,
    $body$Attention is expensive. Cal Newport wrote *Deep Work* (Grand Central, 2016) from one uncomfortable observation: most knowledge work has dissolved into a blur of email, chat, and meetings — shallow, reactive, and easy to replicate. The book's thesis is blunt: the ability to focus without distraction on a cognitively demanding task is becoming both **rare** and **valuable** at once. Train that muscle and you earn an outsized economic edge.

> Deep work is becoming both rare and increasingly valuable — and those who cultivate it will thrive.

## 1. Focus is a multiplier — and task-switching is costly

The enemy of deep work has a name: **attention residue**. When you switch from one task to another, part of your attention stays stuck on the previous one — you sit down to write, but half your head is still on that email from 30 seconds ago. That drag degrades performance on the next task, even after you've "finished" the first.

The term comes from Sophie Leroy (2009), whose experiments showed performance drops when people jump between tasks without properly closing them. The practical sting is real: a day chopped into ten interruptions doesn't yield a tenth of one unbroken block — it yields far less, because each restart pays the residue toll. That's why shallow work is so much more expensive than it looks: it doesn't just take time, it contaminates the time around it.

:::source[Leroy, S. (2009) · Organizational Behavior and Human Decision Processes, 109(2)](https://doi.org/10.1016/j.obhdp.2009.04.002)

## 2. Depth compounds into skill via deliberate practice

Sustained focus isn't just comfortable — it's the mechanism by which you get good at something. Newport leans on the idea of **deliberate practice**: elite improvement comes not from repeating what you already do well, but from effortful, feedback-driven practice right at the edge of your current ability. It's drilling the part that hurts, not the part that flows. And that demands deep focus — you can't practice deliberately while checking notifications.

The term comes from K. Anders Ericsson (1993). But this is where Newport overreaches, and honesty calls for the counterweight:

:::callout{kind=warn}
Deliberate practice matters — but explains **less** than Newport implies. A meta-analysis by Macnamara and colleagues attributed only about **12% of the variance** in performance across domains to deliberate practice (far less in some, like professions). Talent, context, and timing carry the rest. Deep focus is necessary; it isn't sufficient.
:::

The sober read: depth is the best lever **you control**. It isn't the only thing that decides the outcome.

:::source[Ericsson et al. (1993) · Psychological Review, 100(3)](https://doi.org/10.1037/0033-295X.100.3.363)

:::source[Macnamara et al., Psychological Science (2014)](https://journals.sagepub.com/doi/10.1177/0956797614535810)

## 3. Four ways to schedule depth

Newport knows "focus more" is empty advice without structure. He offers four philosophies — pick the one that fits your life, not the most heroic one.

:::list-icon
ban | **Monastic** — isolate yourself almost entirely from the shallow. Good if you have a single product to defend. Anchor: cut email and meetings until you're effectively unreachable.
sync | **Bimodal** — split the calendar into seasons: weeks (or months) of deep seclusion, alternating with open periods. Anchor: reserve one week a month for the hard work only.
time | **Rhythmic** — a fixed deep block, every day, turned into habit. The most realistic for a working adult. Anchor: block 90 min every morning before you open email.
sparkles | **Journalistic** — drop into depth whenever a gap opens in your schedule. Powerful, but it requires an already-trained focus muscle. Anchor: when you see 40 free minutes, dive straight into the hard task, no warm-up.
:::

For most people, rhythmic wins. It doesn't depend on heroism or an empty calendar — it depends on a daily trigger repeated until it runs on autopilot. Same principle as any habit: the fixed time removes the decision.

Newport also proposes **"draining the shallows"** — aggressively shrinking the time spent on logistical busywork to clear room for the deep blocks. Fewer meetings, batched email, an explicit cap on shallow hours per day.

In the end, *Deep Work* is a one-knob thesis: protect your attention and the rest improves. The overreach is suggesting depth nearly guarantees mastery — the evidence shows it helps a lot, not that it's enough. Read it as a manual for **defending focus** in a world engineered to fragment it, not as a promise of excellence.$body$,
    array[
      'Trocar de tarefa deixa resíduo de atenção: o dia picado rende muito menos que um bloco contínuo.',
      'A prática deliberada (treinar no limite, com feedback) constrói habilidade — mas explica só ~12% da performance, então foco ajuda, não basta.',
      'Das quatro filosofias de Newport, a rítmica (um bloco profundo fixo por dia) é a única realista para quem trabalha.'
    ],
    array[
      'Switching tasks leaves attention residue: a fragmented day yields far less than one continuous block.',
      'Deliberate practice (training at the edge, with feedback) builds skill — but explains only ~12% of performance, so focus helps, it isn''t enough.',
      'Of Newport''s four philosophies, the rhythmic one (a fixed daily deep block) is the only realistic one for working adults.'
    ],
    array[
      'Você termina o dia ocupado mas sem nada profundo feito.',
      'Você abre o e-mail antes de qualquer tarefa difícil — e ele engole a manhã.',
      'Cada bloco de foco dura menos de 20 minutos antes de uma interrupção (sua ou de fora).'
    ],
    array[
      'You end the day busy but with nothing deep actually done.',
      'You open email before any hard task — and it swallows the morning.',
      'Each focus block lasts under 20 minutes before an interruption (yours or someone else''s).'
    ],
    'Esse summary fica em Aprender, sob o sub Construir (Craft). A forma de aplicar é criar uma tarefa diária — um bloco rítmico de 90 min de trabalho profundo, antes do e-mail — alocada ao sub Construir. O app rastreia isso como streak: cada dia que você cumpre o bloco mantém a sequência viva, e a curva de momentum mostra, ao longo das semanas, se a profundidade virou hábito ou ainda é exceção.',
    'This summary lives in Learn under the Build sub (Craft). The way to apply it is to create a daily task — a rhythmic 90-min deep-work block before email — allocated to the Build sub. The app tracks it as a streak: every day you hit the block keeps the run alive, and the momentum curve shows, over weeks, whether depth has become a habit or is still the exception.',
    'https://www.hachettebookgroup.com/titles/cal-newport/deep-work/9781455586691/',
    'Deep Work — Cal Newport (Grand Central, 2016)',
    'Deep Work — Cal Newport (Grand Central, 2016)',
    $rlog${
      "template_type": "summary",
      "template_version": 1,
      "steps": [
        {"id": "author_question", "answer_pt": "Por que o trabalho de conhecimento virou um borrão raso de e-mail/chat/reunião — e o que se perde quando ninguém mais consegue focar fundo?", "answer_en": "Why has knowledge work dissolved into a shallow blur of email/chat/meetings — and what is lost when no one can focus deeply anymore?"},
        {"id": "author_thesis", "answer_pt": "A hipótese do deep work: a capacidade de focar sem distração em tarefa cognitivamente exigente está ficando rara E valiosa ao mesmo tempo, logo é economicamente premiada.", "answer_en": "The deep work hypothesis: the ability to focus without distraction on cognitively demanding work is becoming both rare AND valuable, so it is economically prized."},
        {"id": "core_ideas", "answer_pt": "Exatamente 3: (1) foco é multiplicador e a troca de tarefa custa via resíduo de atenção (Leroy 2009); (2) profundidade vira habilidade via prática deliberada (Ericsson 1993), com o contraponto Macnamara ~12% dobrado aqui; (3) as 4 filosofias de agendamento, cada uma com âncora comportamental, rítmica como padrão realista.", "answer_en": "Exactly 3: (1) focus is a multiplier and task-switching costs via attention residue (Leroy 2009); (2) depth compounds into skill via deliberate practice (Ericsson 1993), with the Macnamara ~12% counterweight folded in; (3) the 4 scheduling philosophies, each with a behavioral anchor, rhythmic as the realistic default."},
        {"id": "evidence", "answer_pt": "Resíduo de atenção: Leroy 2009 (Organizational Behavior and Human Decision Processes). Prática deliberada: Ericsson 1993, definido em linguagem simples. Contraponto: Macnamara et al. 2014, Psychological Science — só ~12% da variância.", "answer_en": "Attention residue: Leroy 2009 (Organizational Behavior and Human Decision Processes). Deliberate practice: Ericsson 1993, defined plainly. Counterweight: Macnamara et al. 2014, Psychological Science — only ~12% of variance."},
        {"id": "actionable", "answer_pt": "Escolha uma das 4 filosofias; para a maioria, a rítmica: bloqueie 90 min de profundidade toda manhã antes do e-mail. Drene o raso. Rastreado como tarefa diária no sub Construir via streak.", "answer_en": "Pick one of the 4 philosophies; for most, rhythmic: block 90 min of depth every morning before email. Drain the shallows. Tracked as a daily task under the Build sub via streak."},
        {"id": "verdict", "answer_pt": "Tese de um botão só: proteja a atenção e o resto melhora. Exagero: sugerir que profundidade quase garante maestria — Macnamara mostra ~12%. Vale como manual de defesa do foco, não como promessa de excelência.", "answer_en": "One-knob thesis: protect attention and the rest improves. Overreach: implying depth nearly guarantees mastery — Macnamara shows ~12%. Worth it as a manual for defending focus, not a promise of excellence."}
      ]
    }$rlog$::jsonb
  )
  returning id
)
insert into public.learning_material_sub (material_id, sub_id) values
  ((select id from m), 'build');

commit;
