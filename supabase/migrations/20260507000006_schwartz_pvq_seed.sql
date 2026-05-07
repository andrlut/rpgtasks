-- ============================================================================
-- Psych — Schwartz PVQ-RR-style values inventory (autoral)
--
-- Seeds the `schwartz_pvq` instrument: 4 meta-values × 19 basic values × 3
-- items = 57. Items are 100% authored, inspired by Schwartz's refined
-- 19-value theory (Schwartz et al., 2012) without reproducing any
-- copyrighted PVQ-RR item.
--
-- Third-person framing ("Esta pessoa…" / "This person…") matches Schwartz's
-- design: it lowers social-desirability bias on values like Power and
-- Hedonism. The respondent rates how much the description fits them.
--
-- Scale: 1..6
--   1 = não se parece nada comigo / not at all like me
--   ...
--   6 = muito parecido comigo / very much like me
--
-- Scoring (`schwartz_centered`, already registered in #121):
--   per-value:  centered = mean(3 raw) - mean(57 raw)
--   per-meta:   mean(centered scores of children)
-- The centering kills acquiescence bias (responders who mark high on
-- everything) — without it, the value ranking would be dominated by
-- response style, not actual priorities.
--
-- 19-value → 4 meta-value mapping (Schwartz refined theory):
--   Self-Transcendence    → Universalism (concern/nature/tolerance),
--                          Benevolence (caring/dependability), Humility
--   Self-Enhancement      → Achievement, Power (dominance/resources), Face
--   Openness to Change    → Self-Direction (thought/action), Stimulation,
--                          Hedonism
--   Conservation          → Security (personal/societal), Tradition,
--                          Conformity (rules/interpersonal)
--
-- ============================================================================

begin;

-- ─── 1. Instrument ─────────────────────────────────────────────────────────

insert into public.psych_instrument
  (id, name, description, category, version,
   item_count, scale_min, scale_max, scoring_doc_url,
   scoring_method, scale_labels)
values (
  'schwartz_pvq',
  'Valores — Schwartz',
  'Inventário de 57 itens, autoral, inspirado na teoria refinada de ' ||
  'valores de Schwartz (19 valores em 4 grupos). Devolve um ranking — ' ||
  'o que você prioriza vs o que abre mão. Não substitui instrumento ' ||
  'clínico ou de pesquisa.',
  'self_knowledge', '1.0', 57, 1, 6,
  'docs/psych-instruments-v1.md#53-schwartz-pvq-rr',
  'schwartz_centered',
  '{
    "pt": [
      {"label": "Não se parece nada comigo", "value": 1},
      {"label": "Não se parece comigo",      "value": 2},
      {"label": "Pouco parecido comigo",     "value": 3},
      {"label": "Mais ou menos parecido",    "value": 4},
      {"label": "Parece comigo",             "value": 5},
      {"label": "Muito parecido comigo",     "value": 6}
    ],
    "en": [
      {"label": "Not at all like me",   "value": 1},
      {"label": "Not like me",          "value": 2},
      {"label": "A little like me",     "value": 3},
      {"label": "Somewhat like me",     "value": 4},
      {"label": "Like me",              "value": 5},
      {"label": "Very much like me",    "value": 6}
    ]
  }'::jsonb
);

-- ─── 2. Meta-values (4 parent facets) ──────────────────────────────────────

insert into public.psych_facet
  (id, instrument_id, parent_facet_id, slug, name, description, position)
values
  ('schwartz:meta:self_transcendence', 'schwartz_pvq', null,
   'self_transcendence', 'Auto-Transcendência',
   'Cuidar dos outros e do mundo: universalismo, benevolência, humildade.',
   1000),
  ('schwartz:meta:self_enhancement',   'schwartz_pvq', null,
   'self_enhancement',   'Auto-Promoção',
   'Status, sucesso, recursos, imagem: conquista, poder, face.',
   2000),
  ('schwartz:meta:openness_to_change', 'schwartz_pvq', null,
   'openness_to_change', 'Abertura à Mudança',
   'Liberdade, estímulo, prazer: autonomia, estimulação, hedonismo.',
   3000),
  ('schwartz:meta:conservation',       'schwartz_pvq', null,
   'conservation',       'Conservação',
   'Estabilidade, ordem, tradição: segurança, tradição, conformidade.',
   4000);

-- ─── 3. Basic values (19 leaf facets) ──────────────────────────────────────

insert into public.psych_facet
  (id, instrument_id, parent_facet_id, slug, name, position)
values
  -- Self-Transcendence
  ('schwartz:value:universalism_concern',
   'schwartz_pvq', 'schwartz:meta:self_transcendence',
   'universalism_concern',  'Universalismo — Preocupação',  1010),
  ('schwartz:value:universalism_nature',
   'schwartz_pvq', 'schwartz:meta:self_transcendence',
   'universalism_nature',   'Universalismo — Natureza',     1020),
  ('schwartz:value:universalism_tolerance',
   'schwartz_pvq', 'schwartz:meta:self_transcendence',
   'universalism_tolerance','Universalismo — Tolerância',   1030),
  ('schwartz:value:benevolence_caring',
   'schwartz_pvq', 'schwartz:meta:self_transcendence',
   'benevolence_caring',    'Benevolência — Cuidado',       1040),
  ('schwartz:value:benevolence_dependability',
   'schwartz_pvq', 'schwartz:meta:self_transcendence',
   'benevolence_dependability','Benevolência — Confiabilidade', 1050),
  ('schwartz:value:humility',
   'schwartz_pvq', 'schwartz:meta:self_transcendence',
   'humility',              'Humildade',                    1060),
  -- Self-Enhancement
  ('schwartz:value:achievement',
   'schwartz_pvq', 'schwartz:meta:self_enhancement',
   'achievement',           'Conquista',                    2010),
  ('schwartz:value:power_dominance',
   'schwartz_pvq', 'schwartz:meta:self_enhancement',
   'power_dominance',       'Poder — Dominância',           2020),
  ('schwartz:value:power_resources',
   'schwartz_pvq', 'schwartz:meta:self_enhancement',
   'power_resources',       'Poder — Recursos',             2030),
  ('schwartz:value:face',
   'schwartz_pvq', 'schwartz:meta:self_enhancement',
   'face',                  'Imagem Pública',               2040),
  -- Openness to Change
  ('schwartz:value:self_direction_thought',
   'schwartz_pvq', 'schwartz:meta:openness_to_change',
   'self_direction_thought','Autonomia — Pensamento',       3010),
  ('schwartz:value:self_direction_action',
   'schwartz_pvq', 'schwartz:meta:openness_to_change',
   'self_direction_action', 'Autonomia — Ação',             3020),
  ('schwartz:value:stimulation',
   'schwartz_pvq', 'schwartz:meta:openness_to_change',
   'stimulation',           'Estimulação',                  3030),
  ('schwartz:value:hedonism',
   'schwartz_pvq', 'schwartz:meta:openness_to_change',
   'hedonism',              'Hedonismo',                    3040),
  -- Conservation
  ('schwartz:value:security_personal',
   'schwartz_pvq', 'schwartz:meta:conservation',
   'security_personal',     'Segurança — Pessoal',          4010),
  ('schwartz:value:security_societal',
   'schwartz_pvq', 'schwartz:meta:conservation',
   'security_societal',     'Segurança — Social',           4020),
  ('schwartz:value:tradition',
   'schwartz_pvq', 'schwartz:meta:conservation',
   'tradition',             'Tradição',                     4030),
  ('schwartz:value:conformity_rules',
   'schwartz_pvq', 'schwartz:meta:conservation',
   'conformity_rules',      'Conformidade — Regras',        4040),
  ('schwartz:value:conformity_interpersonal',
   'schwartz_pvq', 'schwartz:meta:conservation',
   'conformity_interpersonal','Conformidade — Interpessoal', 4050);

-- ─── 4. Items (57) ─────────────────────────────────────────────────────────
-- Third-person framing throughout. options_jsonb null — items inherit the
-- instrument's scale_labels (Likert 1..6).

insert into public.psych_item
  (id, instrument_id, facet_id, position, text_pt, text_en,
   reverse_scored, options_jsonb)
values
  -- ───────────── Self-Transcendence ─────────────
  -- Universalism Concern
  ('sw_ucnc_1', 'schwartz_pvq', 'schwartz:value:universalism_concern', 1,
   'Esta pessoa se importa com a igualdade e justiça pra todos.',
   'This person cares about equality and justice for everyone.',
   false, null),
  ('sw_ucnc_2', 'schwartz_pvq', 'schwartz:value:universalism_concern', 2,
   'Trabalhar por um mundo mais justo é importante pra ela.',
   'Working toward a more just world matters to them.',
   false, null),
  ('sw_ucnc_3', 'schwartz_pvq', 'schwartz:value:universalism_concern', 3,
   'Esta pessoa se incomoda quando vê desigualdade ou injustiça.',
   'This person is bothered when they see inequality or injustice.',
   false, null),
  -- Universalism Nature
  ('sw_unat_1', 'schwartz_pvq', 'schwartz:value:universalism_nature', 4,
   'Esta pessoa se preocupa com a preservação da natureza.',
   'This person cares about preserving nature.',
   false, null),
  ('sw_unat_2', 'schwartz_pvq', 'schwartz:value:universalism_nature', 5,
   'Cuidar do meio ambiente é importante pra ela.',
   'Caring for the environment is important to them.',
   false, null),
  ('sw_unat_3', 'schwartz_pvq', 'schwartz:value:universalism_nature', 6,
   'Pra esta pessoa, proteger outras espécies importa tanto quanto proteger pessoas.',
   'For this person, protecting other species matters as much as protecting people.',
   false, null),
  -- Universalism Tolerance
  ('sw_utol_1', 'schwartz_pvq', 'schwartz:value:universalism_tolerance', 7,
   'Esta pessoa acha importante aceitar pessoas diferentes dela.',
   'It is important to this person to accept people different from themselves.',
   false, null),
  ('sw_utol_2', 'schwartz_pvq', 'schwartz:value:universalism_tolerance', 8,
   'Pra esta pessoa, é importante ouvir e respeitar opiniões com as quais discorda.',
   'For this person, it is important to listen to and respect opinions they disagree with.',
   false, null),
  ('sw_utol_3', 'schwartz_pvq', 'schwartz:value:universalism_tolerance', 9,
   'Esta pessoa valoriza conhecer pessoas de origens diferentes.',
   'This person values getting to know people from different backgrounds.',
   false, null),
  -- Benevolence Caring
  ('sw_bcar_1', 'schwartz_pvq', 'schwartz:value:benevolence_caring', 10,
   'Cuidar do bem-estar das pessoas próximas é importante pra esta pessoa.',
   'Caring for the well-being of those close is important to this person.',
   false, null),
  ('sw_bcar_2', 'schwartz_pvq', 'schwartz:value:benevolence_caring', 11,
   'Esta pessoa quer fazer coisas boas pelas pessoas que ama.',
   'This person wants to do good things for the people they love.',
   false, null),
  ('sw_bcar_3', 'schwartz_pvq', 'schwartz:value:benevolence_caring', 12,
   'Pra esta pessoa, dedicar tempo e energia aos próximos é fundamental.',
   'For this person, devoting time and energy to those close is fundamental.',
   false, null),
  -- Benevolence Dependability
  ('sw_bdep_1', 'schwartz_pvq', 'schwartz:value:benevolence_dependability', 13,
   'Ser uma pessoa em quem o grupo próximo pode confiar é importante pra ela.',
   'Being someone the close group can rely on is important to them.',
   false, null),
  ('sw_bdep_2', 'schwartz_pvq', 'schwartz:value:benevolence_dependability', 14,
   'Esta pessoa quer estar presente quando alguém próximo precisar.',
   'This person wants to be there when someone close needs them.',
   false, null),
  ('sw_bdep_3', 'schwartz_pvq', 'schwartz:value:benevolence_dependability', 15,
   'Pra esta pessoa, é importante ser leal aos amigos e à família.',
   'For this person, it is important to be loyal to friends and family.',
   false, null),
  -- Humility
  ('sw_humi_1', 'schwartz_pvq', 'schwartz:value:humility', 16,
   'Esta pessoa acha importante reconhecer que é apenas uma entre tantas.',
   'It is important to this person to recognize they are just one among many.',
   false, null),
  ('sw_humi_2', 'schwartz_pvq', 'schwartz:value:humility', 17,
   'Pra esta pessoa, é importante não se achar mais importante que os outros.',
   'For this person, it is important not to think themselves more important than others.',
   false, null),
  ('sw_humi_3', 'schwartz_pvq', 'schwartz:value:humility', 18,
   'Esta pessoa valoriza modéstia em si própria.',
   'This person values modesty in themselves.',
   false, null),

  -- ───────────── Self-Enhancement ─────────────
  -- Achievement
  ('sw_achv_1', 'schwartz_pvq', 'schwartz:value:achievement', 19,
   'Esta pessoa quer mostrar pros outros que é capaz e bem-sucedida.',
   'This person wants to show others they are capable and successful.',
   false, null),
  ('sw_achv_2', 'schwartz_pvq', 'schwartz:value:achievement', 20,
   'Pra esta pessoa, ser reconhecida pelas conquistas é importante.',
   'It is important to this person to be recognized for their accomplishments.',
   false, null),
  ('sw_achv_3', 'schwartz_pvq', 'schwartz:value:achievement', 21,
   'Esta pessoa se cobra pra superar os outros no que faz.',
   'This person pushes themselves to outperform others at what they do.',
   false, null),
  -- Power Dominance
  ('sw_pdom_1', 'schwartz_pvq', 'schwartz:value:power_dominance', 22,
   'Esta pessoa quer estar em posição de mandar nos outros.',
   'This person wants to be in a position to lead others.',
   false, null),
  ('sw_pdom_2', 'schwartz_pvq', 'schwartz:value:power_dominance', 23,
   'Pra ela, ter influência sobre as decisões dos outros é importante.',
   'It is important to them to have influence over others'' decisions.',
   false, null),
  ('sw_pdom_3', 'schwartz_pvq', 'schwartz:value:power_dominance', 24,
   'Esta pessoa gosta quando os outros aceitam o que ela diz.',
   'This person likes it when others accept what they say.',
   false, null),
  -- Power Resources
  ('sw_pres_1', 'schwartz_pvq', 'schwartz:value:power_resources', 25,
   'Esta pessoa acha importante ter dinheiro e bens materiais.',
   'It is important to this person to have money and material possessions.',
   false, null),
  ('sw_pres_2', 'schwartz_pvq', 'schwartz:value:power_resources', 26,
   'Pra ela, sucesso financeiro é uma medida importante de vida.',
   'For them, financial success is an important measure of life.',
   false, null),
  ('sw_pres_3', 'schwartz_pvq', 'schwartz:value:power_resources', 27,
   'Esta pessoa quer ter o poder que vem com riqueza.',
   'This person wants the power that comes with wealth.',
   false, null),
  -- Face
  ('sw_face_1', 'schwartz_pvq', 'schwartz:value:face', 28,
   'Esta pessoa se preocupa em manter uma imagem respeitável pros outros.',
   'This person cares about maintaining a respectable image for others.',
   false, null),
  ('sw_face_2', 'schwartz_pvq', 'schwartz:value:face', 29,
   'Evitar passar vergonha em público é importante pra ela.',
   'Avoiding public embarrassment is important to them.',
   false, null),
  ('sw_face_3', 'schwartz_pvq', 'schwartz:value:face', 30,
   'Pra esta pessoa, é importante que os outros tenham uma boa opinião dela.',
   'It is important to this person that others hold them in good regard.',
   false, null),

  -- ───────────── Openness to Change ─────────────
  -- Self-Direction Thought
  ('sw_sdth_1', 'schwartz_pvq', 'schwartz:value:self_direction_thought', 31,
   'Esta pessoa acha importante formar suas próprias opiniões em vez de aceitar ideias prontas.',
   'It is important to this person to form their own opinions rather than accept ready-made ideas.',
   false, null),
  ('sw_sdth_2', 'schwartz_pvq', 'schwartz:value:self_direction_thought', 32,
   'Pra ela é importante ser livre pra pensar de forma diferente dos outros.',
   'For them it is important to be free to think differently from others.',
   false, null),
  ('sw_sdth_3', 'schwartz_pvq', 'schwartz:value:self_direction_thought', 33,
   'Esta pessoa valoriza buscar entender as coisas profundamente, com critério próprio.',
   'This person values seeking to understand things deeply, on their own terms.',
   false, null),
  -- Self-Direction Action
  ('sw_sdac_1', 'schwartz_pvq', 'schwartz:value:self_direction_action', 34,
   'É importante pra esta pessoa decidir sozinha o que fazer com a vida.',
   'It is important to this person to decide for themselves what to do with their life.',
   false, null),
  ('sw_sdac_2', 'schwartz_pvq', 'schwartz:value:self_direction_action', 35,
   'Esta pessoa quer escolher seu próprio caminho, sem depender da aprovação dos outros.',
   'This person wants to choose their own path, without depending on others'' approval.',
   false, null),
  ('sw_sdac_3', 'schwartz_pvq', 'schwartz:value:self_direction_action', 36,
   'Liberdade pra agir como acha melhor é importante pra ela.',
   'Being free to act as they see fit is important to them.',
   false, null),
  -- Stimulation
  ('sw_stim_1', 'schwartz_pvq', 'schwartz:value:stimulation', 37,
   'Esta pessoa busca aventura e gosta de correr riscos.',
   'This person seeks adventure and likes to take risks.',
   false, null),
  ('sw_stim_2', 'schwartz_pvq', 'schwartz:value:stimulation', 38,
   'Pra ela, ter uma vida cheia de experiências novas e diferentes é importante.',
   'For them, having a life full of new and varied experiences is important.',
   false, null),
  ('sw_stim_3', 'schwartz_pvq', 'schwartz:value:stimulation', 39,
   'Esta pessoa fica entediada com rotina — precisa de estímulo pra se sentir viva.',
   'This person gets bored with routine — they need stimulation to feel alive.',
   false, null),
  -- Hedonism
  ('sw_hedo_1', 'schwartz_pvq', 'schwartz:value:hedonism', 40,
   'Aproveitar o prazer da vida é prioridade pra esta pessoa.',
   'Enjoying life''s pleasures is a priority for this person.',
   false, null),
  ('sw_hedo_2', 'schwartz_pvq', 'schwartz:value:hedonism', 41,
   'Esta pessoa acha que a vida é pra ser saboreada — comida, sexo, conforto, tudo isso conta.',
   'This person believes life is meant to be savored — food, sex, comfort, all of it counts.',
   false, null),
  ('sw_hedo_3', 'schwartz_pvq', 'schwartz:value:hedonism', 42,
   'Buscar momentos prazerosos é importante pra ela, mesmo que outros achem fútil.',
   'Seeking pleasurable moments matters to them, even if others find it frivolous.',
   false, null),

  -- ───────────── Conservation ─────────────
  -- Security Personal
  ('sw_sper_1', 'schwartz_pvq', 'schwartz:value:security_personal', 43,
   'Esta pessoa precisa se sentir segura no seu ambiente próximo.',
   'This person needs to feel safe in their immediate surroundings.',
   false, null),
  ('sw_sper_2', 'schwartz_pvq', 'schwartz:value:security_personal', 44,
   'Pra ela, evitar situações que possam machucá-la é importante.',
   'For them, avoiding situations that could harm them is important.',
   false, null),
  ('sw_sper_3', 'schwartz_pvq', 'schwartz:value:security_personal', 45,
   'Estabilidade e previsibilidade são importantes pra esta pessoa.',
   'Stability and predictability are important to this person.',
   false, null),
  -- Security Societal
  ('sw_ssoc_1', 'schwartz_pvq', 'schwartz:value:security_societal', 46,
   'Esta pessoa acha importante que o país esteja seguro contra ameaças.',
   'It is important to this person that the country be safe from threats.',
   false, null),
  ('sw_ssoc_2', 'schwartz_pvq', 'schwartz:value:security_societal', 47,
   'Manter a ordem na sociedade é importante pra ela.',
   'Maintaining order in society is important to them.',
   false, null),
  ('sw_ssoc_3', 'schwartz_pvq', 'schwartz:value:security_societal', 48,
   'Esta pessoa quer viver em um mundo estável, sem grandes rupturas.',
   'This person wants to live in a stable world, without major disruptions.',
   false, null),
  -- Tradition
  ('sw_trad_1', 'schwartz_pvq', 'schwartz:value:tradition', 49,
   'Manter os costumes e tradições da família é importante pra esta pessoa.',
   'Keeping the family''s customs and traditions is important to this person.',
   false, null),
  ('sw_trad_2', 'schwartz_pvq', 'schwartz:value:tradition', 50,
   'Esta pessoa acha importante seguir práticas culturais ou religiosas que herdou.',
   'It is important to this person to follow cultural or religious practices they inherited.',
   false, null),
  ('sw_trad_3', 'schwartz_pvq', 'schwartz:value:tradition', 51,
   'Pra ela, o velho tem um valor que o novo não substitui.',
   'For them, the old has a value that the new doesn''t replace.',
   false, null),
  -- Conformity Rules
  ('sw_cnfr_1', 'schwartz_pvq', 'schwartz:value:conformity_rules', 52,
   'Esta pessoa acha importante obedecer regras mesmo quando ninguém está vendo.',
   'It is important to this person to follow rules even when no one is watching.',
   false, null),
  ('sw_cnfr_2', 'schwartz_pvq', 'schwartz:value:conformity_rules', 53,
   'Seguir o que as autoridades pedem é importante pra ela.',
   'Following what authorities ask is important to them.',
   false, null),
  ('sw_cnfr_3', 'schwartz_pvq', 'schwartz:value:conformity_rules', 54,
   'Pra esta pessoa, regras existem por uma razão e devem ser respeitadas.',
   'For this person, rules exist for a reason and should be respected.',
   false, null),
  -- Conformity Interpersonal
  ('sw_cnfi_1', 'schwartz_pvq', 'schwartz:value:conformity_interpersonal', 55,
   'Esta pessoa evita fazer coisas que possam aborrecer os outros.',
   'This person avoids doing things that might upset others.',
   false, null),
  ('sw_cnfi_2', 'schwartz_pvq', 'schwartz:value:conformity_interpersonal', 56,
   'Não dar trabalho pras pessoas próximas é importante pra ela.',
   'Not being a burden to those close to them is important to them.',
   false, null),
  ('sw_cnfi_3', 'schwartz_pvq', 'schwartz:value:conformity_interpersonal', 57,
   'Esta pessoa se contém pra não criar atrito.',
   'This person holds back to avoid creating friction.',
   false, null);

commit;
