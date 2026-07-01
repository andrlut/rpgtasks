-- ============================================================================
-- profile.subscription_tier — cosmetic Premium flag (beta).
--
-- Per the D3 decision (simplified from the frozen tier spec): NOT a tiered
-- entitlement system — just a binary flag that drives a "Premium" badge in
-- the UI. No free-limit enforcement, no levels. Premium is granted MANUALLY
-- via Supabase Studio during the beta.
--
-- Security: users must not be able to self-grant premium. A BEFORE UPDATE
-- trigger reverts any change to subscription_tier that comes from the app
-- (PostgREST role 'authenticated'/'anon'); changes from privileged roles
-- (Studio = 'postgres', or 'service_role') pass through untouched.
-- ============================================================================

begin;

alter table public.profile
  add column if not exists subscription_tier text not null default 'free';

alter table public.profile
  drop constraint if exists profile_subscription_tier_chk;
alter table public.profile
  add constraint profile_subscription_tier_chk
    check (subscription_tier in ('free', 'premium'));

-- SECURITY INVOKER (default): the function runs as the caller's role, so
-- current_user is 'authenticated'/'anon' for app requests and 'postgres'/
-- 'service_role' for admin ones. That's exactly the distinction we need.
create or replace function public.lock_subscription_tier()
returns trigger
language plpgsql
as $$
begin
  if new.subscription_tier is distinct from old.subscription_tier
     and current_user in ('authenticated', 'anon') then
    -- Silently ignore self-grant attempts from the app.
    new.subscription_tier := old.subscription_tier;
  end if;
  return new;
end $$;

drop trigger if exists lock_subscription_tier on public.profile;
create trigger lock_subscription_tier
  before update on public.profile
  for each row
  execute function public.lock_subscription_tier();

commit;
