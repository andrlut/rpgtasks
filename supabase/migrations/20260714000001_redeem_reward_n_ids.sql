-- migration: 20260714000001_redeem_reward_n_ids.sql
-- purpose: return the created redemption ids from redeem_reward_n() so the
--          buy-celebration modal can offer an "enjoy now" (use immediately)
--          action on the just-purchased unit without a second round-trip.
--
-- affected tables: none (read/write only)
-- new rpcs:        none — replaces redeem_reward_n(uuid, integer) in place.
-- breaking?        no — the returned json GAINS a `redemption_ids` array.
--                  Existing callers reading qty/unit_cost/total_paid keep
--                  working; the new field is additive.
--
-- notes:
--   - The redemption ids come back in insert order (oldest first). The UI
--     uses the first id for "enjoy now" (consume one unit), leaving any
--     remaining units banked.
--   - Body is otherwise identical to 20260525000001 — only the collection
--     of ids and the return object changed.
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
  v_ids uuid[] := array[]::uuid[];
  v_id uuid;
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

  for i in 1 .. p_qty loop
    insert into public.reward_redemption (reward_id, character_id, cost_paid)
    values (p_reward_id, v_uid, v_reward.cost)
    returning id into v_id;
    v_ids := array_append(v_ids, v_id);
  end loop;

  return json_build_object(
    'qty', p_qty,
    'unit_cost', v_reward.cost,
    'total_paid', v_total,
    'redemption_ids', to_jsonb(v_ids)
  );
end $$;

grant execute on function public.redeem_reward_n(uuid, integer) to authenticated;

commit;
