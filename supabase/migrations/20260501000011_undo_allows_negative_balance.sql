-- ============================================================================
-- Allow undo to drive balance negative (close redeem-then-undo exploit).
--
-- The previous delete_task_completion clamped totals at 0 with greatest().
-- That created a free-reward exploit:
--   1. Complete task: +40 coins
--   2. Redeem 40-coin reward: 0 coins, reward granted
--   3. Undo task: should be -40, but clamped to 0 → free reward
--
-- Now: undo deducts the full granted amount unconditionally. If the user
-- has spent the rewards already, balance goes negative and they have to
-- earn it back before redeeming again. Honor system + numbers that
-- actually add up.
--
-- Per-dimension XP and total_xp are also unclamped for symmetry. Going
-- negative there is rare (you'd have to redeem something against XP, which
-- isn't a thing) but the same principle applies.
--
-- Drops the >= 0 CHECK constraints on character.total_xp / character.coins /
-- character_dimension.xp so the UPDATE in the function doesn't fail.
-- The original positive-only invariant was the source of the exploit.
-- ============================================================================

-- Find and drop the old "coins >= 0" / "total_xp >= 0" / "xp >= 0" check constraints.
-- They were created inline so Postgres named them character_coins_check etc.
do $$
declare
  c record;
begin
  for c in
    select conname, conrelid::regclass::text as table_name
    from pg_constraint
    where contype = 'c'
      and connamespace = 'public'::regnamespace
      and conrelid::regclass::text in ('character', 'character_dimension')
  loop
    -- Heuristic: drop the check that pins a coin/xp column non-negative.
    -- Safe because we own these tables and the only relevant checks are the
    -- non-negative pins from migration 0001.
    if pg_get_constraintdef((select oid from pg_constraint where conname = c.conname and conrelid::regclass::text = c.table_name))
       ~* '(coins|xp|total_xp)\s*>=\s*0' then
      execute format('alter table public.%I drop constraint %I', c.table_name, c.conname);
    end if;
  end loop;
end $$;

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

  -- Roll back character totals — UNCLAMPED so undo-after-redeem
  -- correctly produces a debt the user must earn back.
  update public.character
  set total_xp = total_xp - v_comp.xp_granted,
      coins = coins - v_comp.coins_granted
  where id = auth.uid();

  -- Roll back per-dimension XP. Also unclamped for accounting consistency.
  select array_agg(dimension_id) into v_dim_ids
  from public.task_dimension
  where task_id = v_comp.task_id;

  if v_dim_ids is not null and array_length(v_dim_ids, 1) > 0 then
    update public.character_dimension
    set xp = xp - v_comp.xp_granted
    where character_id = auth.uid() and dimension_id = any(v_dim_ids);
  end if;

  delete from public.task_completion where id = p_completion_id;

  return json_build_object(
    'xp_returned', v_comp.xp_granted,
    'coins_returned', v_comp.coins_granted
  );
end $$;
