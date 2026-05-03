-- ============================================================================
-- Reward tracking: lets a user "pin" one reward to track progress against it.
-- The Rewards screen shows a wide card with a coins-vs-cost progress bar at
-- the top, and the per-card UI surfaces a "Current goal" badge.
--
-- One tracked reward per character at a time → character_id is the PK.
-- Switching tracking is an UPSERT; clearing is a DELETE.
-- Separate table (vs. flag on reward) to keep reward immutable in shape and
-- leave room for analytics/history later (e.g. "rewards most often tracked").
-- ============================================================================

create table public.reward_tracking (
  character_id uuid primary key references public.character(id) on delete cascade,
  reward_id uuid not null references public.reward(id) on delete cascade,
  tracked_at timestamptz not null default now()
);

create index reward_tracking_reward_idx on public.reward_tracking (reward_id);

alter table public.reward_tracking enable row level security;

create policy "reward_tracking_self_all" on public.reward_tracking
  for all to authenticated
  using (character_id = auth.uid())
  with check (character_id = auth.uid());
