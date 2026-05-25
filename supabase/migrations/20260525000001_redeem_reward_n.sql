-- migration: 20260525000001_redeem_reward_n.sql
-- purpose: enable multi-buy from the Shop. Adds redeem_reward_n() RPC
--          which validates the whole batch's cost vs balance, inserts
--          qty rows into reward_redemption, and debits coins atomically.
--          Solo redeem_reward() stays untouched for callers that only
--          ever buy 1 — the new RPC is a superset but introducing it
--          alongside avoids a wide-blast-radius refactor.
--
-- affected tables: none (read/write only)
-- new rpcs:        redeem_reward_n(uuid, integer)
-- breaking?        no — additive. redeem_reward(uuid) remains.
--
-- notes:
--   - qty is clamped to [1, 50]. 50 is arbitrary; we just need a ceiling
--     so a bug or fat-finger doesn't drain the user's balance in one
--     accidental call. The Shop UI will hard-cap before we ever hit this.
--   - All-or-nothing atomicity: if balance < qty * cost the function
--     raises and nothing is written. Partial-purchase semantics would
--     surprise users mid-confirmation.
--   - migrations are write-once; do not edit after applying.

begin;

create or replace function public.redeem_reward_n(
  p_reward_id uuid,
  p_qty integer
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reward record;
  v_balance integer;
  v_total integer;
  v_uid uuid := auth.uid();
  i integer;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_qty is null or p_qty < 1 then
    raise exception 'Quantity must be at least 1';
  end if;
  if p_qty > 50 then
    raise exception 'Quantity capped at 50';
  end if;

  select * into v_reward
  from public.reward
  where id = p_reward_id
    and character_id = v_uid
    and is_archived = false;

  if not found then
    raise exception 'Reward not found or not owned by current user';
  end if;

  v_total := v_reward.cost * p_qty;

  select coins into v_balance from public.character where id = v_uid;
  if v_balance is null or v_balance < v_total then
    raise exception 'Insufficient coins (have %, need %)',
      coalesce(v_balance, 0), v_total;
  end if;

  update public.character
    set coins = coins - v_total
    where id = v_uid;

  -- Insert qty individual redemption rows. Keeping them as separate
  -- rows (vs. one row with a quantity column) preserves the existing
  -- "one redemption = one bank slot you can use independently"
  -- mental model. Useful when you buy 3 coffees and want to use them
  -- on different days.
  for i in 1 .. p_qty loop
    insert into public.reward_redemption (reward_id, character_id, cost_paid)
    values (p_reward_id, v_uid, v_reward.cost);
  end loop;

  return json_build_object(
    'qty', p_qty,
    'unit_cost', v_reward.cost,
    'total_paid', v_total
  );
end $$;

grant execute on function public.redeem_reward_n(uuid, integer) to authenticated;

commit;
