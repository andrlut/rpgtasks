-- ============================================================================
-- Retroactive task completion.
--
-- complete_task() gains an optional p_completed_at timestamptz parameter.
-- When null (default), the function behaves exactly as before — a "live"
-- completion stamped with now(). When provided, the timestamp is used for
-- the task_completion row, enabling the History view's "tap to log
-- retroactively" affordance for days you forgot to mark things done.
--
-- Validation:
--   - p_completed_at must be in the past (≤ now()).
--   - Ownership and archival checks unchanged.
--   - XP/coins granted are identical to a live completion — retroactive
--     marking is honor-system; no penalty.
--
-- task_completion remains immutable: no update/delete policies. If you
-- tap the wrong thing on a retro day, you live with it (V1).
-- ============================================================================

create or replace function public.complete_task(
  p_task_id uuid,
  p_completed_at timestamptz default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task record;
  v_xp integer;
  v_coins integer;
  v_dim_ids text[];
  v_completed_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  v_completed_at := coalesce(p_completed_at, now());

  if v_completed_at > now() then
    raise exception 'Completion timestamp cannot be in the future';
  end if;

  -- ownership check
  select * into v_task
  from public.task
  where id = p_task_id and character_id = auth.uid() and is_archived = false;

  if not found then
    raise exception 'Task not found or not owned by current user';
  end if;

  -- difficulty → XP/coin curve (mirrors app/lib/xp.ts on the client)
  v_xp := case v_task.difficulty
    when 1 then 5
    when 2 then 15
    when 3 then 40
    when 4 then 100
    when 5 then 250
  end;
  v_coins := v_xp;

  -- immutable history row, with caller-supplied (or now()) timestamp
  insert into public.task_completion (task_id, character_id, xp_granted, coins_granted, completed_at)
  values (p_task_id, auth.uid(), v_xp, v_coins, v_completed_at);

  update public.character
  set total_xp = total_xp + v_xp,
      coins = coins + v_coins
  where id = auth.uid();

  select array_agg(dimension_id) into v_dim_ids
  from public.task_dimension
  where task_id = p_task_id;

  if v_dim_ids is not null and array_length(v_dim_ids, 1) > 0 then
    update public.character_dimension
    set xp = xp + v_xp
    where character_id = auth.uid() and dimension_id = any(v_dim_ids);
  end if;

  return json_build_object('xp_granted', v_xp, 'coins_granted', v_coins);
end $$;

grant execute on function public.complete_task(uuid, timestamptz) to authenticated;
