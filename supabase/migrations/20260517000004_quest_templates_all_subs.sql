-- migration: 20260516130000_quest_templates_all_subs.sql
-- purpose: seed 24 system quest templates — 2 per sub (1 skill + 1 challenge)
--          covering all 12 dimension_sub: sleep, nutrition, strength, dexterity,
--          learn, contemplate, money, career, circle, romance, play, build
--
-- notes:
--   skill quest requirements reference real skill.id values from the catalog
--   challenge quests use quest_challenge_log (no skill_id required)
--   quest_template.id is the primary key (text slug)
--   on conflict (id) do nothing — safe to re-run
--   quest_type column added by migration 20260516120000_quest_v3_challenge.sql
--   suggested_duration_days is guidance shown in UI; deadline is set at quest start

insert into quest_template (
  id,
  title_pt, title_en,
  description_pt, description_en,
  category,
  quest_type,
  suggested_duration_days,
  reward_xp, reward_coins,
  allow_partial,
  challenge_target_value,
  challenge_unit_pt, challenge_unit_en,
  requirements,
  sort_order
)
values

-- ══════════════════════════════════════════════════════════════════════════════
-- SLEEP (sub: sleep)
-- ══════════════════════════════════════════════════════════════════════════════

-- skill: 8h+ sleep streak
(
  'skill_sleep_8h_streak',
  '14 dias dormindo 8h+',
  '14-day 8h+ sleep streak',
  'Mantenha uma sequência de 14 dias dormindo pelo menos 8 horas. Registre cada dia como entrada na habilidade.',
  'Keep a 14-day streak of sleeping at least 8 hours. Log each day as a skill entry.',
  'sleep',
  'skill',
  21,
  220, 55, false,
  null, null, null,
  '[{"kind": "reach_skill_value", "skill_id": "sleep_8h_streak", "target_value": 14}]',
  10
),

-- challenge: screen-free hour before bed
(
  'challenge_screen_free_bed',
  'Sem tela antes de dormir por 14 dias',
  'Screen-free before bed for 14 days',
  'Fique sem telas pelo menos 1 hora antes de dormir durante 14 dias seguidos. Registre seus dias consecutivos.',
  'Stay screen-free for at least 1 hour before bed for 14 consecutive days. Log your consecutive day count.',
  'sleep',
  'challenge',
  21,
  200, 50, true,
  14, 'dias consecutivos', 'consecutive days',
  '[]',
  11
),

-- ══════════════════════════════════════════════════════════════════════════════
-- NUTRITION (sub: nutrition)
-- ══════════════════════════════════════════════════════════════════════════════

-- skill: home-cooked meals per week
(
  'skill_home_cooked_meals',
  '5 refeições caseiras por semana',
  '5 home-cooked meals per week',
  'Alcance a marca de 5 refeições caseiras em uma única semana. Registre suas refeições como entrada de habilidade.',
  'Reach 5 home-cooked meals in a single week. Log your meals as a skill entry.',
  'nutrition',
  'skill',
  14,
  200, 50, false,
  null, null, null,
  '[{"kind": "reach_skill_value", "skill_id": "home_cooked_week", "target_value": 5}]',
  20
),

-- challenge: no added sugar streak
(
  'challenge_no_sugar_21',
  '21 dias sem açúcar adicionado',
  '21 days no added sugar',
  'Fique 21 dias consecutivos sem consumir açúcar adicionado. Registre quantos dias consecutivos você manteve.',
  'Go 21 consecutive days without added sugar. Log your current consecutive day count.',
  'nutrition',
  'challenge',
  28,
  280, 70, true,
  21, 'dias consecutivos', 'consecutive days',
  '[]',
  21
),

-- ══════════════════════════════════════════════════════════════════════════════
-- STRENGTH (sub: strength)
-- ══════════════════════════════════════════════════════════════════════════════

-- skill: push-ups single set
(
  'skill_pushups_30',
  'Série de 30 flexões',
  '30 push-up set',
  'Consiga completar 30 flexões seguidas em uma única série. Registre sua melhor série em cada treino.',
  'Complete 30 push-ups in a single set. Log your best set after each workout.',
  'strength',
  'skill',
  30,
  280, 70, false,
  null, null, null,
  '[{"kind": "reach_skill_value", "skill_id": "pushups", "target_value": 30}]',
  30
),

-- challenge: run 5 km without stopping
(
  'challenge_run_5k',
  'Correr 5 km sem parar',
  'Run 5 km without stopping',
  'Treine até conseguir correr 5 km sem parar. Registre a distância da sua melhor corrida a cada treino (em km).',
  'Train until you can run 5 km without stopping. Log the distance of your best run each session (in km).',
  'strength',
  'challenge',
  45,
  320, 80, true,
  5, 'km', 'km',
  '[]',
  31
),

-- ══════════════════════════════════════════════════════════════════════════════
-- DEXTERITY (sub: dexterity)
-- ══════════════════════════════════════════════════════════════════════════════

-- skill: typing speed
(
  'skill_typing_60wpm',
  'Digitar 60 palavras por minuto',
  'Type 60 words per minute',
  'Alcance 60 palavras por minuto na digitação. Registre sua velocidade após cada sessão de treino.',
  'Reach 60 words per minute typing speed. Log your speed after each practice session.',
  'dexterity',
  'skill',
  30,
  240, 60, false,
  null, null, null,
  '[{"kind": "reach_skill_value", "skill_id": "typing_wpm", "target_value": 60}]',
  40
),

-- challenge: juggling 3-ball cascade
(
  'challenge_juggling_3ball',
  'Malabarismo com 3 bolas por 30 segundos',
  'Juggle 3 balls for 30 seconds',
  'Aprenda a fazer malabarismo com 3 bolas por 30 segundos sem derrubar. Registre seu recorde em segundos.',
  'Learn to juggle 3 balls for 30 seconds without dropping. Log your record in seconds.',
  'dexterity',
  'challenge',
  45,
  260, 65, true,
  30, 'segundos', 'seconds',
  '[]',
  41
),

-- ══════════════════════════════════════════════════════════════════════════════
-- LEARN (sub: learn)
-- ══════════════════════════════════════════════════════════════════════════════

-- skill: daily reading streak
(
  'skill_reading_streak_21',
  'Ler todo dia por 21 dias',
  'Read every day for 21 days',
  'Mantenha uma sequência de 21 dias lendo todos os dias. Registre cada dia como entrada na habilidade.',
  'Keep a 21-day daily reading streak. Log each day as a skill entry.',
  'learn',
  'skill',
  28,
  250, 60, false,
  null, null, null,
  '[{"kind": "reach_skill_value", "skill_id": "reading_streak", "target_value": 21}]',
  50
),

-- challenge: complete an online course
(
  'challenge_complete_course',
  'Concluir um curso online',
  'Complete an online course',
  'Escolha um curso online e conclua-o dentro do prazo. Registre o percentual de progresso ao longo do caminho.',
  'Choose an online course and complete it within the deadline. Log your completion percentage along the way.',
  'learn',
  'challenge',
  60,
  400, 100, true,
  100, '% concluído', '% completed',
  '[]',
  51
),

-- ══════════════════════════════════════════════════════════════════════════════
-- CONTEMPLATE (sub: contemplate)
-- ══════════════════════════════════════════════════════════════════════════════

-- skill: meditation daily streak
(
  'skill_meditate_streak_21',
  'Meditar todo dia por 21 dias',
  'Meditate every day for 21 days',
  'Mantenha uma sequência de 21 dias meditando todos os dias. Registre cada dia na habilidade.',
  'Keep a 21-day daily meditation streak. Log each day as a skill entry.',
  'contemplate',
  'skill',
  28,
  260, 65, false,
  null, null, null,
  '[{"kind": "reach_skill_value", "skill_id": "meditate_streak", "target_value": 21}]',
  60
),

-- challenge: journaling habit
(
  'challenge_journal_30',
  'Diário por 30 dias',
  '30-day journaling habit',
  'Escreva no diário todos os dias por 30 dias. Registre o total de entradas feitas.',
  'Write in your journal every day for 30 days. Log your total entry count.',
  'contemplate',
  'challenge',
  35,
  220, 55, true,
  30, 'entradas', 'entries',
  '[]',
  61
),

-- ══════════════════════════════════════════════════════════════════════════════
-- MONEY (sub: money)
-- ══════════════════════════════════════════════════════════════════════════════

-- skill: months saving ≥20% of income
(
  'skill_savings_rate_3months',
  'Economizar 20%+ por 3 meses seguidos',
  'Save 20%+ for 3 consecutive months',
  'Mantenha uma taxa de poupança de pelo menos 20% da sua renda por 3 meses consecutivos. Registre cada mês.',
  'Maintain a savings rate of at least 20% of your income for 3 consecutive months. Log each qualifying month.',
  'money',
  'skill',
  90,
  380, 95, false,
  null, null, null,
  '[{"kind": "reach_skill_value", "skill_id": "savings_rate_streak", "target_value": 3}]',
  70
),

-- challenge: no-spend week
(
  'challenge_no_spend_week',
  'Semana sem gastos supérfluos',
  'No-spend week',
  'Passe 7 dias sem gastar em itens não essenciais. Registre cada dia que você conseguiu manter.',
  'Go 7 days without spending on non-essentials. Log each successful day.',
  'money',
  'challenge',
  10,
  200, 50, true,
  7, 'dias', 'days',
  '[]',
  71
),

-- ══════════════════════════════════════════════════════════════════════════════
-- CAREER (sub: career)
-- ══════════════════════════════════════════════════════════════════════════════

-- skill: focused work hours per week
(
  'skill_focus_hours_20',
  '20 horas de trabalho focado por semana',
  '20 focused work hours per week',
  'Alcance 20 horas de trabalho focado em uma única semana. Registre suas horas de foco semanalmente.',
  'Reach 20 focused work hours in a single week. Log your weekly focused hours.',
  'career',
  'skill',
  14,
  300, 75, false,
  null, null, null,
  '[{"kind": "reach_skill_value", "skill_id": "focus_hours_week", "target_value": 20}]',
  80
),

-- challenge: ship a side project
(
  'challenge_ship_side_project',
  'Lançar um projeto paralelo',
  'Ship a side project',
  'Defina um projeto paralelo e leve-o até o lançamento dentro do prazo. Registre seu progresso em percentual.',
  'Define a side project and take it to launch within the deadline. Log your progress as a percentage.',
  'career',
  'challenge',
  60,
  450, 110, true,
  100, '% concluído', '% completed',
  '[]',
  81
),

-- ══════════════════════════════════════════════════════════════════════════════
-- CIRCLE / FRIENDS & FAMILY (sub: circle)
-- ══════════════════════════════════════════════════════════════════════════════

-- skill: friends seen in person per week
(
  'skill_friends_in_person',
  'Ver 2 amigos pessoalmente por semana',
  'See 2 friends in person per week',
  'Alcance 2 encontros presenciais com amigos em uma única semana. Registre seus encontros semanalmente.',
  'Reach 2 in-person friend meetups in a single week. Log your weekly meetup count.',
  'circle',
  'skill',
  21,
  220, 55, false,
  null, null, null,
  '[{"kind": "reach_skill_value", "skill_id": "friends_in_person_week", "target_value": 2}]',
  90
),

-- challenge: reconnect with 5 people
(
  'challenge_reconnect_5',
  'Reconecte com 5 pessoas',
  'Reconnect with 5 people',
  'Entre em contato genuíno com 5 pessoas com quem perdeu o contato. Registre cada reconexão feita.',
  'Genuinely reach out to 5 people you have lost touch with. Log each reconnection.',
  'circle',
  'challenge',
  30,
  200, 50, true,
  5, 'reconexões', 'reconnections',
  '[]',
  91
),

-- ══════════════════════════════════════════════════════════════════════════════
-- ROMANCE (sub: romance)
-- ══════════════════════════════════════════════════════════════════════════════

-- skill: date nights per month
(
  'skill_date_nights_4',
  '4 encontros intencionais no mês',
  '4 intentional dates this month',
  'Organize 4 encontros intencionais com seu parceiro em um único mês. Registre cada encontro.',
  'Plan 4 intentional dates with your partner in a single month. Log each date.',
  'romance',
  'skill',
  35,
  220, 55, false,
  null, null, null,
  '[{"kind": "reach_skill_value", "skill_id": "date_nights_month", "target_value": 4}]',
  100
),

-- challenge: daily appreciation message streak
(
  'challenge_appreciation_14',
  '14 dias enviando mensagem de apreciação',
  '14-day appreciation message streak',
  'Envie uma mensagem genuína de apreciação para seu parceiro todos os dias por 14 dias. Registre seus dias consecutivos.',
  'Send a genuine appreciation message to your partner every day for 14 days. Log your consecutive day count.',
  'romance',
  'challenge',
  21,
  180, 45, true,
  14, 'dias consecutivos', 'consecutive days',
  '[]',
  101
),

-- ══════════════════════════════════════════════════════════════════════════════
-- PLAY (sub: play)
-- ══════════════════════════════════════════════════════════════════════════════

-- skill: distinct hobbies tried per year
(
  'skill_new_hobbies_3',
  'Experimentar 3 hobbies novos',
  'Try 3 new hobbies',
  'Experimente 3 hobbies que você nunca praticou antes. Registre cada novo hobby tentado.',
  'Try 3 hobbies you have never done before. Log each new hobby attempted.',
  'play',
  'skill',
  90,
  240, 60, false,
  null, null, null,
  '[{"kind": "reach_skill_value", "skill_id": "distinct_hobbies_year", "target_value": 3}]',
  110
),

-- challenge: longest uninterrupted hobby session
(
  'challenge_hobby_session_2h',
  'Sessão de hobby de 2 horas sem interrupção',
  '2-hour uninterrupted hobby session',
  'Dedique-se a um hobby por 2 horas seguidas sem distrações. Registre sua sessão mais longa em minutos.',
  'Dedicate yourself to a hobby for 2 uninterrupted hours without distractions. Log your longest session in minutes.',
  'play',
  'challenge',
  14,
  180, 45, true,
  120, 'minutos', 'minutes',
  '[]',
  111
),

-- ══════════════════════════════════════════════════════════════════════════════
-- BUILD (sub: build)
-- ══════════════════════════════════════════════════════════════════════════════

-- skill: build streak (consecutive build days)
(
  'skill_build_streak_14',
  '14 dias consecutivos construindo',
  '14-day build streak',
  'Trabalhe no seu projeto criativo ou técnico todos os dias por 14 dias consecutivos. Registre sua sequência.',
  'Work on your creative or technical project every day for 14 consecutive days. Log your streak.',
  'build',
  'skill',
  21,
  300, 75, false,
  null, null, null,
  '[{"kind": "reach_skill_value", "skill_id": "build_streak", "target_value": 14}]',
  120
),

-- challenge: publish something
(
  'challenge_publish_piece',
  'Publicar 3 trabalhos',
  'Publish 3 pieces',
  'Crie e publique 3 trabalhos (artigo, vídeo, design, código, etc.) dentro do prazo. Registre cada publicação.',
  'Create and publish 3 pieces of work (article, video, design, code, etc.) within the deadline. Log each publication.',
  'build',
  'challenge',
  45,
  320, 80, true,
  3, 'publicações', 'publications',
  '[]',
  121
)

on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- end of migration
-- ─────────────────────────────────────────────────────────────────────────────
