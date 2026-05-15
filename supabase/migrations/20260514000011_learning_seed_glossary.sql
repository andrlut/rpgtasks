-- ============================================================================
-- Learning seed: glossary explainers — 1 material per sub (12 total).
--
-- These are the day-1 content drop: a short, warm, practical explainer for
-- each sub. Tone is contemplative + concrete, not didactic. PT is the
-- primary; EN mirrors closely but reads natural-EN.
--
-- All materials are type='explainer', no source, no hero image (the feed
-- falls back to a sub icon for now). Sub linkage is exactly 1 per material
-- (the sub being explained). XP per read = 5 base + 5 per sub = 10.
-- ============================================================================

begin;

-- ─── 1. SLEEP (health) ────────────────────────────────────────────────────
with m as (
  insert into public.learning_material (
    slug, type, dimension_id, topic, reading_minutes,
    title_pt, title_en,
    summary_pt, summary_en,
    body_pt, body_en
  ) values (
    'glossary-sleep', 'explainer', 'health', 'sleep', 3,
    'Sono — a base de tudo',
    'Sleep — the foundation under everything',
    'A única atividade do dia em que não fazer nada é fazer tudo.',
    'The one activity where doing nothing is doing everything.',
    $body$Sono é a única atividade do seu dia em que não fazer nada é fazer tudo. Você não acorda renovado porque tomou café — você acorda renovado porque dormiu. Tudo o resto, da memória ao humor, depende disso.

## O que entra aqui

Quantidade (idealmente 7–9h em adulto), regularidade (ir pra cama em horários parecidos) e qualidade (escuro, fresco, sem tela bem antes). Os três pesam. Dormir 8h irregulares ou ruins não substitui 7h regulares e profundas.

## Por que importa tanto

Memória se consolida durante o sono — você literalmente decora o que estudou durante o dia enquanto dorme. Hormônios de fome e saciedade recalibram. O sistema glinfático limpa subprodutos metabólicos do cérebro (a "lavagem" diária dele). Sem isso, tudo o que você tenta melhorar fica mais difícil.

## Sinais de que está bem

- Acordar antes do despertador, sem se sentir esmagado.
- Focar por blocos longos no início do dia.
- Não precisar de cafeína pra existir.

## Como o app acompanha

Sono é uma sub de Saúde. Suas tasks de "dormir cedo", "evitar tela depois de X" ou "8h cheias" contribuem aqui. Cair na pontuação aqui costuma puxar tudo o resto pra baixo em algumas semanas — vale acompanhar.$body$,
    $body$Sleep is the one thing in your day where doing nothing is doing everything. You don't wake up rested because you had coffee — you wake up rested because you slept. Everything else, from memory to mood, depends on it.

## What this covers

Quantity (ideally 7–9h for adults), regularity (going to bed at similar times), and quality (dark, cool, no screens right before). All three matter. Eight irregular or low-quality hours don't replace seven regular, deep ones.

## Why it matters

Memory consolidates during sleep — you literally encode what you studied that day while you sleep. Hunger and satiety hormones recalibrate. The glymphatic system clears metabolic byproducts from the brain (its daily "wash"). Without this, everything else you're trying to improve gets harder.

## Signs you're on track

- Waking before your alarm without feeling crushed.
- Focusing in long blocks early in the day.
- Not needing caffeine just to function.

## How the app tracks it

Sleep is a sub of Health. Your tasks for "sleep early", "no screens after X", or "full 8h" contribute here. Score drops in this sub tend to drag everything else down within a few weeks — worth watching.$body$
  )
  returning id
)
insert into public.learning_material_sub (material_id, sub_id)
select id, 'sleep' from m;

-- ─── 2. NUTRITION (health) ───────────────────────────────────────────────
with m as (
  insert into public.learning_material (
    slug, type, dimension_id, topic, reading_minutes,
    title_pt, title_en,
    summary_pt, summary_en,
    body_pt, body_en
  ) values (
    'glossary-nutrition', 'explainer', 'health', 'nutrition', 3,
    'Nutrição — combustível e sinal',
    'Nutrition — fuel and signal',
    'O que você come vira corpo, energia e humor — nessa ordem.',
    'What you eat becomes body, energy, and mood — in that order.',
    $body$Nutrição é o que entra no seu corpo todos os dias e vira, sem perguntar, a matéria-prima de tudo: músculo, hormônio, neurotransmissor, humor. Não é dieta — é o sinal que você manda pro seu corpo o tempo todo.

## O que entra aqui

Qualidade (alimentos minimamente processados, fibras, proteínas, água), quantidade (suficiente, não em excesso) e ritmo (refeições com regularidade que você consegue sustentar). Aqui não cabe contar caloria com obsessão — cabe perguntar "isso me deixa pronto pra próximas 4 horas?".

## Por que importa tanto

Comida ruim em pouca quantidade ainda é comida ruim. O corpo te dá energia constante quando recebe proteína + fibra + gordura boa em refeições. Picos de açúcar viram queda de energia em 90 minutos. Hidratação afeta foco antes de afetar sede — quando você sente sede, já está atrasado.

## Sinais de que está bem

- Energia razoavelmente constante ao longo do dia.
- Conseguir esperar 4–5h entre refeições sem desmoronar.
- Pele, intestino e humor estáveis.

## Como o app acompanha

Nutrição é uma sub de Saúde. Tasks de "tomar água", "comer uma fruta", "evitar ultraprocessados" ou "cozinhar em casa" todas contribuem. Esse sub é dos que mais se beneficia de consistência: um dia bom não muda nada, três meses bons mudam quase tudo.$body$,
    $body$Nutrition is what enters your body every day and becomes — without asking — the raw material for everything: muscle, hormone, neurotransmitter, mood. It's not a diet. It's the signal you send your body all day long.

## What this covers

Quality (minimally processed food, fiber, protein, water), quantity (enough, not too much), and rhythm (meals at intervals you can actually sustain). This isn't about obsessive calorie counting — it's about asking "does this set me up for the next 4 hours?".

## Why it matters

Bad food in small amounts is still bad food. Your body gives you steady energy when it gets protein + fiber + good fat in meals. Sugar spikes become crashes within 90 minutes. Hydration hits focus before it hits thirst — by the time you feel thirsty, you're already behind.

## Signs you're on track

- Reasonably stable energy through the day.
- Going 4–5h between meals without falling apart.
- Skin, gut, and mood stay even.

## How the app tracks it

Nutrition is a sub of Health. Tasks for "drink water", "eat a piece of fruit", "no ultra-processed", or "cook at home" all contribute. This sub rewards consistency above all: one good day changes nothing, three good months change almost everything.$body$
  )
  returning id
)
insert into public.learning_material_sub (material_id, sub_id)
select id, 'nutrition' from m;

-- ─── 3. STRENGTH (body) ───────────────────────────────────────────────────
with m as (
  insert into public.learning_material (
    slug, type, dimension_id, topic, reading_minutes,
    title_pt, title_en,
    summary_pt, summary_en,
    body_pt, body_en
  ) values (
    'glossary-strength', 'explainer', 'body', 'strength', 3,
    'Força — o corpo como capacidade',
    'Strength — the body as capability',
    'Não é vaidade — é a estrutura que sustenta o resto da vida.',
    'It''s not vanity — it''s the scaffolding that holds the rest up.',
    $body$Força não é só estética e não é só esporte — é a capacidade do seu corpo de fazer o que a vida pede. Pegar uma criança no colo. Subir três lances de escada sem morrer. Movimentar uma caixa pesada sozinho. Aos 30 isso parece dado; aos 60, vira o que determina a sua autonomia.

## O que entra aqui

Esforço físico que exige resistência cardiovascular ou força muscular: correr, pedalar, nadar, treinar com peso, escalar, jogar bola. O ponto não é o esporte específico — é gastar a moeda do "esforço que tira você do conforto".

## Por que importa tanto

Massa muscular após os 30 cai em média 3–8% por década se você não treina. Cardio prediz mortalidade melhor que qualquer outro indicador isolado. Força funcional reduz lesão, melhora postura, libera endorfina, melhora sono. É um dos poucos pilares onde o input (treinar) tem retorno desproporcional em vários outros pilares.

## Sinais de que está bem

- Subir escada sem pensar nela.
- Aguentar 30+ min de esforço contínuo.
- Acordar no dia seguinte sem dor anormal.

## Como o app acompanha

Força é uma sub de Corpo. Tasks de "20 push-ups", "30 min de cardio" ou "treino na academia" caem aqui. Skills do catálogo (push-ups, corrida) usam percentis populacionais — você vê não só "quanto melhorou" mas "onde está em relação aos adultos no geral".$body$,
    $body$Strength isn't just aesthetics and isn't just sports — it's your body's capacity to do what life asks of it. Pick up a kid. Take three flights of stairs without dying. Move a heavy box on your own. At 30 this feels given; at 60, it's what determines your autonomy.

## What this covers

Physical effort that demands cardiovascular endurance or muscle force: running, cycling, swimming, lifting, climbing, ball sports. The point isn't the specific sport — it's spending the currency of "effort that pulls you out of comfort".

## Why it matters

Muscle mass past 30 drops 3–8% per decade on average if you don't train. Cardio predicts mortality better than almost any other single indicator. Functional strength cuts injury, fixes posture, releases endorphins, improves sleep. It's one of the few pillars where the input (training) returns disproportionately across many others.

## Signs you're on track

- Climbing stairs without thinking about it.
- Holding 30+ min of continuous effort.
- Waking up the next day without abnormal pain.

## How the app tracks it

Strength is a sub of Body. Tasks for "20 push-ups", "30 min cardio", or "gym session" land here. Catalog skills (push-ups, running) use population percentiles — you see not just "how much you improved" but "where you stand against adults overall".$body$
  )
  returning id
)
insert into public.learning_material_sub (material_id, sub_id)
select id, 'strength' from m;

-- ─── 4. DEXTERITY (body) ──────────────────────────────────────────────────
with m as (
  insert into public.learning_material (
    slug, type, dimension_id, topic, reading_minutes,
    title_pt, title_en,
    summary_pt, summary_en,
    body_pt, body_en
  ) values (
    'glossary-dexterity', 'explainer', 'body', 'dexterity', 2,
    'Destreza — mobilidade e precisão',
    'Dexterity — mobility and precision',
    'O outro lado do corpo — não é potência, é controle.',
    'The other side of the body — not power, control.',
    $body$Destreza é a outra metade do corpo, que costuma ser esquecida quando a conversa é só sobre força. É amplitude de movimento, coordenação, equilíbrio, controle motor fino. O corpo que se move bem, não só com peso.

## O que entra aqui

Mobilidade articular, alongamento, ioga, pilates, dança, esportes que exigem coordenação (basquete, escalada, surfe), prática de instrumentos, atividades manuais finas. Tudo o que treina o corpo a fazer movimentos precisos com a amplitude certa.

## Por que importa tanto

Quase toda lesão de adulto na faixa dos 30–60 vem de falta de mobilidade, não de falta de força. Quadril travado, ombro com pouca amplitude, tornozelo enrijecido — esses são os culpados silenciosos. Trabalhar destreza preserva a capacidade de envelhecer sem virar prisioneiro do próprio corpo.

## Sinais de que está bem

- Conseguir agachar até embaixo com calcanhar no chão.
- Pegar objeto no chão sem hesitar.
- Tocar os pés (ou perto) sem dor.

## Como o app acompanha

Destreza é uma sub de Corpo, par com Força. Tasks de "10 min de mobilidade", "alongamento pós-treino" ou "aula de ioga" contribuem aqui. Esse sub é dos que rendem mais com pouco — 10 min diários valem mais que 1h por mês.$body$,
    $body$Dexterity is the other half of the body, the one that gets forgotten when the conversation is only about strength. It's range of motion, coordination, balance, fine motor control. The body that moves well, not just with weight.

## What this covers

Joint mobility, stretching, yoga, pilates, dance, sports demanding coordination (basketball, climbing, surfing), instrument practice, fine manual activities. Anything that trains the body to make precise movements through the right range.

## Why it matters

Almost every adult injury in the 30–60 range comes from lack of mobility, not lack of strength. Locked hips, low shoulder range, stiff ankles — those are the silent culprits. Working dexterity preserves the capacity to age without becoming a prisoner of your own body.

## Signs you're on track

- Squatting all the way down with heels on the floor.
- Picking something off the ground without hesitating.
- Touching your toes (or close) without pain.

## How the app tracks it

Dexterity is a sub of Body, paired with Strength. Tasks for "10 min mobility", "post-workout stretch", or "yoga class" all contribute. This sub returns a lot for little — 10 min daily beats 1h per month.$body$
  )
  returning id
)
insert into public.learning_material_sub (material_id, sub_id)
select id, 'dexterity' from m;

-- ─── 5. LEARN (mind) ──────────────────────────────────────────────────────
with m as (
  insert into public.learning_material (
    slug, type, dimension_id, topic, reading_minutes,
    title_pt, title_en,
    summary_pt, summary_en,
    body_pt, body_en
  ) values (
    'glossary-learn', 'explainer', 'mind', 'learn', 3,
    'Aprender — manter a mente em obra',
    'Learn — keeping the mind under construction',
    'Não é só estudar — é continuar capaz de mudar de ideia.',
    'It''s not just studying — it''s staying able to change your mind.',
    $body$Aprender, na vida adulta, raramente é sobre tirar 10 numa prova. É sobre não congelar — manter a curiosidade ativa, treinar a habilidade de pegar uma ideia complexa e digerir, manter a porta aberta pra mudar de opinião baseado em evidência nova.

## O que entra aqui

Leitura (livro, artigo longo, ensaio), cursos, podcasts densos, conversas profundas com gente que sabe coisa que você não sabe, escrever pra esclarecer, projetos pessoais que forçam aprendizado novo. Não conta scroll passivo nem consumo de conteúdo curto e disperso.

## Por que importa tanto

A plasticidade cerebral cai com idade, mas só se você não usa. Quem mantém prática de aprender ativamente preserva memória, foco e velocidade de raciocínio por décadas. Além do efeito biológico, é o que evita o pior tipo de envelhecimento: o intelectual.

## Sinais de que está bem

- Estar no meio de algum livro/curso/projeto que te exige.
- Conseguir explicar com clareza algo que aprendeu recentemente.
- Ter mudado de ideia sobre algo importante no último ano.

## Como o app acompanha

Aprender é uma sub de Mente. Tasks de "ler 20 min", "1 episódio de curso" ou "praticar idioma" contribuem aqui. Skills do tipo "páginas lidas em uma sessão" medem a faceta de foco concentrado. Esse sub é onde o uso compõe no longuíssimo prazo.$body$,
    $body$Learning, in adult life, is rarely about scoring high on a test. It's about not freezing — keeping curiosity active, training the skill of taking a complex idea and digesting it, keeping the door open to changing your mind based on new evidence.

## What this covers

Reading (books, long articles, essays), courses, dense podcasts, deep conversations with people who know things you don't, writing to clarify, personal projects that force new learning. Passive scrolling and short scattered content don't count.

## Why it matters

Brain plasticity drops with age, but only if you don't use it. People who keep an active learning practice preserve memory, focus, and reasoning speed for decades. Beyond the biology, it's what prevents the worst kind of aging: intellectual.

## Signs you're on track

- You're currently mid-book / mid-course / mid-project that stretches you.
- You can clearly explain something you learned recently.
- You've changed your mind about something important in the last year.

## How the app tracks it

Learn is a sub of Mind. Tasks for "read 20 min", "one course episode", or "language practice" land here. Skills like "pages in one session" measure the focused-attention side. This sub compounds over the very long term.$body$
  )
  returning id
)
insert into public.learning_material_sub (material_id, sub_id)
select id, 'learn' from m;

-- ─── 6. CONTEMPLATE (mind) ────────────────────────────────────────────────
with m as (
  insert into public.learning_material (
    slug, type, dimension_id, topic, reading_minutes,
    title_pt, title_en,
    summary_pt, summary_en,
    body_pt, body_en
  ) values (
    'glossary-contemplate', 'explainer', 'mind', 'contemplate', 3,
    'Contemplar — estar com a própria cabeça',
    'Contemplate — being with your own mind',
    'A prática de ficar quieto o suficiente pra se ouvir.',
    'The practice of staying still enough to hear yourself.',
    $body$Contemplar é o oposto silencioso de aprender. Aprender é encher a mente; contemplar é arrumar. Os dois fazem par. Sem o segundo, o primeiro vira só acúmulo ansioso. É a prática de ficar quieto o suficiente pra se ouvir.

## O que entra aqui

Meditação (qualquer estilo — atenção plena, transcendental, mantra), oração contemplativa, journaling sem objetivo prático, caminhadas longas sem podcast, observar a natureza, terapia, momentos deliberados de tédio. Tudo que reduz input externo pra deixar processamento interno acontecer.

## Por que importa tanto

A maior parte da ansiedade adulta vem de ter pensamento demais sem espaço pra digerir. Práticas contemplativas reduzem reatividade emocional, melhoram tomada de decisão sob pressão e aumentam a sensação de que o tempo "rendeu" — não por terem feito mais, mas por terem absorvido melhor.

## Sinais de que está bem

- Conseguir ficar 5 minutos parado sem pegar o celular.
- Notar emoção antes de reagir a ela.
- Sentir que o dia teve algumas pausas, não foi só corrida.

## Como o app acompanha

Contemplar é uma sub de Mente, par com Aprender. Tasks de "meditar 10 min", "journaling de manhã" ou "caminhar sem fone" contribuem aqui. A skill "meditação mais longa" cresce com prática consistente. Esse sub não premia esforço bruto — premia regularidade.$body$,
    $body$Contemplating is the silent opposite of learning. Learning fills the mind; contemplating sorts it. The two are a pair. Without the second, the first becomes anxious accumulation. It's the practice of staying still enough to hear yourself.

## What this covers

Meditation (any style — mindfulness, transcendental, mantra), contemplative prayer, journaling without practical goal, long walks without a podcast, watching nature, therapy, deliberate moments of boredom. Anything that reduces external input so internal processing can happen.

## Why it matters

Most adult anxiety comes from too much thinking with no space to digest. Contemplative practices reduce emotional reactivity, improve decision-making under pressure, and increase the feeling that time "amounted to something" — not because you did more, but because you absorbed it better.

## Signs you're on track

- You can sit still for 5 minutes without grabbing your phone.
- You notice an emotion before reacting to it.
- The day had a few pauses, not just sprinting.

## How the app tracks it

Contemplate is a sub of Mind, paired with Learn. Tasks for "meditate 10 min", "morning journaling", or "walk without earbuds" all contribute. The "longest meditation" skill grows with consistent practice. This sub doesn't reward brute effort — it rewards regularity.$body$
  )
  returning id
)
insert into public.learning_material_sub (material_id, sub_id)
select id, 'contemplate' from m;

-- ─── 7. MONEY (wealth) ────────────────────────────────────────────────────
with m as (
  insert into public.learning_material (
    slug, type, dimension_id, topic, reading_minutes,
    title_pt, title_en,
    summary_pt, summary_en,
    body_pt, body_en
  ) values (
    'glossary-money', 'explainer', 'wealth', 'money', 3,
    'Dinheiro — clareza antes de quantidade',
    'Money — clarity before quantity',
    'Não é sobre ganhar mais — é sobre saber onde está.',
    'It''s not about earning more — it''s about knowing where you stand.',
    $body$Dinheiro, antes de ser sobre ganhar mais, é sobre saber onde está. A maior parte do desconforto financeiro adulto não vem de pobreza — vem de não saber. Não saber quanto entra, não saber quanto sai, não saber quanto custa o seu mês. Clareza vem antes de quantidade.

## O que entra aqui

Acompanhar despesas, ter orçamento (mesmo grosseiro), construir reserva de emergência, evitar dívida ruim, conhecer e usar instrumentos básicos de investimento. Não é sobre virar especialista — é sobre não estar na neblina.

## Por que importa tanto

Dinheiro mal resolvido sangra atenção em silêncio. Você pensa nele mais do que percebe, mesmo quando não está pensando "nele" — está pensando em ansiedade que tem ele como causa de fundo. Resolver não significa ficar rico; significa parar de gastar atenção mental com isso.

## Sinais de que está bem

- Você sabe, com erro de 10%, quanto gastou no último mês.
- Tem reserva pra 3+ meses sem renda.
- Decisões de compra grande não te tiram o sono.

## Como o app acompanha

Dinheiro é uma sub de Riqueza. Tasks de "registrar despesas do dia", "revisar orçamento" ou "transferir pra reserva" caem aqui. Esse sub não vira maratona — vira hábito leve e contínuo. Vinte minutos por semana de atenção bem dirigida muda mais que duas horas trimestrais de pânico.$body$,
    $body$Money, before being about earning more, is about knowing where you stand. Most adult financial discomfort isn't from poverty — it's from not knowing. Not knowing what comes in, what goes out, what your month costs. Clarity comes before quantity.

## What this covers

Tracking expenses, having a budget (even rough), building an emergency fund, avoiding bad debt, understanding and using basic investment vehicles. It's not about becoming a specialist — it's about not being in fog.

## Why it matters

Unresolved money bleeds attention silently. You think about it more than you realize, even when you're not thinking "about it" — you're thinking about anxiety that has it as a background cause. Resolving doesn't mean getting rich; it means not spending mental attention on it.

## Signs you're on track

- You know, within 10%, what you spent last month.
- You have a reserve for 3+ months without income.
- Big purchase decisions don't cost you sleep.

## How the app tracks it

Money is a sub of Wealth. Tasks for "log today's expenses", "review budget", or "transfer to savings" land here. This sub doesn't reward marathons — it rewards light, continuous habit. Twenty well-directed minutes a week change more than two quarterly hours of panic.$body$
  )
  returning id
)
insert into public.learning_material_sub (material_id, sub_id)
select id, 'money' from m;

-- ─── 8. CAREER (wealth) ───────────────────────────────────────────────────
with m as (
  insert into public.learning_material (
    slug, type, dimension_id, topic, reading_minutes,
    title_pt, title_en,
    summary_pt, summary_en,
    body_pt, body_en
  ) values (
    'glossary-career', 'explainer', 'wealth', 'career', 3,
    'Carreira — direção mais que escada',
    'Career — direction over ladder',
    'Não é o cargo do mês — é em quem você está virando ao trabalhar.',
    'Not the job-of-the-month — it''s who you''re becoming through work.',
    $body$Carreira não é a escada que você está subindo — é a direção pra qual está se tornando. Cargo é o snapshot do mês. Carreira é o vetor: que tipo de problema você quer ser bom em resolver daqui a 10 anos, e o trabalho de hoje move pra lá ou pro contrário?

## O que entra aqui

Tempo focado em trabalho profundo (não reuniões reativas), construção de network real (não LinkedIn), pivot de habilidades em direção ao seu vetor, ler/escrever/falar sobre o que você faz, manter portfólio público, conversas honestas sobre próximo passo. Não conta hora gasta apagando incêndio.

## Por que importa tanto

A maior parte das pessoas adultas passa metade dos dias acordados trabalhando. Se o vetor está errado, você fica bom em algo que não quer ser. Se está certo, dez anos viram capacidade rara. A diferença entre os dois é quase invisível no curto prazo e enorme no longo.

## Sinais de que está bem

- Sabe descrever em uma frase pra onde está indo profissionalmente.
- Faz 1+ projeto de "construção" por trimestre, não só "manutenção".
- Tem 3 pessoas com quem pode conversar sobre próximos passos sem performar.

## Como o app acompanha

Carreira é uma sub de Riqueza. Tasks de "90 min de deep work", "estudar [skill profissional]" ou "atualizar portfólio" caem aqui. Esse sub se beneficia de tasks com peso alto (3–5 estrelas) — não conta hora corrida.$body$,
    $body$Career isn't the ladder you're climbing — it's the direction you're becoming. Job title is the snapshot of the month. Career is the vector: what kind of problem do you want to be good at solving ten years from now, and does today's work move toward that or away from it?

## What this covers

Focused time on deep work (not reactive meetings), building real network (not LinkedIn), pivoting skills toward your vector, reading/writing/speaking about what you do, keeping a public portfolio, honest conversations about next steps. Hours spent firefighting don't count.

## Why it matters

Most adults spend half their waking hours working. If the vector is wrong, you get good at something you don't want to be. If it's right, ten years compound into rare capability. The difference between the two is almost invisible short term and enormous long term.

## Signs you're on track

- You can describe in one sentence where you're heading professionally.
- You do 1+ "building" project per quarter, not just "maintenance".
- You have 3 people you can talk to about next steps without performing.

## How the app tracks it

Career is a sub of Wealth. Tasks for "90 min deep work", "study [professional skill]", or "update portfolio" land here. This sub rewards high-weight tasks (3–5 stars) — rushed hours don't count.$body$
  )
  returning id
)
insert into public.learning_material_sub (material_id, sub_id)
select id, 'career' from m;

-- ─── 9. CIRCLE (bonds) ────────────────────────────────────────────────────
with m as (
  insert into public.learning_material (
    slug, type, dimension_id, topic, reading_minutes,
    title_pt, title_en,
    summary_pt, summary_en,
    body_pt, body_en
  ) values (
    'glossary-circle', 'explainer', 'bonds', 'circle', 3,
    'Amigos e Família — a infraestrutura silenciosa',
    'Friends & Family — the silent infrastructure',
    'A variável que melhor prediz se sua vida adulta será boa.',
    'The single variable that best predicts whether adult life feels good.',
    $body$Vínculos próximos — família, amigos, comunidade — são a infraestrutura silenciosa de quase tudo o que dá certo na vida. Eles não aparecem nos KPI, não viram resultado mensurável, e por isso são os primeiros a serem sacrificados quando a vida aperta. Mas o estudo de Harvard sobre desenvolvimento adulto, com 85 anos de dados, é claro: relacionamentos próximos são a variável que melhor prediz se sua vida adulta será boa.

## O que entra aqui

Tempo presente com família. Manter amizades vivas (não só "lembrar de existir") — ligar sem pretexto, marcar encontro, mandar mensagem que não é resposta a nada. Participar de comunidade real (grupo, time, igreja, projeto). Estar presente quando outros precisam, sem cobrar volta.

## Por que importa tanto

Solidão crônica tem efeito de saúde comparável a fumar 15 cigarros por dia. Mas o oposto também é verdade: ter 3–5 pessoas com quem você se vê regularmente, e que sabem o que está acontecendo na sua vida, é um seguro de saúde mental que dinheiro nenhum compra. O capital social demora a construir e quebra rápido se negligenciado.

## Sinais de que está bem

- Você sabe quem ligar às 23h num dia ruim.
- Vê 2+ pessoas próximas por semana, sem combinar com semanas de antecedência.
- Mantém contato com 1+ pessoa "antiga" que conhece sua história.

## Como o app acompanha

Amigos e Família é uma sub de Vínculos. Tasks de "ligar pra alguém", "marcar encontro", "presença em evento" contribuem aqui. Esse sub é onde o app pode te lembrar — porque os outros são auto-evidentes (se você não comeu, sente fome), mas amizade não cobra. Você que tem que ir.$body$,
    $body$Close bonds — family, friends, community — are the silent infrastructure under almost everything that goes right in life. They don't show up in KPIs, don't turn into a measurable outcome, and that's why they're the first to be sacrificed when life gets tight. But the Harvard adult development study, with 85 years of data, is clear: close relationships are the single variable that best predicts whether adult life feels good.

## What this covers

Present time with family. Keeping friendships alive (not just "remembering they exist") — calling without pretext, scheduling, sending a message that isn't a reply to anything. Participating in real community (group, team, church, project). Being there when others need it, without keeping score.

## Why it matters

Chronic loneliness has a health effect comparable to smoking 15 cigarettes a day. But the reverse is true too: having 3–5 people you see regularly, who know what's happening in your life, is a mental-health insurance no money can buy. Social capital is slow to build and fast to lose when neglected.

## Signs you're on track

- You know who to call at 11pm on a bad day.
- You see 2+ close people per week, without booking weeks ahead.
- You stay in touch with 1+ "old" person who knows your story.

## How the app tracks it

Friends & Family is a sub of Bonds. Tasks for "call someone", "schedule a meetup", or "show up to an event" all count. This is the sub where the app can remind you — because the others are self-evident (skip food and you feel hunger), but friendship doesn't bill you. You have to go.$body$
  )
  returning id
)
insert into public.learning_material_sub (material_id, sub_id)
select id, 'circle' from m;

-- ─── 10. ROMANCE (bonds) ──────────────────────────────────────────────────
with m as (
  insert into public.learning_material (
    slug, type, dimension_id, topic, reading_minutes,
    title_pt, title_en,
    summary_pt, summary_en,
    body_pt, body_en
  ) values (
    'glossary-romance', 'explainer', 'bonds', 'romance', 3,
    'Romance — atenção mais que paixão',
    'Romance — attention over passion',
    'O que mantém uma parceria viva não é química — é tempo e olhar.',
    'What keeps a relationship alive isn''t chemistry — it''s time and attention.',
    $body$Romance, dentro de uma parceria estável, não é o que filme romântico mostra. É menos sobre paixão e mais sobre atenção sustentada. O que mantém uma relação viva ao longo de anos não é química — é dois adultos decidindo, repetidamente, olhar um pro outro de verdade, mesmo quando seria mais fácil olhar pro celular.

## O que entra aqui

Tempo sem distração com o parceiro (phones away). Conversas que vão além de logística do dia. Encontros ritualizados (date, viagem, ritual semanal). Gestos pequenos e regulares — o "obrigado" recebido com olho no olho vale mais que presente caro. Manutenção de intimidade física como prática, não milagre.

## Por que importa tanto

Pesquisa sobre casais (Gottman et al.) mostra que o que prediz longevidade de relacionamento não é falta de briga — é o "ratio" entre interações positivas e negativas (5:1 é o número clássico). Casais bem-sucedidos não brigam menos; eles se reconectam mais. E reconexão exige tempo deliberadamente reservado, não tempo "que sobrar".

## Sinais de que está bem

- Vocês têm 1+ ritual semanal só de vocês dois.
- Conseguem conversar 20 min sem mencionar logística (filho, conta, casa).
- O parceiro sabe o que está te angustiando agora, sem precisar perguntar.

## Como o app acompanha

Romance é uma sub de Vínculos, par com Amigos e Família. Tasks de "date night", "20 min de conversa real", "fim de semana sem tela" contribuem. Esse sub é especialmente sensível a regularidade — semanal funciona, mensal já não.$body$,
    $body$Romance, inside a stable partnership, isn't what romance movies show. It's less about passion and more about sustained attention. What keeps a relationship alive over years isn't chemistry — it's two adults deciding, repeatedly, to really look at each other, even when it would be easier to look at a phone.

## What this covers

Distraction-free time with your partner (phones away). Conversations that go beyond daily logistics. Ritualized time (date, trip, weekly ritual). Small, regular gestures — a "thank you" received eye-to-eye is worth more than an expensive gift. Maintaining physical intimacy as practice, not as miracle.

## Why it matters

Relationship research (Gottman et al.) shows what predicts longevity isn't lack of fighting — it's the "ratio" between positive and negative interactions (the classic 5:1). Successful couples don't fight less; they reconnect more. And reconnection requires deliberately reserved time, not "leftover" time.

## Signs you're on track

- You have 1+ weekly ritual that's just the two of you.
- You can talk for 20 min without mentioning logistics (kids, bills, house).
- Your partner knows what's troubling you right now, without having to ask.

## How the app tracks it

Romance is a sub of Bonds, paired with Friends & Family. Tasks for "date night", "20 min real conversation", or "screen-free weekend" all count. This sub is especially sensitive to regularity — weekly works, monthly doesn't.$body$
  )
  returning id
)
insert into public.learning_material_sub (material_id, sub_id)
select id, 'romance' from m;

-- ─── 11. PLAY (craft) ─────────────────────────────────────────────────────
with m as (
  insert into public.learning_material (
    slug, type, dimension_id, topic, reading_minutes,
    title_pt, title_en,
    summary_pt, summary_en,
    body_pt, body_en
  ) values (
    'glossary-play', 'explainer', 'craft', 'play', 2,
    'Lazer — o que você faz sem precisar',
    'Play — what you do for no reason',
    'A coisa mais subestimada da vida adulta: hobby sem virar produto.',
    'The most underrated thing in adult life: a hobby that doesn''t become a product.',
    $body$Lazer é o que você faz porque sim. Não pra ficar bom, não pra postar, não pra virar renda secundária — só porque você gosta. A vida adulta tem uma tendência cruel de transformar todo hobby em "side hustle" ou em métrica. Resgatar o direito ao lazer puro é um ato de saúde mental.

## O que entra aqui

Jogo (videogame, board game, RPG de mesa). Esporte recreativo sem objetivo de performance. Hobby manual (cozinha por prazer, jardim, marcenaria leve). Instrumento sem meta de show. Leitura/filme de gênero que ninguém respeita. Caminhada sem destino. Tudo que tem como único KPI "foi gostoso".

## Por que importa tanto

O cérebro adulto, especialmente o de gente produtiva, vira viciado em propósito. Tudo precisa render. Lazer puro é o antídoto: é onde a recuperação real acontece, não a "recuperação" de checar email no sofá. Pesquisas mostram que adultos com hobby ativo têm menos burnout e maior longevidade — mas só quando o hobby não vira segunda jornada.

## Sinais de que está bem

- Você tem 1+ atividade que faz por prazer e sobre a qual ninguém precisa saber.
- Consegue passar 1h fazendo algo "improdutivo" sem culpa.
- Termina o fim de semana sentindo que descansou, não que cumpriu agenda.

## Como o app acompanha

Lazer é uma sub de Criação. Tasks de "30 min de hobby", "noite de jogo", "tarde sem agenda" contribuem aqui. Esse sub é o único onde a métrica do app pode ser meio paradoxal — você está medindo o que era pra não medir. Aceita a tensão; o lembrete vale mais que a métrica.$body$,
    $body$Play is what you do because. Not to get good, not to post, not to turn into side income — just because you like it. Adult life has a cruel tendency to turn every hobby into a "side hustle" or a metric. Reclaiming the right to pure play is an act of mental health.

## What this covers

Gaming (video, board, tabletop RPG). Recreational sport with no performance goal. Manual hobby (cooking for pleasure, garden, light woodwork). An instrument with no gig in mind. Genre reading/film no one respects. Walking with no destination. Anything whose only KPI is "that was fun".

## Why it matters

The adult brain, especially in productive people, gets addicted to purpose. Everything has to amount to something. Pure play is the antidote: it's where real recovery happens, not the "recovery" of checking email on the couch. Research shows adults with active hobbies have less burnout and longer lives — but only when the hobby doesn't become a second job.

## Signs you're on track

- You have 1+ activity you do for pleasure that nobody needs to know about.
- You can spend 1h doing something "unproductive" without guilt.
- You end the weekend feeling rested, not feeling you fulfilled an agenda.

## How the app tracks it

Play is a sub of Craft. Tasks for "30 min hobby", "game night", "afternoon with no agenda" all count. This is the one sub where the app's metric is a bit paradoxical — you're measuring what was supposed to not be measured. Accept the tension; the reminder is worth more than the metric.$body$
  )
  returning id
)
insert into public.learning_material_sub (material_id, sub_id)
select id, 'play' from m;

-- ─── 12. BUILD (craft) ────────────────────────────────────────────────────
with m as (
  insert into public.learning_material (
    slug, type, dimension_id, topic, reading_minutes,
    title_pt, title_en,
    summary_pt, summary_en,
    body_pt, body_en
  ) values (
    'glossary-build', 'explainer', 'craft', 'build', 3,
    'Construir — o que sobra de você',
    'Build — what survives you',
    'Trabalho criativo sem chefe — o tipo que vira sua marca.',
    'Creative work with no boss — the kind that becomes your mark.',
    $body$Construir é o lado ativo de Criação — o oposto de Lazer. É o impulso de fazer algo que não existia, e que sobrevive depois de você ter feito. Escrever, codar, desenhar, montar, costurar, gravar, fundar. Não importa se "rende" — importa que existe porque você existe.

## O que entra aqui

Projeto pessoal de criação (livro, código, vídeo, arte, negócio). Side project com ambição própria, não com objetivo de monetização. Construção física (móvel, casa, jardim). Documentação da própria vida (memória, foto, escrita). Qualquer coisa que produza um artefato que não existiria sem você.

## Por que importa tanto

Vida adulta sem construção vira manutenção. Você acorda, mantém o trabalho, mantém a casa, mantém a relação, mantém o corpo — tudo ótimo, e tudo zero. Construir é onde você deixa marca: um livro escrito, um filho criado, uma empresa feita, um móvel que dura, uma rede de gente que você ajudou a chegar onde está. É o legado em formato pequeno, antes do legado em formato grande.

## Sinais de que está bem

- Você tem 1+ projeto pessoal que toca de forma irregular há meses.
- Pode apontar 1 coisa que existe no mundo só porque você fez existir.
- O "shipou" supera o "começou" — você termina coisas, mesmo pequenas.

## Como o app acompanha

Construir é uma sub de Criação, par com Lazer. Tasks de "1h em side project", "shipar algo", "publicar versão" contribuem aqui. Esse sub se beneficia de tasks de alto peso (4–5 estrelas) porque construção exige tempo concentrado, não 15 min entre reuniões.$body$,
    $body$Building is the active side of Craft — the opposite of Play. It's the impulse to make something that didn't exist, and that outlives the making. Writing, coding, drawing, assembling, sewing, recording, founding. It doesn't matter whether it "amounts to" anything — it matters that it exists because you exist.

## What this covers

Personal creation project (book, code, video, art, business). Side project with its own ambition, not aimed at monetization. Physical construction (furniture, house, garden). Documentation of your own life (memoir, photo, writing). Anything that produces an artifact that wouldn't exist without you.

## Why it matters

Adult life without building becomes maintenance. You wake up, maintain the job, maintain the house, maintain the relationship, maintain the body — all great, and all zero. Building is where you leave a mark: a book written, a kid raised, a company built, a piece of furniture that lasts, a network of people you helped get where they are. It's legacy in small format, before legacy in big format.

## Signs you're on track

- You have 1+ personal project you touch irregularly over months.
- You can point at 1 thing that exists in the world only because you made it exist.
- "Shipped" outpaces "started" — you finish things, even small ones.

## How the app tracks it

Build is a sub of Craft, paired with Play. Tasks for "1h on side project", "ship something", or "publish a version" all count. This sub rewards high-weight tasks (4–5 stars) because building requires concentrated time, not 15 min between meetings.$body$
  )
  returning id
)
insert into public.learning_material_sub (material_id, sub_id)
select id, 'build' from m;

commit;
