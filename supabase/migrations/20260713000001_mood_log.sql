-- ============================================================================
-- Daily mood check-in (mood_log)
--
-- A deliberately tiny QUALITATIVE end-of-day check-in — "how did you feel
-- today?" on a 1..5 subjective valence scale + an optional free note. This is
-- the counterweight to the app's heavy quantitative systems (XP, coins,
-- Momentum, tasks): it is wired to ZERO of them by design. No reward, no
-- streak, no level progression. Reflection is the one place with no score.
--
-- One canonical row per LOCAL day (upsert), mirroring the task_skip precedent
-- (`logged_for date`, "today is a user-local concept"). Self-only RLS.
-- ============================================================================

begin;

create table public.mood_log (
  id           uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.character(id) on delete cascade,
  -- Local YYYY-MM-DD the mood refers to (client passes device-local date).
  logged_for   date not null,
  -- 1 (worst) .. 5 (best) subjective valence.
  mood         smallint not null check (mood between 1 and 5),
  -- Optional free-text note. Never required.
  note         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- One canonical entry per day; revising the day upserts this row.
  unique (character_id, logged_for)
);

create index mood_log_character_date_idx
  on public.mood_log (character_id, logged_for desc);

alter table public.mood_log enable row level security;

-- Self-only: character.id == auth.uid() (1:1 with auth.users), matching every
-- other personal table (skill_log, assessment_log, reward_redemption, ...).
create policy "mood_log_self_select" on public.mood_log
  for select to authenticated using (character_id = auth.uid());

create policy "mood_log_self_insert" on public.mood_log
  for insert to authenticated with check (character_id = auth.uid());

create policy "mood_log_self_update" on public.mood_log
  for update to authenticated
  using (character_id = auth.uid())
  with check (character_id = auth.uid());
-- No delete policy for now (an undo RPC is a later phase).

-- ─── RPC: the single write path ──────────────────────────────────────────────
-- Upserts the day's entry. SECURITY DEFINER so it can resolve character_id from
-- auth.uid() and write regardless of the column-level policy nuances. Restricts
-- logged_for to a small window around "today" so it can't be used to backfill
-- ancient days (a mood memory older than a day or two is unreliable) — the
-- window is generous enough to absorb device/UTC timezone skew for a legit
-- "today"/"yesterday" entry, but no more.
create or replace function public.log_mood(
  p_mood       smallint,
  p_note       text default null,
  p_logged_for date default current_date
) returns public.mood_log
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.mood_log;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if p_mood < 1 or p_mood > 5 then
    raise exception 'Mood must be 1-5, got %', p_mood;
  end if;
  if p_logged_for < current_date - 2 or p_logged_for > current_date + 1 then
    raise exception 'Can only log mood for a recent day (today or yesterday)';
  end if;

  insert into public.mood_log (character_id, logged_for, mood, note)
  values (auth.uid(), p_logged_for, p_mood, nullif(btrim(p_note), ''))
  on conflict (character_id, logged_for)
  do update set
    mood = excluded.mood,
    note = excluded.note,
    updated_at = now()
  returning * into v_row;

  return v_row;
end $$;

grant execute on function public.log_mood(smallint, text, date) to authenticated;

commit;
