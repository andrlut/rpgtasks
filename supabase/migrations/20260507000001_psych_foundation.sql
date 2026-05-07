-- ============================================================================
-- Psych Instruments — Foundation (Phase 0)
--
-- Generic schema for psychometric instruments: questionnaires, trait
-- inventories, value surveys, attachment scales. Sets up the catalog
-- (instrument / facet / item), per-user data (session / answer / score),
-- RLS, and the RPCs (start / submit + scoring helpers) that future
-- instruments (Big Five 120, Schwartz PVQ-RR, ECR-R) will plug into
-- without any further schema changes.
--
-- This migration also:
--   - seeds `avaliacao_v1` (the existing 24-question questionnaire) into
--     the new catalog so historical and new sessions share one foundation,
--   - backfills existing questionnaire_session / questionnaire_answer rows
--     into psych_session / psych_answer / psych_score, sharing UUIDs so
--     `assessment_log.session_id` keeps resolving,
--   - rewrites `submit_questionnaire` as a thin wrapper that writes both
--     the new psych_* tables AND the legacy questionnaire_* tables (the
--     UI still reads from the legacy ones; they will be dropped in a
--     follow-up migration once the new UI is promoted).
--
-- Reference: docs/psych-instruments-v1.md (sections 4 + 5).
-- ============================================================================

begin;

-- ─── 1. Catalog tables ──────────────────────────────────────────────────────

create table public.psych_instrument (
  id              text primary key,            -- 'avaliacao_v1', 'big_five_120'
  name            text not null,
  description     text,
  category        text not null
                  check (category in ('wellbeing', 'self_knowledge')),
  version         text not null,
  item_count      integer not null,
  scale_min       smallint not null default 1,
  scale_max       smallint not null default 5,
  scoring_doc_url text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

alter table public.psych_instrument enable row level security;
create policy "psych_instrument_public_read" on public.psych_instrument
  for select to authenticated using (true);

create table public.psych_facet (
  id               text primary key,
  instrument_id    text not null
                   references public.psych_instrument(id) on delete cascade,
  parent_facet_id  text references public.psych_facet(id) on delete cascade,
  slug             text not null,
  name             text not null,
  description      text,
  position         integer not null default 0
);

create index psych_facet_instrument_idx
  on public.psych_facet (instrument_id, position);
create index psych_facet_parent_idx
  on public.psych_facet (parent_facet_id);

alter table public.psych_facet enable row level security;
create policy "psych_facet_public_read" on public.psych_facet
  for select to authenticated using (true);

create table public.psych_item (
  id              text primary key,
  instrument_id   text not null
                  references public.psych_instrument(id) on delete cascade,
  facet_id        text references public.psych_facet(id) on delete set null,
  position        integer not null,
  text_pt         text not null,
  text_en         text,
  reverse_scored  boolean not null default false,
  options_jsonb   jsonb not null              -- [{label, value}, ...]
);

create index psych_item_instrument_idx
  on public.psych_item (instrument_id, position);
create index psych_item_facet_idx on public.psych_item (facet_id);

alter table public.psych_item enable row level security;
create policy "psych_item_public_read" on public.psych_item
  for select to authenticated using (true);

-- ─── 2. Per-user tables ────────────────────────────────────────────────────

create table public.psych_session (
  id                uuid primary key default gen_random_uuid(),
  character_id      uuid not null
                    references public.character(id) on delete cascade,
  instrument_id     text not null
                    references public.psych_instrument(id) on delete restrict,
  taken_at          timestamptz not null default now(),
  duration_seconds  integer,
  is_complete       boolean not null default false
);

create index psych_session_char_inst_idx
  on public.psych_session (character_id, instrument_id, taken_at desc);

alter table public.psych_session enable row level security;
create policy "psych_session_self_select" on public.psych_session
  for select to authenticated using (character_id = auth.uid());
-- Inserts/updates flow through SECURITY DEFINER RPCs only.

-- Snapshot of which items were served to the user in a given session.
-- For avaliacao_v1 this is the full 24-item catalog. For avaliacao_v2 the
-- server will sample 1 of 2 items per facet from the 96-item pool. The
-- snapshot lets us reconstruct exactly what the user saw, even after the
-- catalog is updated.
create table public.psych_session_item (
  session_id  uuid not null
              references public.psych_session(id) on delete cascade,
  item_id     text not null
              references public.psych_item(id) on delete cascade,
  position    integer not null,
  primary key (session_id, item_id)
);

alter table public.psych_session_item enable row level security;
create policy "psych_session_item_self_select" on public.psych_session_item
  for select to authenticated using (
    exists (
      select 1 from public.psych_session s
      where s.id = session_id and s.character_id = auth.uid()
    )
  );

create table public.psych_answer (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null
               references public.psych_session(id) on delete cascade,
  item_id      text not null
               references public.psych_item(id) on delete restrict,
  raw_value    smallint not null
);

create index psych_answer_session_idx on public.psych_answer (session_id);

alter table public.psych_answer enable row level security;
create policy "psych_answer_self_select" on public.psych_answer
  for select to authenticated using (
    exists (
      select 1 from public.psych_session s
      where s.id = session_id and s.character_id = auth.uid()
    )
  );

create table public.psych_score (
  session_id     uuid not null
                 references public.psych_session(id) on delete cascade,
  facet_id       text not null
                 references public.psych_facet(id) on delete cascade,
  score_decimal  numeric(6, 3) not null,
  percentile     smallint
                 check (percentile is null or percentile between 0 and 100),
  primary key (session_id, facet_id)
);

alter table public.psych_score enable row level security;
create policy "psych_score_self_select" on public.psych_score
  for select to authenticated using (
    exists (
      select 1 from public.psych_session s
      where s.id = session_id and s.character_id = auth.uid()
    )
  );

-- ─── 3. Seed avaliacao_v1 catalog ──────────────────────────────────────────

insert into public.psych_instrument
  (id, name, description, category, version,
   item_count, scale_min, scale_max, scoring_doc_url)
values
  ('avaliacao_v1',
   'Avaliação 24',
   '24 perguntas (12 subs × 2): comportamento + resultado funcional. ' ||
   'Janela de estado, refeita a cada 30-90 dias.',
   'wellbeing', '1.0', 24, 1, 5,
   'docs/psych-instruments-v1.md#51-avaliação-v2');

-- 12 facets, one per sub. The slug matches `dimension_sub.id` exactly so
-- the wellbeing scoring branch can bridge psych_score → character_sub_score
-- via a simple slug equality.
insert into public.psych_facet
  (id, instrument_id, slug, name, position)
values
  ('avaliacao_v1:sub:sleep',       'avaliacao_v1', 'sleep',       'Sono',         10),
  ('avaliacao_v1:sub:nutrition',   'avaliacao_v1', 'nutrition',   'Nutrição',     20),
  ('avaliacao_v1:sub:strength',    'avaliacao_v1', 'strength',    'Força',        30),
  ('avaliacao_v1:sub:dexterity',   'avaliacao_v1', 'dexterity',   'Destreza',     40),
  ('avaliacao_v1:sub:learn',       'avaliacao_v1', 'learn',       'Aprender',     50),
  ('avaliacao_v1:sub:contemplate', 'avaliacao_v1', 'contemplate', 'Contemplar',   60),
  ('avaliacao_v1:sub:money',       'avaliacao_v1', 'money',       'Dinheiro',     70),
  ('avaliacao_v1:sub:career',      'avaliacao_v1', 'career',      'Carreira',     80),
  ('avaliacao_v1:sub:circle',      'avaliacao_v1', 'circle',      'Círculo',      90),
  ('avaliacao_v1:sub:romance',     'avaliacao_v1', 'romance',     'Romance',     100),
  ('avaliacao_v1:sub:play',        'avaliacao_v1', 'play',        'Brincar',     110),
  ('avaliacao_v1:sub:build',       'avaliacao_v1', 'build',       'Construir',   120);

-- 24 items mirror app/lib/assessment/questions.ts. The item id matches the
-- legacy `questionnaire_answer.question_id` so historical answers backfill
-- against the catalog without remapping. None of v1's items are
-- reverse-scored — every prompt is worded so 5 = best.
insert into public.psych_item
  (id, instrument_id, facet_id, position, text_pt, reverse_scored, options_jsonb)
values
  ('sleep_consistent', 'avaliacao_v1', 'avaliacao_v1:sub:sleep', 1,
   'Em uma semana típica, em quantas noites você dorme 7 horas ou mais?', false,
   '[{"label":"Nenhuma ou quase nenhuma","value":1},{"label":"1-2 noites","value":2},{"label":"3-4 noites","value":3},{"label":"5-6 noites","value":4},{"label":"Quase toda noite","value":5}]'::jsonb),
  ('sleep_rested', 'avaliacao_v1', 'avaliacao_v1:sub:sleep', 2,
   'Acordo descansado e sustento minha energia ao longo do dia, sem precisar de cafeína pra funcionar.', false,
   '[{"label":"Quase nunca","value":1},{"label":"Raramente","value":2},{"label":"Mais ou menos","value":3},{"label":"Maioria dos dias","value":4},{"label":"Quase todo dia","value":5}]'::jsonb),
  ('nutrition_real_meals', 'avaliacao_v1', 'avaliacao_v1:sub:nutrition', 3,
   'Em uma semana típica, em quantos dias você faz refeições reais (sem fast food, sem pular refeição)?', false,
   '[{"label":"0-1 dias","value":1},{"label":"2 dias","value":2},{"label":"3-4 dias","value":3},{"label":"5-6 dias","value":4},{"label":"Praticamente todos","value":5}]'::jsonb),
  ('nutrition_relationship', 'avaliacao_v1', 'avaliacao_v1:sub:nutrition', 4,
   'Minha relação com comida é tranquila — sem culpa, sem obsessão, sem compulsão.', false,
   '[{"label":"Discordo totalmente","value":1},{"label":"Discordo","value":2},{"label":"Mais ou menos","value":3},{"label":"Concordo","value":4},{"label":"Concordo totalmente","value":5}]'::jsonb),
  ('strength_frequency', 'avaliacao_v1', 'avaliacao_v1:sub:strength', 5,
   'Em uma semana típica, em quantos dias você faz atividade física que tira do sedentarismo (treino de força, cardio, esporte) por 20+ minutos?', false,
   '[{"label":"Nunca ou quase nunca","value":1},{"label":"1 dia","value":2},{"label":"2 dias","value":3},{"label":"3-4 dias","value":4},{"label":"5+ dias","value":5}]'::jsonb),
  ('strength_capable', 'avaliacao_v1', 'avaliacao_v1:sub:strength', 6,
   'Meu corpo se sente forte e capaz no dia a dia — subo escada, carrego peso, jogo um esporte sem travar.', false,
   '[{"label":"Nem um pouco","value":1},{"label":"Pouco","value":2},{"label":"Mais ou menos","value":3},{"label":"Bastante","value":4},{"label":"Totalmente","value":5}]'::jsonb),
  ('dexterity_practice', 'avaliacao_v1', 'avaliacao_v1:sub:dexterity', 7,
   'Em uma semana típica, em quantos dias você dedica 10+ minutos a mobilidade, alongamento ou postura consciente?', false,
   '[{"label":"Nunca","value":1},{"label":"1 dia","value":2},{"label":"2 dias","value":3},{"label":"3-4 dias","value":4},{"label":"5+ dias","value":5}]'::jsonb),
  ('dexterity_painfree', 'avaliacao_v1', 'avaliacao_v1:sub:dexterity', 8,
   'Me movo sem dor, com boa amplitude e coordenação — não trinco, não travo, não compenso.', false,
   '[{"label":"Nem um pouco","value":1},{"label":"Pouco","value":2},{"label":"Mais ou menos","value":3},{"label":"Bastante","value":4},{"label":"Totalmente","value":5}]'::jsonb),
  ('learn_frequency', 'avaliacao_v1', 'avaliacao_v1:sub:learn', 9,
   'Em uma semana típica, em quantos dias você dedica 20+ minutos a leitura ou estudo intencional?', false,
   '[{"label":"Nunca","value":1},{"label":"1 dia","value":2},{"label":"2-3 dias","value":3},{"label":"4-5 dias","value":4},{"label":"Quase todo dia","value":5}]'::jsonb),
  ('learn_applied', 'avaliacao_v1', 'avaliacao_v1:sub:learn', 10,
   'O que aprendo encontra uso — aplico, ensino ou conecto com algo que faço.', false,
   '[{"label":"Quase nunca","value":1},{"label":"Raramente","value":2},{"label":"Às vezes","value":3},{"label":"Frequentemente","value":4},{"label":"Quase sempre","value":5}]'::jsonb),
  ('contemplate_practice', 'avaliacao_v1', 'avaliacao_v1:sub:contemplate', 11,
   'Em uma semana típica, em quantos dias você faz pausa consciente, meditação ou journaling por 5+ minutos?', false,
   '[{"label":"Nunca","value":1},{"label":"1 dia","value":2},{"label":"2-3 dias","value":3},{"label":"4-5 dias","value":4},{"label":"Quase todo dia","value":5}]'::jsonb),
  ('contemplate_anchored', 'avaliacao_v1', 'avaliacao_v1:sub:contemplate', 12,
   'Em momentos de estresse, consigo me ancorar — não saio do eixo facilmente.', false,
   '[{"label":"Quase nunca","value":1},{"label":"Raramente","value":2},{"label":"Mais ou menos","value":3},{"label":"Maioria das vezes","value":4},{"label":"Quase sempre","value":5}]'::jsonb),
  ('money_savings_months', 'avaliacao_v1', 'avaliacao_v1:sub:money', 13,
   'Nos últimos 12 meses, em quantos meses sobrou dinheiro pra você poupar ou investir?', false,
   '[{"label":"Nenhum","value":1},{"label":"1-3 meses","value":2},{"label":"4-6 meses","value":3},{"label":"7-9 meses","value":4},{"label":"10+ meses","value":5}]'::jsonb),
  ('money_no_anxiety', 'avaliacao_v1', 'avaliacao_v1:sub:money', 14,
   'Dinheiro não é fonte constante de ansiedade — tenho colchão e respiro com tranquilidade.', false,
   '[{"label":"Discordo totalmente","value":1},{"label":"Discordo","value":2},{"label":"Neutro","value":3},{"label":"Concordo","value":4},{"label":"Concordo totalmente","value":5}]'::jsonb),
  ('career_deep_work', 'avaliacao_v1', 'avaliacao_v1:sub:career', 15,
   'Em uma semana típica, em quantos dias você consegue blocos de 60+ minutos de deep work em algo que importa pra sua carreira?', false,
   '[{"label":"Nenhum","value":1},{"label":"1 dia","value":2},{"label":"2 dias","value":3},{"label":"3-4 dias","value":4},{"label":"5+ dias","value":5}]'::jsonb),
  ('career_energy_left', 'avaliacao_v1', 'avaliacao_v1:sub:career', 16,
   'Sobra energia minha pra vida fora do trabalho — não chego em casa zerado.', false,
   '[{"label":"Quase nunca","value":1},{"label":"Raramente","value":2},{"label":"Mais ou menos","value":3},{"label":"Maioria dos dias","value":4},{"label":"Quase todo dia","value":5}]'::jsonb),
  ('circle_meaningful_convos', 'avaliacao_v1', 'avaliacao_v1:sub:circle', 17,
   'Em uma semana típica, quantas vezes você tem uma conversa significativa (não só logística) com família ou amigos?', false,
   '[{"label":"Nenhuma","value":1},{"label":"1 vez","value":2},{"label":"2-3 vezes","value":3},{"label":"4-5 vezes","value":4},{"label":"Praticamente todo dia","value":5}]'::jsonb),
  ('circle_close', 'avaliacao_v1', 'avaliacao_v1:sub:circle', 18,
   'Me sinto genuinamente próximo das pessoas importantes pra mim — alguém me conhece de verdade.', false,
   '[{"label":"Discordo totalmente","value":1},{"label":"Discordo","value":2},{"label":"Mais ou menos","value":3},{"label":"Concordo","value":4},{"label":"Concordo totalmente","value":5}]'::jsonb),
  ('romance_frequency', 'avaliacao_v1', 'avaliacao_v1:sub:romance', 19,
   'Em um mês típico, com que frequência você tem momentos reais de conexão romântica (parceria, encontros, intimidade, presença)?', false,
   '[{"label":"Nenhuma vez","value":1},{"label":"1 vez","value":2},{"label":"2-3 vezes","value":3},{"label":"4-7 vezes","value":4},{"label":"Mais que isso","value":5}]'::jsonb),
  ('romance_satisfied', 'avaliacao_v1', 'avaliacao_v1:sub:romance', 20,
   'Minha vida romântica está em um lugar bom — me sinto satisfeito com como está hoje.', false,
   '[{"label":"Discordo totalmente","value":1},{"label":"Discordo","value":2},{"label":"Neutro","value":3},{"label":"Concordo","value":4},{"label":"Concordo totalmente","value":5}]'::jsonb),
  ('play_frequency', 'avaliacao_v1', 'avaliacao_v1:sub:play', 21,
   'Em uma semana típica, quantas vezes você tem momentos só pra curtir um hobby/jogo/criativo, sem objetivo, sem produzir nada?', false,
   '[{"label":"Nenhuma","value":1},{"label":"1 vez","value":2},{"label":"2-3 vezes","value":3},{"label":"4-5 vezes","value":4},{"label":"Quase todo dia","value":5}]'::jsonb),
  ('play_recharges', 'avaliacao_v1', 'avaliacao_v1:sub:play', 22,
   'Curtir hobby ou brincar me recarrega de verdade — termino mais leve, não mais cansado.', false,
   '[{"label":"Discordo totalmente","value":1},{"label":"Discordo","value":2},{"label":"Neutro","value":3},{"label":"Concordo","value":4},{"label":"Concordo totalmente","value":5}]'::jsonb),
  ('build_frequency', 'avaliacao_v1', 'avaliacao_v1:sub:build', 23,
   'Em uma semana típica, em quantos dias você dedica 30+ minutos a um projeto pessoal (criativo, técnico, manual)?', false,
   '[{"label":"Nenhum","value":1},{"label":"1 dia","value":2},{"label":"2 dias","value":3},{"label":"3-4 dias","value":4},{"label":"5+ dias","value":5}]'::jsonb),
  ('build_ships', 'avaliacao_v1', 'avaliacao_v1:sub:build', 24,
   'Termino e compartilho coisas que começo — não acumulo só projetos abandonados.', false,
   '[{"label":"Quase nunca","value":1},{"label":"Raramente","value":2},{"label":"Às vezes","value":3},{"label":"Frequentemente","value":4},{"label":"Quase sempre","value":5}]'::jsonb);

-- ─── 4. Backfill historical questionnaire data ─────────────────────────────
-- Preserve UUIDs so:
--   - assessment_log.session_id (legacy FK to questionnaire_session) keeps
--     resolving against the same id surface, and
--   - the rewritten submit_questionnaire() can write to BOTH legacy and
--     psych tables sharing one uuid going forward.

insert into public.psych_session
  (id, character_id, instrument_id, taken_at, duration_seconds, is_complete)
select id, character_id, 'avaliacao_v1', taken_at, duration_seconds, true
from public.questionnaire_session;

-- Snapshot session_items in catalog order (every historical session saw the
-- full 24-item v1 set).
insert into public.psych_session_item (session_id, item_id, position)
select ps.id, pi.id, pi.position
from public.psych_session ps
join public.psych_item pi on pi.instrument_id = ps.instrument_id
where ps.instrument_id = 'avaliacao_v1';

-- Migrate raw answers. Skip any rows whose question_id is unknown to the
-- catalog (defensive: there shouldn't be any for v1).
insert into public.psych_answer (id, session_id, item_id, raw_value)
select a.id, a.session_id, a.question_id, a.raw_value
from public.questionnaire_answer a
where exists (select 1 from public.psych_item i where i.id = a.question_id);

-- Compute psych_score for migrated sessions: per-facet decimal mean × 5.
insert into public.psych_score (session_id, facet_id, score_decimal)
select
  pa.session_id,
  pi.facet_id,
  greatest(0::numeric, least(5::numeric, avg(
    case when pi.reverse_scored
         then ((6 - pa.raw_value) - 1) / 4.0
         else (pa.raw_value - 1) / 4.0
    end
  ) * 5))::numeric(6,3) as score_decimal
from public.psych_answer pa
join public.psych_item pi on pi.id = pa.item_id
where pi.instrument_id = 'avaliacao_v1' and pi.facet_id is not null
group by pa.session_id, pi.facet_id;

-- ─── 5. Internal: scoring helper ───────────────────────────────────────────
-- Recomputes psych_score for one session based on its current answers and
-- the instrument category. Called from submit_psych_session.
--
-- Wellbeing math (avaliacao_v1, avaliacao_v2):
--   per item:  normalized = (raw-1)/4, with raw inverted to (6-raw) first
--              if reverse_scored.
--   per facet: score_decimal = mean(normalized) × 5    →  [0, 5]
--
-- Other categories (self_knowledge: Big Five, Schwartz, ECR-R) have their
-- own scoring rules and will extend this helper in their own migrations.

create or replace function public._psych_score_session(
  p_session_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inst     text;
  v_category text;
begin
  select s.instrument_id, i.category
    into v_inst, v_category
  from public.psych_session s
  join public.psych_instrument i on i.id = s.instrument_id
  where s.id = p_session_id;

  if v_inst is null then
    raise exception 'Session % not found', p_session_id;
  end if;

  delete from public.psych_score where session_id = p_session_id;

  if v_category = 'wellbeing' then
    insert into public.psych_score (session_id, facet_id, score_decimal)
    select
      pa.session_id,
      pi.facet_id,
      greatest(0::numeric, least(5::numeric, avg(
        case when pi.reverse_scored
             then ((6 - pa.raw_value) - 1) / 4.0
             else (pa.raw_value - 1) / 4.0
        end
      ) * 5))::numeric(6,3)
    from public.psych_answer pa
    join public.psych_item pi on pi.id = pa.item_id
    where pa.session_id = p_session_id and pi.facet_id is not null
    group by pa.session_id, pi.facet_id;
  else
    raise notice 'Scoring for category % is not implemented yet', v_category;
  end if;
end $$;
-- Internal helper — not granted to authenticated.

-- ─── 6. RPC: psych_seed_session_items ──────────────────────────────────────
-- Populates psych_session_item for the given session. The default policy
-- ("all items, catalog order") covers avaliacao_v1, big_five_120, schwartz
-- and ecr_r equally well. avaliacao_v2 (96-item pool, 1 of 2 per facet)
-- will replace this body in its own migration.

create or replace function public.psych_seed_session_items(
  p_session_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inst text;
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  select instrument_id into v_inst
  from public.psych_session
  where id = p_session_id and character_id = v_user;
  if v_inst is null then
    raise exception 'Session % not found or not owned by user', p_session_id;
  end if;

  -- Idempotent: if already seeded, do nothing.
  if exists (
    select 1 from public.psych_session_item where session_id = p_session_id
  ) then
    return;
  end if;

  insert into public.psych_session_item (session_id, item_id, position)
  select p_session_id, id, position
  from public.psych_item
  where instrument_id = v_inst
  order by position;
end $$;

grant execute on function public.psych_seed_session_items(uuid)
  to authenticated;

-- ─── 7. RPC: start_psych_session ───────────────────────────────────────────
-- Creates a new (incomplete) session and returns the served items so the
-- client can render the test. The client posts answers back via
-- submit_psych_session keyed on the returned session_id.
--
-- Returns:
--   { session_id, instrument_id, items: [
--       { item_id, position, text_pt, text_en, options, facet_id,
--         reverse_scored }, ...
--     ] }

create or replace function public.start_psych_session(
  p_instrument_id text
) returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user       uuid := auth.uid();
  v_session_id uuid;
  v_items      json;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;
  if not exists (
    select 1 from public.psych_instrument
    where id = p_instrument_id and is_active
  ) then
    raise exception 'Unknown or inactive instrument: %', p_instrument_id;
  end if;

  insert into public.psych_session (character_id, instrument_id)
  values (v_user, p_instrument_id)
  returning id into v_session_id;

  perform public.psych_seed_session_items(v_session_id);

  select coalesce(json_agg(row_to_json(x)), '[]'::json) into v_items
  from (
    select
      pi.id            as item_id,
      psi.position     as position,
      pi.text_pt       as text_pt,
      pi.text_en       as text_en,
      pi.options_jsonb as options,
      pi.facet_id      as facet_id,
      pi.reverse_scored as reverse_scored
    from public.psych_session_item psi
    join public.psych_item pi on pi.id = psi.item_id
    where psi.session_id = v_session_id
    order by psi.position
  ) x;

  return json_build_object(
    'session_id',    v_session_id,
    'instrument_id', p_instrument_id,
    'items',         v_items
  );
end $$;

grant execute on function public.start_psych_session(text) to authenticated;

-- ─── 8. RPC: submit_psych_session ──────────────────────────────────────────
-- Records final answers, computes scores, marks session complete. For
-- 'wellbeing' instruments it also bridges back to the legacy
-- character_sub_score / assessment_log surfaces so the existing UI keeps
-- working.
--
-- p_answers shape: [{ item_id: text, raw_value: int }]
-- Resubmitting the same session_id is idempotent: prior answers + scores
-- are wiped and rewritten.
--
-- Returns: { session_id, scores: [{facet_id, score_decimal, percentile}] }

create or replace function public.submit_psych_session(
  p_session_id      uuid,
  p_answers         jsonb,
  p_duration_seconds integer default null
) returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user     uuid := auth.uid();
  v_session  record;
  v_category text;
  v_scale_min smallint;
  v_scale_max smallint;
  v_answer   jsonb;
  v_raw      smallint;
  v_scores   json;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;
  if jsonb_typeof(p_answers) <> 'array' then
    raise exception 'p_answers must be a jsonb array';
  end if;

  select s.id, s.character_id, s.instrument_id, i.category,
         i.scale_min, i.scale_max
    into v_session
  from public.psych_session s
  join public.psych_instrument i on i.id = s.instrument_id
  where s.id = p_session_id;

  if v_session.id is null then
    raise exception 'Session % not found', p_session_id;
  end if;
  if v_session.character_id <> v_user then
    raise exception 'Session does not belong to user';
  end if;

  v_category  := v_session.category;
  v_scale_min := v_session.scale_min;
  v_scale_max := v_session.scale_max;

  -- Idempotent rewrite: a resubmit overwrites prior answers + scores.
  delete from public.psych_answer where session_id = p_session_id;
  delete from public.psych_score  where session_id = p_session_id;

  for v_answer in select * from jsonb_array_elements(p_answers) loop
    v_raw := (v_answer->>'raw_value')::smallint;
    if v_raw < v_scale_min or v_raw > v_scale_max then
      raise exception 'raw_value % out of range [%, %]',
        v_raw, v_scale_min, v_scale_max;
    end if;
    insert into public.psych_answer (session_id, item_id, raw_value)
    values (p_session_id, v_answer->>'item_id', v_raw);
  end loop;

  perform public._psych_score_session(p_session_id);

  -- Bridge for wellbeing instruments → character_sub_score + assessment_log.
  -- Slug equality (psych_facet.slug = dimension_sub.id) is the contract.
  if v_category = 'wellbeing' then
    insert into public.character_sub_score (character_id, source, sub_id, score)
    select v_user, 'questionnaire', f.slug,
           greatest(0, least(5, floor(ps.score_decimal)::int))::smallint
    from public.psych_score ps
    join public.psych_facet f on f.id = ps.facet_id
    where ps.session_id = p_session_id
    on conflict (character_id, source, sub_id)
    do update set score = excluded.score, updated_at = now();

    insert into public.assessment_log
      (character_id, source, sub_id, score, session_id)
    select v_user, 'questionnaire', f.slug,
           greatest(0, least(5, floor(ps.score_decimal)::int))::smallint,
           p_session_id
    from public.psych_score ps
    join public.psych_facet f on f.id = ps.facet_id
    where ps.session_id = p_session_id;
  end if;

  update public.psych_session
  set duration_seconds = coalesce(p_duration_seconds, duration_seconds),
      is_complete      = true,
      taken_at         = now()
  where id = p_session_id;

  select coalesce(json_agg(row_to_json(x)), '[]'::json) into v_scores
  from (
    select facet_id, score_decimal, percentile
    from public.psych_score
    where session_id = p_session_id
    order by facet_id
  ) x;

  return json_build_object('session_id', p_session_id, 'scores', v_scores);
end $$;

grant execute on function public.submit_psych_session(uuid, jsonb, integer)
  to authenticated;

-- ─── 9. Wrapper: submit_questionnaire (legacy v1 entry point) ──────────────
-- The old payload is [{question_id, sub_id, raw_value, reverse}]. This
-- wrapper:
--   - creates a psych_session for 'avaliacao_v1' (and a matching
--     questionnaire_session sharing the same UUID, so existing UI hooks
--     and the assessment_log.session_id FK still resolve),
--   - mirrors raw answers to legacy questionnaire_answer (the UI's "see
--     past results" view reads from there),
--   - delegates the new {item_id, raw_value} payload to
--     submit_psych_session, which writes psych_answer + psych_score and
--     bridges back to character_sub_score + assessment_log.
--
-- Returns the (shared) session UUID. UI surface unchanged.

create or replace function public.submit_questionnaire(
  p_answers           jsonb,
  p_duration_seconds  integer default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user        uuid := auth.uid();
  v_session_id  uuid;
  v_answer      jsonb;
  v_new_payload jsonb;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;
  if jsonb_typeof(p_answers) <> 'array' then
    raise exception 'p_answers must be a jsonb array';
  end if;

  -- Canonical id: live in psych_session.
  insert into public.psych_session
    (character_id, instrument_id, duration_seconds)
  values (v_user, 'avaliacao_v1', p_duration_seconds)
  returning id into v_session_id;

  -- Mirror in legacy questionnaire_session with the SAME id.
  insert into public.questionnaire_session
    (id, character_id, taken_at, duration_seconds)
  values (v_session_id, v_user, now(), p_duration_seconds);

  perform public.psych_seed_session_items(v_session_id);

  -- Mirror raw answers to legacy table (UI reads from here today).
  for v_answer in select * from jsonb_array_elements(p_answers) loop
    insert into public.questionnaire_answer (session_id, question_id, raw_value)
    values (
      v_session_id,
      v_answer->>'question_id',
      (v_answer->>'raw_value')::smallint
    );
  end loop;

  -- Adapt to new shape and delegate.
  select coalesce(jsonb_agg(jsonb_build_object(
           'item_id',   a->>'question_id',
           'raw_value', (a->>'raw_value')::int
         )), '[]'::jsonb)
    into v_new_payload
  from jsonb_array_elements(p_answers) a;

  perform public.submit_psych_session(
    v_session_id, v_new_payload, p_duration_seconds
  );

  return v_session_id;
end $$;

grant execute on function public.submit_questionnaire(jsonb, integer)
  to authenticated;

commit;
