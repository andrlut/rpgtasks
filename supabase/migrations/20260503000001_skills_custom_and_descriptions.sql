-- ============================================================================
-- Skills: descriptions, percentile tiers, and user-created custom skills.
--
-- 1. skill.description       — what this skill is, why it matters (~1-3 frases)
-- 2. skill_tier.description  — what reaching this tier means in plain English
-- 3. skill_tier.percentile   — % of adult population that achieves this tier
--                              (e.g. 50 = top 50%, 5 = top 5%). Optional, used
--                              for "you're better than ~X% of adults" copy.
-- 4. skill.character_id      — owner; NULL means catalog (public read).
--                              Non-NULL means user-created (self-only access).
-- 5. RPC create_custom_skill — atomic insert of skill + 5 tiers.
-- ============================================================================

-- ─── columns ──────────────────────────────────────────────────────────────

alter table public.skill
  add column description text;

alter table public.skill_tier
  add column description text,
  add column percentile numeric check (percentile is null or (percentile >= 0 and percentile <= 100));

alter table public.skill
  add column character_id uuid references public.character(id) on delete cascade;

create index skill_character_id_idx on public.skill (character_id);

-- ─── RLS: skill ───────────────────────────────────────────────────────────
-- Replace the catalog-only read policy with one that also lets users see
-- their own custom skills, plus insert/update/delete on their own.

drop policy if exists "skill_read_authenticated" on public.skill;

create policy "skill_read_catalog_or_own" on public.skill
  for select to authenticated
  using (character_id is null or character_id = auth.uid());

create policy "skill_insert_self" on public.skill
  for insert to authenticated
  with check (character_id = auth.uid());

create policy "skill_update_self" on public.skill
  for update to authenticated
  using (character_id = auth.uid())
  with check (character_id = auth.uid());

create policy "skill_delete_self" on public.skill
  for delete to authenticated
  using (character_id = auth.uid());

-- ─── RLS: skill_tier ──────────────────────────────────────────────────────
-- Same idea: anyone authenticated can read all tiers (catalog or theirs),
-- but write access is gated by ownership of the parent skill.

drop policy if exists "skill_tier_read_authenticated" on public.skill_tier;

create policy "skill_tier_read_catalog_or_own" on public.skill_tier
  for select to authenticated
  using (
    exists (
      select 1 from public.skill s
      where s.id = skill_tier.skill_id
        and (s.character_id is null or s.character_id = auth.uid())
    )
  );

create policy "skill_tier_insert_for_own_skill" on public.skill_tier
  for insert to authenticated
  with check (
    exists (
      select 1 from public.skill s
      where s.id = skill_tier.skill_id
        and s.character_id = auth.uid()
    )
  );

create policy "skill_tier_update_for_own_skill" on public.skill_tier
  for update to authenticated
  using (
    exists (
      select 1 from public.skill s
      where s.id = skill_tier.skill_id
        and s.character_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.skill s
      where s.id = skill_tier.skill_id
        and s.character_id = auth.uid()
    )
  );

create policy "skill_tier_delete_for_own_skill" on public.skill_tier
  for delete to authenticated
  using (
    exists (
      select 1 from public.skill s
      where s.id = skill_tier.skill_id
        and s.character_id = auth.uid()
    )
  );

-- ─── RPC: create_custom_skill ─────────────────────────────────────────────
-- Atomic insert of skill + its tier ladder. Caller passes:
--   {
--     "display_name": "Burpees",
--     "unit": "reps",
--     "dimension_id": "strength",
--     "icon": "fitness",
--     "description": "Full-body conditioning movement.",
--     "tiers": [
--       { "tier_name": "beginner", "threshold": 0,  "description": "...", "percentile": 80 },
--       { "tier_name": "bronze",   "threshold": 5,  ... },
--       { "tier_name": "silver",   "threshold": 15, ... },
--       { "tier_name": "gold",     "threshold": 30, ... },
--       { "tier_name": "master",   "threshold": 50, ... }
--     ]
--   }
-- Returns the new skill id (custom_<uuid>).

create or replace function public.create_custom_skill(p_payload jsonb)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text;
  v_user_id uuid;
  v_dim text;
  v_display_name text;
  v_unit text;
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

  if jsonb_typeof(p_payload->'tiers') <> 'array'
     or jsonb_array_length(p_payload->'tiers') <> 5 then
    raise exception 'tiers must be an array of 5 entries (beginner..master)';
  end if;

  v_id := 'custom_' || replace(gen_random_uuid()::text, '-', '');

  insert into public.skill (
    id, display_name, unit, dimension_id, icon, sort_order, description, character_id
  ) values (
    v_id,
    v_display_name,
    v_unit,
    v_dim,
    coalesce(p_payload->>'icon', 'flash'),
    coalesce((p_payload->>'sort_order')::int, 999),
    nullif(trim(coalesce(p_payload->>'description', '')), ''),
    v_user_id
  );

  v_idx := 0;
  v_seen_tiers := array[]::text[];
  for v_tier in select * from jsonb_array_elements(p_payload->'tiers') loop
    v_idx := v_idx + 1;
    if v_tier->>'tier_name' is null
       or v_tier->>'tier_name' not in ('beginner','bronze','silver','gold','master') then
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
$$;

grant execute on function public.create_custom_skill(jsonb) to authenticated;

comment on function public.create_custom_skill(jsonb) is
  'Atomic insert of a user-owned skill + its 5 tier ladder. Returns new skill id.';
