-- migration: 20260516120000_quest_v3_challenge.sql
-- purpose: extend the quest system with two explicit quest types:
--   'skill'     — progress auto-tracked from skill_log via reach_skill_value requirement
--   'challenge' — user-defined target with manual append-only progress log
-- also adds allow_partial_quest_reward to character (global toggle for partial rewards on expiry)
--
-- affected tables:
--   quest               — add quest_type, challenge_target_value, challenge_unit_pt/en
--   quest_template      — same additions
--   character           — add allow_partial_quest_reward
--   quest_challenge_log — new immutable table (mirrors skill_log pattern)
--
-- new rpcs:
--   log_quest_challenge_progress(quest_id, value)
--   expire_overdue_quests (replaced in-place to respect partial reward setting)
--
-- new system templates: 10 (5 skill, 5 challenge) across all 6 dimensions
--
-- notes:
--   migrations are write-once; never edit after applying
--   rls enabled on quest_challenge_log (self-only via auth.uid() → profile → character)
--   bilingual: all user-facing catalog strings have _pt and _en variants
--   existing quest rows default to quest_type = 'skill' — no data loss

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. quest_type enum
-- ─────────────────────────────────────────────────────────────────────────────

do $$ begin
  if not exists (select 1 from pg_type where typname = 'quest_type_enum') then
    create type quest_type_enum as enum ('skill', 'challenge');
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. alter quest
-- ─────────────────────────────────────────────────────────────────────────────

-- default 'skill' keeps all existing rows valid with no data migration needed
alter table quest
  add column if not exists quest_type             quest_type_enum not null default 'skill',
  add column if not exists challenge_target_value numeric,
  add column if not exists challenge_unit_pt      text,
  add column if not exists challenge_unit_en      text;

comment on column quest.quest_type is
  'skill = auto-tracked via skill_log; challenge = manual logging via quest_challenge_log';
comment on column quest.challenge_target_value is
  'numeric goal value (challenge quests only, e.g. 20 for 20 push-ups)';
comment on column quest.challenge_unit_pt is
  'unit label in pt-BR displayed next to progress (e.g. "flexões", "km")';
comment on column quest.challenge_unit_en is
  'unit label in en-US displayed next to progress (e.g. "push-ups", "km")';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. alter quest_template
-- ─────────────────────────────────────────────────────────────────────────────

alter table quest_template
  add column if not exists quest_type             quest_type_enum not null default 'skill',
  add column if not exists challenge_target_value numeric,
  add column if not exists challenge_unit_pt      text,
  add column if not exists challenge_unit_en      text;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. character: global partial-reward toggle
-- ─────────────────────────────────────────────────────────────────────────────

alter table character
  add column if not exists allow_partial_quest_reward boolean not null default false;

comment on column character.allow_partial_quest_reward is
  'when true, quests that expire mid-progress grant partial xp/coins proportional to progress';

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. quest_challenge_log
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists quest_challenge_log (
  id           uuid        primary key default gen_random_uuid(),
  quest_id     uuid        not null references quest(id) on delete cascade,
  character_id uuid        not null references character(id) on delete cascade,
  value        numeric     not null check (value >= 0),
  logged_at    timestamptz not null default now()
);

comment on table quest_challenge_log is
  'immutable append-only progress entries for challenge-type quests; mirrors skill_log';

-- fast lookup of latest value (and history) for a given quest
create index if not exists quest_challenge_log_quest_logged_at_idx
  on quest_challenge_log (quest_id, logged_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. rls: quest_challenge_log
-- ─────────────────────────────────────────────────────────────────────────────

alter table quest_challenge_log enable row level security;

-- select: own entries only (auth.uid() = profile.id = character.id in this schema)
create policy "quest_challenge_log: self-read"
  on quest_challenge_log
  for select
  using (
    auth.uid() = (
      select p.id
      from profile p
      join character c on c.id = quest_challenge_log.character_id
      where p.id = c.id
      limit 1
    )
  );

-- insert: caller may only insert for their own character
create policy "quest_challenge_log: self-insert"
  on quest_challenge_log
  for insert
  with check (
    auth.uid() = (
      select p.id
      from profile p
      join character c on c.id = quest_challenge_log.character_id
      where p.id = c.id
      limit 1
    )
  );

-- no update or delete policies — log is immutable by design

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. rpc: log_quest_challenge_progress
-- ─────────────────────────────────────────────────────────────────────────────
-- appends a progress entry for a challenge quest belonging to the calling user.
-- auto-completes the quest (via complete_quest rpc) if value >= target.
-- raises if: quest not found / not owned / wrong type / not active / negative value.

create or replace function log_quest_challenge_progress(
  p_quest_id uuid,
  p_value    numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_character_id uuid;
  v_quest        record;
begin
  -- resolve the calling user's character (profile.id = character.id in this schema)
  select id into v_character_id
  from character
  where id = auth.uid()
  limit 1;

  if v_character_id is null then
    raise exception 'character not found for current user';
  end if;

  -- load and validate the quest
  select id, quest_type, status, character_id, challenge_target_value
  into v_quest
  from quest
  where id = p_quest_id;

  if not found then
    raise exception 'quest not found: %', p_quest_id;
  end if;

  if v_quest.character_id <> v_character_id then
    raise exception 'quest does not belong to the current user';
  end if;

  if v_quest.quest_type <> 'challenge' then
    raise exception 'log_quest_challenge_progress only applies to challenge-type quests';
  end if;

  if v_quest.status <> 'active' then
    raise exception 'quest is not active (current status: %)', v_quest.status;
  end if;

  if p_value < 0 then
    raise exception 'progress value must be >= 0, got: %', p_value;
  end if;

  -- append the immutable log entry
  insert into quest_challenge_log (quest_id, character_id, value)
  values (p_quest_id, v_character_id, p_value);

  -- auto-complete if target reached or exceeded
  if v_quest.challenge_target_value is not null
     and p_value >= v_quest.challenge_target_value then
    perform complete_quest(p_quest_id);
  end if;
end;
$$;

grant execute on function log_quest_challenge_progress(uuid, numeric) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. replace expire_overdue_quests to support partial rewards
-- ─────────────────────────────────────────────────────────────────────────────
-- when character.allow_partial_quest_reward = true, expired quests grant
-- xp/coins proportional to progress at expiry:
--   challenge: max(quest_challenge_log.value) / challenge_target_value
--   skill:     latest skill_log.value / reach_skill_value requirement target
-- ratio is clamped to [0, 1]; nothing granted if ratio = 0.
-- quest always flips to 'expired' regardless of partial reward outcome.

create or replace function expire_overdue_quests()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quest         record;
  v_allow_partial boolean;
  v_progress      numeric;
  v_ratio         numeric;
  v_partial_xp    integer;
  v_partial_coins integer;
begin
  for v_quest in
    select id, character_id, quest_type, challenge_target_value, reward_xp, reward_coins
    from quest
    where status = 'active'
      and deadline < now()
  loop
    -- read the character's partial-reward preference
    select allow_partial_quest_reward into v_allow_partial
    from character
    where id = v_quest.character_id;

    if v_allow_partial then
      v_ratio := 0;

      if v_quest.quest_type = 'challenge'
         and coalesce(v_quest.challenge_target_value, 0) > 0 then

        select coalesce(max(value), 0) into v_progress
        from quest_challenge_log
        where quest_id = v_quest.id;

        v_ratio := least(v_progress / v_quest.challenge_target_value, 1.0);

      elsif v_quest.quest_type = 'skill' then

        select least(
          coalesce(
            (select sl.value
             from skill_log sl
             join quest_requirement qr
               on qr.skill_id = sl.skill_id
              and qr.quest_id = v_quest.id
              and qr.kind = 'reach_skill_value'
             where sl.character_id = v_quest.character_id
             order by sl.logged_at desc
             limit 1),
            0
          )
          /
          nullif(
            (select qr.target_value
             from quest_requirement qr
             where qr.quest_id = v_quest.id
               and qr.kind = 'reach_skill_value'
             limit 1),
            0
          ),
          1.0
        ) into v_ratio;

      end if;

      -- grant partial reward proportional to progress
      if coalesce(v_ratio, 0) > 0 then
        v_partial_xp    := floor(coalesce(v_quest.reward_xp, 0)    * v_ratio);
        v_partial_coins := floor(coalesce(v_quest.reward_coins, 0) * v_ratio);

        if v_partial_xp > 0 or v_partial_coins > 0 then
          update character
          set total_xp = total_xp + v_partial_xp,
              coins    = coins    + v_partial_coins
          where id = v_quest.character_id;
        end if;
      end if;

    end if;

    -- always mark quest as expired
    update quest
    set status = 'expired'
    where id = v_quest.id;

  end loop;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. system quest templates
--    5 skill quests (auto-tracked via skill_log) +
--    5 challenge quests (manual logging via quest_challenge_log)
--    spanning all 6 dimensions: health, body, mind, wealth, bonds, craft
-- ─────────────────────────────────────────────────────────────────────────────

insert into quest_template (
  slug,
  title_pt, title_en,
  description_pt, description_en,
  quest_type,
  reward_xp, reward_coins,
  allow_partial,
  challenge_target_value,
  challenge_unit_pt, challenge_unit_en,
  requirements
)
values

-- ── skill quests ─────────────────────────────────────────────────────────────

-- body / strength — push-ups
(
  'skill_push_up_20',
  'Série de 20 flexões',
  '20 push-up set',
  'Consiga completar 20 flexões seguidas. Registre sua melhor série em cada treino como entrada de habilidade.',
  'Complete 20 consecutive push-ups. Log your best set after each workout as a skill entry.',
  'skill', 250, 60, false,
  null, null, null,
  '[{"kind": "reach_skill_value", "skill_slug": "forca_superior", "target_value": 20}]'
),

-- body / endurance — running
(
  'skill_first_5k_run',
  'Primeira corrida de 5 km',
  'First 5 km run',
  'Alcance 5 km em uma única corrida dentro do prazo. Registre a distância de cada treino.',
  'Reach 5 km in a single run within the deadline. Log the distance of each training run.',
  'skill', 300, 80, false,
  null, null, null,
  '[{"kind": "reach_skill_value", "skill_slug": "corrida", "target_value": 5}]'
),

-- mind / learning — reading
(
  'skill_read_10_books',
  'Dez livros lidos',
  'Ten books read',
  'Registre a leitura de 10 livros completos dentro do prazo.',
  'Log 10 completed books within the deadline.',
  'skill', 400, 100, false,
  null, null, null,
  '[{"kind": "reach_skill_value", "skill_slug": "leitura", "target_value": 10}]'
),

-- wealth / saving
(
  'skill_save_1000',
  'Economize R$ 1.000',
  'Save R$1,000',
  'Acumule R$ 1.000 em economias registradas dentro do prazo.',
  'Accumulate R$1,000 in logged savings within the deadline.',
  'skill', 350, 90, false,
  null, null, null,
  '[{"kind": "reach_skill_value", "skill_slug": "poupanca", "target_value": 1000}]'
),

-- health / mind — meditation
(
  'skill_meditate_30_sessions',
  '30 sessões de meditação',
  '30 meditation sessions',
  'Complete 30 sessões de meditação registradas dentro do prazo.',
  'Complete 30 logged meditation sessions within the deadline.',
  'skill', 280, 70, false,
  null, null, null,
  '[{"kind": "reach_skill_value", "skill_slug": "meditacao", "target_value": 30}]'
),

-- ── challenge quests ──────────────────────────────────────────────────────────

-- body — handstand (no percentile, pure personal milestone)
(
  'challenge_handstand',
  'Segurar parada de mãos por 10 s',
  'Hold a handstand for 10 s',
  'Treine até conseguir manter uma parada de mãos por 10 segundos. Registre seu tempo de equilíbrio a cada sessão.',
  'Train until you can hold a handstand for 10 seconds. Log your hold time after each session.',
  'challenge', 300, 80, true,
  10, 'segundos', 'seconds',
  '[]'
),

-- health — cold showers
(
  'challenge_cold_shower_21',
  'Ducha fria por 21 dias seguidos',
  '21-day cold shower streak',
  'Tome uma ducha fria todos os dias por 21 dias consecutivos. Registre quantos dias seguidos você manteve.',
  'Take a cold shower every day for 21 consecutive days. Log your current streak count.',
  'challenge', 250, 65, true,
  21, 'dias consecutivos', 'consecutive days',
  '[]'
),

-- mind / craft — journaling
(
  'challenge_journal_30',
  'Diário por 30 dias',
  '30-day journaling habit',
  'Escreva no diário todos os dias por 30 dias. Registre o total de entradas feitas.',
  'Write in your journal every day for 30 days. Log your total entry count.',
  'challenge', 220, 55, true,
  30, 'entradas', 'entries',
  '[]'
),

-- wealth — no-spend challenge
(
  'challenge_no_spend_week',
  'Semana sem gastos supérfluos',
  'No-spend week',
  'Passe 7 dias sem gastar em itens não essenciais. Registre cada dia que você conseguiu manter.',
  'Go 7 days without spending on non-essentials. Log each successful day.',
  'challenge', 200, 50, true,
  7, 'dias', 'days',
  '[]'
),

-- bonds — reconnecting
(
  'challenge_reconnect_5_friends',
  'Reconecte com 5 amigos',
  'Reconnect with 5 friends',
  'Entre em contato genuíno com 5 pessoas com quem perdeu o contato. Registre cada reconexão feita.',
  'Genuinely reach out to 5 people you have lost touch with. Log each reconnection.',
  'challenge', 180, 45, true,
  5, 'reconexões', 'reconnections',
  '[]'
)

on conflict (slug) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- end of migration
-- ─────────────────────────────────────────────────────────────────────────────
