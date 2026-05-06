-- ============================================================================
-- Tasks: drop the total stars-per-task cap.
--
-- The previous model capped sum(stars) ≤ 5 across a task's subs. The user
-- found this too restrictive — legitimate sessions like "2h tennis with a
-- close friend during my main hobby" honestly read as 3 dex + 3 bonds +
-- 3 play (9 stars total), and the cap was forcing those into ugly shapes.
--
-- The exponential XP curve already self-regulates: a 1+1+1+...+1 (10★)
-- task only nets 50 XP, far less than a single honest 4★ (100 XP), so
-- there's no incentive to inflate. Per-sub remains capped at 5 — that
-- single ceiling protects against "this single training was so heavy it
-- counts as 7 stars of strength."
--
-- Touches:
--   1. task_completion.total_stars CHECK loosened (was 1..5, now >= 1)
--   2. set_task_subs RPC: drop the cap-5 sum validation
--   3. complete_task RPC: drop the override cap + the least(...,5) clamp
-- ============================================================================

begin;

-- ─── 1. Loosen the total_stars CHECK on task_completion ────────────────
do $$
declare
  c text;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.task_completion'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%total_stars%'
  loop
    execute format('alter table public.task_completion drop constraint %I', c);
  end loop;
end $$;

alter table public.task_completion
  add constraint task_completion_total_stars_positive
  check (total_stars >= 1);

-- ─── 2. set_task_subs: drop the cap-5 sum validation ───────────────────
create or replace function public.set_task_subs(
  p_task_id uuid,
  p_subs jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer;
  v_owner uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select character_id into v_owner from public.task where id = p_task_id;
  if v_owner is null then
    raise exception 'Task not found';
  end if;
  if v_owner <> auth.uid() then
    raise exception 'Task not owned by current user';
  end if;

  if jsonb_typeof(p_subs) <> 'array' then
    raise exception 'p_subs must be a JSON array';
  end if;
  if jsonb_array_length(p_subs) = 0 then
    raise exception 'At least one sub is required';
  end if;

  select sum((elem->>'stars')::int) into v_total
  from jsonb_array_elements(p_subs) elem;

  if v_total is null or v_total < 1 then
    raise exception 'Stars must be ≥ 1';
  end if;

  -- Per-sub stars must be 1..5 (the single hard cap that remains).
  if exists (
    select 1 from jsonb_array_elements(p_subs) elem
    where (elem->>'stars')::int < 1 or (elem->>'stars')::int > 5
  ) then
    raise exception 'Each sub must have 1..5 stars';
  end if;

  delete from public.task_sub where task_id = p_task_id;

  insert into public.task_sub (task_id, sub_id, stars)
  select
    p_task_id,
    elem->>'sub_id',
    (elem->>'stars')::int
  from jsonb_array_elements(p_subs) elem;
end $$;

grant execute on function public.set_task_subs(uuid, jsonb) to authenticated;

-- ─── 3. complete_task: drop the override cap + the clamp ───────────────
create or replace function public.complete_task(
  p_task_id uuid,
  p_completed_at timestamptz default null,
  p_sub_overrides jsonb default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task record;
  v_completion_id uuid;
  v_completed_at timestamptz := coalesce(p_completed_at, now());
  v_streak_days integer;
  v_multiplier numeric;
  v_total_xp integer := 0;
  v_total_coins integer := 0;
  v_total_stars integer := 0;
  v_subs jsonb;
  v_elem jsonb;
  v_sub_id text;
  v_stars int;
  v_dim_id text;
  v_base_xp integer;
  v_xp integer;
  v_coins integer;
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

  if p_sub_overrides is not null and jsonb_array_length(p_sub_overrides) > 0 then
    v_subs := p_sub_overrides;
    -- No total cap; per-sub cap (1..5) enforced inside the loop below.
  else
    select coalesce(jsonb_agg(jsonb_build_object('sub_id', sub_id, 'stars', stars)), '[]'::jsonb)
    into v_subs
    from public.task_sub
    where task_id = p_task_id;
    if v_subs is null or jsonb_array_length(v_subs) = 0 then
      raise exception 'Task has no subs configured';
    end if;
  end if;

  v_streak_days := public.compute_streak_days(
    auth.uid(),
    (v_completed_at at time zone 'UTC')::date
  );
  v_multiplier := public.streak_multiplier(v_streak_days);

  insert into public.task_completion (
    task_id, character_id, completed_at, xp_granted, coins_granted, total_stars
  ) values (
    p_task_id, auth.uid(), v_completed_at, 0, 0, 1
  )
  returning id into v_completion_id;

  for v_elem in select * from jsonb_array_elements(v_subs) loop
    v_sub_id := v_elem->>'sub_id';
    v_stars := (v_elem->>'stars')::int;
    if v_stars < 1 or v_stars > 5 then
      raise exception 'Invalid stars value % for sub % (per-sub cap is 1..5)', v_stars, v_sub_id;
    end if;

    v_base_xp := case v_stars
      when 1 then 5
      when 2 then 15
      when 3 then 40
      when 4 then 100
      when 5 then 250
    end;
    v_xp := round(v_base_xp::numeric * v_multiplier)::integer;
    v_coins := v_xp;

    insert into public.task_completion_sub (
      completion_id, sub_id, stars, xp_granted, coins_granted
    ) values (
      v_completion_id, v_sub_id, v_stars, v_xp, v_coins
    );

    select dimension_id into v_dim_id from public.dimension_sub where id = v_sub_id;
    if v_dim_id is not null then
      update public.character_dimension
      set xp = xp + v_xp
      where character_id = auth.uid() and dimension_id = v_dim_id;
    end if;

    v_total_xp := v_total_xp + v_xp;
    v_total_coins := v_total_coins + v_coins;
    v_total_stars := v_total_stars + v_stars;
  end loop;

  -- Cached total_stars on the parent row — no clamp now that the cap is gone.
  update public.task_completion
  set xp_granted = v_total_xp,
      coins_granted = v_total_coins,
      total_stars = v_total_stars
  where id = v_completion_id;

  update public.character
  set total_xp = total_xp + v_total_xp,
      coins = coins + v_total_coins
  where id = auth.uid();

  return json_build_object(
    'completion_id', v_completion_id,
    'xp_granted', v_total_xp,
    'coins_granted', v_total_coins,
    'total_stars', v_total_stars,
    'streak_days', v_streak_days,
    'multiplier', v_multiplier
  );
end $$;

grant execute on function public.complete_task(uuid, timestamptz, jsonb) to authenticated;

commit;
