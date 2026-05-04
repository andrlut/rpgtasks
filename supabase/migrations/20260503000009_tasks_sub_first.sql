-- ============================================================================
-- Tasks: complete the sub-first migration. Drop the legacy task_dimension M:N.
--
-- After migration 0007, every task has sub_id NOT NULL. Each sub belongs to
-- exactly one dim (dimension_sub.dimension_id), so the M:N task ↔ dim link
-- is now 1:1-derivable from the sub. Keeping task_dimension around invites
-- drift between sub_id and the M:N rows; this migration removes it and
-- rewrites every consumer RPC to derive the dim from sub_id.
--
-- Touch list:
--   1. complete_task              — bump character_dimension via task.sub_id
--   2. delete_task_completion     — refund character_dimension via task.sub_id
--   3. start_task_from_template   — stop writing task_dimension rows
--   4. drop public.task_dimension
-- ============================================================================

begin;

-- ─── 1. complete_task: derive dim from sub_id ──────────────────────────────
create or replace function public.complete_task(
  p_task_id uuid,
  p_completed_at timestamptz default null,
  p_selected_difficulty smallint default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task record;
  v_difficulty smallint;
  v_base_xp integer;
  v_xp integer;
  v_coins integer;
  v_dim_id text;
  v_completed_at timestamptz := coalesce(p_completed_at, now());
  v_streak_days integer;
  v_multiplier numeric;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_task
  from public.task
  where id = p_task_id and character_id = auth.uid() and is_archived = false;

  if not found then
    raise exception 'Task not found or not owned by current user';
  end if;

  -- Resolve effective difficulty: client-provided wins, fallback to task default.
  v_difficulty := coalesce(p_selected_difficulty, v_task.difficulty);
  if v_difficulty < 1 or v_difficulty > 5 then
    raise exception 'selected_difficulty must be between 1 and 5';
  end if;

  v_base_xp := case v_difficulty
    when 1 then 5
    when 2 then 15
    when 3 then 40
    when 4 then 100
    when 5 then 250
  end;

  -- Streak multiplier (anchored at completion date — see 0502000001).
  v_streak_days := public.compute_streak_days(
    auth.uid(),
    (v_completed_at at time zone 'UTC')::date
  );
  v_multiplier := public.streak_multiplier(v_streak_days);

  v_xp := round(v_base_xp::numeric * v_multiplier)::integer;
  v_coins := v_xp;

  insert into public.task_completion (
    task_id, character_id, completed_at, xp_granted, coins_granted, selected_difficulty
  ) values (
    p_task_id, auth.uid(), v_completed_at, v_xp, v_coins, v_difficulty
  );

  update public.character
  set total_xp = total_xp + v_xp,
      coins = coins + v_coins
  where id = auth.uid();

  -- Bump per-dimension XP by deriving the parent dim from the task's sub.
  select dimension_id into v_dim_id
  from public.dimension_sub
  where id = v_task.sub_id;

  if v_dim_id is not null then
    update public.character_dimension
    set xp = xp + v_xp
    where character_id = auth.uid() and dimension_id = v_dim_id;
  end if;

  return json_build_object(
    'xp_granted', v_xp,
    'coins_granted', v_coins,
    'base_xp', v_base_xp,
    'selected_difficulty', v_difficulty,
    'streak_days', v_streak_days,
    'multiplier', v_multiplier
  );
end $$;

grant execute on function public.complete_task(uuid, timestamptz, smallint) to authenticated;

-- ─── 2. delete_task_completion: refund via sub_id ──────────────────────────
create or replace function public.delete_task_completion(p_completion_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_comp record;
  v_dim_id text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_comp
  from public.task_completion
  where id = p_completion_id and character_id = auth.uid();
  if not found then
    raise exception 'Completion not found or not owned by current user';
  end if;

  update public.character
  set total_xp = greatest(0, total_xp - v_comp.xp_granted),
      coins = greatest(0, coins - v_comp.coins_granted)
  where id = auth.uid();

  -- Refund per-dim XP via the task's sub. Joining task→dimension_sub gives
  -- the canonical owning dim; the row may still resolve even if task is
  -- archived (we only need the sub_id).
  select s.dimension_id into v_dim_id
  from public.task t
  join public.dimension_sub s on s.id = t.sub_id
  where t.id = v_comp.task_id;

  if v_dim_id is not null then
    update public.character_dimension
    set xp = greatest(0, xp - v_comp.xp_granted)
    where character_id = auth.uid() and dimension_id = v_dim_id;
  end if;

  delete from public.task_completion where id = p_completion_id;

  return json_build_object(
    'xp_returned', v_comp.xp_granted,
    'coins_returned', v_comp.coins_granted
  );
end $$;

grant execute on function public.delete_task_completion(uuid) to authenticated;

-- ─── 3. start_task_from_template: drop the task_dimension write ────────────
create or replace function public.start_task_from_template(
  p_template_id text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_template public.task_template%rowtype;
  v_new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_template from public.task_template where id = p_template_id;
  if not found then
    raise exception 'Unknown template: %', p_template_id;
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

  return v_new_id;
end $$;

grant execute on function public.start_task_from_template(text) to authenticated;

-- ─── 4. Drop task_dimension ────────────────────────────────────────────────
-- No remaining consumers after this migration. RLS policies and the table
-- go together via cascade.

drop table if exists public.task_dimension;

commit;
