-- migration: 20260707000002_fix_create_custom_skill_pt_columns.sql
-- purpose: Fix a pre-existing bug that broke ALL custom skill creation.
--          `create_custom_skill` inserted only into skill.display_name / .unit,
--          but the bilingual-catalog migration made skill.display_name_pt and
--          skill.unit_pt NOT NULL. Every insert therefore failed with
--          "null value in column display_name_pt violates not-null constraint",
--          surfacing as "erro desconhecido" in skill-form.
--
-- affected tables: none (RPC only)
-- new rpcs:        none (CREATE OR REPLACE of create_custom_skill)
-- breaking?        no — restores intended behaviour. For a user-created skill
--                  the pt columns mirror the single value the user typed.
--
-- notes:
--   Discovered while testing Premium P1.1; unrelated to the tier limits.
--   Migrations are write-once; never edit after applying.

begin;

create or replace function public.create_custom_skill(p_payload jsonb)
returns text
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_id text;
  v_user_id uuid;
  v_dim text;
  v_sub text;
  v_sub_dim text;
  v_display_name text;
  v_unit text;
  v_desc text;
  v_tier jsonb;
  v_idx int;
  v_seen_tiers text[];
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  v_display_name := trim(coalesce(p_payload->>'display_name', ''));
  if v_display_name = '' then
    raise exception 'display_name required';
  end if;

  v_unit := trim(coalesce(p_payload->>'unit', ''));
  if v_unit = '' then
    raise exception 'unit required';
  end if;

  v_dim := p_payload->>'dimension_id';
  if v_dim is null then
    raise exception 'dimension_id required';
  end if;
  if not exists (select 1 from public.dimension where id = v_dim) then
    raise exception 'unknown dimension_id: %', v_dim;
  end if;

  -- Optional sub_id, with parent-dim consistency check.
  v_sub := nullif(p_payload->>'sub_id', '');
  if v_sub is not null then
    select dimension_id into v_sub_dim
      from public.dimension_sub where id = v_sub;
    if v_sub_dim is null then
      raise exception 'unknown sub_id: %', v_sub;
    end if;
    if v_sub_dim <> v_dim then
      raise exception 'sub_id % parents dimension % but dimension_id is %',
        v_sub, v_sub_dim, v_dim;
    end if;
  end if;

  if jsonb_typeof(p_payload->'tiers') <> 'array'
     or jsonb_array_length(p_payload->'tiers') <> 5 then
    raise exception 'tiers must be an array of 5 entries (beginner..master)';
  end if;

  v_desc := nullif(trim(coalesce(p_payload->>'description', '')), '');
  v_id := 'custom_' || replace(gen_random_uuid()::text, '-', '');

  -- FIX: also populate the NOT NULL bilingual columns (display_name_pt,
  -- unit_pt) and description_pt. A user-created skill has one value per field,
  -- so pt mirrors the typed value.
  insert into public.skill (
    id, display_name, display_name_pt, unit, unit_pt, dimension_id, sub_id, icon,
    sort_order, description, description_pt, character_id
  ) values (
    v_id,
    v_display_name,
    v_display_name,
    v_unit,
    v_unit,
    v_dim,
    v_sub,
    coalesce(p_payload->>'icon', 'flash'),
    coalesce((p_payload->>'sort_order')::int, 999),
    v_desc,
    v_desc,
    v_user_id
  );

  v_idx := 0;
  v_seen_tiers := array[]::text[];
  for v_tier in select * from jsonb_array_elements(p_payload->'tiers') loop
    v_idx := v_idx + 1;
    if v_tier->>'tier_name' is null
       or v_tier->>'tier_name' not in ('beginner', 'bronze', 'silver', 'gold', 'master') then
      raise exception 'invalid tier_name at index %: %', v_idx, v_tier->>'tier_name';
    end if;
    if v_tier->>'tier_name' = any(v_seen_tiers) then
      raise exception 'duplicate tier_name: %', v_tier->>'tier_name';
    end if;
    v_seen_tiers := v_seen_tiers || (v_tier->>'tier_name');

    insert into public.skill_tier (
      id, skill_id, tier_name, threshold, sort_order, description, percentile
    ) values (
      v_id || '_' || (v_tier->>'tier_name'),
      v_id,
      v_tier->>'tier_name',
      coalesce((v_tier->>'threshold')::int, 0),
      v_idx,
      nullif(trim(coalesce(v_tier->>'description', '')), ''),
      nullif(v_tier->>'percentile', '')::numeric
    );
  end loop;

  return v_id;
end;
$function$;

commit;
