-- migration: 20260524000005_delete_reward_drop_template_gate.sql
-- purpose: fix delete_reward() — drop the template_id gate because
--          public.reward never had a template_id column to begin with.
--          The previous migration (20260524000004) introduced the RPC
--          referencing a non-existent column; the function body parses
--          fine at create time but would fail at runtime on the first
--          call. This recreates it with only the redemption gate, which
--          is the gate that actually protects user history.
--
-- affected tables: none
-- new rpcs:        delete_reward(uuid) [REPLACED]
-- breaking?        no — function signature unchanged. Adopted-template
--                  rewards are now deletable (no schema link existed to
--                  distinguish them anyway).
--
-- notes:
--   write-once rule honored: we recreate the function via CREATE OR
--   REPLACE rather than editing the prior migration.

begin;

create or replace function public.delete_reward(p_reward_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_redemption_count int;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select character_id
    into v_owner
    from public.reward
    where id = p_reward_id;

  if not found then
    raise exception 'reward not found';
  end if;
  if v_owner <> v_uid then
    raise exception 'not authorized';
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

commit;
