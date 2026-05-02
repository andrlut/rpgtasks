-- ============================================================================
-- Skills system — concrete proficiency tracking with tiered milestones.
--
-- skill: catalog of named skills (push-ups, running, etc.). Shared across
--        all users; seeded with V0 set.
-- skill_tier: catalog of milestone thresholds per skill (beginner / bronze /
--             silver / gold / master).
-- skill_log: per-user log of PR (personal record) entries.
--
-- Current PR per skill is computed on the client by max(value) over rows.
-- Tier is the highest skill_tier whose threshold <= current PR.
-- ============================================================================

-- ─── catalog: skill ─────────────────────────────────────────────────────────

create table public.skill (
  id text primary key,                              -- e.g. 'pushups'
  display_name text not null,
  unit text not null,                               -- 'reps', 'km', 'min', 'pages'
  dimension_id text not null references public.dimension(id) on delete restrict,
  icon text not null,
  sort_order integer not null
);

alter table public.skill enable row level security;

create policy "skill_read_authenticated"
  on public.skill for select
  to authenticated using (true);

insert into public.skill (id, display_name, unit, dimension_id, icon, sort_order) values
  ('pushups',   'Push-ups',          'reps', 'strength', 'fitness',         1),
  ('running',   'Longest run',       'km',   'health',   'walk',            2),
  ('meditate',  'Longest meditation','min',  'mind',     'leaf',            3),
  ('reading',   'Pages in one go',   'pgs',  'mind',     'book',            4);

-- ─── catalog: skill_tier ────────────────────────────────────────────────────

create table public.skill_tier (
  id text primary key,                              -- 'pushups_bronze'
  skill_id text not null references public.skill(id) on delete cascade,
  tier_name text not null,                          -- beginner|bronze|silver|gold|master
  threshold integer not null,
  sort_order integer not null,
  unique (skill_id, tier_name)
);

alter table public.skill_tier enable row level security;

create policy "skill_tier_read_authenticated"
  on public.skill_tier for select
  to authenticated using (true);

insert into public.skill_tier (id, skill_id, tier_name, threshold, sort_order) values
  -- pushups
  ('pushups_beginner', 'pushups',  'beginner',  0,   1),
  ('pushups_bronze',   'pushups',  'bronze',    10,  2),
  ('pushups_silver',   'pushups',  'silver',    25,  3),
  ('pushups_gold',     'pushups',  'gold',      50,  4),
  ('pushups_master',   'pushups',  'master',    100, 5),

  -- running (km)
  ('running_beginner', 'running',  'beginner',  0,   1),
  ('running_bronze',   'running',  'bronze',    3,   2),
  ('running_silver',   'running',  'silver',    7,   3),
  ('running_gold',     'running',  'gold',      15,  4),
  ('running_master',   'running',  'master',    30,  5),

  -- meditate (minutes)
  ('meditate_beginner','meditate', 'beginner',  0,   1),
  ('meditate_bronze',  'meditate', 'bronze',    10,  2),
  ('meditate_silver',  'meditate', 'silver',    20,  3),
  ('meditate_gold',    'meditate', 'gold',      45,  4),
  ('meditate_master',  'meditate', 'master',    60,  5),

  -- reading (pages)
  ('reading_beginner', 'reading',  'beginner',  0,   1),
  ('reading_bronze',   'reading',  'bronze',    20,  2),
  ('reading_silver',   'reading',  'silver',    50,  3),
  ('reading_gold',     'reading',  'gold',      100, 4),
  ('reading_master',   'reading',  'master',    200, 5);

-- ─── per-user: skill_log ────────────────────────────────────────────────────

create table public.skill_log (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.character(id) on delete cascade,
  skill_id text not null references public.skill(id) on delete cascade,
  value integer not null check (value >= 0),
  logged_at timestamptz not null default now()
);

create index skill_log_character_skill_idx
  on public.skill_log (character_id, skill_id, logged_at desc);

alter table public.skill_log enable row level security;

create policy "skill_log_self_select" on public.skill_log
  for select to authenticated using (character_id = auth.uid());

create policy "skill_log_self_insert" on public.skill_log
  for insert to authenticated with check (character_id = auth.uid());
-- skill_log is immutable: no update/delete policies.
