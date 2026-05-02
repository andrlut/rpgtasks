-- ============================================================================
-- Seed sample tasks for new users + backfill existing users.
-- Refactors handle_new_user() to call a reusable seed_sample_tasks() function.
-- ============================================================================

create or replace function public.seed_sample_tasks(p_character_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  tid uuid;
begin
  -- idempotent: only seed if the user has zero tasks
  if exists (select 1 from public.task where character_id = p_character_id) then
    return;
  end if;

  -- 1. Drink water (health, easy, daily)
  insert into public.task (character_id, title, difficulty, task_type, description)
  values (p_character_id, 'Drink 2L of water', 2, 'daily', 'Keep hydrated.')
  returning id into tid;
  insert into public.task_dimension (task_id, dimension_id) values (tid, 'health');

  -- 2. Push-ups (strength + health, medium, daily)
  insert into public.task (character_id, title, difficulty, task_type, description)
  values (p_character_id, '20 push-ups', 3, 'daily', 'Hit the floor.')
  returning id into tid;
  insert into public.task_dimension (task_id, dimension_id) values (tid, 'strength');
  insert into public.task_dimension (task_id, dimension_id) values (tid, 'health');

  -- 3. Read (mind, easy, daily)
  insert into public.task (character_id, title, difficulty, task_type, description)
  values (p_character_id, 'Read for 20 minutes', 2, 'daily', null)
  returning id into tid;
  insert into public.task_dimension (task_id, dimension_id) values (tid, 'mind');

  -- 4. Meditate (mind + discipline, easy, daily)
  insert into public.task (character_id, title, difficulty, task_type, description)
  values (p_character_id, 'Meditate 10 minutes', 2, 'daily', null)
  returning id into tid;
  insert into public.task_dimension (task_id, dimension_id) values (tid, 'mind');
  insert into public.task_dimension (task_id, dimension_id) values (tid, 'discipline');

  -- 5. Track expenses (wealth + discipline, trivial, daily)
  insert into public.task (character_id, title, difficulty, task_type, description)
  values (p_character_id, 'Log today''s expenses', 1, 'daily', null)
  returning id into tid;
  insert into public.task_dimension (task_id, dimension_id) values (tid, 'wealth');
  insert into public.task_dimension (task_id, dimension_id) values (tid, 'discipline');

  -- 6. Reach out (social, easy, weekly)
  insert into public.task (character_id, title, difficulty, task_type, description)
  values (p_character_id, 'Reach out to a friend', 2, 'weekly', null)
  returning id into tid;
  insert into public.task_dimension (task_id, dimension_id) values (tid, 'social');
end $$;

-- update signup trigger to also seed sample tasks
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

  perform public.seed_sample_tasks(new.id);

  return new;
end $$;

-- backfill: any existing character without tasks gets the sample set
do $$
declare
  c record;
begin
  for c in select id from public.character loop
    perform public.seed_sample_tasks(c.id);
  end loop;
end $$;
