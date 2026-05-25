-- migration: 20260525000003_unuse_reward.sql
-- purpose: enable un-doing a "use" — sends a redemption from the
--          history (used) state back into the bank (banked) state by
--          clearing used_at. The user requested this so accidental
--          uses (or "I changed my mind, I want to use it later") can
--          be reversed without losing the original purchase.
--
-- affected tables: reward_redemption (UPDATE used_at = null)
-- new rpcs:        unuse_reward(uuid)
-- breaking?        no — additive. The original use_reward() stays.
--
-- notes:
--   - We keep the same redemption row (preserving cost_paid and the
--     original redeemed_at). Just clearing used_at is enough; the
--     row reappears in the bank query.
--   - Rejects rows that are already banked (used_at IS NULL) so
--     repeated taps don't no-op silently.
--   - migrations are write-once; do not edit after applying.

begin;

create or replace function public.unuse_reward(p_redemption_id uuid)
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

  select id, character_id, used_at
    into v_redemption
    from public.reward_redemption
    where id = p_redemption_id;

  if not found then
    raise exception 'Redemption not found';
  end if;
  if v_redemption.character_id <> v_uid then
    raise exception 'Not authorized';
  end if;
  if v_redemption.used_at is null then
    raise exception 'Reward is already in the bank';
  end if;

  update public.reward_redemption
    set used_at = null
    where id = p_redemption_id;

  return json_build_object('id', p_redemption_id);
end $$;

grant execute on function public.unuse_reward(uuid) to authenticated;

commit;
