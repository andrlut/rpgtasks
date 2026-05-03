-- ============================================================================
-- Rewards Bank — split "buy" from "use".
--
-- Before this migration, redeem_reward() did both: spend coins + log
-- the consumption. Now:
--
--   Buy   → redeem_reward()   inserts reward_redemption with used_at = NULL
--                              (the reward is "in your bank")
--   Use   → use_reward(id)    sets used_at = now() on a banked redemption
--                              (the reward is consumed)
--
-- A redemption with used_at IS NULL  → in the bank (available to use).
-- A redemption with used_at IS NOT NULL → already used (history).
--
-- Refunds intentionally not modeled in V0 — once you buy, no take-backs.
-- ============================================================================

begin;

-- ─── 1. Schema: used_at column ───────────────────────────────────────────
alter table public.reward_redemption
  add column used_at timestamptz;

create index reward_redemption_bank_idx
  on public.reward_redemption (character_id, redeemed_at desc)
  where used_at is null;

-- ─── 2. RPC: use_reward(p_redemption_id) ──────────────────────────────────
-- Marks a banked redemption as used. Idempotent in spirit but defensive:
-- raises if the redemption is already used or doesn't belong to the caller.

create or replace function public.use_reward(p_redemption_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_row
  from public.reward_redemption
  where id = p_redemption_id and character_id = auth.uid();

  if not found then
    raise exception 'Redemption not found or not owned by current user';
  end if;

  if v_row.used_at is not null then
    raise exception 'Reward was already used at %', v_row.used_at;
  end if;

  update public.reward_redemption
  set used_at = now()
  where id = p_redemption_id;

  return json_build_object('used_at', now());
end $$;

grant execute on function public.use_reward(uuid) to authenticated;

comment on function public.use_reward(uuid) is
  'Mark a banked reward redemption as used. Once set, used_at cannot be cleared.';

commit;
