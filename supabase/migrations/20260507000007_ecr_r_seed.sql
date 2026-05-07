-- ============================================================================
-- Psych — ECR-R-style attachment inventory (autoral)
--
-- Seeds the `ecr_r` instrument: 2 scales × 18 items = 36 total. Items are
-- 100% authored, inspired by Brennan/Fraley's 2-dimensional attachment
-- model (Anxiety + Avoidance) without reproducing any copyrighted ECR-R
-- item.
--
-- Scale: 1..7 (Discordo totalmente → Concordo totalmente)
--
-- Reverse-scoring: ~7 of 18 per scale (~39%), worded so that strong
-- agreement signals LOW on the dimension (e.g. "Demora pra responder não
-- me afeta" reverses to high Anxiety when disagreed with).
--
-- Scoring (`ecr_mean`, registered in #121):
--   per-scale: mean of (raw if forward, 8-raw if reverse) over 18 items
--              → range [1, 7]
-- The 4 attachment styles (secure / preoccupied / dismissive / fearful)
-- are derived in the client from the two scale means with cutoff at 4.
--
-- Topic: adult close relationships. Intro copy flags this clearly; no
-- hard age gate at this stage (single-dev sandbox, no stranger access).
--
-- ============================================================================

begin;

-- ─── 1. Instrument ─────────────────────────────────────────────────────────

insert into public.psych_instrument
  (id, name, description, category, version,
   item_count, scale_min, scale_max, scoring_doc_url,
   scoring_method, scale_labels)
values (
  'ecr_r',
  'Apego — ECR-R',
  'Inventário de 36 itens, autoral, inspirado no modelo de apego adulto ' ||
  '(Ansiedade + Evitação). Devolve um padrão de apego em relacionamentos ' ||
  'próximos. Não substitui avaliação clínica.',
  'self_knowledge', '1.0', 36, 1, 7,
  'docs/psych-instruments-v1.md#54-ecr-r',
  'ecr_mean',
  '{
    "pt": [
      {"label": "Discordo totalmente", "value": 1},
      {"label": "Discordo",            "value": 2},
      {"label": "Discordo um pouco",   "value": 3},
      {"label": "Neutro",              "value": 4},
      {"label": "Concordo um pouco",   "value": 5},
      {"label": "Concordo",            "value": 6},
      {"label": "Concordo totalmente", "value": 7}
    ],
    "en": [
      {"label": "Strongly disagree",   "value": 1},
      {"label": "Disagree",            "value": 2},
      {"label": "Slightly disagree",   "value": 3},
      {"label": "Neutral",             "value": 4},
      {"label": "Slightly agree",      "value": 5},
      {"label": "Agree",               "value": 6},
      {"label": "Strongly agree",      "value": 7}
    ]
  }'::jsonb
);

-- ─── 2. Scales (2 leaf facets, no parent) ──────────────────────────────────

insert into public.psych_facet
  (id, instrument_id, parent_facet_id, slug, name, description, position)
values
  ('ecr_r:scale:anxiety',   'ecr_r', null,
   'anxiety',   'Ansiedade',
   'Preocupação com abandono, hipersensibilidade a sinais de rejeição.',
   1),
  ('ecr_r:scale:avoidance', 'ecr_r', null,
   'avoidance', 'Evitação',
   'Desconforto com proximidade, preferência por independência emocional.',
   2);

-- ─── 3. Items (36) ─────────────────────────────────────────────────────────

insert into public.psych_item
  (id, instrument_id, facet_id, position, text_pt, text_en,
   reverse_scored, options_jsonb)
values
  -- ───────────── Anxiety (18 items, 11 forward + 7 reverse) ─────────────
  ('ecr_anx_1', 'ecr_r', 'ecr_r:scale:anxiety', 1,
   'Me preocupo com a possibilidade de ser abandonado por quem amo.',
   'I worry about being abandoned by the people I love.',
   false, null),
  ('ecr_anx_2', 'ecr_r', 'ecr_r:scale:anxiety', 2,
   'Quando alguém próximo demora pra responder, imagino que perdi a pessoa.',
   'When someone close takes a while to reply, I imagine I''ve lost them.',
   false, null),
  ('ecr_anx_3', 'ecr_r', 'ecr_r:scale:anxiety', 3,
   'Tenho medo de não ser amado o suficiente em troca.',
   'I fear I''m not loved enough in return.',
   false, null),
  ('ecr_anx_4', 'ecr_r', 'ecr_r:scale:anxiety', 4,
   'Em geral, queria mais proximidade do que a outra pessoa parece querer.',
   'Generally, I want more closeness than the other person seems to want.',
   false, null),
  ('ecr_anx_5', 'ecr_r', 'ecr_r:scale:anxiety', 5,
   'Fico ressentido quando o outro tem muito espaço próprio na relação.',
   'I feel resentful when the other person has a lot of their own space in the relationship.',
   false, null),
  ('ecr_anx_6', 'ecr_r', 'ecr_r:scale:anxiety', 6,
   'Pequenas distâncias dentro de uma relação me deixam ansioso.',
   'Small distances within a relationship make me anxious.',
   false, null),
  ('ecr_anx_7', 'ecr_r', 'ecr_r:scale:anxiety', 7,
   'Sinto preocupação por trás da maioria das interações com quem amo.',
   'I feel a low-grade worry behind most interactions with the people I love.',
   false, null),
  ('ecr_anx_8', 'ecr_r', 'ecr_r:scale:anxiety', 8,
   'Penso muito sobre o que o outro está sentindo por mim.',
   'I think a lot about what the other person is feeling toward me.',
   false, null),
  ('ecr_anx_9', 'ecr_r', 'ecr_r:scale:anxiety', 9,
   'Tenho medo de que o outro pare de me amar quando me conhecer melhor.',
   'I fear the other person will stop loving me when they get to know me better.',
   false, null),
  ('ecr_anx_10', 'ecr_r', 'ecr_r:scale:anxiety', 10,
   'Releio conversas em busca de pistas sobre o tom da pessoa.',
   'I reread conversations searching for clues about the other person''s tone.',
   false, null),
  ('ecr_anx_11', 'ecr_r', 'ecr_r:scale:anxiety', 11,
   'Peço reasseguramento ("você me ama?") com alguma frequência.',
   'I ask for reassurance ("do you love me?") with some frequency.',
   false, null),
  ('ecr_anx_12', 'ecr_r', 'ecr_r:scale:anxiety', 12,
   'Aceito sem dificuldade que o outro tenha vida e interesses próprios.',
   'I accept without struggle that the other person has their own life and interests.',
   true, null),
  ('ecr_anx_13', 'ecr_r', 'ecr_r:scale:anxiety', 13,
   'Demora pra responder não me afeta — sei que a pessoa volta.',
   'Slow replies don''t affect me — I know the person will come back.',
   true, null),
  ('ecr_anx_14', 'ecr_r', 'ecr_r:scale:anxiety', 14,
   'Confio que sou amado, mesmo sem reasseguramento constante.',
   'I trust I''m loved, even without constant reassurance.',
   true, null),
  ('ecr_anx_15', 'ecr_r', 'ecr_r:scale:anxiety', 15,
   'Em períodos de silêncio prolongado, fico tranquilo na relação.',
   'During long stretches of silence, I stay calm in the relationship.',
   true, null),
  ('ecr_anx_16', 'ecr_r', 'ecr_r:scale:anxiety', 16,
   'Não fico personalizando quando o outro está distante — assumo que é a vida dele.',
   'I don''t take it personally when the other is distant — I assume it''s their own stuff.',
   true, null),
  ('ecr_anx_17', 'ecr_r', 'ecr_r:scale:anxiety', 17,
   'Diferenças de proximidade entre mim e o outro não me incomodam.',
   'Differences in closeness between me and the other person don''t bother me.',
   true, null),
  ('ecr_anx_18', 'ecr_r', 'ecr_r:scale:anxiety', 18,
   'Quando o outro está ocupado com as coisas dele, fico tranquilo.',
   'When the other is busy with their own things, I''m at ease.',
   true, null),

  -- ───────────── Avoidance (18 items, 11 forward + 7 reverse) ─────────────
  ('ecr_avo_1', 'ecr_r', 'ecr_r:scale:avoidance', 19,
   'Prefiro não depender emocionalmente de quem amo.',
   'I prefer not to depend emotionally on the people I love.',
   false, null),
  ('ecr_avo_2', 'ecr_r', 'ecr_r:scale:avoidance', 20,
   'Falar de sentimentos profundos com a pessoa amada me deixa desconfortável.',
   'Talking about deep feelings with my partner makes me uncomfortable.',
   false, null),
  ('ecr_avo_3', 'ecr_r', 'ecr_r:scale:avoidance', 21,
   'Acho difícil deixar alguém entrar de verdade na minha vida íntima.',
   'I find it hard to let someone really into my intimate life.',
   false, null),
  ('ecr_avo_4', 'ecr_r', 'ecr_r:scale:avoidance', 22,
   'Quando o outro fica muito próximo, sinto vontade de criar espaço.',
   'When the other gets too close, I feel the urge to create space.',
   false, null),
  ('ecr_avo_5', 'ecr_r', 'ecr_r:scale:avoidance', 23,
   'Prefiro manter independência financeira e emocional na relação.',
   'I prefer to keep financial and emotional independence within the relationship.',
   false, null),
  ('ecr_avo_6', 'ecr_r', 'ecr_r:scale:avoidance', 24,
   'Demonstrar carinho físico sem reciprocidade clara me trava.',
   'Showing physical affection without clear reciprocity makes me freeze.',
   false, null),
  ('ecr_avo_7', 'ecr_r', 'ecr_r:scale:avoidance', 25,
   'Compartilhar problemas com a pessoa amada não vem natural pra mim.',
   'Sharing problems with my partner doesn''t come naturally.',
   false, null),
  ('ecr_avo_8', 'ecr_r', 'ecr_r:scale:avoidance', 26,
   'Preciso de tempo só meu pra recarregar, mesmo dentro de uma relação.',
   'I need time alone to recharge, even within a relationship.',
   false, null),
  ('ecr_avo_9', 'ecr_r', 'ecr_r:scale:avoidance', 27,
   'Quando o outro precisa de muita conexão, me sinto pressionado.',
   'When the other person needs a lot of connection, I feel pressured.',
   false, null),
  ('ecr_avo_10', 'ecr_r', 'ecr_r:scale:avoidance', 28,
   'Me sinto melhor quando sei que posso me afastar quando quiser.',
   'I feel better knowing I can pull away when I want to.',
   false, null),
  ('ecr_avo_11', 'ecr_r', 'ecr_r:scale:avoidance', 29,
   'No geral, tendo a guardar mais do que mostrar emocionalmente.',
   'In general, I tend to hold back more than I show emotionally.',
   false, null),
  ('ecr_avo_12', 'ecr_r', 'ecr_r:scale:avoidance', 30,
   'Sinto facilidade em compartilhar coisas profundas com quem amo.',
   'I easily share deep things with the people I love.',
   true, null),
  ('ecr_avo_13', 'ecr_r', 'ecr_r:scale:avoidance', 31,
   'Conexão emocional intensa com a pessoa amada me sustenta.',
   'Intense emotional connection with my partner sustains me.',
   true, null),
  ('ecr_avo_14', 'ecr_r', 'ecr_r:scale:avoidance', 32,
   'Em momentos difíceis, conto com o outro sem hesitar.',
   'In hard moments, I rely on the other person without hesitation.',
   true, null),
  ('ecr_avo_15', 'ecr_r', 'ecr_r:scale:avoidance', 33,
   'Demonstrar carinho físico — abraço, toque — vem natural.',
   'Physical affection — hugging, touching — comes naturally to me.',
   true, null),
  ('ecr_avo_16', 'ecr_r', 'ecr_r:scale:avoidance', 34,
   'Falar de sentimentos é uma das melhores coisas da relação pra mim.',
   'Talking about feelings is one of the best parts of a relationship for me.',
   true, null),
  ('ecr_avo_17', 'ecr_r', 'ecr_r:scale:avoidance', 35,
   'Quando o outro precisa de mim emocionalmente, eu apareço sem reservas.',
   'When the other person needs me emotionally, I show up without reservation.',
   true, null),
  ('ecr_avo_18', 'ecr_r', 'ecr_r:scale:avoidance', 36,
   'Não tenho problema em pedir ajuda emocional quando preciso.',
   'I have no problem asking for emotional help when I need it.',
   true, null);

commit;
