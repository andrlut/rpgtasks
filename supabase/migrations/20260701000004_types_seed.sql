-- ============================================================================
-- Psych — Jungian Types inventory (autoral)
--
-- Seeds the `tipos` instrument: 4 dichotomies × 4 facets × 4 items = 64.
-- 100% authored, inspired by the PUBLIC-DOMAIN Jungian dichotomies
-- (Extraversion/Introversion, Sensing/Intuition, Thinking/Feeling,
-- Judging/Perceiving). This is NOT the MBTI and NOT MBTI Step II.
--
-- IP GUARDRAIL (do not violate when editing):
--   * NEVER put the strings "MBTI", "Myers-Briggs", "Step I", "Step II",
--     "Introduction to Type" in this file or the UI.
--   * The facet decomposition here is ORIGINAL (4 per dichotomy = 16, not the
--     proprietary MBTI Step II 20-facet set). NEVER use Step II facet names
--     (Initiating/Receiving, Systematic/Casual, Gregarious/Intimate,
--     Tough/Tender, etc.).
--   * Type names are original — never Keirsey (Guardian/Artisan/Rational/
--     Idealist) or 16Personalities type names.
--   * The four-letter codes (E/I, S/N, T/F, J/P) are generic and used freely
--     by 16Personalities, Truity, etc.; the intro carries a non-affiliation
--     disclaimer (client-side).
--
-- Format: bipolar. Each leaf facet has 4 items — 2 keyed to pole A (the
-- E/S/T/J side, forward) and 2 to pole B (the I/N/F/P side, reverse_scored).
--
-- Scale: 1..5 (Discordo totalmente → Concordo totalmente).
--
-- Scoring (`type_bipolar`, NEW here): per-leaf bipolar mean with reverse via
-- (6 - raw); per-dichotomy (parent) = avg of its 4 leaf means. A parent mean
-- > 3 leans pole A (letter E/S/T/J), < 3 leans pole B (letter I/N/F/P);
-- |mean - 3| = clarity of the preference (computed/labeled client-side). The
-- 4-letter type code is derived client-side from the 4 parent means.
--
-- Category self_knowledge — no bridge to character_sub_score.
--
-- Item `position` interleaves each facet's 4 items across the test
-- (position = 1 + facetIndex + itemIndex*16).
-- ============================================================================

begin;

-- ─── 1. Widen scoring_method CHECK to allow 'type_bipolar' ──────────────────

alter table public.psych_instrument
  drop constraint if exists psych_instrument_scoring_method_check;

alter table public.psych_instrument
  add constraint psych_instrument_scoring_method_check
    check (scoring_method in (
      'wellbeing_decimal',
      'big_five_sum',
      'schwartz_centered',
      'ecr_mean',
      'disc_mean',
      'type_bipolar'
    ));

-- ─── 2. Scoring: add the type_bipolar branch ───────────────────────────────
-- Full CREATE OR REPLACE carrying every existing branch + the new one.

create or replace function public._psych_score_session(
  p_session_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inst   text;
  v_method text;
begin
  select s.instrument_id, i.scoring_method
    into v_inst, v_method
  from public.psych_session s
  join public.psych_instrument i on i.id = s.instrument_id
  where s.id = p_session_id;

  if v_inst is null then
    raise exception 'Session % not found', p_session_id;
  end if;

  delete from public.psych_score where session_id = p_session_id;

  -- ---- wellbeing_decimal ----
  if v_method = 'wellbeing_decimal' then
    insert into public.psych_score (session_id, facet_id, score_decimal)
    select
      pa.session_id, f.id,
      greatest(0::numeric, least(5::numeric, avg(
        case when pi.reverse_scored
             then ((6 - pa.raw_value) - 1) / 4.0
             else (pa.raw_value - 1) / 4.0
        end
      ) * 5))::numeric(6,3)
    from public.psych_facet f
    join public.psych_item pi on (
      pi.facet_id = f.id
      or pi.facet_id in (
        select c.id from public.psych_facet c where c.parent_facet_id = f.id
      )
    )
    join public.psych_answer pa
      on pa.item_id = pi.id and pa.session_id = p_session_id
    where f.instrument_id = v_inst
    group by pa.session_id, f.id;

  -- ---- big_five_sum ----
  elsif v_method = 'big_five_sum' then
    insert into public.psych_score (session_id, facet_id, score_decimal)
    select pa.session_id, pi.facet_id,
      sum(case when pi.reverse_scored then (6 - pa.raw_value) else pa.raw_value end)::numeric(6,3)
    from public.psych_answer pa
    join public.psych_item  pi on pi.id = pa.item_id
    join public.psych_facet f  on f.id  = pi.facet_id
    where pa.session_id = p_session_id and f.parent_facet_id is not null
    group by pa.session_id, pi.facet_id;

    insert into public.psych_score (session_id, facet_id, score_decimal)
    select p_session_id, parent.id, sum(ps.score_decimal)::numeric(6,3)
    from public.psych_facet parent
    join public.psych_facet child on child.parent_facet_id = parent.id
    join public.psych_score ps    on ps.facet_id = child.id and ps.session_id = p_session_id
    where parent.instrument_id = v_inst and parent.parent_facet_id is null
    group by parent.id;

  -- ---- schwartz_centered ----
  elsif v_method = 'schwartz_centered' then
    insert into public.psych_score (session_id, facet_id, score_decimal)
    select pa.session_id, pi.facet_id,
      (avg(pa.raw_value) - (
        select avg(pa2.raw_value)::numeric
        from public.psych_answer pa2 where pa2.session_id = p_session_id
      ))::numeric(6,3)
    from public.psych_answer pa
    join public.psych_item  pi on pi.id = pa.item_id
    join public.psych_facet f  on f.id  = pi.facet_id
    where pa.session_id = p_session_id and f.parent_facet_id is not null
    group by pa.session_id, pi.facet_id;

    insert into public.psych_score (session_id, facet_id, score_decimal)
    select p_session_id, parent.id, avg(ps.score_decimal)::numeric(6,3)
    from public.psych_facet parent
    join public.psych_facet child on child.parent_facet_id = parent.id
    join public.psych_score ps    on ps.facet_id = child.id and ps.session_id = p_session_id
    where parent.instrument_id = v_inst and parent.parent_facet_id is null
    group by parent.id;

  -- ---- ecr_mean ----
  elsif v_method = 'ecr_mean' then
    insert into public.psych_score (session_id, facet_id, score_decimal)
    select pa.session_id, pi.facet_id,
      avg(case when pi.reverse_scored then (8 - pa.raw_value) else pa.raw_value end)::numeric(6,3)
    from public.psych_answer pa
    join public.psych_item pi on pi.id = pa.item_id
    where pa.session_id = p_session_id and pi.facet_id is not null
    group by pa.session_id, pi.facet_id;

  -- ---- disc_mean ----
  elsif v_method = 'disc_mean' then
    insert into public.psych_score (session_id, facet_id, score_decimal)
    select pa.session_id, pi.facet_id,
      avg(case when pi.reverse_scored then (6 - pa.raw_value) else pa.raw_value end)::numeric(6,3)
    from public.psych_answer pa
    join public.psych_item pi on pi.id = pa.item_id
    where pa.session_id = p_session_id and pi.facet_id is not null
    group by pa.session_id, pi.facet_id;

  -- ---- type_bipolar ----
  -- Per-leaf bipolar mean (pole-A items forward, pole-B items reverse via
  -- 6-raw on a 1..5 scale) → >3 leans pole A, <3 leans pole B. Per-dichotomy
  -- (parent) = avg of its 4 leaf means. The 4-letter code + clarity bands are
  -- derived client-side from the parent means.
  elsif v_method = 'type_bipolar' then
    insert into public.psych_score (session_id, facet_id, score_decimal)
    select pa.session_id, pi.facet_id,
      avg(case when pi.reverse_scored then (6 - pa.raw_value) else pa.raw_value end)::numeric(6,3)
    from public.psych_answer pa
    join public.psych_item  pi on pi.id = pa.item_id
    join public.psych_facet f  on f.id  = pi.facet_id
    where pa.session_id = p_session_id and f.parent_facet_id is not null
    group by pa.session_id, pi.facet_id;

    insert into public.psych_score (session_id, facet_id, score_decimal)
    select p_session_id, parent.id, avg(ps.score_decimal)::numeric(6,3)
    from public.psych_facet parent
    join public.psych_facet child on child.parent_facet_id = parent.id
    join public.psych_score ps    on ps.facet_id = child.id and ps.session_id = p_session_id
    where parent.instrument_id = v_inst and parent.parent_facet_id is null
    group by parent.id;

  else
    raise notice 'Unknown scoring_method: %', v_method;
  end if;
end $$;

-- ─── 3. Instrument ─────────────────────────────────────────────────────────

insert into public.psych_instrument
  (id, name, description, category, version,
   item_count, scale_min, scale_max, scoring_doc_url,
   scoring_method, scale_labels)
values (
  'tipos',
  'Tipos',
  'Inventário de 64 itens, autoral, inspirado nos tipos psicológicos de Jung ' ||
  '(4 preferências que combinam num código de 4 letras). Mostra a clareza de ' ||
  'cada preferência e um detalhamento por facetas. Reflexão, não diagnóstico ' ||
  '— não é o MBTI, sem afiliação com a The Myers-Briggs Company.',
  'self_knowledge', '1.0', 64, 1, 5,
  'docs/psych-instruments-v1.md#tipos',
  'type_bipolar',
  '{
    "pt": [
      {"label": "Discordo totalmente", "value": 1},
      {"label": "Discordo",            "value": 2},
      {"label": "Neutro",              "value": 3},
      {"label": "Concordo",            "value": 4},
      {"label": "Concordo totalmente", "value": 5}
    ],
    "en": [
      {"label": "Strongly disagree",   "value": 1},
      {"label": "Disagree",            "value": 2},
      {"label": "Neutral",             "value": 3},
      {"label": "Agree",               "value": 4},
      {"label": "Strongly agree",      "value": 5}
    ]
  }'::jsonb
);

-- ─── 4. Dichotomies (4 parent facets) ──────────────────────────────────────
-- Pole A = first letter (E/S/T/J); Pole B = second letter (I/N/F/P).

insert into public.psych_facet
  (id, instrument_id, parent_facet_id, slug, name, description, position)
values
  ('tipos:axis:energy',       'tipos', null, 'energy',       'Energia — Externa (E) / Interna (I)',      'Onde você recarrega e como engaja o mundo.',       100),
  ('tipos:axis:perception',   'tipos', null, 'perception',   'Percepção — Concreta (S) / Abstrata (N)',  'No que você confia: fatos concretos ou possibilidades.', 200),
  ('tipos:axis:decision',     'tipos', null, 'decision',     'Decisão — Lógica (T) / Afetiva (F)',       'Como você decide: pela razão ou pelo impacto.',    300),
  ('tipos:axis:organization', 'tipos', null, 'organization', 'Organização — Estruturada (J) / Fluida (P)', 'Como você lida com planos e desfechos.',         400);

-- ─── 5. Facets (16 leaf facets, under their dichotomy) ─────────────────────

insert into public.psych_facet
  (id, instrument_id, parent_facet_id, slug, name, position)
values
  ('tipos:facet:e_initiate', 'tipos', 'tipos:axis:energy', 'e_initiate', 'Puxa a conversa / Espera o convite',       110),
  ('tipos:facet:e_process',  'tipos', 'tipos:axis:energy', 'e_process',  'Pensa falando / Pensa por dentro',         120),
  ('tipos:facet:e_recharge', 'tipos', 'tipos:axis:energy', 'e_recharge', 'Rende na roda / Rende no recolhimento',    130),
  ('tipos:facet:e_engage',   'tipos', 'tipos:axis:energy', 'e_engage',   'Entra na ação / Recua pra observar',       140),
  ('tipos:facet:p_trust',    'tipos', 'tipos:axis:perception', 'p_trust',    'Confia nos fatos / Confia nos palpites', 210),
  ('tipos:facet:p_focus',    'tipos', 'tipos:axis:perception', 'p_focus',    'Olha o que é / Olha o que poderia ser',  220),
  ('tipos:facet:p_interest', 'tipos', 'tipos:axis:perception', 'p_interest', 'Mão na massa / Cabeça nas ideias',       230),
  ('tipos:facet:p_novelty',  'tipos', 'tipos:axis:perception', 'p_novelty',  'Segue o testado / Busca o inédito',      240),
  ('tipos:facet:d_criterion','tipos', 'tipos:axis:decision', 'd_criterion', 'Decide pela razão / Decide pelo impacto', 310),
  ('tipos:facet:d_stance',   'tipos', 'tipos:axis:decision', 'd_stance',    'Aponta a falha / Acolhe primeiro',       320),
  ('tipos:facet:d_react',    'tipos', 'tipos:axis:decision', 'd_react',     'Questiona pra testar / Concorda pra somar', 330),
  ('tipos:facet:d_delivery', 'tipos', 'tipos:axis:decision', 'd_delivery',  'Firme na verdade / Cuidadoso no toque',  340),
  ('tipos:facet:o_closure',  'tipos', 'tipos:axis:organization', 'o_closure',  'Fecha logo / Deixa em aberto',        410),
  ('tipos:facet:o_conduct',  'tipos', 'tipos:axis:organization', 'o_conduct',  'Anda pelo mapa / Anda pelo momento',  420),
  ('tipos:facet:o_timing',   'tipos', 'tipos:axis:organization', 'o_timing',   'Começa cedo / Rende no aperto',       430),
  ('tipos:facet:o_method',   'tipos', 'tipos:axis:organization', 'o_method',   'Passo a passo / Conforme surge',      440);

-- ─── 6. Items (64 — 4 per facet: 2 pole-A forward + 2 pole-B reverse) ───────
-- pole B → reverse_scored true. Positions interleave facets across the test.

insert into public.psych_item
  (id, instrument_id, facet_id, position, text_pt, text_en, reverse_scored, options_jsonb)
values
  -- ── Energy · e_initiate (idx 0 → pos 1/17/33/49) ──
  ('type_e_initiate_1', 'tipos', 'tipos:facet:e_initiate', 1,
   'Numa festa cheia de gente que não conheço, sou eu quem começa a puxar assunto.',
   'At a party full of strangers, I''m the one who starts up conversations.', false, null),
  ('type_e_initiate_2', 'tipos', 'tipos:facet:e_initiate', 17,
   'Quando quero rever alguém, mando a mensagem primeiro sem ficar esperando.',
   'When I want to catch up with someone, I text first instead of waiting.', false, null),
  ('type_e_initiate_3', 'tipos', 'tipos:facet:e_initiate', 33,
   'Num grupo novo, prefiro esperar alguém vir falar comigo antes de me soltar.',
   'In a new group, I''d rather wait for someone to come to me before I open up.', true, null),
  ('type_e_initiate_4', 'tipos', 'tipos:facet:e_initiate', 49,
   'Costumo deixar que os outros marquem os encontros e só entro no que aparece.',
   'I tend to let others set up the plans and just join whatever comes up.', true, null),

  -- ── Energy · e_process (idx 1 → pos 2/18/34/50) ──
  ('type_e_process_1', 'tipos', 'tipos:facet:e_process', 2,
   'Só entendo direito o que penso depois de colocar pra fora conversando.',
   'I only really get my own thoughts once I''ve talked them out loud.', false, null),
  ('type_e_process_2', 'tipos', 'tipos:facet:e_process', 18,
   'Quando surge um problema, vou raciocinando em voz alta com quem tá do lado.',
   'When a problem shows up, I reason through it out loud with whoever''s around.', false, null),
  ('type_e_process_3', 'tipos', 'tipos:facet:e_process', 34,
   'Prefiro remoer uma ideia em silêncio antes de comentar com alguém.',
   'I''d rather turn an idea over in silence before I mention it to anyone.', true, null),
  ('type_e_process_4', 'tipos', 'tipos:facet:e_process', 50,
   'Numa reunião, guardo minha opinião até ter tudo montado na cabeça.',
   'In a meeting, I hold my opinion until I''ve got it all sorted in my head.', true, null),

  -- ── Energy · e_recharge (idx 2 → pos 3/19/35/51) ──
  ('type_e_recharge_1', 'tipos', 'tipos:facet:e_recharge', 3,
   'Depois de um dia puxado, sair com gente me deixa mais ligado do que descansado.',
   'After a rough day, going out with people leaves me more charged than tired.', false, null),
  ('type_e_recharge_2', 'tipos', 'tipos:facet:e_recharge', 19,
   'Quando passo muito tempo sozinho em casa, fico meio pra baixo e sem energia.',
   'When I spend too long alone at home, I get a bit down and drained.', false, null),
  ('type_e_recharge_3', 'tipos', 'tipos:facet:e_recharge', 35,
   'Pra recarregar de verdade, preciso de um tempo quieto só pra mim.',
   'To really recharge, I need some quiet time all to myself.', true, null),
  ('type_e_recharge_4', 'tipos', 'tipos:facet:e_recharge', 51,
   'Depois de horas no meio de muita gente, saio esgotado mesmo curtindo.',
   'After hours in a crowd, I come out wiped even if I had fun.', true, null),

  -- ── Energy · e_engage (idx 3 → pos 4/20/36/52) ──
  ('type_e_engage_1', 'tipos', 'tipos:facet:e_engage', 4,
   'Quando aparece algo novo pra fazer, já entro de cabeça e vou aprendendo no caminho.',
   'When something new comes up, I dive right in and figure it out as I go.', false, null),
  ('type_e_engage_2', 'tipos', 'tipos:facet:e_engage', 20,
   'Chegando num lugar diferente, já me meto na atividade em vez de ficar de fora.',
   'Arriving somewhere new, I get into the activity instead of hanging back.', false, null),
  ('type_e_engage_3', 'tipos', 'tipos:facet:e_engage', 36,
   'Antes de participar, gosto de ficar um tempo só olhando como as coisas funcionam.',
   'Before joining in, I like to spend a while just watching how things work.', true, null),
  ('type_e_engage_4', 'tipos', 'tipos:facet:e_engage', 52,
   'Num ambiente novo, fico na minha sentindo o clima antes de me envolver.',
   'In a new setting, I keep to myself and read the room before getting involved.', true, null),

  -- ── Perception · p_trust (idx 4 → pos 5/21/37/53) ──
  ('type_p_trust_1', 'tipos', 'tipos:facet:p_trust', 5,
   'Só me convenço de algo quando vejo o dado na minha frente.',
   'I only get convinced when I see the actual data in front of me.', false, null),
  ('type_p_trust_2', 'tipos', 'tipos:facet:p_trust', 21,
   'Antes de decidir, corro atrás dos números e das provas.',
   'Before deciding, I go dig up the numbers and the evidence.', false, null),
  ('type_p_trust_3', 'tipos', 'tipos:facet:p_trust', 37,
   'Muitas vezes bate um pressentimento e ele acaba certo.',
   'A gut feeling often hits me and it ends up being right.', true, null),
  ('type_p_trust_4', 'tipos', 'tipos:facet:p_trust', 53,
   'Confio no meu faro mesmo quando não tenho como explicar.',
   'I trust my instinct even when I can''t quite explain it.', true, null),

  -- ── Perception · p_focus (idx 5 → pos 6/22/38/54) ──
  ('type_p_focus_1', 'tipos', 'tipos:facet:p_focus', 6,
   'Prefiro lidar com o que tá na minha frente agora do que imaginar futuro.',
   'I''d rather deal with what''s in front of me now than picture the future.', false, null),
  ('type_p_focus_2', 'tipos', 'tipos:facet:p_focus', 22,
   'Presto atenção nos detalhes da situação como ela realmente está.',
   'I pay attention to the details of the situation as it actually is.', false, null),
  ('type_p_focus_3', 'tipos', 'tipos:facet:p_focus', 38,
   'Olho pra qualquer coisa e já fico pensando no que ela poderia virar.',
   'I look at anything and start thinking about what it could become.', true, null),
  ('type_p_focus_4', 'tipos', 'tipos:facet:p_focus', 54,
   'Vivo com a cabeça em possibilidades que ainda nem existem.',
   'My head lives on possibilities that don''t even exist yet.', true, null),

  -- ── Perception · p_interest (idx 6 → pos 7/23/39/55) ──
  ('type_p_interest_1', 'tipos', 'tipos:facet:p_interest', 7,
   'Aprendo de verdade é botando a mão e testando na prática.',
   'I really learn by getting my hands in and testing it for real.', false, null),
  ('type_p_interest_2', 'tipos', 'tipos:facet:p_interest', 23,
   'Me interessa mais fazer a coisa funcionar do que entender a teoria por trás.',
   'I care more about making the thing work than grasping the theory behind it.', false, null),
  ('type_p_interest_3', 'tipos', 'tipos:facet:p_interest', 39,
   'Me empolgo discutindo ideias e conceitos, mesmo sem uso prático imediato.',
   'I get excited debating ideas and concepts, even with no immediate use.', true, null),
  ('type_p_interest_4', 'tipos', 'tipos:facet:p_interest', 55,
   'Adoro entender o porquê profundo de como as coisas funcionam.',
   'I love digging into the deep why of how things work.', true, null),

  -- ── Perception · p_novelty (idx 7 → pos 8/24/40/56) ──
  ('type_p_novelty_1', 'tipos', 'tipos:facet:p_novelty', 8,
   'Prefiro o método que já provou que funciona a arriscar num novo.',
   'I''d rather use the method that''s proven itself than gamble on a new one.', false, null),
  ('type_p_novelty_2', 'tipos', 'tipos:facet:p_novelty', 24,
   'Se uma receita já dá certo, não vejo motivo pra ficar mudando.',
   'If a recipe already works, I see no reason to keep changing it.', false, null),
  ('type_p_novelty_3', 'tipos', 'tipos:facet:p_novelty', 40,
   'Me atrai fazer do jeito que ninguém ainda tinha pensado.',
   'I''m drawn to doing it in a way no one had thought of yet.', true, null),
  ('type_p_novelty_4', 'tipos', 'tipos:facet:p_novelty', 56,
   'Fico entediado repetindo o mesmo jeito e logo quero inventar outro.',
   'I get bored repeating the same approach and soon want to invent another.', true, null),

  -- ── Decision · d_criterion (idx 8 → pos 9/25/41/57) ──
  ('type_d_criterion_1', 'tipos', 'tipos:facet:d_criterion', 9,
   'Na hora de decidir, eu vejo primeiro o que faz mais sentido nos fatos.',
   'When I decide, I look first at what makes the most sense given the facts.', false, null),
  ('type_d_criterion_2', 'tipos', 'tipos:facet:d_criterion', 25,
   'Se a conta fecha e a lógica é sólida, pra mim já é razão suficiente.',
   'If the numbers add up and the logic is sound, that''s reason enough for me.', false, null),
  ('type_d_criterion_3', 'tipos', 'tipos:facet:d_criterion', 41,
   'Antes de escolher, penso em quem vai ser afetado por aquilo.',
   'Before I choose, I think about who''s going to be affected by it.', true, null),
  ('type_d_criterion_4', 'tipos', 'tipos:facet:d_criterion', 57,
   'Uma decisão só me convence se estiver de acordo com o que eu valorizo.',
   'A decision only sits right with me if it lines up with what I value.', true, null),

  -- ── Decision · d_stance (idx 9 → pos 10/26/42/58) ──
  ('type_d_stance_1', 'tipos', 'tipos:facet:d_stance', 10,
   'Quando alguém me mostra uma ideia, eu já reparo no ponto que não fecha.',
   'When someone shows me an idea, I spot the part that doesn''t hold up.', false, null),
  ('type_d_stance_2', 'tipos', 'tipos:facet:d_stance', 26,
   'Meu instinto é analisar o que tá errado antes de qualquer outra coisa.',
   'My instinct is to size up what''s wrong before anything else.', false, null),
  ('type_d_stance_3', 'tipos', 'tipos:facet:d_stance', 42,
   'Quando alguém me procura, minha primeira reação é entender como a pessoa tá.',
   'When someone comes to me, my first reaction is to tune in to how they''re doing.', true, null),
  ('type_d_stance_4', 'tipos', 'tipos:facet:d_stance', 58,
   'Prefiro acolher a pessoa antes de comentar qualquer defeito do que ela trouxe.',
   'I''d rather make the person feel welcome before pointing at any flaw in what they brought.', true, null),

  -- ── Decision · d_react (idx 10 → pos 11/27/43/59) ──
  ('type_d_react_1', 'tipos', 'tipos:facet:d_react', 11,
   'Quando concordam rápido demais, eu jogo um contra pra ver se aguenta.',
   'When everyone agrees too fast, I throw in a counterpoint to see if it holds.', false, null),
  ('type_d_react_2', 'tipos', 'tipos:facet:d_react', 27,
   'Gosto de discordar de propósito só pra testar se a ideia se sustenta.',
   'I like to disagree on purpose just to test whether the idea stands up.', false, null),
  ('type_d_react_3', 'tipos', 'tipos:facet:d_react', 43,
   'Quando gosto do rumo da conversa, eu entro junto e ajudo a construir.',
   'When I like where the talk is going, I jump in and help build on it.', true, null),
  ('type_d_react_4', 'tipos', 'tipos:facet:d_react', 59,
   'Prefiro apoiar a ideia do grupo a ficar levantando objeção.',
   'I''d rather get behind the group''s idea than keep raising objections.', true, null),

  -- ── Decision · d_delivery (idx 11 → pos 12/28/44/60) ──
  ('type_d_delivery_1', 'tipos', 'tipos:facet:d_delivery', 12,
   'Se a notícia é ruim, eu falo direto, sem ficar amaciando.',
   'If the news is bad, I say it straight, without softening it.', false, null),
  ('type_d_delivery_2', 'tipos', 'tipos:facet:d_delivery', 28,
   'Pra mim, ser honesto vale mais do que poupar o sentimento da pessoa.',
   'For me, being honest matters more than sparing someone''s feelings.', false, null),
  ('type_d_delivery_3', 'tipos', 'tipos:facet:d_delivery', 44,
   'Escolho as palavras com cuidado pra dar uma notícia difícil sem ferir.',
   'I pick my words carefully to deliver hard news without hurting anyone.', true, null),
  ('type_d_delivery_4', 'tipos', 'tipos:facet:d_delivery', 60,
   'Espero o momento certo pra dizer algo pesado, pra pessoa receber melhor.',
   'I wait for the right moment to say something heavy, so it lands more gently.', true, null),

  -- ── Organization · o_closure (idx 12 → pos 13/29/45/61) ──
  ('type_o_closure_1', 'tipos', 'tipos:facet:o_closure', 13,
   'Fico aliviado quando bato o martelo e a decisão finalmente sai.',
   'I feel relieved once I make the call and the decision is finally out.', false, null),
  ('type_o_closure_2', 'tipos', 'tipos:facet:o_closure', 29,
   'Assim que resolvo uma pendência, já quero riscar da lista e seguir.',
   'The moment I settle something, I want to cross it off and move on.', false, null),
  ('type_o_closure_3', 'tipos', 'tipos:facet:o_closure', 45,
   'Gosto de deixar a escolha em aberto o máximo de tempo possível.',
   'I like leaving the choice open for as long as I can.', true, null),
  ('type_o_closure_4', 'tipos', 'tipos:facet:o_closure', 61,
   'Fecho uma decisão e continuo cogitando outros caminhos.',
   'I make a decision and keep mulling over other paths anyway.', true, null),

  -- ── Organization · o_conduct (idx 13 → pos 14/30/46/62) ──
  ('type_o_conduct_1', 'tipos', 'tipos:facet:o_conduct', 14,
   'Monto meu dia com antecedência e sigo o que combinei comigo mesmo.',
   'I map out my day ahead of time and stick to what I set for myself.', false, null),
  ('type_o_conduct_2', 'tipos', 'tipos:facet:o_conduct', 30,
   'Antes de sair, já sei mais ou menos o roteiro do que vou fazer.',
   'Before heading out, I already have a rough plan of what I''ll do.', false, null),
  ('type_o_conduct_3', 'tipos', 'tipos:facet:o_conduct', 46,
   'Prefiro deixar o dia acontecer e ir decidindo na hora.',
   'I''d rather let the day unfold and decide as I go.', true, null),
  ('type_o_conduct_4', 'tipos', 'tipos:facet:o_conduct', 62,
   'Meus melhores momentos costumam vir de coisas que eu nem tinha planejado.',
   'My best moments usually come from stuff I never even planned.', true, null),

  -- ── Organization · o_timing (idx 14 → pos 15/31/47/63) ──
  ('type_o_timing_1', 'tipos', 'tipos:facet:o_timing', 15,
   'Começo as tarefas bem antes do prazo pra não ficar no sufoco.',
   'I start tasks well before the deadline so I''m not scrambling.', false, null),
  ('type_o_timing_2', 'tipos', 'tipos:facet:o_timing', 31,
   'Quando recebo um trabalho, gosto de já adiantar um pedaço no mesmo dia.',
   'When I get an assignment, I like to knock out a chunk that same day.', false, null),
  ('type_o_timing_3', 'tipos', 'tipos:facet:o_timing', 47,
   'Só engreno de verdade quando o prazo tá em cima.',
   'I only really get going when the deadline is right on top of me.', true, null),
  ('type_o_timing_4', 'tipos', 'tipos:facet:o_timing', 63,
   'Rendo mais na correria da reta final do que espalhando o trabalho.',
   'I do more in the last-minute rush than by spreading the work out.', true, null),

  -- ── Organization · o_method (idx 15 → pos 16/32/48/64) ──
  ('type_o_method_1', 'tipos', 'tipos:facet:o_method', 16,
   'Gosto de seguir uma ordem definida, um passo de cada vez.',
   'I like following a set order, one step at a time.', false, null),
  ('type_o_method_2', 'tipos', 'tipos:facet:o_method', 32,
   'Antes de pôr a mão na massa, defino o método que vou usar.',
   'Before I dig in, I settle on the method I''m going to use.', false, null),
  ('type_o_method_3', 'tipos', 'tipos:facet:o_method', 48,
   'Não planejo as etapas de antemão: a ordem das coisas se forma enquanto trabalho.',
   'I don''t plan the steps in advance: the order sorts itself out while I work.', true, null),
  ('type_o_method_4', 'tipos', 'tipos:facet:o_method', 64,
   'Não me prendo a uma sequência: mudo a abordagem conforme a coisa vai tomando forma.',
   'I don''t lock into a sequence: I shift my approach as the thing takes shape.', true, null);

commit;
