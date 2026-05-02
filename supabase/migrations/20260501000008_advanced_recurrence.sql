-- ============================================================================
-- Advanced task recurrence.
--
-- Adds two columns to public.task:
--   - recurrence jsonb : pattern ('one_shot' | 'daily' | 'weekly' | 'monthly')
--                        with shape-specific extras (days array, day-of-month)
--   - target_count int  : how many completions count as "done" per occurrence
--                        (e.g. brush teeth 3x/day → target_count = 3)
--
-- Existing task_type column is preserved as a legacy hint, but `recurrence`
-- is the new source of truth. Backfill maps the old enum 1:1 (weekly tasks
-- behaved identically to daily in V0, so they migrate to type='daily';
-- the new "weekly with specific days" model is opt-in via the form).
--
-- Shapes (validated at write-time by client; no SQL constraint beyond
-- valid JSONB):
--   {"type": "one_shot"}
--   {"type": "daily"}
--   {"type": "weekly", "days": [0, 2, 4]}      -- 0=Sun ... 6=Sat
--   {"type": "monthly", "day": 15}
-- ============================================================================

alter table public.task
  add column recurrence jsonb not null default '{"type":"daily"}'::jsonb,
  add column target_count integer not null default 1
    check (target_count >= 1 and target_count <= 50);

-- Backfill from existing task_type. Any task with task_type='weekly' was
-- being treated as a daily task in V0 anyway, so we migrate it to daily.
update public.task
set recurrence = case task_type
  when 'one_shot' then '{"type":"one_shot"}'::jsonb
  when 'daily'    then '{"type":"daily"}'::jsonb
  when 'weekly'   then '{"type":"daily"}'::jsonb
  else '{"type":"daily"}'::jsonb
end;

-- Update seed_sample_tasks to use the new column. New users get the same
-- 6 starter tasks but with explicit recurrence values so the History
-- view sees them correctly on day-of-week filters.
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

  insert into public.task (character_id, title, difficulty, task_type, description, recurrence)
  values (p_character_id, 'Drink 2L of water', 2, 'daily', 'Keep hydrated.', '{"type":"daily"}'::jsonb)
  returning id into tid;
  insert into public.task_dimension (task_id, dimension_id) values (tid, 'health');

  insert into public.task (character_id, title, difficulty, task_type, description, recurrence)
  values (p_character_id, '20 push-ups', 3, 'daily', 'Hit the floor.', '{"type":"daily"}'::jsonb)
  returning id into tid;
  insert into public.task_dimension (task_id, dimension_id) values (tid, 'strength');
  insert into public.task_dimension (task_id, dimension_id) values (tid, 'health');

  insert into public.task (character_id, title, difficulty, task_type, description, recurrence)
  values (p_character_id, 'Read for 20 minutes', 2, 'daily', null, '{"type":"daily"}'::jsonb)
  returning id into tid;
  insert into public.task_dimension (task_id, dimension_id) values (tid, 'mind');

  insert into public.task (character_id, title, difficulty, task_type, description, recurrence)
  values (p_character_id, 'Meditate 10 minutes', 2, 'daily', null, '{"type":"daily"}'::jsonb)
  returning id into tid;
  insert into public.task_dimension (task_id, dimension_id) values (tid, 'mind');
  insert into public.task_dimension (task_id, dimension_id) values (tid, 'discipline');

  insert into public.task (character_id, title, difficulty, task_type, description, recurrence)
  values (p_character_id, 'Log today''s expenses', 1, 'daily', null, '{"type":"daily"}'::jsonb)
  returning id into tid;
  insert into public.task_dimension (task_id, dimension_id) values (tid, 'wealth');
  insert into public.task_dimension (task_id, dimension_id) values (tid, 'discipline');

  -- Use the new "weekly with specific days" model on a sample task so new
  -- users see what it looks like out of the box. Sun + Wed.
  insert into public.task (character_id, title, difficulty, task_type, description, recurrence)
  values (p_character_id, 'Reach out to a friend', 2, 'weekly', null, '{"type":"weekly","days":[0,3]}'::jsonb)
  returning id into tid;
  insert into public.task_dimension (task_id, dimension_id) values (tid, 'social');
end $$;
