-- ============================================================================
-- Psych — self-knowledge prep
--
-- Unblocks Big Five (IPIP-NEO 120-style), Schwartz PVQ-RR and ECR-R by:
--
--   1. Adding `scale_labels jsonb` to psych_instrument so a uniform Likert
--      scale (PT + EN labels) can be defined once at the instrument level
--      instead of repeating it on every item. avaliacao_v1/v2 keep their
--      per-item options_jsonb (each prompt has bespoke labels like "1-2
--      noites" / "3-4 dias"); the new instruments leave options_jsonb null
--      and inherit instrument.scale_labels.
--
--   2. Adding `scoring_method` to psych_instrument so _psych_score_session
--      dispatches declaratively per instrument:
--        - 'wellbeing_decimal'  (avaliacao_v1, avaliacao_v2 — existing math)
--        - 'big_five_sum'       (sum-with-reverse: leaf facet → trait)
--        - 'schwartz_centered'  (mean − person_mean: value → meta-value)
--        - 'ecr_mean'           (mean-with-reverse on a 1..7 scale)
--
--   3. Making psych_item.options_jsonb nullable.
--
--   4. Surfacing `scale_labels` in start_psych_session's response envelope
--      so the client can render a uniform Likert when an item carries no
--      options of its own.
--
-- The Big Five / Schwartz / ECR-R item rows themselves arrive in their own
-- migrations (PRs #120, #122, #123). This migration only prepares the
-- schema + scoring + transport.
-- ============================================================================

begin;

-- ─── 1. Schema additions ───────────────────────────────────────────────────

alter table public.psych_instrument
  add column scale_labels   jsonb,
  add column scoring_method text not null default 'wellbeing_decimal';

alter table public.psych_instrument
  add constraint psych_instrument_scoring_method_check
    check (scoring_method in (
      'wellbeing_decimal',
      'big_five_sum',
      'schwartz_centered',
      'ecr_mean'
    ));

-- Backfill existing rows (the default already covers them, but make it
-- explicit for legibility in psql / Studio).
update public.psych_instrument
   set scoring_method = 'wellbeing_decimal'
 where id in ('avaliacao_v1', 'avaliacao_v2');

alter table public.psych_item
  alter column options_jsonb drop not null;

comment on column public.psych_instrument.scale_labels is
  'Optional uniform Likert labels (e.g. {"pt":[{"label":"Discordo totalmente","value":1},...],"en":[...]}). Used when items leave options_jsonb null. Wellbeing instruments keep this null.';

comment on column public.psych_instrument.scoring_method is
  'Declarative scoring rule. Dispatcher key for _psych_score_session. See migration 20260507000004 for the four supported values.';

comment on column public.psych_item.options_jsonb is
  'Per-item Likert options. NULL → fall back to psych_instrument.scale_labels.';

-- ─── 2. Scoring helper: dispatch on scoring_method ─────────────────────────

create or replace function public._psych_score_session(
  p_session_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inst   text;
  v_method text;
begin
  select s.instrument_id, i.scoring_method
    into v_inst, v_method
  from public.psych_session s
  join public.psych_instrument i on i.id = s.instrument_id
  where s.id = p_session_id;

  if v_inst is null then
    raise exception 'Session % not found', p_session_id;
  end if;

  delete from public.psych_score where session_id = p_session_id;

  -- ---- wellbeing_decimal ----
  -- Same logic as migration 002: every facet gets a [0,5] decimal averaged
  -- across its own items + items of its direct children.
  if v_method = 'wellbeing_decimal' then
    insert into public.psych_score (session_id, facet_id, score_decimal)
    select
      pa.session_id,
      f.id,
      greatest(0::numeric, least(5::numeric, avg(
        case when pi.reverse_scored
             then ((6 - pa.raw_value) - 1) / 4.0
             else (pa.raw_value - 1) / 4.0
        end
      ) * 5))::numeric(6,3)
    from public.psych_facet f
    join public.psych_item pi on (
      pi.facet_id = f.id
      or pi.facet_id in (
        select c.id from public.psych_facet c where c.parent_facet_id = f.id
      )
    )
    join public.psych_answer pa
      on pa.item_id = pi.id and pa.session_id = p_session_id
    where f.instrument_id = v_inst
    group by pa.session_id, f.id;

  -- ---- big_five_sum ----
  -- Per leaf facet (parent_facet_id is not null): sum of raw values, with
  -- reverse-scored items mapped via (scale_max + 1 - raw) on a 1..5 scale,
  -- giving a per-facet score in [item_count, item_count*scale_max] (e.g.
  -- 4 items × 1..5 → [4, 20]).
  -- Per parent facet (trait, parent_facet_id is null): sum of its leaves'
  -- scores (e.g. 6 facets × [4,20] → [24, 120]).
  elsif v_method = 'big_five_sum' then
    insert into public.psych_score (session_id, facet_id, score_decimal)
    select pa.session_id, pi.facet_id,
      sum(case when pi.reverse_scored
               then (6 - pa.raw_value)
               else pa.raw_value end)::numeric(6,3)
    from public.psych_answer pa
    join public.psych_item  pi on pi.id = pa.item_id
    join public.psych_facet f  on f.id  = pi.facet_id
    where pa.session_id = p_session_id
      and f.parent_facet_id is not null
    group by pa.session_id, pi.facet_id;

    insert into public.psych_score (session_id, facet_id, score_decimal)
    select p_session_id, parent.id,
      sum(ps.score_decimal)::numeric(6,3)
    from public.psych_facet parent
    join public.psych_facet child on child.parent_facet_id = parent.id
    join public.psych_score ps    on ps.facet_id = child.id
                                  and ps.session_id = p_session_id
    where parent.instrument_id = v_inst
      and parent.parent_facet_id is null
    group by parent.id;

  -- ---- schwartz_centered ----
  -- Schwartz-style ipsative correction: for each leaf value, store
  --   centered = mean(raw_for_value) - mean(raw_for_session).
  -- This neutralises acquiescence bias (people who tend to mark high on
  -- everything). Meta-values (4 higher-order groups) average their child
  -- centered scores. Range is roughly [-(scale_max-1), +(scale_max-1)].
  elsif v_method = 'schwartz_centered' then
    insert into public.psych_score (session_id, facet_id, score_decimal)
    select pa.session_id, pi.facet_id,
      (avg(pa.raw_value) - (
        select avg(pa2.raw_value)::numeric
        from public.psych_answer pa2
        where pa2.session_id = p_session_id
      ))::numeric(6,3)
    from public.psych_answer pa
    join public.psych_item  pi on pi.id = pa.item_id
    join public.psych_facet f  on f.id  = pi.facet_id
    where pa.session_id = p_session_id
      and f.parent_facet_id is not null
    group by pa.session_id, pi.facet_id;

    insert into public.psych_score (session_id, facet_id, score_decimal)
    select p_session_id, parent.id,
      avg(ps.score_decimal)::numeric(6,3)
    from public.psych_facet parent
    join public.psych_facet child on child.parent_facet_id = parent.id
    join public.psych_score ps    on ps.facet_id = child.id
                                  and ps.session_id = p_session_id
    where parent.instrument_id = v_inst
      and parent.parent_facet_id is null
    group by parent.id;

  -- ---- ecr_mean ----
  -- Per-facet mean of raw values with reverse-coding via (8 - raw) on a
  -- 1..7 scale. ECR-R has only 2 facets (anxiety, avoidance) — no parent
  -- rollup. The 4 attachment styles (secure / anxious / avoidant / fearful)
  -- are derived in the client from the two scale means.
  elsif v_method = 'ecr_mean' then
    insert into public.psych_score (session_id, facet_id, score_decimal)
    select pa.session_id, pi.facet_id,
      avg(case when pi.reverse_scored
               then (8 - pa.raw_value)
               else pa.raw_value end)::numeric(6,3)
    from public.psych_answer pa
    join public.psych_item pi on pi.id = pa.item_id
    where pa.session_id = p_session_id
      and pi.facet_id is not null
    group by pa.session_id, pi.facet_id;

  else
    raise notice 'Unknown scoring_method: %', v_method;
  end if;
end $$;

-- ─── 3. RPC: surface scale_labels in start_psych_session ──────────────────
-- Adds `scale_labels` to the response envelope so the client can render a
-- uniform Likert when an item carries no options of its own. Existing
-- consumers of the envelope continue to read `items[]`; the new field is
-- additive.

create or replace function public.start_psych_session(
  p_instrument_id text
) returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user         uuid := auth.uid();
  v_session_id   uuid;
  v_items        json;
  v_scale_labels jsonb;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;
  if not exists (
    select 1 from public.psych_instrument
    where id = p_instrument_id and is_active
  ) then
    raise exception 'Unknown or inactive instrument: %', p_instrument_id;
  end if;

  insert into public.psych_session (character_id, instrument_id)
  values (v_user, p_instrument_id)
  returning id into v_session_id;

  perform public.psych_seed_session_items(v_session_id);

  select coalesce(json_agg(row_to_json(x)), '[]'::json) into v_items
  from (
    select
      pi.id             as item_id,
      psi.position      as position,
      pi.text_pt        as text_pt,
      pi.text_en        as text_en,
      pi.options_jsonb  as options,
      pi.facet_id       as facet_id,
      pi.reverse_scored as reverse_scored
    from public.psych_session_item psi
    join public.psych_item pi on pi.id = psi.item_id
    where psi.session_id = v_session_id
    order by psi.position
  ) x;

  select scale_labels into v_scale_labels
  from public.psych_instrument
  where id = p_instrument_id;

  return json_build_object(
    'session_id',    v_session_id,
    'instrument_id', p_instrument_id,
    'items',         v_items,
    'scale_labels',  v_scale_labels
  );
end $$;

grant execute on function public.start_psych_session(text) to authenticated;

commit;
