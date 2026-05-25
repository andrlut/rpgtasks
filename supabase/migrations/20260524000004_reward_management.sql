-- migration: 20260524000004_reward_management.sql
-- purpose: enable the new /rewards-manage screen — adds sort_order for
--          drag-reorder, plus RPCs for batch reorder and guarded hard-delete.
--
-- affected tables: reward (new column sort_order + index)
-- new rpcs:        reorder_rewards(uuid[]), delete_reward(uuid)
-- breaking?        no — sort_order defaults to 0 with a backfill from
--                  created_at, so reads stay ordered the way callers expect
--                  after they switch from .order('cost') to .order('sort_order').
--
-- notes:
--   * delete_reward() is intentionally restrictive: it refuses both
--     template-adopted rewards (re-adopt would lose user edits) and any
--     reward with redemption history (would cascade-delete the user's
--     purchase records via reward_redemption.reward_id ON DELETE CASCADE,
--     which we never want to do). UI must surface "archive instead" in
--     both blocked cases.
--   * migrations are write-once; do not edit after applying.

begin;

alter table public.reward
  add column if not exists sort_order int not null default 0;

-- Backfill: epoch seconds of created_at gives a monotonic int with no
-- collisions at human authoring speed. Only touch rows still at the
-- default (0), so re-running the migration on a partially-populated DB
-- doesn't shuffle existing user ordering.
update public.reward
  set sort_order = extract(epoch from created_at)::int
  where sort_order = 0;

create index if not exists reward_sort_idx
  on public.reward (character_id, sort_order);


-- ─── RPC: reorder_rewards(p_ids) ───────────────────────────────────────────
-- Atomic batch reorder. Caller passes the rewards in their desired order
-- and we rewrite sort_order 1..N. Only ids belonging to the caller are
-- accepted; a single foreign id aborts the whole TX.
create or replace function public.reorder_rewards(p_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  i int;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if exists (
    select 1
    from unnest(p_ids) as t(id)
    where not exists (
      select 1 from public.reward r
      where r.id = t.id and r.character_id = v_uid
    )
  ) then
    raise exception 'not authorized for one or more rewards';
  end if;

  for i in 1 .. coalesce(array_length(p_ids, 1), 0) loop
    update public.reward
      set sort_order = i
      where id = p_ids[i] and character_id = v_uid;
  end loop;
end;
$$;


-- ─── RPC: delete_reward(p_reward_id) ───────────────────────────────────────
-- Hard delete with two safety gates. See header notes for the rationale.
create or replace function public.delete_reward(p_reward_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_template_id uuid;
  v_redemption_count int;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select character_id, template_id
    into v_owner, v_template_id
    from public.reward
    where id = p_reward_id;

  if not found then
    raise exception 'reward not found';
  end if;
  if v_owner <> v_uid then
    raise exception 'not authorized';
  end if;
  if v_template_id is not null then
    raise exception 'cannot hard-delete template-adopted reward; archive instead';
  end if;

  select count(*) into v_redemption_count
    from public.reward_redemption
    where reward_id = p_reward_id;

  if v_redemption_count > 0 then
    raise exception 'cannot hard-delete reward with redemption history; archive instead';
  end if;

  delete from public.reward where id = p_reward_id;
end;
$$;


grant execute on function public.reorder_rewards(uuid[]) to authenticated;
grant execute on function public.delete_reward(uuid) to authenticated;

commit;
