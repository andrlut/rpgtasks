-- ============================================================================
-- Rewards: catalog of user-defined rewards + redemption history.
-- - reward: user-owned templates (title, cost, icon)
-- - reward_redemption: immutable history rows when user spends coins
-- - redeem_reward(p_reward_id) RPC: atomic spend with balance check
-- - seed_sample_rewards(): 5 starter rewards on signup, plus backfill
-- ============================================================================

create table public.reward (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.character(id) on delete cascade,
  title text not null,
  description text,
  cost integer not null check (cost > 0),
  icon text not null default 'gift',
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reward_character_idx on public.reward (character_id) where is_archived = false;

alter table public.reward enable row level security;

create policy "reward_self_all" on public.reward
  for all to authenticated
  using (character_id = auth.uid())
  with check (character_id = auth.uid());

create trigger reward_touch_updated_at
  before update on public.reward
  for each row execute function public.touch_updated_at();

create table public.reward_redemption (
  id uuid primary key default gen_random_uuid(),
  reward_id uuid not null references public.reward(id) on delete cascade,
  character_id uuid not null references public.character(id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  cost_paid integer not null check (cost_paid >= 0)
);

create index reward_redemption_character_idx
  on public.reward_redemption (character_id, redeemed_at desc);

alter table public.reward_redemption enable row level security;

create policy "reward_redemption_self_select" on public.reward_redemption
  for select to authenticated using (character_id = auth.uid());

create policy "reward_redemption_self_insert" on public.reward_redemption
  for insert to authenticated with check (character_id = auth.uid());
-- redemptions are immutable: no update/delete policies.

-- ──────────────────────────────────────────────────────────────────────────
-- redeem_reward(p_reward_id) — atomic spend
-- ──────────────────────────────────────────────────────────────────────────

create or replace function public.redeem_reward(p_reward_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reward record;
  v_balance integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_reward
  from public.reward
  where id = p_reward_id and character_id = auth.uid() and is_archived = false;

  if not found then
    raise exception 'Reward not found or not owned by current user';
  end if;

  select coins into v_balance from public.character where id = auth.uid();
  if v_balance is null or v_balance < v_reward.cost then
    raise exception 'Insufficient coins (have %, need %)', coalesce(v_balance, 0), v_reward.cost;
  end if;

  update public.character
  set coins = coins - v_reward.cost
  where id = auth.uid();

  insert into public.reward_redemption (reward_id, character_id, cost_paid)
  values (p_reward_id, auth.uid(), v_reward.cost);

  return json_build_object('cost_paid', v_reward.cost);
end $$;

grant execute on function public.redeem_reward(uuid) to authenticated;

-- ──────────────────────────────────────────────────────────────────────────
-- seed_sample_rewards() — 5 starter rewards (idempotent)
-- ──────────────────────────────────────────────────────────────────────────

create or replace function public.seed_sample_rewards(p_character_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.reward where character_id = p_character_id) then
    return;
  end if;

  insert into public.reward (character_id, title, description, cost, icon) values
    (p_character_id, 'Premium coffee',       'Treat yourself.',                  40,  'cafe'),
    (p_character_id, '30 min guilt-free TV', 'A drama, a doc, a dumb show. No phone.', 50, 'tv'),
    (p_character_id, '1 hour of gaming',     'No grinding, no goal — just play.', 80, 'game-controller'),
    (p_character_id, 'Movie night',          'Pick the movie. Pop the corn.',    200, 'film'),
    (p_character_id, 'Guilt-free rest day',  'No checklists, no apps, no shame.', 300, 'bed');
end $$;

-- update signup trigger to also seed sample rewards
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profile (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      split_part(new.email, '@', 1),
      'Adventurer'
    )
  );

  insert into public.character (id) values (new.id);

  insert into public.character_dimension (character_id, dimension_id)
    select new.id, d.id from public.dimension d;

  perform public.seed_sample_tasks(new.id);
  perform public.seed_sample_rewards(new.id);

  return new;
end $$;

-- backfill existing users
do $$
declare c record;
begin
  for c in select id from public.character loop
    perform public.seed_sample_rewards(c.id);
  end loop;
end $$;
