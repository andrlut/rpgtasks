-- ============================================================================
-- Dimensions v2 — drop `discipline`, rename `social` → `bonds`, add `craft`.
-- New `dimension_sub` catalog (12 rows: 2 subs per dim) with `sub_id` on
-- `task` and `skill`. New `character_sub` table for per-user subjective
-- questionnaire scores (0-5).
--
-- WIPES all user-owned data (tasks, completions, skill_logs, quests, XP,
-- coins). Authorized by user — V0 sandbox, fresh start.
--
-- The 6 dims:
--   1 Health   = sleep + nutrition
--   2 Strength = movement + dexterity
--   3 Mind     = learn + contemplate
--   4 Wealth   = money + career
--   5 Bonds    = circle (family/friends) + romance
--   6 Craft    = play + build
-- ============================================================================

begin;

-- ─── 1. Wipe user-owned data ──────────────────────────────────────────────
truncate table public.task_completion cascade;
truncate table public.skill_log cascade;
truncate table public.quest_requirement cascade;
truncate table public.quest cascade;
truncate table public.task_dimension cascade;
delete from public.task;
delete from public.character_dimension;
update public.character set total_xp = 0, coins = 0, updated_at = now();

-- ─── 2. Wipe quest_template + skill catalog (will re-seed) ────────────────
delete from public.quest_template;
delete from public.skill_tier;
delete from public.skill;

-- ─── 3. Replace dimension catalog ─────────────────────────────────────────
delete from public.dimension;
insert into public.dimension (id, display_name, color, icon, sort_order) values
  ('health',   'Health',   '#FF6B7A', 'heart',         1),
  ('strength', 'Strength', '#FF8A3D', 'fitness',       2),
  ('mind',     'Mind',     '#B07BFF', 'sparkles',      3),
  ('wealth',   'Wealth',   '#FFC83D', 'cash',          4),
  ('bonds',    'Bonds',    '#4DD0FF', 'people',        5),
  ('craft',    'Craft',    '#2EC4B6', 'color-palette', 6);

-- Repopulate character_dimension at 0 for every existing character
insert into public.character_dimension (character_id, dimension_id, xp)
  select c.id, d.id, 0
  from public.character c cross join public.dimension d;

-- ─── 4. dimension_sub catalog ─────────────────────────────────────────────
create table public.dimension_sub (
  id text primary key,
  dimension_id text not null references public.dimension(id) on delete cascade,
  display_name text not null,
  icon text not null,
  sort_order integer not null
);

alter table public.dimension_sub enable row level security;

create policy "dimension_sub_read_authenticated"
  on public.dimension_sub for select
  to authenticated using (true);

insert into public.dimension_sub (id, dimension_id, display_name, icon, sort_order) values
  ('sleep',       'health',   'Sleep',            'moon',            1),
  ('nutrition',   'health',   'Nutrition',        'restaurant',      2),
  ('movement',    'strength', 'Movement',         'walk',            1),
  ('dexterity',   'strength', 'Dexterity',        'body',            2),
  ('learn',       'mind',     'Learn',            'book',            1),
  ('contemplate', 'mind',     'Contemplate',      'leaf',            2),
  ('money',       'wealth',   'Money',            'wallet',          1),
  ('career',      'wealth',   'Career',           'briefcase',       2),
  ('circle',      'bonds',    'Friends & Family', 'people',          1),
  ('romance',     'bonds',    'Romance',          'heart',           2),
  ('play',        'craft',    'Play',             'game-controller', 1),
  ('build',       'craft',    'Build',            'construct',       2);

-- ─── 5. sub_id on task + skill ────────────────────────────────────────────
alter table public.task
  add column sub_id text references public.dimension_sub(id) on delete set null;

alter table public.skill
  add column sub_id text references public.dimension_sub(id) on delete set null;

-- ─── 6. character_sub: per-user subjective score per sub (0-5) ───────────
create table public.character_sub (
  character_id uuid not null references public.character(id) on delete cascade,
  sub_id text not null references public.dimension_sub(id) on delete cascade,
  subjective_score smallint not null default 0
    check (subjective_score between 0 and 5),
  primary key (character_id, sub_id)
);

alter table public.character_sub enable row level security;

create policy "character_sub_self_all"
  on public.character_sub for all to authenticated
  using (character_id = auth.uid())
  with check (character_id = auth.uid());

-- Seed character_sub for every existing character
insert into public.character_sub (character_id, sub_id, subjective_score)
  select c.id, s.id, 0
  from public.character c cross join public.dimension_sub s;

-- ─── 7. Re-seed catalog skills (with sub_id) ─────────────────────────────
insert into public.skill (id, display_name, unit, dimension_id, sub_id, icon, sort_order, description, character_id) values
  ('pushups',  'Push-ups',           'reps', 'strength', 'movement',
    'fitness', 1,
    'Classic upper-body strength. Works chest, shoulders, triceps, and core.',
    null),
  ('running',  'Longest run',        'km',   'strength', 'movement',
    'walk',    2,
    'Distance covered in a single continuous run. Builds cardio and leg endurance.',
    null),
  ('meditate', 'Longest meditation', 'min',  'mind',     'contemplate',
    'leaf',    3,
    'Longest single uninterrupted sit. Trains attention and equanimity.',
    null),
  ('reading',  'Pages in one go',    'pgs',  'mind',     'learn',
    'book',    4,
    'Pages read in a single focused session. Trains attention and comprehension.',
    null);

insert into public.skill_tier (id, skill_id, tier_name, threshold, sort_order) values
  ('pushups_beginner', 'pushups',  'beginner',  0,   1),
  ('pushups_bronze',   'pushups',  'bronze',    10,  2),
  ('pushups_silver',   'pushups',  'silver',    25,  3),
  ('pushups_gold',     'pushups',  'gold',      50,  4),
  ('pushups_master',   'pushups',  'master',    100, 5),

  ('running_beginner', 'running',  'beginner',  0,   1),
  ('running_bronze',   'running',  'bronze',    3,   2),
  ('running_silver',   'running',  'silver',    7,   3),
  ('running_gold',     'running',  'gold',      15,  4),
  ('running_master',   'running',  'master',    30,  5),

  ('meditate_beginner','meditate', 'beginner',  0,   1),
  ('meditate_bronze',  'meditate', 'bronze',    10,  2),
  ('meditate_silver',  'meditate', 'silver',    20,  3),
  ('meditate_gold',    'meditate', 'gold',      45,  4),
  ('meditate_master',  'meditate', 'master',    60,  5),

  ('reading_beginner', 'reading',  'beginner',  0,   1),
  ('reading_bronze',   'reading',  'bronze',    20,  2),
  ('reading_silver',   'reading',  'silver',    50,  3),
  ('reading_gold',     'reading',  'gold',      100, 4),
  ('reading_master',   'reading',  'master',    200, 5);

-- ─── 8. Update handle_new_user trigger ───────────────────────────────────
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

  insert into public.character_sub (character_id, sub_id)
    select new.id, s.id from public.dimension_sub s;

  perform public.seed_sample_tasks(new.id);

  return new;
end $$;

-- ─── 9. Re-seed sample tasks for new model (1 per sub = 12 tasks) ────────
create or replace function public.seed_sample_tasks(p_character_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  tid uuid;
begin
  if exists (select 1 from public.task where character_id = p_character_id) then
    return;
  end if;

  -- Health / Sleep
  insert into public.task (character_id, title, difficulty, task_type, sub_id, description)
  values (p_character_id, 'Sleep 7+ hours', 2, 'daily', 'sleep', 'Recovery is the engine.')
  returning id into tid;
  insert into public.task_dimension (task_id, dimension_id) values (tid, 'health');

  -- Health / Nutrition
  insert into public.task (character_id, title, difficulty, task_type, sub_id, description)
  values (p_character_id, 'Drink 2L of water', 1, 'daily', 'nutrition', 'Stay hydrated.')
  returning id into tid;
  insert into public.task_dimension (task_id, dimension_id) values (tid, 'health');

  -- Strength / Movement
  insert into public.task (character_id, title, difficulty, task_type, sub_id, description)
  values (p_character_id, '20 push-ups', 3, 'daily', 'movement', 'Hit the floor.')
  returning id into tid;
  insert into public.task_dimension (task_id, dimension_id) values (tid, 'strength');

  -- Strength / Dexterity
  insert into public.task (character_id, title, difficulty, task_type, sub_id, description)
  values (p_character_id, 'Mobility 10 min', 2, 'daily', 'dexterity', 'Loosen up.')
  returning id into tid;
  insert into public.task_dimension (task_id, dimension_id) values (tid, 'strength');

  -- Mind / Learn
  insert into public.task (character_id, title, difficulty, task_type, sub_id, description)
  values (p_character_id, 'Read for 20 minutes', 2, 'daily', 'learn', null)
  returning id into tid;
  insert into public.task_dimension (task_id, dimension_id) values (tid, 'mind');

  -- Mind / Contemplate
  insert into public.task (character_id, title, difficulty, task_type, sub_id, description)
  values (p_character_id, 'Meditate 10 min', 2, 'daily', 'contemplate', null)
  returning id into tid;
  insert into public.task_dimension (task_id, dimension_id) values (tid, 'mind');

  -- Wealth / Money
  insert into public.task (character_id, title, difficulty, task_type, sub_id, description)
  values (p_character_id, 'Log today''s expenses', 1, 'daily', 'money', null)
  returning id into tid;
  insert into public.task_dimension (task_id, dimension_id) values (tid, 'wealth');

  -- Wealth / Career
  insert into public.task (character_id, title, difficulty, task_type, sub_id, description)
  values (p_character_id, '90 min deep work', 4, 'daily', 'career', 'Distraction-free.')
  returning id into tid;
  insert into public.task_dimension (task_id, dimension_id) values (tid, 'wealth');

  -- Bonds / Circle
  insert into public.task (character_id, title, difficulty, task_type, sub_id, description)
  values (p_character_id, 'Reach out to a friend or family', 2, 'weekly', 'circle', null)
  returning id into tid;
  insert into public.task_dimension (task_id, dimension_id) values (tid, 'bonds');

  -- Bonds / Romance
  insert into public.task (character_id, title, difficulty, task_type, sub_id, description)
  values (p_character_id, 'Quality time with partner', 3, 'weekly', 'romance', 'Phones away.')
  returning id into tid;
  insert into public.task_dimension (task_id, dimension_id) values (tid, 'bonds');

  -- Craft / Play
  insert into public.task (character_id, title, difficulty, task_type, sub_id, description)
  values (p_character_id, 'Hobby session 30 min', 2, 'weekly', 'play', 'Just for fun.')
  returning id into tid;
  insert into public.task_dimension (task_id, dimension_id) values (tid, 'craft');

  -- Craft / Build
  insert into public.task (character_id, title, difficulty, task_type, sub_id, description)
  values (p_character_id, 'Ship something on a side project', 3, 'weekly', 'build', null)
  returning id into tid;
  insert into public.task_dimension (task_id, dimension_id) values (tid, 'craft');
end $$;

-- Re-seed sample tasks for existing characters (we wiped everything)
do $$
declare
  c record;
begin
  for c in select id from public.character loop
    perform public.seed_sample_tasks(c.id);
  end loop;
end $$;

commit;
