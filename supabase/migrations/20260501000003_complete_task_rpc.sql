-- ============================================================================
-- complete_task(p_task_id) — atomic server-side task completion.
--
-- - Verifies the task belongs to the authenticated user (defense in depth
--   beyond RLS — RLS is bypassed inside SECURITY DEFINER).
-- - Computes XP/coins from task difficulty (single source of truth).
-- - Inserts an immutable task_completion row.
-- - Updates character.total_xp + character.coins.
-- - Updates character_dimension.xp for every dimension linked to the task.
-- - Returns the granted XP + coins so the client can show feedback.
-- ============================================================================

create or replace function public.complete_task(p_task_id uuid)
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
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- ownership check (also makes function safe under SECURITY DEFINER)
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

  -- immutable history row
  insert into public.task_completion (task_id, character_id, xp_granted, coins_granted)
  values (p_task_id, auth.uid(), v_xp, v_coins);

  -- bump character totals
  update public.character
  set total_xp = total_xp + v_xp,
      coins = coins + v_coins
  where id = auth.uid();

  -- bump per-dimension XP for every dimension this task earns in
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

-- callable by any authenticated user (function itself enforces ownership)
grant execute on function public.complete_task(uuid) to authenticated;
