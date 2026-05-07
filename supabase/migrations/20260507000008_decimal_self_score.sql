-- ============================================================================
-- Decimal self-assessment scores
--
-- Self-assessment is migrating from a 6-step tap-on-pip integer (0..5) to a
-- snap-0.5 slider (11 steps: 0, 0.5, 1, ..., 5). The questionnaire side
-- already writes decimals (since avaliacao_v2). This migration:
--
--   1. Extends `set_sub_score` to accept a nullable `p_score_decimal` and,
--      when provided, treats it as the source of truth — `score` (legacy
--      integer column) is derived by floor() for back-compat with the hex
--      pip count and sparkline anchors.
--   2. Adds `set_sub_scores_bulk(source, jsonb_entries)` so the new "Save"
--      button on the self-assessment screen ships every dirty sub in one
--      RPC round-trip instead of N.
--
-- Both RPCs continue to write a row to `assessment_log` per change so the
-- trendline keeps building.
-- ============================================================================

begin;

create or replace function public.set_sub_score(
  p_source        text,
  p_sub_id        text,
  p_score         smallint,
  p_score_decimal numeric default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_int smallint;
  v_dec numeric;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if p_source not in ('self', 'questionnaire') then
    raise exception 'Invalid source: %', p_source;
  end if;

  -- Decimal path takes precedence: derive integer from it via floor() so
  -- existing readers (hex pip count, sparkline) keep working untouched.
  if p_score_decimal is not null then
    if p_score_decimal < 0 or p_score_decimal > 5 then
      raise exception 'score_decimal must be between 0 and 5, got %', p_score_decimal;
    end if;
    v_dec := round(p_score_decimal::numeric, 2);
    v_int := greatest(0, least(5, floor(v_dec)::int))::smallint;
  else
    if p_score < 0 or p_score > 5 then
      raise exception 'Score must be between 0 and 5, got %', p_score;
    end if;
    v_int := p_score;
    v_dec := null;
  end if;

  if not exists (select 1 from public.dimension_sub where id = p_sub_id) then
    raise exception 'Unknown sub_id: %', p_sub_id;
  end if;

  insert into public.character_sub_score
    (character_id, source, sub_id, score, score_decimal)
  values
    (auth.uid(), p_source, p_sub_id, v_int, v_dec)
  on conflict (character_id, source, sub_id)
  do update set
    score         = excluded.score,
    score_decimal = excluded.score_decimal,
    updated_at    = now();

  insert into public.assessment_log
    (character_id, source, sub_id, score)
  values
    (auth.uid(), p_source, p_sub_id, v_int);
end $$;

-- (CREATE OR REPLACE preserves grants from the original definition.)

-- ─── Bulk variant ─────────────────────────────────────────────────────────
-- Drives the "Save" button on the self-assessment screen. p_entries is a
-- jsonb array of { sub_id, score_decimal } pairs.
create or replace function public.set_sub_scores_bulk(
  p_source  text,
  p_entries jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry jsonb;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if jsonb_typeof(p_entries) <> 'array' then
    raise exception 'p_entries must be a jsonb array';
  end if;

  for v_entry in select * from jsonb_array_elements(p_entries) loop
    perform public.set_sub_score(
      p_source,
      v_entry->>'sub_id',
      null::smallint,
      (v_entry->>'score_decimal')::numeric
    );
  end loop;
end $$;

grant execute on function public.set_sub_scores_bulk(text, jsonb)
  to authenticated;

commit;
