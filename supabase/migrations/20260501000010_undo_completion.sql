-- ============================================================================
-- Undo a task completion.
--
-- task_completion was originally immutable (no UPDATE / DELETE policies).
-- This migration relaxes that for DELETE only — and only via a SECURITY
-- DEFINER RPC that atomically rolls the granted XP / coins / dimension XP
-- back off the character before removing the row.
--
-- - Ownership validated (defense in depth — RLS would also enforce it).
-- - Character totals never go below zero (clamped via greatest()).
-- - The row is removed last so refetches see consistent state.
--
-- Rationale: V1 lets retroactive logging mistakes be reversed for ~the
-- same UX cost as making them, without changing the immutable-history
-- contract for normal task completion (which still uses an INSERT-only
-- RPC).
-- ============================================================================

create or replace function public.delete_task_completion(p_completion_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_comp record;
  v_dim_ids text[];
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

  -- Roll back character totals (clamp at 0 in case of any drift).
  update public.character
  set total_xp = greatest(0, total_xp - v_comp.xp_granted),
      coins = greatest(0, coins - v_comp.coins_granted)
  where id = auth.uid();

  -- Roll back per-dimension XP for every dimension the task earns in.
  select array_agg(dimension_id) into v_dim_ids
  from public.task_dimension
  where task_id = v_comp.task_id;

  if v_dim_ids is not null and array_length(v_dim_ids, 1) > 0 then
    update public.character_dimension
    set xp = greatest(0, xp - v_comp.xp_granted)
    where character_id = auth.uid() and dimension_id = any(v_dim_ids);
  end if;

  delete from public.task_completion where id = p_completion_id;

  return json_build_object(
    'xp_returned', v_comp.xp_granted,
    'coins_returned', v_comp.coins_granted
  );
end $$;

grant execute on function public.delete_task_completion(uuid) to authenticated;
