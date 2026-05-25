-- migration: 20260525000002_sell_reward.sql
-- purpose: enable selling a banked reward back for coins. Adds
--          sell_reward() RPC — refunds 100% of cost_paid and deletes
--          the redemption row. Intended for "oops, bought wrong" cases.
--
-- affected tables: reward_redemption (DELETE), character (UPDATE coins)
-- new rpcs:        sell_reward(uuid)
-- breaking?        no — additive.
--
-- notes:
--   - 100% refund is intentional (user request). No anti-gaming penalty.
--   - Only banked (used_at IS NULL) redemptions can be sold; consumed
--     ones are immutable history.
--   - security definer + explicit ownership check; no DELETE policy on
--     reward_redemption is required (the table currently allows
--     INSERT/SELECT to self but not DELETE).
--   - migrations are write-once; do not edit after applying.

begin;

create or replace function public.sell_reward(p_redemption_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_redemption record;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select id, character_id, cost_paid, used_at
    into v_redemption
    from public.reward_redemption
    where id = p_redemption_id;

  if not found then
    raise exception 'Redemption not found';
  end if;
  if v_redemption.character_id <> v_uid then
    raise exception 'Not authorized';
  end if;
  if v_redemption.used_at is not null then
    raise exception 'Cannot sell a reward you already used';
  end if;

  update public.character
    set coins = coins + v_redemption.cost_paid
    where id = v_uid;

  delete from public.reward_redemption where id = p_redemption_id;

  return json_build_object(
    'refund', v_redemption.cost_paid
  );
end $$;

grant execute on function public.sell_reward(uuid) to authenticated;

commit;
