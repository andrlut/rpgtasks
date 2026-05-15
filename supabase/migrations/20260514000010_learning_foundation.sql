-- ============================================================================
-- Learning module — system catalog of bilingual material + per-user read log.
--
-- The 4th frente (item 4 in docs/v3-overview.html): visual, short, in-app
-- content tied to subs. No `personal` counterpart by design — Learning is
-- curated content, dropped periodically by the maintainer. Users only have
-- a read log + the XP/coins they earned by reading.
--
-- Tables:
--   learning_material      catalog of materials (bilingual). 3 types:
--                          'summary'  — resumo de algo externo (+ source)
--                          'news'     — notícia (+ source, data)
--                          'explainer' — texto sobre algo do app
--   learning_material_sub  N-to-1 sub relation (optional). Each related sub
--                          contributes +5 XP/coins to that sub's parent dim
--                          when the user marks the material as read.
--   learning_view          per-user read log. UNIQUE on (character, material)
--                          — re-reads grant no XP.
--
-- RPC:
--   mark_material_read(slug)  idempotent. Credits 5 base XP (to material's
--                             primary `dimension_id`) plus 5 XP per related
--                             sub (to each sub's parent dim). Same totals
--                             credited as coins. Returns the xp/coins paid
--                             on first read; { already_read: true } on repeat.
--
-- XP invariant preserved: total_xp = sum of dim XPs. Base 5 always lands on
-- the material's `dimension_id`, so 0-sub materials still credit a dim.
-- ============================================================================

begin;

-- ─── 1. learning_material ────────────────────────────────────────────────

create table public.learning_material (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  type text not null check (type in ('summary', 'news', 'explainer')),

  dimension_id text not null references public.dimension(id) on delete restrict,
  topic text not null,                          -- 'sleep', 'focus', 'habits', etc.
  reading_minutes integer not null default 3 check (reading_minutes between 1 and 60),

  title_pt text not null,
  title_en text not null,
  summary_pt text not null,                     -- 1–2 line teaser shown in the feed card
  summary_en text not null,
  body_pt text not null,                        -- markdown w/ custom directives
  body_en text not null,

  hero_image_url text,                          -- nullable: feed shows icon if absent
  source_url text,                              -- for summary/news
  source_label_pt text,                         -- e.g. "Walker (2017)"
  source_label_en text,

  cta_action jsonb,                             -- e.g. {"kind":"start_task","template_slug":"..."}

  released_at timestamptz not null default now(),
  version integer not null default 1,
  is_archived boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index learning_material_released_idx
  on public.learning_material (released_at desc)
  where is_archived = false;

create index learning_material_dim_idx
  on public.learning_material (dimension_id)
  where is_archived = false;

alter table public.learning_material enable row level security;

create policy "learning_material_read_authenticated"
  on public.learning_material for select
  to authenticated using (true);

create trigger learning_material_touch_updated_at
  before update on public.learning_material
  for each row execute function public.touch_updated_at();

-- ─── 2. learning_material_sub (N-to-1 sub join) ──────────────────────────

create table public.learning_material_sub (
  material_id uuid not null references public.learning_material(id) on delete cascade,
  sub_id text not null references public.dimension_sub(id) on delete restrict,
  primary key (material_id, sub_id)
);

create index learning_material_sub_sub_idx
  on public.learning_material_sub (sub_id);

alter table public.learning_material_sub enable row level security;

create policy "learning_material_sub_read_authenticated"
  on public.learning_material_sub for select
  to authenticated using (true);

-- ─── 3. learning_view (per-user read log) ────────────────────────────────

create table public.learning_view (
  character_id uuid not null references public.character(id) on delete cascade,
  material_id uuid not null references public.learning_material(id) on delete cascade,
  read_at timestamptz not null default now(),
  xp_awarded integer not null check (xp_awarded >= 0),
  coins_awarded integer not null check (coins_awarded >= 0),
  primary key (character_id, material_id)
);

create index learning_view_character_idx
  on public.learning_view (character_id, read_at desc);

alter table public.learning_view enable row level security;

create policy "learning_view_self_select" on public.learning_view
  for select to authenticated using (character_id = auth.uid());

create policy "learning_view_self_insert" on public.learning_view
  for insert to authenticated with check (character_id = auth.uid());
-- learning_view is immutable: no update/delete policies.

-- ─── 4. RPC: mark_material_read(slug) ────────────────────────────────────

create or replace function public.mark_material_read(p_slug text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_material record;
  v_existing record;
  v_sub_count integer;
  v_xp_per_sub constant integer := 5;
  v_xp_base constant integer := 5;
  v_total_xp integer;
  v_total_coins integer;
  v_elem record;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_material
  from public.learning_material
  where slug = p_slug and is_archived = false;
  if not found then
    raise exception 'Material not found: %', p_slug;
  end if;

  -- Idempotent: if already read, return early with the snapshot.
  select * into v_existing
  from public.learning_view
  where character_id = auth.uid() and material_id = v_material.id;
  if found then
    return json_build_object(
      'already_read', true,
      'xp_awarded', v_existing.xp_awarded,
      'coins_awarded', v_existing.coins_awarded
    );
  end if;

  select count(*) into v_sub_count
  from public.learning_material_sub
  where material_id = v_material.id;

  v_total_xp := v_xp_base + (v_xp_per_sub * v_sub_count);
  v_total_coins := v_total_xp;

  insert into public.learning_view (character_id, material_id, xp_awarded, coins_awarded)
  values (auth.uid(), v_material.id, v_total_xp, v_total_coins);

  -- Base 5 always lands on the material's primary dim (preserves total_xp = sum(dim_xp)).
  update public.character_dimension
  set xp = xp + v_xp_base
  where character_id = auth.uid() and dimension_id = v_material.dimension_id;

  -- +5 to each related sub's parent dim.
  for v_elem in
    select ds.dimension_id
    from public.learning_material_sub lms
    join public.dimension_sub ds on ds.id = lms.sub_id
    where lms.material_id = v_material.id
  loop
    update public.character_dimension
    set xp = xp + v_xp_per_sub
    where character_id = auth.uid() and dimension_id = v_elem.dimension_id;
  end loop;

  update public.character
  set total_xp = total_xp + v_total_xp,
      coins = coins + v_total_coins
  where id = auth.uid();

  return json_build_object(
    'already_read', false,
    'xp_awarded', v_total_xp,
    'coins_awarded', v_total_coins
  );
end $$;

grant execute on function public.mark_material_read(text) to authenticated;

commit;
