-- ============================================================================
-- Task templates — sub-anchored catalog of system-curated suggestions the user
-- can adopt with one tap, mirroring the reward_template pattern.
--
-- This migration also enforces what the V0 product implies but didn't enforce:
-- every task lives under a sub. We delete the legacy null-sub rows (sandbox
-- stage — user authorized "pode apagar tudo que for legado") and turn the
-- sub_id column NOT NULL going forward.
--
-- Auto-seeding sample tasks for new users is removed. The new flow: user
-- opens dim detail, browses templates, taps to adopt. Custom tasks via
-- task-form continue to work.
-- ============================================================================

begin;

-- ─── 1. Cleanup legacy + enforce sub_id NOT NULL ────────────────────────
delete from public.task where sub_id is null;
alter table public.task alter column sub_id set not null;

-- ─── 2. New task_template catalog ───────────────────────────────────────
create table public.task_template (
  id text primary key,
  title text not null,
  description text,
  sub_id text not null references public.dimension_sub(id) on delete cascade,
  difficulty smallint not null check (difficulty between 1 and 5) default 2,
  task_type text not null check (task_type in ('one_shot', 'daily', 'weekly')) default 'daily',
  recurrence jsonb not null default '{"type":"daily"}'::jsonb,
  target_count integer not null default 1 check (target_count between 1 and 50),
  metric_type text check (metric_type in ('reps', 'minutes', 'pages', 'km', 'ml', 'custom')),
  metric_label text,
  base_value numeric check (base_value > 0),
  increment_per_star numeric check (increment_per_star >= 0),
  sort_order integer not null default 0,
  -- Either ALL of the metric scaling fields are set, or none.
  constraint task_template_scaling_all_or_none check (
    (metric_type is null and base_value is null and increment_per_star is null)
    or
    (metric_type is not null and base_value is not null and increment_per_star is not null)
  )
);

alter table public.task_template enable row level security;

create policy "task_template_read_authenticated"
  on public.task_template for select
  to authenticated using (true);

create index task_template_sub_idx on public.task_template (sub_id, sort_order);

-- ─── 3. RPC: start_task_from_template ──────────────────────────────────
-- Clones a template into the user's task list, including the task_dimension
-- link (derived from the sub's parent dim). Returns the new task id.
create or replace function public.start_task_from_template(
  p_template_id text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_template public.task_template%rowtype;
  v_dim text;
  v_new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_template from public.task_template where id = p_template_id;
  if not found then
    raise exception 'Unknown template: %', p_template_id;
  end if;

  select dimension_id into v_dim
  from public.dimension_sub
  where id = v_template.sub_id;
  if v_dim is null then
    raise exception 'Sub % has no parent dimension', v_template.sub_id;
  end if;

  insert into public.task (
    character_id, title, description, difficulty, task_type,
    recurrence, target_count, sub_id,
    metric_type, metric_label, base_value, increment_per_star
  ) values (
    auth.uid(), v_template.title, v_template.description,
    v_template.difficulty, v_template.task_type,
    v_template.recurrence, v_template.target_count, v_template.sub_id,
    v_template.metric_type, v_template.metric_label,
    v_template.base_value, v_template.increment_per_star
  )
  returning id into v_new_id;

  insert into public.task_dimension (task_id, dimension_id)
  values (v_new_id, v_dim);

  return v_new_id;
end $$;

grant execute on function public.start_task_from_template(text) to authenticated;

-- ─── 4. handle_new_user no longer auto-seeds tasks ─────────────────────
-- Templates replace the sample-task seeding pattern. Users adopt from the
-- catalog via the dim detail screen, or create custom via task-form.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profile (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      split_part(new.email, '@', 1),
      'Adventurer'
    )
  );

  insert into public.character (id) values (new.id);

  insert into public.character_dimension (character_id, dimension_id)
    select new.id, d.id from public.dimension d;

  insert into public.character_sub_score (character_id, source, sub_id)
    select new.id, 'self', s.id from public.dimension_sub s;

  -- No more auto-seeded tasks. User adopts from task_template or creates own.

  return new;
end $$;

drop function if exists public.seed_sample_tasks(uuid);

-- ─── 5. Seed the catalog (3 templates × 12 subs = 36) ───────────────────
-- Content authored in PT to match the user-facing tone of the existing
-- self-assessment / questionnaire copy. Difficulty calibrated:
--   1 → trivial (<2 min, ~no resistance)
--   2 → easy daily habit
--   3 → meaningful daily commitment
--   4 → significant effort
--   5 → big lift / one-shot

insert into public.task_template
  (id, title, description, sub_id, difficulty, task_type, recurrence, target_count, sort_order)
values
  -- Sleep
  ('sleep_7h', 'Dormir 7 horas ou mais', 'Janela mínima pra recuperação cognitiva e física.',
   'sleep', 2, 'daily', '{"type":"daily"}', 1, 10),
  ('sleep_no_phone_22', 'Sem celular após 22h', 'Tela à noite atrasa o sono real em 30-60min.',
   'sleep', 3, 'daily', '{"type":"daily"}', 1, 20),
  ('sleep_consistent_wakeup', 'Acordar no mesmo horário (±30min)', 'Consistência > duração quando o dormir é decente.',
   'sleep', 2, 'daily', '{"type":"daily"}', 1, 30),

  -- Nutrition
  ('nutrition_real_meals', '3 refeições reais', 'Sem fast food, sem pular. Comida que você reconhece.',
   'nutrition', 2, 'daily', '{"type":"daily"}', 1, 10),
  ('nutrition_no_ultraprocessed', 'Dia sem ultraprocessado', 'Um dia limpo por semana já move a agulha.',
   'nutrition', 3, 'weekly', '{"type":"weekly","days":[1,2,3,4,5,6,0]}', 1, 20),
  ('nutrition_water_2l', 'Beber 2 litros de água', 'Hidratação consistente, sem catch-up à noite.',
   'nutrition', 1, 'daily', '{"type":"daily"}', 1, 30),

  -- Movement
  ('movement_30min', 'Mover-se 30 minutos', 'Caminhada, treino, esporte — qualquer coisa que tire do sedentarismo.',
   'movement', 2, 'daily', '{"type":"daily"}', 1, 10),
  ('movement_strength_3x', 'Treino de força 3x na semana', 'Bloco principal pro tier de força.',
   'movement', 3, 'weekly', '{"type":"weekly","days":[1,3,5]}', 1, 20),
  ('movement_stairs', 'Subir escadas em vez de elevador', 'Micro-doses de cardio embutidas no dia.',
   'movement', 1, 'daily', '{"type":"daily"}', 1, 30),

  -- Dexterity
  ('dexterity_mobility', 'Mobilidade matinal 10min', 'Articulações fluidas, postura desperta.',
   'dexterity', 1, 'daily', '{"type":"daily"}', 1, 10),
  ('dexterity_stretch_pre_sleep', 'Alongar antes de dormir', 'Reset físico que acelera o adormecer.',
   'dexterity', 1, 'daily', '{"type":"daily"}', 1, 20),
  ('dexterity_balance', 'Exercício de equilíbrio diário', 'Postura ereta + sistema vestibular firme aos 60.',
   'dexterity', 2, 'daily', '{"type":"daily"}', 1, 30),

  -- Learn
  ('learn_read_20min', 'Ler 20 minutos intencionais', 'Não rolar feed — ler algo que exige atenção.',
   'learn', 2, 'daily', '{"type":"daily"}', 1, 10),
  ('learn_study_1h', 'Estudo focado de 1 hora', 'Bloco profundo num tópico que importa.',
   'learn', 3, 'daily', '{"type":"daily"}', 1, 20),
  ('learn_apply_review', 'Aplicar ou anotar o que aprendeu', 'Conhecimento sem uso é vapor.',
   'learn', 1, 'daily', '{"type":"daily"}', 1, 30),

  -- Contemplate
  ('contemplate_meditate_10', 'Meditar 10 minutos', 'Silêncio estruturado treina foco e regulação.',
   'contemplate', 2, 'daily', '{"type":"daily"}', 1, 10),
  ('contemplate_journal_pre_sleep', 'Journaling antes de dormir', 'Tira o ruído mental do travesseiro.',
   'contemplate', 1, 'daily', '{"type":"daily"}', 1, 20),
  ('contemplate_walk_no_phone', 'Caminhada de 15min sem celular', 'Tédio fértil — onde insights aparecem.',
   'contemplate', 1, 'daily', '{"type":"daily"}', 1, 30),

  -- Money
  ('money_log_expenses', 'Anotar gastos do dia', 'Consciência > orçamento elaborado que você ignora.',
   'money', 1, 'daily', '{"type":"daily"}', 1, 10),
  ('money_review_budget', 'Revisar orçamento mensal', 'Uma hora por mês > planilhas perfeitas que você não atualiza.',
   'money', 2, 'one_shot', '{"type":"one_shot"}', 1, 20),
  ('money_invest_10pct', 'Investir 10% da renda', 'Hábito antes de retorno. Setup automático se possível.',
   'money', 4, 'one_shot', '{"type":"one_shot"}', 1, 30),

  -- Career
  ('career_deep_work_60', 'Bloco de deep work de 60 minutos', 'Sem notificações, em algo que move a carreira.',
   'career', 3, 'daily', '{"type":"daily"}', 1, 10),
  ('career_skill_30min', 'Estudar 30min algo da área', 'Composto cresce. Vale mesmo num dia ruim.',
   'career', 2, 'daily', '{"type":"daily"}', 1, 20),
  ('career_weekly_review', 'Revisão semanal de progresso', 'O que avançou, o que travou, o que muda na semana.',
   'career', 2, 'weekly', '{"type":"weekly","days":[0]}', 1, 30),

  -- Circle (friends & family)
  ('circle_message', 'Mandar mensagem real pra alguém', 'Não meme — uma pergunta ou contexto de verdade.',
   'circle', 1, 'daily', '{"type":"daily"}', 1, 10),
  ('circle_meet_in_person', 'Encontro presencial na semana', 'Tela não substitui presença.',
   'circle', 2, 'weekly', '{"type":"weekly","days":[5,6]}', 1, 20),
  ('circle_call_30', 'Ligação ou videochamada de 30+ min', 'Conversa longa > ping rápido.',
   'circle', 2, 'weekly', '{"type":"weekly","days":[6,0]}', 1, 30),

  -- Romance
  ('romance_quality_no_screen', 'Tempo de qualidade sem tela', 'Atenção é o presente que falta.',
   'romance', 2, 'daily', '{"type":"daily"}', 1, 10),
  ('romance_intentional_date', 'Encontro intencional', 'Algo planejado, fora do automático.',
   'romance', 3, 'weekly', '{"type":"weekly","days":[5,6]}', 1, 20),
  ('romance_unexpected_gesture', 'Gesto de afeto inesperado', 'Bilhete, recado, surpresa pequena. Cumulativo.',
   'romance', 1, 'daily', '{"type":"daily"}', 1, 30),

  -- Play
  ('play_hobby_30', '30 minutos de hobby sem objetivo', 'Brincar pelo brincar — não pra produzir.',
   'play', 1, 'daily', '{"type":"daily"}', 1, 10),
  ('play_sport_1h', 'Esporte ou jogo por 1 hora', 'Movimento + diversão + competição leve.',
   'play', 2, 'weekly', '{"type":"weekly","days":[3,6]}', 1, 20),
  ('play_creative_pure', 'Sessão criativa pura', 'Música, desenho, escrita — sem destino.',
   'play', 2, 'weekly', '{"type":"weekly","days":[5,6,0]}', 1, 30),

  -- Build
  ('build_30min_project', '30min em projeto pessoal', 'Pequenas iterações > sprints heroicos.',
   'build', 2, 'daily', '{"type":"daily"}', 1, 10),
  ('build_share_progress', 'Compartilhar progresso', 'Mostrar o que está fazendo — accountability + feedback.',
   'build', 2, 'weekly', '{"type":"weekly","days":[5]}', 1, 20),
  ('build_ship_one_thing', 'Terminar e compartilhar 1 coisa', 'Concluir importa. Inacabado é peso morto.',
   'build', 4, 'one_shot', '{"type":"one_shot"}', 1, 30);

commit;
