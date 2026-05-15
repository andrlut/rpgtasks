-- ============================================================================
-- Learning: pull "Signs you're on track" and "How the app tracks it" out
-- of the markdown body into structured columns.
--
-- Both sections repeat in every glossary explainer with identical headings.
-- Replacing them with iconed visual blocks on the detail screen kills
-- repetition and turns recurring content into a dopaminergic recognizable
-- pattern.
--
-- After this migration, the body of each glossary material ends at the
-- "Why it matters" / "Por que importa tanto" section. The two stripped
-- sections live in dedicated columns:
--   signs_pt[]   / signs_en[]    — 3 bullet array
--   tracking_pt  / tracking_en   — single paragraph (text)
-- ============================================================================

begin;

-- ─── 1. Columns ──────────────────────────────────────────────────────────

alter table public.learning_material
  add column signs_pt text[] not null default array[]::text[],
  add column signs_en text[] not null default array[]::text[],
  add column tracking_pt text,
  add column tracking_en text;

alter table public.learning_material
  add constraint learning_material_signs_pt_len
    check (array_length(signs_pt, 1) is null or array_length(signs_pt, 1) <= 8),
  add constraint learning_material_signs_en_len
    check (array_length(signs_en, 1) is null or array_length(signs_en, 1) <= 8);

-- ─── 2. Seed per-row signs + tracking ─────────────────────────────────────

-- SLEEP
update public.learning_material set
  signs_pt = array[
    'Acordar antes do despertador, sem se sentir esmagado.',
    'Focar por blocos longos no início do dia.',
    'Não precisar de cafeína pra existir.'
  ],
  signs_en = array[
    'Waking before your alarm without feeling crushed.',
    'Focusing in long blocks early in the day.',
    'Not needing caffeine just to function.'
  ],
  tracking_pt = 'Sono é uma sub de Saúde. Suas tasks de "dormir cedo", "evitar tela depois de X" ou "8h cheias" contribuem aqui. Cair na pontuação aqui costuma puxar tudo o resto pra baixo em algumas semanas — vale acompanhar.',
  tracking_en = 'Sleep is a sub of Health. Your tasks for "sleep early", "no screens after X", or "full 8h" contribute here. Score drops in this sub tend to drag everything else down within a few weeks — worth watching.'
where slug = 'glossary-sleep';

-- NUTRITION
update public.learning_material set
  signs_pt = array[
    'Energia razoavelmente constante ao longo do dia.',
    'Conseguir esperar 4–5h entre refeições sem desmoronar.',
    'Pele, intestino e humor estáveis.'
  ],
  signs_en = array[
    'Reasonably stable energy through the day.',
    'Going 4–5h between meals without falling apart.',
    'Skin, gut, and mood stay even.'
  ],
  tracking_pt = 'Nutrição é uma sub de Saúde. Tasks de "tomar água", "comer uma fruta", "evitar ultraprocessados" ou "cozinhar em casa" todas contribuem. Esse sub é dos que mais se beneficia de consistência: um dia bom não muda nada, três meses bons mudam quase tudo.',
  tracking_en = 'Nutrition is a sub of Health. Tasks for "drink water", "eat a piece of fruit", "no ultra-processed", or "cook at home" all contribute. This sub rewards consistency above all: one good day changes nothing, three good months change almost everything.'
where slug = 'glossary-nutrition';

-- STRENGTH
update public.learning_material set
  signs_pt = array[
    'Subir escada sem pensar nela.',
    'Aguentar 30+ min de esforço contínuo.',
    'Acordar no dia seguinte sem dor anormal.'
  ],
  signs_en = array[
    'Climbing stairs without thinking about it.',
    'Holding 30+ min of continuous effort.',
    'Waking up the next day without abnormal pain.'
  ],
  tracking_pt = 'Força é uma sub de Corpo. Tasks de "20 push-ups", "30 min de cardio" ou "treino na academia" caem aqui. Skills do catálogo (push-ups, corrida) usam percentis populacionais — você vê não só "quanto melhorou" mas "onde está em relação aos adultos no geral".',
  tracking_en = 'Strength is a sub of Body. Tasks for "20 push-ups", "30 min cardio", or "gym session" land here. Catalog skills (push-ups, running) use population percentiles — you see not just "how much you improved" but "where you stand against adults overall".'
where slug = 'glossary-strength';

-- DEXTERITY
update public.learning_material set
  signs_pt = array[
    'Conseguir agachar até embaixo com calcanhar no chão.',
    'Pegar objeto no chão sem hesitar.',
    'Tocar os pés (ou perto) sem dor.'
  ],
  signs_en = array[
    'Squatting all the way down with heels on the floor.',
    'Picking something off the ground without hesitating.',
    'Touching your toes (or close) without pain.'
  ],
  tracking_pt = 'Destreza é uma sub de Corpo, par com Força. Tasks de "10 min de mobilidade", "alongamento pós-treino" ou "aula de ioga" contribuem aqui. Esse sub é dos que rendem mais com pouco — 10 min diários valem mais que 1h por mês.',
  tracking_en = 'Dexterity is a sub of Body, paired with Strength. Tasks for "10 min mobility", "post-workout stretch", or "yoga class" all contribute. This sub returns a lot for little — 10 min daily beats 1h per month.'
where slug = 'glossary-dexterity';

-- LEARN
update public.learning_material set
  signs_pt = array[
    'Estar no meio de algum livro/curso/projeto que te exige.',
    'Conseguir explicar com clareza algo que aprendeu recentemente.',
    'Ter mudado de ideia sobre algo importante no último ano.'
  ],
  signs_en = array[
    $$You're currently mid-book / mid-course / mid-project that stretches you.$$,
    'You can clearly explain something you learned recently.',
    $$You've changed your mind about something important in the last year.$$
  ],
  tracking_pt = 'Aprender é uma sub de Mente. Tasks de "ler 20 min", "1 episódio de curso" ou "praticar idioma" contribuem aqui. Skills do tipo "páginas lidas em uma sessão" medem a faceta de foco concentrado. Esse sub é onde o uso compõe no longuíssimo prazo.',
  tracking_en = 'Learn is a sub of Mind. Tasks for "read 20 min", "one course episode", or "language practice" land here. Skills like "pages in one session" measure the focused-attention side. This sub compounds over the very long term.'
where slug = 'glossary-learn';

-- CONTEMPLATE
update public.learning_material set
  signs_pt = array[
    'Conseguir ficar 5 minutos parado sem pegar o celular.',
    'Notar emoção antes de reagir a ela.',
    'Sentir que o dia teve algumas pausas, não foi só corrida.'
  ],
  signs_en = array[
    'You can sit still for 5 minutes without grabbing your phone.',
    'You notice an emotion before reacting to it.',
    'The day had a few pauses, not just sprinting.'
  ],
  tracking_pt = 'Contemplar é uma sub de Mente, par com Aprender. Tasks de "meditar 10 min", "journaling de manhã" ou "caminhar sem fone" contribuem aqui. A skill "meditação mais longa" cresce com prática consistente. Esse sub não premia esforço bruto — premia regularidade.',
  tracking_en = $$Contemplate is a sub of Mind, paired with Learn. Tasks for "meditate 10 min", "morning journaling", or "walk without earbuds" all contribute. The "longest meditation" skill grows with consistent practice. This sub doesn't reward brute effort — it rewards regularity.$$
where slug = 'glossary-contemplate';

-- MONEY
update public.learning_material set
  signs_pt = array[
    'Você sabe, com erro de 10%, quanto gastou no último mês.',
    'Tem reserva pra 3+ meses sem renda.',
    'Decisões de compra grande não te tiram o sono.'
  ],
  signs_en = array[
    'You know, within 10%, what you spent last month.',
    'You have a reserve for 3+ months without income.',
    $$Big purchase decisions don't cost you sleep.$$
  ],
  tracking_pt = 'Dinheiro é uma sub de Riqueza. Tasks de "registrar despesas do dia", "revisar orçamento" ou "transferir pra reserva" caem aqui. Esse sub não vira maratona — vira hábito leve e contínuo. Vinte minutos por semana de atenção bem dirigida muda mais que duas horas trimestrais de pânico.',
  tracking_en = $$Money is a sub of Wealth. Tasks for "log today's expenses", "review budget", or "transfer to savings" land here. This sub doesn't reward marathons — it rewards light, continuous habit. Twenty well-directed minutes a week change more than two quarterly hours of panic.$$
where slug = 'glossary-money';

-- CAREER
update public.learning_material set
  signs_pt = array[
    'Sabe descrever em uma frase pra onde está indo profissionalmente.',
    'Faz 1+ projeto de "construção" por trimestre, não só "manutenção".',
    'Tem 3 pessoas com quem pode conversar sobre próximos passos sem performar.'
  ],
  signs_en = array[
    $$You can describe in one sentence where you're heading professionally.$$,
    'You do 1+ "building" project per quarter, not just "maintenance".',
    'You have 3 people you can talk to about next steps without performing.'
  ],
  tracking_pt = 'Carreira é uma sub de Riqueza. Tasks de "90 min de deep work", "estudar [skill profissional]" ou "atualizar portfólio" caem aqui. Esse sub se beneficia de tasks com peso alto (3–5 estrelas) — não conta hora corrida.',
  tracking_en = $$Career is a sub of Wealth. Tasks for "90 min deep work", "study [professional skill]", or "update portfolio" land here. This sub rewards high-weight tasks (3–5 stars) — rushed hours don't count.$$
where slug = 'glossary-career';

-- CIRCLE
update public.learning_material set
  signs_pt = array[
    'Você sabe quem ligar às 23h num dia ruim.',
    'Vê 2+ pessoas próximas por semana, sem combinar com semanas de antecedência.',
    'Mantém contato com 1+ pessoa "antiga" que conhece sua história.'
  ],
  signs_en = array[
    'You know who to call at 11pm on a bad day.',
    'You see 2+ close people per week, without booking weeks ahead.',
    'You stay in touch with 1+ "old" person who knows your story.'
  ],
  tracking_pt = 'Amigos e Família é uma sub de Vínculos. Tasks de "ligar pra alguém", "marcar encontro", "presença em evento" contribuem aqui. Esse sub é onde o app pode te lembrar — porque os outros são auto-evidentes (se você não comeu, sente fome), mas amizade não cobra. Você que tem que ir.',
  tracking_en = $$Friends & Family is a sub of Bonds. Tasks for "call someone", "schedule a meetup", or "show up to an event" all count. This is the sub where the app can remind you — because the others are self-evident (skip food and you feel hunger), but friendship doesn't bill you. You have to go.$$
where slug = 'glossary-circle';

-- ROMANCE
update public.learning_material set
  signs_pt = array[
    'Vocês têm 1+ ritual semanal só de vocês dois.',
    'Conseguem conversar 20 min sem mencionar logística (filho, conta, casa).',
    'O parceiro sabe o que está te angustiando agora, sem precisar perguntar.'
  ],
  signs_en = array[
    $$You have 1+ weekly ritual that's just the two of you.$$,
    'You can talk for 20 min without mentioning logistics (kids, bills, house).',
    'Your partner knows what is troubling you right now, without having to ask.'
  ],
  tracking_pt = 'Romance é uma sub de Vínculos, par com Amigos e Família. Tasks de "date night", "20 min de conversa real", "fim de semana sem tela" contribuem. Esse sub é especialmente sensível a regularidade — semanal funciona, mensal já não.',
  tracking_en = $$Romance is a sub of Bonds, paired with Friends & Family. Tasks for "date night", "20 min real conversation", or "screen-free weekend" all count. This sub is especially sensitive to regularity — weekly works, monthly doesn't.$$
where slug = 'glossary-romance';

-- PLAY
update public.learning_material set
  signs_pt = array[
    'Você tem 1+ atividade que faz por prazer e sobre a qual ninguém precisa saber.',
    'Consegue passar 1h fazendo algo "improdutivo" sem culpa.',
    'Termina o fim de semana sentindo que descansou, não que cumpriu agenda.'
  ],
  signs_en = array[
    'You have 1+ activity you do for pleasure that nobody needs to know about.',
    'You can spend 1h doing something "unproductive" without guilt.',
    'You end the weekend feeling rested, not feeling you fulfilled an agenda.'
  ],
  tracking_pt = 'Lazer é uma sub de Criação. Tasks de "30 min de hobby", "noite de jogo", "tarde sem agenda" contribuem aqui. Esse sub é o único onde a métrica do app pode ser meio paradoxal — você está medindo o que era pra não medir. Aceita a tensão; o lembrete vale mais que a métrica.',
  tracking_en = $$Play is a sub of Craft. Tasks for "30 min hobby", "game night", "afternoon with no agenda" all count. This is the one sub where the app's metric is a bit paradoxical — you're measuring what was supposed to not be measured. Accept the tension; the reminder is worth more than the metric.$$
where slug = 'glossary-play';

-- BUILD
update public.learning_material set
  signs_pt = array[
    'Você tem 1+ projeto pessoal que toca de forma irregular há meses.',
    'Pode apontar 1 coisa que existe no mundo só porque você fez existir.',
    'O "shipou" supera o "começou" — você termina coisas, mesmo pequenas.'
  ],
  signs_en = array[
    'You have 1+ personal project you touch irregularly over months.',
    'You can point at 1 thing that exists in the world only because you made it exist.',
    '"Shipped" outpaces "started" — you finish things, even small ones.'
  ],
  tracking_pt = 'Construir é uma sub de Criação, par com Lazer. Tasks de "1h em side project", "shipar algo", "publicar versão" contribuem aqui. Esse sub se beneficia de tasks de alto peso (4–5 estrelas) porque construção exige tempo concentrado, não 15 min entre reuniões.',
  tracking_en = 'Build is a sub of Craft, paired with Play. Tasks for "1h on side project", "ship something", or "publish a version" all count. This sub rewards high-weight tasks (4–5 stars) because building requires concentrated time, not 15 min between meetings.'
where slug = 'glossary-build';

-- ─── 3. Strip the now-duplicated sections from the body ───────────────────
-- Cut everything from the "Signs / Sinais" heading onward. Both that
-- section and the "How the app tracks it / Como o app acompanha" section
-- live in dedicated columns now. Uses position()-based truncation so we
-- don't have to fight Postgres regex flag semantics.

update public.learning_material set
  body_pt = case
    when position('## Sinais' in body_pt) > 0
    then rtrim(substr(body_pt, 1, position('## Sinais' in body_pt) - 1))
    else body_pt
  end,
  body_en = case
    when position('## Signs' in body_en) > 0
    then rtrim(substr(body_en, 1, position('## Signs' in body_en) - 1))
    else body_en
  end
where slug like 'glossary-%';

commit;
