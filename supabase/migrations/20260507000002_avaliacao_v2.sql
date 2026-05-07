-- ============================================================================
-- Avaliação v2 — Phase 1 of the psych instruments roadmap
--
-- Catalog seed for the second-generation Avaliação:
--   - 12 subs × 4 facets per sub (Comportamento, Qualidade, Resultado, Atrito)
--   - 96 items total (2 alternates per facet, sampled 1-of-2 at session start)
--   - 12 parent facets (one per sub) acting as roll-up containers
--   - decimal scoring (mean × 5 in [0,5]) on both leaf and parent facets
--
-- Also:
--   - extends psych_seed_session_items with an avaliacao_v2 sampling branch
--   - extends _psych_score_session so wellbeing scoring rolls up from the 4
--     leaf facets into the parent (sub) facet, not just the leaves
--   - extends character_sub_score with a nullable score_decimal column so the
--     UI can render `Sleep 3.8 / 5` precision without losing the legacy
--     integer pathway used by hex/sparklines today
--
-- Reference: docs/psych-instruments-v1.md §5.1.
-- ============================================================================

begin;

-- ─── 1. Decimal column on character_sub_score ─────────────────────────────
-- Nullable so existing rows + the 'self' source (integer 0-5 ratings) keep
-- working untouched. The questionnaire bridge in submit_psych_session writes
-- both columns; the UI reads decimal where available, integer otherwise.

alter table public.character_sub_score
  add column score_decimal numeric(5, 2);

-- ─── 2. Instrument seed ────────────────────────────────────────────────────

insert into public.psych_instrument
  (id, name, description, category, version,
   item_count, scale_min, scale_max, scoring_doc_url)
values
  ('avaliacao_v2',
   'Avaliação 48',
   '12 subs × 4 facetas (Comportamento, Qualidade, Resultado, Atrito). ' ||
   'Pool de 96 itens, servidos 48 por session. Janela de estado, ' ||
   'refeita a cada 30-90 dias.',
   'wellbeing', '2.0', 48, 1, 5,
   'docs/psych-instruments-v1.md#51-avaliação-v2');

-- ─── 3. Parent facets (12, one per sub) ────────────────────────────────────
-- slug == sub_id so the wellbeing bridge (slug → character_sub_score.sub_id)
-- continues to map identically.

insert into public.psych_facet
  (id, instrument_id, slug, name, position)
values
  ('avaliacao_v2:sub:sleep',       'avaliacao_v2', 'sleep',       'Sono',          10),
  ('avaliacao_v2:sub:nutrition',   'avaliacao_v2', 'nutrition',   'Nutrição',      20),
  ('avaliacao_v2:sub:strength',    'avaliacao_v2', 'strength',    'Força',         30),
  ('avaliacao_v2:sub:dexterity',   'avaliacao_v2', 'dexterity',   'Destreza',      40),
  ('avaliacao_v2:sub:learn',       'avaliacao_v2', 'learn',       'Aprender',      50),
  ('avaliacao_v2:sub:contemplate', 'avaliacao_v2', 'contemplate', 'Contemplar',    60),
  ('avaliacao_v2:sub:money',       'avaliacao_v2', 'money',       'Dinheiro',      70),
  ('avaliacao_v2:sub:career',      'avaliacao_v2', 'career',      'Carreira',      80),
  ('avaliacao_v2:sub:circle',      'avaliacao_v2', 'circle',      'Círculo',       90),
  ('avaliacao_v2:sub:romance',     'avaliacao_v2', 'romance',     'Romance',      100),
  ('avaliacao_v2:sub:play',        'avaliacao_v2', 'play',        'Brincar',      110),
  ('avaliacao_v2:sub:build',       'avaliacao_v2', 'build',       'Construir',    120);

-- ─── 4. Leaf facets (48, 4 per sub) ────────────────────────────────────────
-- Conventions:
--   - facet position: parent_pos + offset (1=Comportamento, 2=Qualidade,
--     3=Resultado, 4=Atrito).
--   - slug: short keyword, used for any future per-facet UI labelling.

insert into public.psych_facet
  (id, instrument_id, parent_facet_id, slug, name, position)
values
  -- Sleep
  ('avaliacao_v2:sub:sleep:behavior',    'avaliacao_v2', 'avaliacao_v2:sub:sleep',       'behavior',    'Comportamento', 11),
  ('avaliacao_v2:sub:sleep:quality',     'avaliacao_v2', 'avaliacao_v2:sub:sleep',       'quality',     'Qualidade',     12),
  ('avaliacao_v2:sub:sleep:result',      'avaliacao_v2', 'avaliacao_v2:sub:sleep',       'result',      'Resultado',     13),
  ('avaliacao_v2:sub:sleep:friction',    'avaliacao_v2', 'avaliacao_v2:sub:sleep',       'friction',    'Atrito',        14),
  -- Nutrition
  ('avaliacao_v2:sub:nutrition:behavior',    'avaliacao_v2', 'avaliacao_v2:sub:nutrition',   'behavior',    'Comportamento', 21),
  ('avaliacao_v2:sub:nutrition:quality',     'avaliacao_v2', 'avaliacao_v2:sub:nutrition',   'quality',     'Qualidade',     22),
  ('avaliacao_v2:sub:nutrition:result',      'avaliacao_v2', 'avaliacao_v2:sub:nutrition',   'result',      'Resultado',     23),
  ('avaliacao_v2:sub:nutrition:friction',    'avaliacao_v2', 'avaliacao_v2:sub:nutrition',   'friction',    'Atrito',        24),
  -- Strength
  ('avaliacao_v2:sub:strength:behavior',    'avaliacao_v2', 'avaliacao_v2:sub:strength',    'behavior',    'Comportamento', 31),
  ('avaliacao_v2:sub:strength:quality',     'avaliacao_v2', 'avaliacao_v2:sub:strength',    'quality',     'Qualidade',     32),
  ('avaliacao_v2:sub:strength:result',      'avaliacao_v2', 'avaliacao_v2:sub:strength',    'result',      'Resultado',     33),
  ('avaliacao_v2:sub:strength:friction',    'avaliacao_v2', 'avaliacao_v2:sub:strength',    'friction',    'Atrito',        34),
  -- Dexterity
  ('avaliacao_v2:sub:dexterity:behavior',    'avaliacao_v2', 'avaliacao_v2:sub:dexterity',   'behavior',    'Comportamento', 41),
  ('avaliacao_v2:sub:dexterity:quality',     'avaliacao_v2', 'avaliacao_v2:sub:dexterity',   'quality',     'Qualidade',     42),
  ('avaliacao_v2:sub:dexterity:result',      'avaliacao_v2', 'avaliacao_v2:sub:dexterity',   'result',      'Resultado',     43),
  ('avaliacao_v2:sub:dexterity:friction',    'avaliacao_v2', 'avaliacao_v2:sub:dexterity',   'friction',    'Atrito',        44),
  -- Learn
  ('avaliacao_v2:sub:learn:behavior',    'avaliacao_v2', 'avaliacao_v2:sub:learn',       'behavior',    'Comportamento', 51),
  ('avaliacao_v2:sub:learn:quality',     'avaliacao_v2', 'avaliacao_v2:sub:learn',       'quality',     'Qualidade',     52),
  ('avaliacao_v2:sub:learn:result',      'avaliacao_v2', 'avaliacao_v2:sub:learn',       'result',      'Resultado',     53),
  ('avaliacao_v2:sub:learn:friction',    'avaliacao_v2', 'avaliacao_v2:sub:learn',       'friction',    'Atrito',        54),
  -- Contemplate
  ('avaliacao_v2:sub:contemplate:behavior',    'avaliacao_v2', 'avaliacao_v2:sub:contemplate', 'behavior',    'Comportamento', 61),
  ('avaliacao_v2:sub:contemplate:quality',     'avaliacao_v2', 'avaliacao_v2:sub:contemplate', 'quality',     'Qualidade',     62),
  ('avaliacao_v2:sub:contemplate:result',      'avaliacao_v2', 'avaliacao_v2:sub:contemplate', 'result',      'Resultado',     63),
  ('avaliacao_v2:sub:contemplate:friction',    'avaliacao_v2', 'avaliacao_v2:sub:contemplate', 'friction',    'Atrito',        64),
  -- Money
  ('avaliacao_v2:sub:money:behavior',    'avaliacao_v2', 'avaliacao_v2:sub:money',       'behavior',    'Comportamento', 71),
  ('avaliacao_v2:sub:money:quality',     'avaliacao_v2', 'avaliacao_v2:sub:money',       'quality',     'Qualidade',     72),
  ('avaliacao_v2:sub:money:result',      'avaliacao_v2', 'avaliacao_v2:sub:money',       'result',      'Resultado',     73),
  ('avaliacao_v2:sub:money:friction',    'avaliacao_v2', 'avaliacao_v2:sub:money',       'friction',    'Atrito',        74),
  -- Career
  ('avaliacao_v2:sub:career:behavior',    'avaliacao_v2', 'avaliacao_v2:sub:career',      'behavior',    'Comportamento', 81),
  ('avaliacao_v2:sub:career:quality',     'avaliacao_v2', 'avaliacao_v2:sub:career',      'quality',     'Qualidade',     82),
  ('avaliacao_v2:sub:career:result',      'avaliacao_v2', 'avaliacao_v2:sub:career',      'result',      'Resultado',     83),
  ('avaliacao_v2:sub:career:friction',    'avaliacao_v2', 'avaliacao_v2:sub:career',      'friction',    'Atrito',        84),
  -- Circle
  ('avaliacao_v2:sub:circle:behavior',    'avaliacao_v2', 'avaliacao_v2:sub:circle',      'behavior',    'Comportamento', 91),
  ('avaliacao_v2:sub:circle:quality',     'avaliacao_v2', 'avaliacao_v2:sub:circle',      'quality',     'Qualidade',     92),
  ('avaliacao_v2:sub:circle:result',      'avaliacao_v2', 'avaliacao_v2:sub:circle',      'result',      'Resultado',     93),
  ('avaliacao_v2:sub:circle:friction',    'avaliacao_v2', 'avaliacao_v2:sub:circle',      'friction',    'Atrito',        94),
  -- Romance
  ('avaliacao_v2:sub:romance:behavior',    'avaliacao_v2', 'avaliacao_v2:sub:romance',     'behavior',    'Comportamento', 101),
  ('avaliacao_v2:sub:romance:quality',     'avaliacao_v2', 'avaliacao_v2:sub:romance',     'quality',     'Qualidade',     102),
  ('avaliacao_v2:sub:romance:result',      'avaliacao_v2', 'avaliacao_v2:sub:romance',     'result',      'Resultado',     103),
  ('avaliacao_v2:sub:romance:friction',    'avaliacao_v2', 'avaliacao_v2:sub:romance',     'friction',    'Atrito',        104),
  -- Play
  ('avaliacao_v2:sub:play:behavior',    'avaliacao_v2', 'avaliacao_v2:sub:play',        'behavior',    'Comportamento', 111),
  ('avaliacao_v2:sub:play:quality',     'avaliacao_v2', 'avaliacao_v2:sub:play',        'quality',     'Qualidade',     112),
  ('avaliacao_v2:sub:play:result',      'avaliacao_v2', 'avaliacao_v2:sub:play',        'result',      'Resultado',     113),
  ('avaliacao_v2:sub:play:friction',    'avaliacao_v2', 'avaliacao_v2:sub:play',        'friction',    'Atrito',        114),
  -- Build
  ('avaliacao_v2:sub:build:behavior',    'avaliacao_v2', 'avaliacao_v2:sub:build',       'behavior',    'Comportamento', 121),
  ('avaliacao_v2:sub:build:quality',     'avaliacao_v2', 'avaliacao_v2:sub:build',       'quality',     'Qualidade',     122),
  ('avaliacao_v2:sub:build:result',      'avaliacao_v2', 'avaliacao_v2:sub:build',       'result',      'Resultado',     123),
  ('avaliacao_v2:sub:build:friction',    'avaliacao_v2', 'avaliacao_v2:sub:build',       'friction',    'Atrito',        124);

-- ─── 5. Items (96 = 12 subs × 4 facets × 2 alternates) ─────────────────────
-- All items: scale 1-5, reverse_scored=false. Friction (atrito) prompts are
-- worded so 5 = least-friction; the option order is therefore
-- worst→best (1 = always, 5 = never), keeping the no-reverse contract.
--
-- The "alt A" of Comportamento and Resultado for each sub mirrors the v1
-- prompt verbatim (transparent migration; users can recognize the question)
-- — so historical mental models hold even if the catalog grew underneath.

insert into public.psych_item
  (id, instrument_id, facet_id, position, text_pt, reverse_scored, options_jsonb)
values
  -- ── SLEEP ───────────────────────────────────────────────────────────────
  ('v2:sleep:behavior:a', 'avaliacao_v2', 'avaliacao_v2:sub:sleep:behavior', 1,
   'Em uma semana típica, em quantas noites você dorme 7 horas ou mais?', false,
   '[{"label":"Nenhuma ou quase nenhuma","value":1},{"label":"1-2 noites","value":2},{"label":"3-4 noites","value":3},{"label":"5-6 noites","value":4},{"label":"Quase toda noite","value":5}]'::jsonb),
  ('v2:sleep:behavior:b', 'avaliacao_v2', 'avaliacao_v2:sub:sleep:behavior', 2,
   'Em uma semana típica, em quantos dias você dorme e acorda em horários consistentes (variação <30 min)?', false,
   '[{"label":"Quase nunca","value":1},{"label":"1-2 dias","value":2},{"label":"3-4 dias","value":3},{"label":"5-6 dias","value":4},{"label":"Quase todo dia","value":5}]'::jsonb),
  ('v2:sleep:quality:a', 'avaliacao_v2', 'avaliacao_v2:sub:sleep:quality', 3,
   'Seu sono é contínuo — você não acorda várias vezes no meio da noite.', false,
   '[{"label":"Quase nunca","value":1},{"label":"Raramente","value":2},{"label":"Às vezes","value":3},{"label":"Frequentemente","value":4},{"label":"Quase sempre","value":5}]'::jsonb),
  ('v2:sleep:quality:b', 'avaliacao_v2', 'avaliacao_v2:sub:sleep:quality', 4,
   'Você pega no sono em até 20 minutos depois de deitar, sem ficar rolando.', false,
   '[{"label":"Quase nunca","value":1},{"label":"Raramente","value":2},{"label":"Às vezes","value":3},{"label":"Frequentemente","value":4},{"label":"Quase sempre","value":5}]'::jsonb),
  ('v2:sleep:result:a', 'avaliacao_v2', 'avaliacao_v2:sub:sleep:result', 5,
   'Acordo descansado e sustento minha energia ao longo do dia, sem precisar de cafeína pra funcionar.', false,
   '[{"label":"Quase nunca","value":1},{"label":"Raramente","value":2},{"label":"Mais ou menos","value":3},{"label":"Maioria dos dias","value":4},{"label":"Quase todo dia","value":5}]'::jsonb),
  ('v2:sleep:result:b', 'avaliacao_v2', 'avaliacao_v2:sub:sleep:result', 6,
   'Mantenho foco e humor à tarde — não bato no muro com sonolência ou irritação.', false,
   '[{"label":"Quase nunca","value":1},{"label":"Raramente","value":2},{"label":"Mais ou menos","value":3},{"label":"Maioria dos dias","value":4},{"label":"Quase todo dia","value":5}]'::jsonb),
  ('v2:sleep:friction:a', 'avaliacao_v2', 'avaliacao_v2:sub:sleep:friction', 7,
   'Com que frequência insônia, ansiedade noturna ou ruminação atrapalham seu sono?', false,
   '[{"label":"Quase todo dia","value":1},{"label":"Frequentemente","value":2},{"label":"Às vezes","value":3},{"label":"Raramente","value":4},{"label":"Quase nunca","value":5}]'::jsonb),
  ('v2:sleep:friction:b', 'avaliacao_v2', 'avaliacao_v2:sub:sleep:friction', 8,
   'Com que frequência telas, trabalho ou rotina caótica te empurram pra dormir tarde demais?', false,
   '[{"label":"Quase todo dia","value":1},{"label":"Frequentemente","value":2},{"label":"Às vezes","value":3},{"label":"Raramente","value":4},{"label":"Quase nunca","value":5}]'::jsonb),

  -- ── NUTRITION ───────────────────────────────────────────────────────────
  ('v2:nutrition:behavior:a', 'avaliacao_v2', 'avaliacao_v2:sub:nutrition:behavior', 9,
   'Em uma semana típica, em quantos dias você faz refeições reais (sem fast food, sem pular refeição)?', false,
   '[{"label":"0-1 dias","value":1},{"label":"2 dias","value":2},{"label":"3-4 dias","value":3},{"label":"5-6 dias","value":4},{"label":"Praticamente todos","value":5}]'::jsonb),
  ('v2:nutrition:behavior:b', 'avaliacao_v2', 'avaliacao_v2:sub:nutrition:behavior', 10,
   'Em uma semana típica, em quantos dias você prepara ou escolhe sua comida com atenção (não no automático)?', false,
   '[{"label":"0-1 dias","value":1},{"label":"2 dias","value":2},{"label":"3-4 dias","value":3},{"label":"5-6 dias","value":4},{"label":"Praticamente todos","value":5}]'::jsonb),
  ('v2:nutrition:quality:a', 'avaliacao_v2', 'avaliacao_v2:sub:nutrition:quality', 11,
   'Suas refeições incluem proteína de qualidade e vegetais — não só carbo e ultra-processado.', false,
   '[{"label":"Quase nunca","value":1},{"label":"Raramente","value":2},{"label":"Mais ou menos","value":3},{"label":"Maioria das refeições","value":4},{"label":"Quase sempre","value":5}]'::jsonb),
  ('v2:nutrition:quality:b', 'avaliacao_v2', 'avaliacao_v2:sub:nutrition:quality', 12,
   'Você bebe água o suficiente pra sustentar urina clara durante o dia.', false,
   '[{"label":"Quase nunca","value":1},{"label":"Raramente","value":2},{"label":"Mais ou menos","value":3},{"label":"Maioria dos dias","value":4},{"label":"Quase sempre","value":5}]'::jsonb),
  ('v2:nutrition:result:a', 'avaliacao_v2', 'avaliacao_v2:sub:nutrition:result', 13,
   'Minha relação com comida é tranquila — sem culpa, sem obsessão, sem compulsão.', false,
   '[{"label":"Discordo totalmente","value":1},{"label":"Discordo","value":2},{"label":"Mais ou menos","value":3},{"label":"Concordo","value":4},{"label":"Concordo totalmente","value":5}]'::jsonb),
  ('v2:nutrition:result:b', 'avaliacao_v2', 'avaliacao_v2:sub:nutrition:result', 14,
   'Como me dá energia estável — não me deixa pesado, sonolento ou ansioso depois.', false,
   '[{"label":"Quase nunca","value":1},{"label":"Raramente","value":2},{"label":"Mais ou menos","value":3},{"label":"Maioria das refeições","value":4},{"label":"Quase sempre","value":5}]'::jsonb),
  ('v2:nutrition:friction:a', 'avaliacao_v2', 'avaliacao_v2:sub:nutrition:friction', 15,
   'Com que frequência você come no automático ou compulsivamente, mesmo sem fome?', false,
   '[{"label":"Quase todo dia","value":1},{"label":"Frequentemente","value":2},{"label":"Às vezes","value":3},{"label":"Raramente","value":4},{"label":"Quase nunca","value":5}]'::jsonb),
  ('v2:nutrition:friction:b', 'avaliacao_v2', 'avaliacao_v2:sub:nutrition:friction', 16,
   'Com que frequência restrição extrema, dieta agressiva ou regras rígidas dominam sua relação com comida?', false,
   '[{"label":"Quase todo dia","value":1},{"label":"Frequentemente","value":2},{"label":"Às vezes","value":3},{"label":"Raramente","value":4},{"label":"Quase nunca","value":5}]'::jsonb),

  -- ── STRENGTH ────────────────────────────────────────────────────────────
  ('v2:strength:behavior:a', 'avaliacao_v2', 'avaliacao_v2:sub:strength:behavior', 17,
   'Em uma semana típica, em quantos dias você faz atividade física que tira do sedentarismo (treino, cardio, esporte) por 20+ minutos?', false,
   '[{"label":"Nunca ou quase nunca","value":1},{"label":"1 dia","value":2},{"label":"2 dias","value":3},{"label":"3-4 dias","value":4},{"label":"5+ dias","value":5}]'::jsonb),
  ('v2:strength:behavior:b', 'avaliacao_v2', 'avaliacao_v2:sub:strength:behavior', 18,
   'Em uma semana típica, em quantos dias você faz especificamente treino de força (musculação, calistenia, kettlebell)?', false,
   '[{"label":"Nenhum","value":1},{"label":"1 dia","value":2},{"label":"2 dias","value":3},{"label":"3 dias","value":4},{"label":"4+ dias","value":5}]'::jsonb),
  ('v2:strength:quality:a', 'avaliacao_v2', 'avaliacao_v2:sub:strength:quality', 19,
   'Quando treina, você se desafia de verdade — sai da zona de conforto, não só passa o tempo.', false,
   '[{"label":"Quase nunca","value":1},{"label":"Raramente","value":2},{"label":"Às vezes","value":3},{"label":"Frequentemente","value":4},{"label":"Quase sempre","value":5}]'::jsonb),
  ('v2:strength:quality:b', 'avaliacao_v2', 'avaliacao_v2:sub:strength:quality', 20,
   'Você executa os exercícios com forma boa — não compensa nem se machuca por descuido técnico.', false,
   '[{"label":"Quase nunca","value":1},{"label":"Raramente","value":2},{"label":"Às vezes","value":3},{"label":"Frequentemente","value":4},{"label":"Quase sempre","value":5}]'::jsonb),
  ('v2:strength:result:a', 'avaliacao_v2', 'avaliacao_v2:sub:strength:result', 21,
   'Meu corpo se sente forte e capaz no dia a dia — subo escada, carrego peso, jogo um esporte sem travar.', false,
   '[{"label":"Nem um pouco","value":1},{"label":"Pouco","value":2},{"label":"Mais ou menos","value":3},{"label":"Bastante","value":4},{"label":"Totalmente","value":5}]'::jsonb),
  ('v2:strength:result:b', 'avaliacao_v2', 'avaliacao_v2:sub:strength:result', 22,
   'Sou mais forte hoje do que era 6 meses atrás — em peso, reps ou volume de algum exercício.', false,
   '[{"label":"Discordo totalmente","value":1},{"label":"Discordo","value":2},{"label":"Neutro","value":3},{"label":"Concordo","value":4},{"label":"Concordo totalmente","value":5}]'::jsonb),
  ('v2:strength:friction:a', 'avaliacao_v2', 'avaliacao_v2:sub:strength:friction', 23,
   'Com que frequência dor, lesão ou fadiga te impedem de treinar como gostaria?', false,
   '[{"label":"Quase todo dia","value":1},{"label":"Frequentemente","value":2},{"label":"Às vezes","value":3},{"label":"Raramente","value":4},{"label":"Quase nunca","value":5}]'::jsonb),
  ('v2:strength:friction:b', 'avaliacao_v2', 'avaliacao_v2:sub:strength:friction', 24,
   'Com que frequência falta de tempo, motivação ou logística (academia, equipamento) te tira do treino?', false,
   '[{"label":"Quase todo dia","value":1},{"label":"Frequentemente","value":2},{"label":"Às vezes","value":3},{"label":"Raramente","value":4},{"label":"Quase nunca","value":5}]'::jsonb),

  -- ── DEXTERITY ───────────────────────────────────────────────────────────
  ('v2:dexterity:behavior:a', 'avaliacao_v2', 'avaliacao_v2:sub:dexterity:behavior', 25,
   'Em uma semana típica, em quantos dias você dedica 10+ minutos a mobilidade, alongamento ou postura consciente?', false,
   '[{"label":"Nunca","value":1},{"label":"1 dia","value":2},{"label":"2 dias","value":3},{"label":"3-4 dias","value":4},{"label":"5+ dias","value":5}]'::jsonb),
  ('v2:dexterity:behavior:b', 'avaliacao_v2', 'avaliacao_v2:sub:dexterity:behavior', 26,
   'Em uma semana típica, em quantos dias você pratica algo que exige equilíbrio ou coordenação fina (yoga, dança, raquete, escalada)?', false,
   '[{"label":"Nenhum","value":1},{"label":"1 dia","value":2},{"label":"2 dias","value":3},{"label":"3 dias","value":4},{"label":"4+ dias","value":5}]'::jsonb),
  ('v2:dexterity:quality:a', 'avaliacao_v2', 'avaliacao_v2:sub:dexterity:quality', 27,
   'Quando alonga ou faz mobilidade, você presta atenção em respirar e em onde travou — não passa por cima.', false,
   '[{"label":"Quase nunca","value":1},{"label":"Raramente","value":2},{"label":"Às vezes","value":3},{"label":"Frequentemente","value":4},{"label":"Quase sempre","value":5}]'::jsonb),
  ('v2:dexterity:quality:b', 'avaliacao_v2', 'avaliacao_v2:sub:dexterity:quality', 28,
   'Sua amplitude de movimento é maior hoje do que era 6 meses atrás.', false,
   '[{"label":"Discordo totalmente","value":1},{"label":"Discordo","value":2},{"label":"Neutro","value":3},{"label":"Concordo","value":4},{"label":"Concordo totalmente","value":5}]'::jsonb),
  ('v2:dexterity:result:a', 'avaliacao_v2', 'avaliacao_v2:sub:dexterity:result', 29,
   'Me movo sem dor, com boa amplitude e coordenação — não trinco, não travo, não compenso.', false,
   '[{"label":"Nem um pouco","value":1},{"label":"Pouco","value":2},{"label":"Mais ou menos","value":3},{"label":"Bastante","value":4},{"label":"Totalmente","value":5}]'::jsonb),
  ('v2:dexterity:result:b', 'avaliacao_v2', 'avaliacao_v2:sub:dexterity:result', 30,
   'Tenho equilíbrio e prontidão pra reagir bem a tropeço, esporte ou movimento inesperado.', false,
   '[{"label":"Nem um pouco","value":1},{"label":"Pouco","value":2},{"label":"Mais ou menos","value":3},{"label":"Bastante","value":4},{"label":"Totalmente","value":5}]'::jsonb),
  ('v2:dexterity:friction:a', 'avaliacao_v2', 'avaliacao_v2:sub:dexterity:friction', 31,
   'Com que frequência você sente dor crônica, postura ruim ou rigidez em alguma articulação?', false,
   '[{"label":"Quase todo dia","value":1},{"label":"Frequentemente","value":2},{"label":"Às vezes","value":3},{"label":"Raramente","value":4},{"label":"Quase nunca","value":5}]'::jsonb),
  ('v2:dexterity:friction:b', 'avaliacao_v2', 'avaliacao_v2:sub:dexterity:friction', 32,
   'Com que frequência você evita movimentos ou esportes por medo de se machucar?', false,
   '[{"label":"Quase sempre","value":1},{"label":"Frequentemente","value":2},{"label":"Às vezes","value":3},{"label":"Raramente","value":4},{"label":"Quase nunca","value":5}]'::jsonb),

  -- ── LEARN ───────────────────────────────────────────────────────────────
  ('v2:learn:behavior:a', 'avaliacao_v2', 'avaliacao_v2:sub:learn:behavior', 33,
   'Em uma semana típica, em quantos dias você dedica 20+ minutos a leitura ou estudo intencional?', false,
   '[{"label":"Nunca","value":1},{"label":"1 dia","value":2},{"label":"2-3 dias","value":3},{"label":"4-5 dias","value":4},{"label":"Quase todo dia","value":5}]'::jsonb),
  ('v2:learn:behavior:b', 'avaliacao_v2', 'avaliacao_v2:sub:learn:behavior', 34,
   'Em um mês típico, quantos livros, cursos ou papers você termina/completa de fato?', false,
   '[{"label":"Nenhum","value":1},{"label":"1","value":2},{"label":"2","value":3},{"label":"3","value":4},{"label":"4 ou mais","value":5}]'::jsonb),
  ('v2:learn:quality:a', 'avaliacao_v2', 'avaliacao_v2:sub:learn:quality', 35,
   'Quando estuda, você se aprofunda — toma notas, questiona, conecta — não só consome passivo.', false,
   '[{"label":"Quase nunca","value":1},{"label":"Raramente","value":2},{"label":"Às vezes","value":3},{"label":"Frequentemente","value":4},{"label":"Quase sempre","value":5}]'::jsonb),
  ('v2:learn:quality:b', 'avaliacao_v2', 'avaliacao_v2:sub:learn:quality', 36,
   'Você escolhe o que estudar com critério — desafia seus pontos cegos, não só conforta o que já sabe.', false,
   '[{"label":"Quase nunca","value":1},{"label":"Raramente","value":2},{"label":"Às vezes","value":3},{"label":"Frequentemente","value":4},{"label":"Quase sempre","value":5}]'::jsonb),
  ('v2:learn:result:a', 'avaliacao_v2', 'avaliacao_v2:sub:learn:result', 37,
   'O que aprendo encontra uso — aplico, ensino ou conecto com algo que faço.', false,
   '[{"label":"Quase nunca","value":1},{"label":"Raramente","value":2},{"label":"Às vezes","value":3},{"label":"Frequentemente","value":4},{"label":"Quase sempre","value":5}]'::jsonb),
  ('v2:learn:result:b', 'avaliacao_v2', 'avaliacao_v2:sub:learn:result', 38,
   'Sei mais sobre algo difícil hoje do que sabia 6 meses atrás — algo concreto e medível.', false,
   '[{"label":"Discordo totalmente","value":1},{"label":"Discordo","value":2},{"label":"Neutro","value":3},{"label":"Concordo","value":4},{"label":"Concordo totalmente","value":5}]'::jsonb),
  ('v2:learn:friction:a', 'avaliacao_v2', 'avaliacao_v2:sub:learn:friction', 39,
   'Com que frequência você abandona um livro ou curso na metade sem terminar?', false,
   '[{"label":"Quase sempre","value":1},{"label":"Frequentemente","value":2},{"label":"Às vezes","value":3},{"label":"Raramente","value":4},{"label":"Quase nunca","value":5}]'::jsonb),
  ('v2:learn:friction:b', 'avaliacao_v2', 'avaliacao_v2:sub:learn:friction', 40,
   'Com que frequência distração (rede social, TV, doomscroll) toma o tempo que você queria dedicar a estudar?', false,
   '[{"label":"Quase todo dia","value":1},{"label":"Frequentemente","value":2},{"label":"Às vezes","value":3},{"label":"Raramente","value":4},{"label":"Quase nunca","value":5}]'::jsonb),

  -- ── CONTEMPLATE ─────────────────────────────────────────────────────────
  ('v2:contemplate:behavior:a', 'avaliacao_v2', 'avaliacao_v2:sub:contemplate:behavior', 41,
   'Em uma semana típica, em quantos dias você faz pausa consciente, meditação ou journaling por 5+ minutos?', false,
   '[{"label":"Nunca","value":1},{"label":"1 dia","value":2},{"label":"2-3 dias","value":3},{"label":"4-5 dias","value":4},{"label":"Quase todo dia","value":5}]'::jsonb),
  ('v2:contemplate:behavior:b', 'avaliacao_v2', 'avaliacao_v2:sub:contemplate:behavior', 42,
   'Em uma semana típica, em quantos dias você fica sem fone, sem tela, sem podcast — só com seus pensamentos — por pelo menos 10 minutos?', false,
   '[{"label":"Nunca","value":1},{"label":"1 dia","value":2},{"label":"2-3 dias","value":3},{"label":"4-5 dias","value":4},{"label":"Quase todo dia","value":5}]'::jsonb),
  ('v2:contemplate:quality:a', 'avaliacao_v2', 'avaliacao_v2:sub:contemplate:quality', 43,
   'Quando medita ou para, você consegue ficar com o que aparece — não foge nem se distrai compulsivo.', false,
   '[{"label":"Quase nunca","value":1},{"label":"Raramente","value":2},{"label":"Às vezes","value":3},{"label":"Frequentemente","value":4},{"label":"Quase sempre","value":5}]'::jsonb),
  ('v2:contemplate:quality:b', 'avaliacao_v2', 'avaliacao_v2:sub:contemplate:quality', 44,
   'Sua prática contemplativa tem profundidade hoje que não tinha 6 meses atrás.', false,
   '[{"label":"Discordo totalmente","value":1},{"label":"Discordo","value":2},{"label":"Neutro","value":3},{"label":"Concordo","value":4},{"label":"Concordo totalmente","value":5}]'::jsonb),
  ('v2:contemplate:result:a', 'avaliacao_v2', 'avaliacao_v2:sub:contemplate:result', 45,
   'Em momentos de estresse, consigo me ancorar — não saio do eixo facilmente.', false,
   '[{"label":"Quase nunca","value":1},{"label":"Raramente","value":2},{"label":"Mais ou menos","value":3},{"label":"Maioria das vezes","value":4},{"label":"Quase sempre","value":5}]'::jsonb),
  ('v2:contemplate:result:b', 'avaliacao_v2', 'avaliacao_v2:sub:contemplate:result', 46,
   'Tenho clareza sobre o que sinto e o que importa pra mim, mesmo quando a vida tá acelerada.', false,
   '[{"label":"Quase nunca","value":1},{"label":"Raramente","value":2},{"label":"Mais ou menos","value":3},{"label":"Maioria das vezes","value":4},{"label":"Quase sempre","value":5}]'::jsonb),
  ('v2:contemplate:friction:a', 'avaliacao_v2', 'avaliacao_v2:sub:contemplate:friction', 47,
   'Com que frequência ansiedade ou ruminação te tomam por longos períodos sem você conseguir sair?', false,
   '[{"label":"Quase todo dia","value":1},{"label":"Frequentemente","value":2},{"label":"Às vezes","value":3},{"label":"Raramente","value":4},{"label":"Quase nunca","value":5}]'::jsonb),
  ('v2:contemplate:friction:b', 'avaliacao_v2', 'avaliacao_v2:sub:contemplate:friction', 48,
   'Com que frequência você adia parar e olhar pra dentro porque tem "coisas mais importantes"?', false,
   '[{"label":"Quase sempre","value":1},{"label":"Frequentemente","value":2},{"label":"Às vezes","value":3},{"label":"Raramente","value":4},{"label":"Quase nunca","value":5}]'::jsonb),

  -- ── MONEY ───────────────────────────────────────────────────────────────
  ('v2:money:behavior:a', 'avaliacao_v2', 'avaliacao_v2:sub:money:behavior', 49,
   'Nos últimos 12 meses, em quantos meses sobrou dinheiro pra você poupar ou investir?', false,
   '[{"label":"Nenhum","value":1},{"label":"1-3 meses","value":2},{"label":"4-6 meses","value":3},{"label":"7-9 meses","value":4},{"label":"10+ meses","value":5}]'::jsonb),
  ('v2:money:behavior:b', 'avaliacao_v2', 'avaliacao_v2:sub:money:behavior', 50,
   'Em um mês típico, com que frequência você abre seu controle financeiro pra ver gastos e saldos?', false,
   '[{"label":"Nunca","value":1},{"label":"1x","value":2},{"label":"2-3x","value":3},{"label":"4-7x","value":4},{"label":"Mais que isso","value":5}]'::jsonb),
  ('v2:money:quality:a', 'avaliacao_v2', 'avaliacao_v2:sub:money:quality', 51,
   'Você sabe pra onde vai cada faixa do seu dinheiro — não tem "sumiço" no fim do mês.', false,
   '[{"label":"Quase nunca","value":1},{"label":"Raramente","value":2},{"label":"Mais ou menos","value":3},{"label":"Maioria das vezes","value":4},{"label":"Quase sempre","value":5}]'::jsonb),
  ('v2:money:quality:b', 'avaliacao_v2', 'avaliacao_v2:sub:money:quality', 52,
   'Suas decisões de gasto são intencionais — você compara opções, não compra no impulso.', false,
   '[{"label":"Quase nunca","value":1},{"label":"Raramente","value":2},{"label":"Às vezes","value":3},{"label":"Frequentemente","value":4},{"label":"Quase sempre","value":5}]'::jsonb),
  ('v2:money:result:a', 'avaliacao_v2', 'avaliacao_v2:sub:money:result', 53,
   'Dinheiro não é fonte constante de ansiedade — tenho colchão e respiro com tranquilidade.', false,
   '[{"label":"Discordo totalmente","value":1},{"label":"Discordo","value":2},{"label":"Neutro","value":3},{"label":"Concordo","value":4},{"label":"Concordo totalmente","value":5}]'::jsonb),
  ('v2:money:result:b', 'avaliacao_v2', 'avaliacao_v2:sub:money:result', 54,
   'Tenho hoje mais ativos líquidos (reserva, fundos, investimentos) do que tinha 12 meses atrás.', false,
   '[{"label":"Discordo totalmente","value":1},{"label":"Discordo","value":2},{"label":"Neutro","value":3},{"label":"Concordo","value":4},{"label":"Concordo totalmente","value":5}]'::jsonb),
  ('v2:money:friction:a', 'avaliacao_v2', 'avaliacao_v2:sub:money:friction', 55,
   'Com que frequência dívida cara (cartão, cheque especial) ou parcelamento pesam na sua cabeça?', false,
   '[{"label":"Quase todo dia","value":1},{"label":"Frequentemente","value":2},{"label":"Às vezes","value":3},{"label":"Raramente","value":4},{"label":"Quase nunca","value":5}]'::jsonb),
  ('v2:money:friction:b', 'avaliacao_v2', 'avaliacao_v2:sub:money:friction', 56,
   'Com que frequência você posterga decisões financeiras (declaração de imposto, abrir conta investidor, renegociar dívida) por aversão ao tema?', false,
   '[{"label":"Quase sempre","value":1},{"label":"Frequentemente","value":2},{"label":"Às vezes","value":3},{"label":"Raramente","value":4},{"label":"Quase nunca","value":5}]'::jsonb),

  -- ── CAREER ──────────────────────────────────────────────────────────────
  ('v2:career:behavior:a', 'avaliacao_v2', 'avaliacao_v2:sub:career:behavior', 57,
   'Em uma semana típica, em quantos dias você consegue blocos de 60+ minutos de deep work em algo que importa pra sua carreira?', false,
   '[{"label":"Nenhum","value":1},{"label":"1 dia","value":2},{"label":"2 dias","value":3},{"label":"3-4 dias","value":4},{"label":"5+ dias","value":5}]'::jsonb),
  ('v2:career:behavior:b', 'avaliacao_v2', 'avaliacao_v2:sub:career:behavior', 58,
   'Em uma semana típica, em quantos dias você produz algo concreto (entrega, decisão, código, pitch) que move sua carreira pra frente?', false,
   '[{"label":"Nenhum","value":1},{"label":"1 dia","value":2},{"label":"2 dias","value":3},{"label":"3-4 dias","value":4},{"label":"5+ dias","value":5}]'::jsonb),
  ('v2:career:quality:a', 'avaliacao_v2', 'avaliacao_v2:sub:career:quality', 59,
   'Quando trabalha, você está engajado de verdade — não no automático, não só preenchendo expediente.', false,
   '[{"label":"Quase nunca","value":1},{"label":"Raramente","value":2},{"label":"Às vezes","value":3},{"label":"Frequentemente","value":4},{"label":"Quase sempre","value":5}]'::jsonb),
  ('v2:career:quality:b', 'avaliacao_v2', 'avaliacao_v2:sub:career:quality', 60,
   'Você toma decisões difíceis no trabalho com clareza — não evita, não procrastina.', false,
   '[{"label":"Quase nunca","value":1},{"label":"Raramente","value":2},{"label":"Às vezes","value":3},{"label":"Frequentemente","value":4},{"label":"Quase sempre","value":5}]'::jsonb),
  ('v2:career:result:a', 'avaliacao_v2', 'avaliacao_v2:sub:career:result', 61,
   'Sobra energia minha pra vida fora do trabalho — não chego em casa zerado.', false,
   '[{"label":"Quase nunca","value":1},{"label":"Raramente","value":2},{"label":"Mais ou menos","value":3},{"label":"Maioria dos dias","value":4},{"label":"Quase todo dia","value":5}]'::jsonb),
  ('v2:career:result:b', 'avaliacao_v2', 'avaliacao_v2:sub:career:result', 62,
   'Estou em uma trajetória que faz sentido — meu trabalho vai pra algum lugar, não tô só rodando no lugar.', false,
   '[{"label":"Discordo totalmente","value":1},{"label":"Discordo","value":2},{"label":"Neutro","value":3},{"label":"Concordo","value":4},{"label":"Concordo totalmente","value":5}]'::jsonb),
  ('v2:career:friction:a', 'avaliacao_v2', 'avaliacao_v2:sub:career:friction', 63,
   'Com que frequência reuniões inúteis, mensagens e interrupções tomam o dia inteiro?', false,
   '[{"label":"Quase todo dia","value":1},{"label":"Frequentemente","value":2},{"label":"Às vezes","value":3},{"label":"Raramente","value":4},{"label":"Quase nunca","value":5}]'::jsonb),
  ('v2:career:friction:b', 'avaliacao_v2', 'avaliacao_v2:sub:career:friction', 64,
   'Com que frequência você adia confronto necessário (com chefe, cliente, par) por desconforto?', false,
   '[{"label":"Quase sempre","value":1},{"label":"Frequentemente","value":2},{"label":"Às vezes","value":3},{"label":"Raramente","value":4},{"label":"Quase nunca","value":5}]'::jsonb),

  -- ── CIRCLE ──────────────────────────────────────────────────────────────
  ('v2:circle:behavior:a', 'avaliacao_v2', 'avaliacao_v2:sub:circle:behavior', 65,
   'Em uma semana típica, quantas vezes você tem uma conversa significativa (não só logística) com família ou amigos?', false,
   '[{"label":"Nenhuma","value":1},{"label":"1 vez","value":2},{"label":"2-3 vezes","value":3},{"label":"4-5 vezes","value":4},{"label":"Praticamente todo dia","value":5}]'::jsonb),
  ('v2:circle:behavior:b', 'avaliacao_v2', 'avaliacao_v2:sub:circle:behavior', 66,
   'Em um mês típico, quantas vezes você toma iniciativa de marcar ou buscar alguém querido (sem esperar convite)?', false,
   '[{"label":"Nenhuma","value":1},{"label":"1-2 vezes","value":2},{"label":"3-4 vezes","value":3},{"label":"5-7 vezes","value":4},{"label":"Mais que isso","value":5}]'::jsonb),
  ('v2:circle:quality:a', 'avaliacao_v2', 'avaliacao_v2:sub:circle:quality', 67,
   'Você ouve as pessoas próximas com presença real — sem celular, sem ensaiar resposta, sem distração.', false,
   '[{"label":"Quase nunca","value":1},{"label":"Raramente","value":2},{"label":"Às vezes","value":3},{"label":"Frequentemente","value":4},{"label":"Quase sempre","value":5}]'::jsonb),
  ('v2:circle:quality:b', 'avaliacao_v2', 'avaliacao_v2:sub:circle:quality', 68,
   'Você compartilha o que tá vivendo de verdade com pelo menos uma pessoa do seu círculo — não fica filtrando.', false,
   '[{"label":"Quase nunca","value":1},{"label":"Raramente","value":2},{"label":"Às vezes","value":3},{"label":"Frequentemente","value":4},{"label":"Quase sempre","value":5}]'::jsonb),
  ('v2:circle:result:a', 'avaliacao_v2', 'avaliacao_v2:sub:circle:result', 69,
   'Me sinto genuinamente próximo das pessoas importantes pra mim — alguém me conhece de verdade.', false,
   '[{"label":"Discordo totalmente","value":1},{"label":"Discordo","value":2},{"label":"Mais ou menos","value":3},{"label":"Concordo","value":4},{"label":"Concordo totalmente","value":5}]'::jsonb),
  ('v2:circle:result:b', 'avaliacao_v2', 'avaliacao_v2:sub:circle:result', 70,
   'Tenho gente que ligaria se eu sumisse e que eu ligaria se sumissem — não é um social abstrato.', false,
   '[{"label":"Discordo totalmente","value":1},{"label":"Discordo","value":2},{"label":"Neutro","value":3},{"label":"Concordo","value":4},{"label":"Concordo totalmente","value":5}]'::jsonb),
  ('v2:circle:friction:a', 'avaliacao_v2', 'avaliacao_v2:sub:circle:friction', 71,
   'Com que frequência você se sente sozinho mesmo cercado de gente?', false,
   '[{"label":"Quase todo dia","value":1},{"label":"Frequentemente","value":2},{"label":"Às vezes","value":3},{"label":"Raramente","value":4},{"label":"Quase nunca","value":5}]'::jsonb),
  ('v2:circle:friction:b', 'avaliacao_v2', 'avaliacao_v2:sub:circle:friction', 72,
   'Com que frequência um conflito mal resolvido com alguém querido te custa energia mental?', false,
   '[{"label":"Quase todo dia","value":1},{"label":"Frequentemente","value":2},{"label":"Às vezes","value":3},{"label":"Raramente","value":4},{"label":"Quase nunca","value":5}]'::jsonb),

  -- ── ROMANCE ─────────────────────────────────────────────────────────────
  ('v2:romance:behavior:a', 'avaliacao_v2', 'avaliacao_v2:sub:romance:behavior', 73,
   'Em um mês típico, com que frequência você tem momentos reais de conexão romântica (parceria, encontros, intimidade, presença)?', false,
   '[{"label":"Nenhuma vez","value":1},{"label":"1 vez","value":2},{"label":"2-3 vezes","value":3},{"label":"4-7 vezes","value":4},{"label":"Mais que isso","value":5}]'::jsonb),
  ('v2:romance:behavior:b', 'avaliacao_v2', 'avaliacao_v2:sub:romance:behavior', 74,
   'Em um mês típico, com que frequência você toma iniciativa de cultivar o lado romântico (com parceiro, ou de buscar conhecer alguém)?', false,
   '[{"label":"Nenhuma","value":1},{"label":"1 vez","value":2},{"label":"2-3 vezes","value":3},{"label":"4-7 vezes","value":4},{"label":"Mais que isso","value":5}]'::jsonb),
  ('v2:romance:quality:a', 'avaliacao_v2', 'avaliacao_v2:sub:romance:quality', 75,
   'Quando tá com seu parceiro ou em encontro, você está presente — sem celular, sem checagem mental.', false,
   '[{"label":"Quase nunca","value":1},{"label":"Raramente","value":2},{"label":"Às vezes","value":3},{"label":"Frequentemente","value":4},{"label":"Quase sempre","value":5}]'::jsonb),
  ('v2:romance:quality:b', 'avaliacao_v2', 'avaliacao_v2:sub:romance:quality', 76,
   'Você expressa o que sente e o que quer no romance — não fica esperando o outro adivinhar.', false,
   '[{"label":"Quase nunca","value":1},{"label":"Raramente","value":2},{"label":"Às vezes","value":3},{"label":"Frequentemente","value":4},{"label":"Quase sempre","value":5}]'::jsonb),
  ('v2:romance:result:a', 'avaliacao_v2', 'avaliacao_v2:sub:romance:result', 77,
   'Minha vida romântica está em um lugar bom — me sinto satisfeito com como está hoje.', false,
   '[{"label":"Discordo totalmente","value":1},{"label":"Discordo","value":2},{"label":"Neutro","value":3},{"label":"Concordo","value":4},{"label":"Concordo totalmente","value":5}]'::jsonb),
  ('v2:romance:result:b', 'avaliacao_v2', 'avaliacao_v2:sub:romance:result', 78,
   'Sinto carinho, desejo e segurança — não só logística ou lembrança do que foi.', false,
   '[{"label":"Discordo totalmente","value":1},{"label":"Discordo","value":2},{"label":"Neutro","value":3},{"label":"Concordo","value":4},{"label":"Concordo totalmente","value":5}]'::jsonb),
  ('v2:romance:friction:a', 'avaliacao_v2', 'avaliacao_v2:sub:romance:friction', 79,
   'Com que frequência conflito não resolvido no romance te ocupa por dias?', false,
   '[{"label":"Quase todo dia","value":1},{"label":"Frequentemente","value":2},{"label":"Às vezes","value":3},{"label":"Raramente","value":4},{"label":"Quase nunca","value":5}]'::jsonb),
  ('v2:romance:friction:b', 'avaliacao_v2', 'avaliacao_v2:sub:romance:friction', 80,
   'Com que frequência você se silencia pra evitar briga ou pra agradar?', false,
   '[{"label":"Quase sempre","value":1},{"label":"Frequentemente","value":2},{"label":"Às vezes","value":3},{"label":"Raramente","value":4},{"label":"Quase nunca","value":5}]'::jsonb),

  -- ── PLAY ────────────────────────────────────────────────────────────────
  ('v2:play:behavior:a', 'avaliacao_v2', 'avaliacao_v2:sub:play:behavior', 81,
   'Em uma semana típica, quantas vezes você tem momentos só pra curtir um hobby/jogo/criativo, sem objetivo, sem produzir nada?', false,
   '[{"label":"Nenhuma","value":1},{"label":"1 vez","value":2},{"label":"2-3 vezes","value":3},{"label":"4-5 vezes","value":4},{"label":"Quase todo dia","value":5}]'::jsonb),
  ('v2:play:behavior:b', 'avaliacao_v2', 'avaliacao_v2:sub:play:behavior', 82,
   'Em um mês típico, quantas vezes você experimenta uma atividade nova (sem performar, só pra brincar)?', false,
   '[{"label":"Nenhuma","value":1},{"label":"1 vez","value":2},{"label":"2 vezes","value":3},{"label":"3-4 vezes","value":4},{"label":"Mais que isso","value":5}]'::jsonb),
  ('v2:play:quality:a', 'avaliacao_v2', 'avaliacao_v2:sub:play:quality', 83,
   'Quando brinca ou joga, você está realmente presente — sem checar rede social, sem trabalhar de fundo.', false,
   '[{"label":"Quase nunca","value":1},{"label":"Raramente","value":2},{"label":"Às vezes","value":3},{"label":"Frequentemente","value":4},{"label":"Quase sempre","value":5}]'::jsonb),
  ('v2:play:quality:b', 'avaliacao_v2', 'avaliacao_v2:sub:play:quality', 84,
   'Você se permite ser ruim em algo só pelo gosto de tentar — não precisa ser produtivo.', false,
   '[{"label":"Quase nunca","value":1},{"label":"Raramente","value":2},{"label":"Às vezes","value":3},{"label":"Frequentemente","value":4},{"label":"Quase sempre","value":5}]'::jsonb),
  ('v2:play:result:a', 'avaliacao_v2', 'avaliacao_v2:sub:play:result', 85,
   'Curtir hobby ou brincar me recarrega de verdade — termino mais leve, não mais cansado.', false,
   '[{"label":"Discordo totalmente","value":1},{"label":"Discordo","value":2},{"label":"Neutro","value":3},{"label":"Concordo","value":4},{"label":"Concordo totalmente","value":5}]'::jsonb),
  ('v2:play:result:b', 'avaliacao_v2', 'avaliacao_v2:sub:play:result', 86,
   'Tenho uma rotina onde alegria, leveza e curiosidade aparecem regularmente.', false,
   '[{"label":"Discordo totalmente","value":1},{"label":"Discordo","value":2},{"label":"Neutro","value":3},{"label":"Concordo","value":4},{"label":"Concordo totalmente","value":5}]'::jsonb),
  ('v2:play:friction:a', 'avaliacao_v2', 'avaliacao_v2:sub:play:friction', 87,
   'Com que frequência você sente culpa por descansar/brincar quando "tem coisa pra fazer"?', false,
   '[{"label":"Quase sempre","value":1},{"label":"Frequentemente","value":2},{"label":"Às vezes","value":3},{"label":"Raramente","value":4},{"label":"Quase nunca","value":5}]'::jsonb),
  ('v2:play:friction:b', 'avaliacao_v2', 'avaliacao_v2:sub:play:friction', 88,
   'Com que frequência seu lazer virou consumo passivo (rolar feed, séries) e não recarrega mais?', false,
   '[{"label":"Quase todo dia","value":1},{"label":"Frequentemente","value":2},{"label":"Às vezes","value":3},{"label":"Raramente","value":4},{"label":"Quase nunca","value":5}]'::jsonb),

  -- ── BUILD ───────────────────────────────────────────────────────────────
  ('v2:build:behavior:a', 'avaliacao_v2', 'avaliacao_v2:sub:build:behavior', 89,
   'Em uma semana típica, em quantos dias você dedica 30+ minutos a um projeto pessoal (criativo, técnico, manual)?', false,
   '[{"label":"Nenhum","value":1},{"label":"1 dia","value":2},{"label":"2 dias","value":3},{"label":"3-4 dias","value":4},{"label":"5+ dias","value":5}]'::jsonb),
  ('v2:build:behavior:b', 'avaliacao_v2', 'avaliacao_v2:sub:build:behavior', 90,
   'Em um mês típico, com que frequência você publica/compartilha algo que fez (post, repo, produto, peça)?', false,
   '[{"label":"Nenhuma","value":1},{"label":"1 vez","value":2},{"label":"2 vezes","value":3},{"label":"3-4 vezes","value":4},{"label":"5+ vezes","value":5}]'::jsonb),
  ('v2:build:quality:a', 'avaliacao_v2', 'avaliacao_v2:sub:build:quality', 91,
   'Quando trabalha em projeto, você se aprofunda — flow, foco, sem checar rede a cada 5 minutos.', false,
   '[{"label":"Quase nunca","value":1},{"label":"Raramente","value":2},{"label":"Às vezes","value":3},{"label":"Frequentemente","value":4},{"label":"Quase sempre","value":5}]'::jsonb),
  ('v2:build:quality:b', 'avaliacao_v2', 'avaliacao_v2:sub:build:quality', 92,
   'Você itera e melhora o que faz — escuta feedback ao invés de só defender o que já fez.', false,
   '[{"label":"Quase nunca","value":1},{"label":"Raramente","value":2},{"label":"Às vezes","value":3},{"label":"Frequentemente","value":4},{"label":"Quase sempre","value":5}]'::jsonb),
  ('v2:build:result:a', 'avaliacao_v2', 'avaliacao_v2:sub:build:result', 93,
   'Termino e compartilho coisas que começo — não acumulo só projetos abandonados.', false,
   '[{"label":"Quase nunca","value":1},{"label":"Raramente","value":2},{"label":"Às vezes","value":3},{"label":"Frequentemente","value":4},{"label":"Quase sempre","value":5}]'::jsonb),
  ('v2:build:result:b', 'avaliacao_v2', 'avaliacao_v2:sub:build:result', 94,
   'Tenho coisas concretas que existem por minha causa — vou poder mostrar daqui 5 anos.', false,
   '[{"label":"Discordo totalmente","value":1},{"label":"Discordo","value":2},{"label":"Neutro","value":3},{"label":"Concordo","value":4},{"label":"Concordo totalmente","value":5}]'::jsonb),
  ('v2:build:friction:a', 'avaliacao_v2', 'avaliacao_v2:sub:build:friction', 95,
   'Com que frequência você abandona projeto antes do fim por perfeccionismo ou medo de mostrar?', false,
   '[{"label":"Quase sempre","value":1},{"label":"Frequentemente","value":2},{"label":"Às vezes","value":3},{"label":"Raramente","value":4},{"label":"Quase nunca","value":5}]'::jsonb),
  ('v2:build:friction:b', 'avaliacao_v2', 'avaliacao_v2:sub:build:friction', 96,
   'Com que frequência distração, indecisão ou pular pra próxima ideia tira você do que tava fazendo?', false,
   '[{"label":"Quase todo dia","value":1},{"label":"Frequentemente","value":2},{"label":"Às vezes","value":3},{"label":"Raramente","value":4},{"label":"Quase nunca","value":5}]'::jsonb);

-- ─── 6. Sampling RPC: avaliacao_v2 picks 1 of 2 per leaf facet ─────────────
-- Replaces the function body. The default-policy branch (all items, catalog
-- order) still applies for v1, big_five, schwartz, ecr_r.

create or replace function public.psych_seed_session_items(
  p_session_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inst text;
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  select instrument_id into v_inst
  from public.psych_session
  where id = p_session_id and character_id = v_user;
  if v_inst is null then
    raise exception 'Session % not found or not owned by user', p_session_id;
  end if;

  if exists (
    select 1 from public.psych_session_item where session_id = p_session_id
  ) then
    return;
  end if;

  if v_inst = 'avaliacao_v2' then
    -- Sample 1 of 2 items per LEAF facet (where parent_facet_id is not
    -- null), in (parent.position, leaf.position) order. This produces 48
    -- items grouped by sub: 4 sleep facets, then 4 nutrition, etc.
    insert into public.psych_session_item (session_id, item_id, position)
    select
      p_session_id,
      picked.item_id,
      row_number() over (
        order by parent.position, leaf.position
      ) as position
    from public.psych_facet leaf
    join public.psych_facet parent on parent.id = leaf.parent_facet_id
    join lateral (
      select pi.id as item_id
      from public.psych_item pi
      where pi.facet_id = leaf.id and pi.instrument_id = v_inst
      order by random()
      limit 1
    ) picked on true
    where leaf.instrument_id = v_inst and leaf.parent_facet_id is not null;
  else
    -- Default: every item in catalog order. Used by v1, big_five, schwartz,
    -- ecr_r — they don't have a sampling pool.
    insert into public.psych_session_item (session_id, item_id, position)
    select p_session_id, id, position
    from public.psych_item
    where instrument_id = v_inst
    order by position;
  end if;
end $$;

-- Grant survives the CREATE OR REPLACE; restate for safety.
grant execute on function public.psych_seed_session_items(uuid)
  to authenticated;

-- ─── 7. Scoring helper: roll up leaf facets into parents ───────────────────
-- For wellbeing: every facet (leaf and parent) gets a score row. Leaves
-- aggregate their own items; parents aggregate ALL items under their
-- descendant leaves. The bridge to character_sub_score then targets ONLY
-- facets whose slug equals a known sub_id (== parent facets in v2, or
-- the single leaf in v1 that has slug=sub_id with no parent).

create or replace function public._psych_score_session(
  p_session_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inst     text;
  v_category text;
begin
  select s.instrument_id, i.category
    into v_inst, v_category
  from public.psych_session s
  join public.psych_instrument i on i.id = s.instrument_id
  where s.id = p_session_id;

  if v_inst is null then
    raise exception 'Session % not found', p_session_id;
  end if;

  delete from public.psych_score where session_id = p_session_id;

  if v_category = 'wellbeing' then
    -- For each facet of the instrument: aggregate items belonging to this
    -- facet directly OR to one of its child facets. Equivalent to "all
    -- items beneath this facet in the catalog tree" for our depth-1 case.
    insert into public.psych_score (session_id, facet_id, score_decimal)
    select
      pa.session_id,
      f.id,
      greatest(0::numeric, least(5::numeric, avg(
        case when pi.reverse_scored
             then ((6 - pa.raw_value) - 1) / 4.0
             else (pa.raw_value - 1) / 4.0
        end
      ) * 5))::numeric(6,3)
    from public.psych_facet f
    join public.psych_item pi on (
      pi.facet_id = f.id
      or pi.facet_id in (
        select c.id from public.psych_facet c where c.parent_facet_id = f.id
      )
    )
    join public.psych_answer pa
      on pa.item_id = pi.id and pa.session_id = p_session_id
    where f.instrument_id = v_inst
    group by pa.session_id, f.id;
  else
    raise notice 'Scoring for category % is not implemented yet', v_category;
  end if;
end $$;

-- ─── 8. Bridge: write score_decimal alongside integer score ────────────────
-- Replaces submit_psych_session so the wellbeing bridge populates BOTH
-- character_sub_score.score (integer floor for back-compat) AND
-- character_sub_score.score_decimal (the precise value the new UI renders).

create or replace function public.submit_psych_session(
  p_session_id      uuid,
  p_answers         jsonb,
  p_duration_seconds integer default null
) returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user      uuid := auth.uid();
  v_session   record;
  v_category  text;
  v_scale_min smallint;
  v_scale_max smallint;
  v_answer    jsonb;
  v_raw       smallint;
  v_scores    json;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;
  if jsonb_typeof(p_answers) <> 'array' then
    raise exception 'p_answers must be a jsonb array';
  end if;

  select s.id, s.character_id, s.instrument_id, i.category,
         i.scale_min, i.scale_max
    into v_session
  from public.psych_session s
  join public.psych_instrument i on i.id = s.instrument_id
  where s.id = p_session_id;

  if v_session.id is null then
    raise exception 'Session % not found', p_session_id;
  end if;
  if v_session.character_id <> v_user then
    raise exception 'Session does not belong to user';
  end if;

  v_category  := v_session.category;
  v_scale_min := v_session.scale_min;
  v_scale_max := v_session.scale_max;

  delete from public.psych_answer where session_id = p_session_id;
  delete from public.psych_score  where session_id = p_session_id;

  for v_answer in select * from jsonb_array_elements(p_answers) loop
    v_raw := (v_answer->>'raw_value')::smallint;
    if v_raw < v_scale_min or v_raw > v_scale_max then
      raise exception 'raw_value % out of range [%, %]',
        v_raw, v_scale_min, v_scale_max;
    end if;
    insert into public.psych_answer (session_id, item_id, raw_value)
    values (p_session_id, v_answer->>'item_id', v_raw);
  end loop;

  perform public._psych_score_session(p_session_id);

  -- Wellbeing bridge: target only facets whose slug equals a known sub_id
  -- (parent facets in v2; leaf facets in v1). Both decimal and integer
  -- columns get populated.
  if v_category = 'wellbeing' then
    insert into public.character_sub_score
      (character_id, source, sub_id, score, score_decimal)
    select
      v_user, 'questionnaire', f.slug,
      greatest(0, least(5, floor(ps.score_decimal)::int))::smallint,
      ps.score_decimal
    from public.psych_score ps
    join public.psych_facet f on f.id = ps.facet_id
    join public.dimension_sub ds on ds.id = f.slug
    where ps.session_id = p_session_id
    on conflict (character_id, source, sub_id)
    do update set
      score         = excluded.score,
      score_decimal = excluded.score_decimal,
      updated_at    = now();

    insert into public.assessment_log
      (character_id, source, sub_id, score, session_id)
    select
      v_user, 'questionnaire', f.slug,
      greatest(0, least(5, floor(ps.score_decimal)::int))::smallint,
      p_session_id
    from public.psych_score ps
    join public.psych_facet f on f.id = ps.facet_id
    join public.dimension_sub ds on ds.id = f.slug
    where ps.session_id = p_session_id;
  end if;

  update public.psych_session
  set duration_seconds = coalesce(p_duration_seconds, duration_seconds),
      is_complete      = true,
      taken_at         = now()
  where id = p_session_id;

  select coalesce(json_agg(row_to_json(x)), '[]'::json) into v_scores
  from (
    select facet_id, score_decimal, percentile
    from public.psych_score
    where session_id = p_session_id
    order by facet_id
  ) x;

  return json_build_object('session_id', p_session_id, 'scores', v_scores);
end $$;

grant execute on function public.submit_psych_session(uuid, jsonb, integer)
  to authenticated;

-- ─── 9. Backfill score_decimal for existing v1 historical scores ───────────
-- For migrated avaliacao_v1 sessions, the score_decimal in psych_score is
-- already populated. Roll the latest per (user, sub) into character_sub_score.

with latest_v1 as (
  select s.character_id, ps.facet_id, ps.score_decimal,
         row_number() over (
           partition by s.character_id, ps.facet_id
           order by s.taken_at desc
         ) as rn
  from public.psych_session s
  join public.psych_score ps on ps.session_id = s.id
  where s.instrument_id = 'avaliacao_v1'
)
update public.character_sub_score css
set score_decimal = lv.score_decimal
from latest_v1 lv
join public.psych_facet f on f.id = lv.facet_id
where lv.rn = 1
  and css.character_id = lv.character_id
  and css.source = 'questionnaire'
  and css.sub_id = f.slug;

commit;
