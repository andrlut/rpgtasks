-- ============================================================================
-- task_skip — explicit "I'm not doing this today" signal.
--
-- Hides a task from Today / This Week / This Month for a single local
-- date without logging a completion. No XP, no coins, doesn't extend
-- the streak, but doesn't break it either ("honest skip").
--
-- Per-task per-day grain. Daily task: skipping today hides until tomorrow.
-- Weekly/monthly task: skipping today reduces "scheduled this week/month"
-- by 1 — so a 3×/week task with 1 skip needs 2 more this week.
--
-- Missed (limbo) is NOT stored — it's derived on read by subtracting
-- completed + skipped from the scheduled days for any range. Keeps the
-- table small and avoids backfill rows for inactive users.
-- ============================================================================

begin;

create table if not exists public.task_skip (
  task_id uuid not null references public.task(id) on delete cascade,
  character_id uuid not null references public.character(id) on delete cascade,
  -- Local YYYY-MM-DD the user skipped on. We store the date, not a
  -- timestamp, since "today" is a user-local concept and we never need
  -- intra-day skip granularity.
  skipped_for date not null,
  /** Optional reason — for now always null from the UI; reserved for a
   *  future "why did you skip?" prompt. */
  reason text,
  created_at timestamptz not null default now(),
  primary key (task_id, skipped_for)
);

create index if not exists task_skip_character_date_idx
  on public.task_skip (character_id, skipped_for desc);

alter table public.task_skip enable row level security;

drop policy if exists "task_skip_self_select" on public.task_skip;
create policy "task_skip_self_select" on public.task_skip
  for select to authenticated
  using (character_id = auth.uid());

drop policy if exists "task_skip_self_insert" on public.task_skip;
create policy "task_skip_self_insert" on public.task_skip
  for insert to authenticated
  with check (character_id = auth.uid());

drop policy if exists "task_skip_self_delete" on public.task_skip;
create policy "task_skip_self_delete" on public.task_skip
  for delete to authenticated
  using (character_id = auth.uid());

-- updates intentionally not allowed — skip is a fact about a date,
-- editing a different reason would be a delete + reinsert.

commit;
