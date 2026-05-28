-- migration: 20260527000001_quest_sub_stars_kind.sql
-- purpose: extend quest_requirement to support 'accumulate_sub_stars' — a count
--          of per-sub stars accumulated across task_completion_sub rows within
--          the quest's started_at..deadline window.
--
-- affected tables:
--   quest_requirement — extend kind check, add sub_id FK, replace per-kind CHECK
--
-- new function:
--   sub_stars_progress(quest_id, sub_id) returns integer
--
-- notes:
--   write-once; do not edit after applying
--   rls already enforced on quest_requirement (no policy change needed)
--   bilingual: no user-facing strings introduced here
--
-- constraint discovery: the original (20260501000009_quests.sql) created two
-- anonymous CHECK constraints on quest_requirement — a column-level check on
-- `kind` and a table-level compound check. Postgres names them
-- `quest_requirement_kind_check` and `quest_requirement_check` respectively
-- under the standard naming rule. We drop both by literal name (failures are
-- silent via `if exists`) and re-add named replacements.

-- 1. extend the kind check
alter table public.quest_requirement
  drop constraint if exists quest_requirement_kind_check;
alter table public.quest_requirement
  add constraint quest_requirement_kind_check check (kind in (
    'complete_task_n_times',
    'complete_any_in_dim',
    'reach_skill_value',
    'accumulate_sub_stars'
  ));

-- 2. new sub_id FK column
alter table public.quest_requirement
  add column if not exists sub_id text references public.dimension_sub(id) on delete restrict;

create index if not exists quest_requirement_sub_idx
  on public.quest_requirement (sub_id);

-- 3. replace the compound per-kind CHECK
-- The original anonymous table-level CHECK lands as `quest_requirement_check`.
alter table public.quest_requirement
  drop constraint if exists quest_requirement_check;
alter table public.quest_requirement
  add constraint quest_requirement_kind_payload check (
    (kind = 'complete_task_n_times'   and task_id      is not null and target_count is not null)
    or (kind = 'complete_any_in_dim'  and dimension_id is not null and target_count is not null)
    or (kind = 'reach_skill_value'    and skill_id     is not null and min_value    is not null)
    or (kind = 'accumulate_sub_stars' and sub_id       is not null and target_count is not null)
  );

-- 4. progress RPC: sum task_completion_sub.stars across the quest's window
--    for the calling user (via auth.uid() = character.id in this schema).
--
--    Filters: only counts completions whose completed_at falls within
--    [quest.started_at, quest.deadline). Completions before/after the
--    window do not contribute.
create or replace function public.sub_stars_progress(
  p_quest_id uuid,
  p_sub_id   text
) returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(tcs.stars), 0)::integer
  from public.task_completion_sub tcs
  join public.task_completion tc on tc.id = tcs.completion_id
  join public.quest q on q.id = p_quest_id
  where tcs.sub_id = p_sub_id
    and tc.character_id = q.character_id
    and tc.completed_at >= q.started_at
    and tc.completed_at <  q.deadline
$$;

grant execute on function public.sub_stars_progress(uuid, text) to authenticated;

-- end of migration
