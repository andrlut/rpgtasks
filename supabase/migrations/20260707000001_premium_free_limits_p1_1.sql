-- migration: 20260707000001_premium_free_limits_p1_1.sql
-- purpose: Perceva Premium P1.1 — server-side free-tier creation limits +
--          premium instrument gate. Backs the client checks in
--          app/lib/premium (limit modal / counter badge / instrument gate).
--
-- affected tables: task, reward, skill, quest, psych_session (BEFORE INSERT triggers)
-- new rpcs:        none
-- breaking?        no — only blocks NEW inserts over the free cap for free-tier
--                  users. Premium = unlimited; admin/migration/signup inserts
--                  (auth.uid() null) always pass. Fully reversible by dropping
--                  the triggers + functions.
--
-- notes:
--   Free caps: 10 active tasks / 5 active rewards / 3 custom skills / 3 active
--   quests ("active" = not archived / status='active'; skills = user-owned).
--   The 6 deep instruments (big_five_120, schwartz_pvq, ecr_r, disc, strengths,
--   tipos) require premium to START a psych_session — historical results stay
--   viewable, only new sessions are blocked. SQL reviewed + approved by Artur.
--   Migrations are write-once; never edit after applying.

begin;

-- ── Free-tier creation limits ───────────────────────────────────────────────
create or replace function public.enforce_free_creation_limit()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_tier  text;
  v_count int;
  v_limit int;
begin
  -- Non-app inserts (Studio / migrations / signup trigger) run without a JWT.
  if auth.uid() is null then
    return new;
  end if;

  -- Premium = unlimited.
  select subscription_tier into v_tier from public.profile where id = auth.uid();
  if v_tier = 'premium' then
    return new;
  end if;

  if TG_TABLE_NAME = 'task' then
    v_limit := 10;
    select count(*) into v_count from public.task
      where character_id = new.character_id and is_archived = false;
  elsif TG_TABLE_NAME = 'reward' then
    v_limit := 5;
    select count(*) into v_count from public.reward
      where character_id = new.character_id and is_archived = false;
  elsif TG_TABLE_NAME = 'skill' then
    v_limit := 3;
    select count(*) into v_count from public.skill
      where character_id = new.character_id;
  elsif TG_TABLE_NAME = 'quest' then
    v_limit := 3;
    select count(*) into v_count from public.quest
      where character_id = new.character_id and status = 'active';
  else
    return new;
  end if;

  if v_count >= v_limit then
    raise exception 'free_limit_reached'
      using errcode = 'P0001', detail = TG_TABLE_NAME, hint = 'free_limit';
  end if;

  return new;
end $$;

drop trigger if exists enforce_free_limit on public.task;
create trigger enforce_free_limit before insert on public.task
  for each row execute function public.enforce_free_creation_limit();

drop trigger if exists enforce_free_limit on public.reward;
create trigger enforce_free_limit before insert on public.reward
  for each row execute function public.enforce_free_creation_limit();

drop trigger if exists enforce_free_limit on public.skill;
create trigger enforce_free_limit before insert on public.skill
  for each row execute function public.enforce_free_creation_limit();

drop trigger if exists enforce_free_limit on public.quest;
create trigger enforce_free_limit before insert on public.quest
  for each row execute function public.enforce_free_creation_limit();

-- ── Premium instrument gate ─────────────────────────────────────────────────
create or replace function public.enforce_premium_instrument()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tier text;
begin
  if auth.uid() is null then
    return new;
  end if;
  if new.instrument_id in
     ('big_five_120', 'schwartz_pvq', 'ecr_r', 'disc', 'strengths', 'tipos') then
    select subscription_tier into v_tier from public.profile where id = auth.uid();
    if v_tier is distinct from 'premium' then
      raise exception 'premium_instrument'
        using errcode = 'P0001', hint = 'premium_instrument';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists enforce_premium_instrument on public.psych_session;
create trigger enforce_premium_instrument before insert on public.psych_session
  for each row execute function public.enforce_premium_instrument();

commit;
