-- ============================================================================
-- Questionnaire — structured periodic assessment to act as the objective
-- "anchor" that the self-assessment is checked against.
--
-- Each session writes:
--   1. raw answers (1..5 per question)
--   2. derived 12 sub scores (floor(mean(normalized) * 5)) into
--      character_sub_score(source='questionnaire')
--   3. 12 assessment_log rows tied to the session_id (timeline grátis)
--
-- All three steps happen atomically inside submit_questionnaire(). The math
-- mirrors the client-side preview implementation in app/lib/assessment/derive.ts.
--
-- New tables:
--   questionnaire_session(id, character_id, taken_at, duration_seconds)
--   questionnaire_answer(id, session_id, question_id, raw_value)
--
-- Mutated tables:
--   assessment_log gains a nullable session_id FK.
-- ============================================================================

begin;

-- ─── 1. Sessions ──────────────────────────────────────────────────────────
create table public.questionnaire_session (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.character(id) on delete cascade,
  taken_at timestamptz not null default now(),
  duration_seconds integer
);

create index questionnaire_session_char_idx
  on public.questionnaire_session (character_id, taken_at desc);

alter table public.questionnaire_session enable row level security;

create policy "qsession_self_select" on public.questionnaire_session
  for select to authenticated using (character_id = auth.uid());
-- inserts go through submit_questionnaire (security definer); no insert
-- policy needed. Sessions are immutable: no update/delete.

-- ─── 2. Raw answers ───────────────────────────────────────────────────────
create table public.questionnaire_answer (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.questionnaire_session(id) on delete cascade,
  question_id text not null,
  raw_value smallint not null check (raw_value between 1 and 5)
);

create index questionnaire_answer_session_idx
  on public.questionnaire_answer (session_id);

alter table public.questionnaire_answer enable row level security;

-- Read via join on session ownership.
create policy "qanswer_self_select" on public.questionnaire_answer
  for select to authenticated
  using (
    exists (
      select 1 from public.questionnaire_session s
      where s.id = session_id and s.character_id = auth.uid()
    )
  );
-- Inserts via RPC only.

-- ─── 3. Link assessment_log to session ────────────────────────────────────
alter table public.assessment_log
  add column session_id uuid
    references public.questionnaire_session(id) on delete set null;

-- ─── 4. RPC: submit_questionnaire ─────────────────────────────────────────
-- p_answers is a jsonb array of objects:
--   { question_id: text, sub_id: text, raw_value: int (1..5), reverse: bool }
-- p_duration_seconds is the wall-clock time the user spent taking the test.
--
-- Atomically:
--   - creates a session
--   - writes one row per answer to questionnaire_answer
--   - groups by sub_id, derives a 0..5 score:
--       per answer: normalized = (raw - 1) / 4   (or (5 - raw)/4 if reverse)
--       per sub:    score      = floor(avg(normalized) * 5)
--   - upserts character_sub_score(source='questionnaire')
--   - writes 12 assessment_log rows tagged with the new session_id
--
-- Returns the new session_id.

create or replace function public.submit_questionnaire(
  p_answers           jsonb,
  p_duration_seconds  integer default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
  v_user       uuid := auth.uid();
  v_answer     jsonb;
  v_sub        text;
  v_score      smallint;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;
  if jsonb_typeof(p_answers) <> 'array' then
    raise exception 'p_answers must be a jsonb array';
  end if;

  -- 1. Create session
  insert into public.questionnaire_session (character_id, duration_seconds)
  values (v_user, p_duration_seconds)
  returning id into v_session_id;

  -- 2. Write raw answers
  for v_answer in select * from jsonb_array_elements(p_answers) loop
    insert into public.questionnaire_answer (session_id, question_id, raw_value)
    values (
      v_session_id,
      v_answer->>'question_id',
      (v_answer->>'raw_value')::smallint
    );
  end loop;

  -- 3 + 4 + 5. Derive per-sub scores and persist
  for v_sub, v_score in
    select
      a->>'sub_id' as sub_id,
      floor(
        avg(
          case
            when coalesce((a->>'reverse')::boolean, false)
              then ((6 - (a->>'raw_value')::int) - 1) / 4.0
            else ((a->>'raw_value')::int - 1) / 4.0
          end
        ) * 5
      )::smallint as score
    from jsonb_array_elements(p_answers) a
    group by a->>'sub_id'
  loop
    -- Defensive clamp (avg of values in [0,1] * 5 floors to [0,5], but
    -- guarding against bad payloads).
    if v_score < 0 then v_score := 0; end if;
    if v_score > 5 then v_score := 5; end if;

    insert into public.character_sub_score (character_id, source, sub_id, score)
    values (v_user, 'questionnaire', v_sub, v_score)
    on conflict (character_id, source, sub_id)
    do update set score = excluded.score, updated_at = now();

    insert into public.assessment_log (character_id, source, sub_id, score, session_id)
    values (v_user, 'questionnaire', v_sub, v_score, v_session_id);
  end loop;

  return v_session_id;
end $$;

grant execute on function public.submit_questionnaire(jsonb, integer) to authenticated;

commit;
