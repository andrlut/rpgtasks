-- migration: 20260525000004_task_reorder.sql
-- purpose: enable drag-reorder on the /tasks Manage screen ("Minhas" tab).
--          Adds task.sort_order + reorder_tasks(uuid[]) RPC, mirroring the
--          reward management pattern from 20260524000004.
--
-- affected tables: task (new column sort_order + index)
-- new rpcs:        reorder_tasks(uuid[])
-- breaking?        no — sort_order defaults to 0 with a backfill from
--                  created_at, so reads stay ordered the way callers expect
--                  after they switch from .order('created_at') to
--                  .order('sort_order').
--
-- notes:
--   * Same shape as reorder_rewards: caller passes the full ordered list,
--     RPC rewrites sort_order 1..N inside a single TX. Foreign ids abort
--     the whole TX so concurrent reorders can't poison each other.
--   * Migrations are write-once; do not edit after applying.

begin;

alter table public.task
  add column if not exists sort_order int not null default 0;

-- Backfill: epoch seconds of created_at gives a monotonic int with no
-- collisions at human authoring speed. Only touch rows still at the
-- default (0), so re-running the migration on a partially-populated DB
-- doesn't shuffle existing user ordering.
update public.task
  set sort_order = extract(epoch from created_at)::int
  where sort_order = 0;

create index if not exists task_sort_idx
  on public.task (character_id, sort_order);


-- ─── RPC: reorder_tasks(p_ids) ─────────────────────────────────────────────
-- Atomic batch reorder. Caller passes the tasks in their desired order
-- and we rewrite sort_order 1..N. Only ids belonging to the caller are
-- accepted; a single foreign id aborts the whole TX.
create or replace function public.reorder_tasks(p_ids uuid[])
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
      select 1 from public.task tk
      where tk.id = t.id and tk.character_id = v_uid
    )
  ) then
    raise exception 'not authorized for one or more tasks';
  end if;

  for i in 1 .. coalesce(array_length(p_ids, 1), 0) loop
    update public.task
      set sort_order = i, updated_at = now()
      where id = p_ids[i] and character_id = v_uid;
  end loop;
end;
$$;

grant execute on function public.reorder_tasks(uuid[]) to authenticated;

commit;
