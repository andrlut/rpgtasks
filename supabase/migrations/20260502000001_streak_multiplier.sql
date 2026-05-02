-- ============================================================================
-- Streak XP/coin multiplier.
--
-- Reward formula:  granted = round(base * (1 + 0.01 * streak_days))
-- Cap:             100 days (multiplier capped at 2.0x)
--
-- streak_days = consecutive days backward from "today" (UTC) with at least
-- one daily-task completion BEFORE this completion is inserted. Reasoning:
-- the user's currently-displayed streak is what they think they have right
-- now; this completion is rewarded at that level. Crossing into a new day
-- with this completion bumps the streak — the bonus shows up on the next
-- task they complete that day.
--
-- Timezone caveat: server uses UTC; client useStreak() uses local. There
-- can be a one-day skew near midnight in non-UTC zones. v1 accepts this;
-- a future migration can take an explicit local-date arg.
-- ============================================================================

-- Streak at a given anchor date = consecutive days backward from anchor
-- (or anchor-1 if no completion on anchor) with daily-task completions.
-- The anchor defaults to "today" (UTC). For retroactive completion, we
-- pass the completion date so the multiplier reflects the streak as it
-- existed THEN — closes the exploit of farming retro-completions while
-- on a long current streak.
create or replace function public.compute_streak_days(
  p_character_id uuid,
  p_anchor date default null
)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_anchor date := coalesce(p_anchor, (now() at time zone 'UTC')::date);
  v_cursor date;
  v_streak integer := 0;
  v_has_anchor boolean;
begin
  -- Lookback window: 120 days ending at anchor. Generous enough that
  -- v_streak hitting the 100-day cap is the binding constraint, not the
  -- window. (Older completions are irrelevant for streak counting.)
  with daily_days as (
    select distinct ((tc.completed_at at time zone 'UTC')::date) as d
    from public.task_completion tc
    join public.task t on t.id = tc.task_id
    where tc.character_id = p_character_id
      and t.task_type = 'daily'
      and (tc.completed_at at time zone 'UTC')::date between v_anchor - 120 and v_anchor
  )
  select exists (select 1 from daily_days where d = v_anchor) into v_has_anchor;

  v_cursor := case when v_has_anchor then v_anchor else v_anchor - 1 end;

  loop
    if exists (
      select 1
      from public.task_completion tc
      join public.task t on t.id = tc.task_id
      where tc.character_id = p_character_id
        and t.task_type = 'daily'
        and (tc.completed_at at time zone 'UTC')::date = v_cursor
    ) then
      v_streak := v_streak + 1;
      v_cursor := v_cursor - 1;
    else
      exit;
    end if;

    if v_streak >= 100 then exit; end if;  -- cap matches multiplier cap
  end loop;

  return v_streak;
end $$;

grant execute on function public.compute_streak_days(uuid, date) to authenticated;

create or replace function public.streak_multiplier(p_streak_days integer)
returns numeric
language sql
immutable
as $$
  select least(2.0::numeric, 1.0 + 0.01 * greatest(0, p_streak_days)::numeric);
$$;

grant execute on function public.streak_multiplier(integer) to authenticated;

-- ──────────────────────────────────────────────────────────────────────────
-- complete_task: apply streak multiplier to base reward.
-- Replaces 0007_retroactive_completion's version. Same signature, same
-- ownership / retroactive semantics; only the reward calculation changes.
-- The xp_granted / coins_granted columns now store the *post-multiplier*
-- values, so undo (delete_task_completion) keeps working unchanged.
-- ──────────────────────────────────────────────────────────────────────────

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
  v_base_xp integer;
  v_xp integer;
  v_coins integer;
  v_dim_ids text[];
  v_completed_at timestamptz := coalesce(p_completed_at, now());
  v_streak_days integer;
  v_multiplier numeric;
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

  -- difficulty → base reward (mirrors app/lib/xp.ts on the client)
  v_base_xp := case v_task.difficulty
    when 1 then 5
    when 2 then 15
    when 3 then 40
    when 4 then 100
    when 5 then 250
  end;

  -- Compute streak BEFORE inserting this completion, anchored at the
  -- completion date (UTC). For live taps that's today; for retroactive
  -- log it's the past date — preventing "farm a streak now, log old
  -- completions to harvest the multiplier."
  v_streak_days := public.compute_streak_days(
    auth.uid(),
    (v_completed_at at time zone 'UTC')::date
  );
  v_multiplier := public.streak_multiplier(v_streak_days);

  v_xp := round(v_base_xp::numeric * v_multiplier)::integer;
  v_coins := v_xp;

  -- immutable history row (stores post-multiplier values)
  insert into public.task_completion (task_id, character_id, completed_at, xp_granted, coins_granted)
  values (p_task_id, auth.uid(), v_completed_at, v_xp, v_coins);

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

  return json_build_object(
    'xp_granted', v_xp,
    'coins_granted', v_coins,
    'base_xp', v_base_xp,
    'streak_days', v_streak_days,
    'multiplier', v_multiplier
  );
end $$;

grant execute on function public.complete_task(uuid, timestamptz) to authenticated;
