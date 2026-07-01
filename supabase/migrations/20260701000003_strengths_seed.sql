-- ============================================================================
-- Psych — Character Strengths inventory (autoral)
--
-- Seeds the `strengths` instrument: 6 virtues × 24 strengths × 3 items = 72.
-- Items are 100% authored, inspired by the academic 24-strength / 6-virtue
-- taxonomy (Peterson & Seligman, "Character Strengths and Virtues", 2004)
-- WITHOUT reproducing any VIA-IS / VIA Institute or CliftonStrengths wording.
-- The trademark "VIA" is NOT used anywhere; user-facing name is "Forças de
-- Caráter" / "Character Strengths".
--
-- Format: NORMATIVE Likert, first-person "like me" statements (1..5). But
-- scored IPSATIVELY (centered) and presented as a RANKING — the top-5 are
-- the user's "signature strengths".
--
-- Scoring: REUSES `schwartz_centered` (already registered in #121) — no new
-- scoring method, no function/constraint change. Per-strength (leaf, under a
-- virtue): centered = mean(3 raw) - mean(72 raw). Per-virtue (parent): mean
-- of its strengths' centered scores. The centering removes acquiescence bias
-- so the ranking reflects real relative strengths, not response style.
--
-- Facet hierarchy: 6 virtue parents (strengths:virtue:<slug>) + 24 strength
-- leaves (strengths:strength:<slug>, parent = its virtue).
--
-- Category self_knowledge — no bridge to character_sub_score.
--
-- Item `position` interleaves the 3 items of each strength across the test
-- (item 1 of all 24 first, then item 2s, then item 3s) so the user never
-- sees 3 same-strength questions back-to-back:
--   position = 1 + strengthIndex + (itemIndex * 24).
-- ============================================================================

begin;

-- ─── 1. Instrument ─────────────────────────────────────────────────────────

insert into public.psych_instrument
  (id, name, description, category, version,
   item_count, scale_min, scale_max, scoring_doc_url,
   scoring_method, scale_labels)
values (
  'strengths',
  'Forças de Caráter',
  'Inventário de 72 itens, autoral, inspirado na taxonomia de 24 forças de ' ||
  'caráter em 6 virtudes (psicologia positiva). Devolve um ranking — suas ' ||
  'forças-assinatura, o que mais te representa. Reflexão, não diagnóstico.',
  'self_knowledge', '1.0', 72, 1, 5,
  'docs/psych-instruments-v1.md#strengths',
  'schwartz_centered',
  '{
    "pt": [
      {"label": "Nada a ver comigo",        "value": 1},
      {"label": "Pouco a ver comigo",       "value": 2},
      {"label": "Mais ou menos",            "value": 3},
      {"label": "A ver comigo",             "value": 4},
      {"label": "Totalmente a ver comigo",  "value": 5}
    ],
    "en": [
      {"label": "Not like me at all",  "value": 1},
      {"label": "A little like me",    "value": 2},
      {"label": "Somewhat like me",    "value": 3},
      {"label": "Like me",             "value": 4},
      {"label": "Very much like me",   "value": 5}
    ]
  }'::jsonb
);

-- ─── 2. Virtues (6 parent facets) ──────────────────────────────────────────

insert into public.psych_facet
  (id, instrument_id, parent_facet_id, slug, name, description, position)
values
  ('strengths:virtue:wisdom', 'strengths', null,
   'wisdom', 'Sabedoria e Conhecimento',
   'Forças cognitivas: criatividade, curiosidade, discernimento, amor ao aprendizado, perspectiva.',
   100),
  ('strengths:virtue:courage', 'strengths', null,
   'courage', 'Coragem',
   'Forças de vontade: bravura, perseverança, autenticidade, vitalidade.',
   200),
  ('strengths:virtue:humanity', 'strengths', null,
   'humanity', 'Humanidade',
   'Forças de aproximação e cuidado: amor, bondade, inteligência social.',
   300),
  ('strengths:virtue:justice', 'strengths', null,
   'justice', 'Justiça',
   'Forças de vida em grupo: trabalho em equipe, senso de justiça, liderança.',
   400),
  ('strengths:virtue:temperance', 'strengths', null,
   'temperance', 'Temperança',
   'Forças contra o excesso: perdão, humildade, prudência, autorregulação.',
   500),
  ('strengths:virtue:transcendence', 'strengths', null,
   'transcendence', 'Transcendência',
   'Forças de sentido: apreciação da beleza, gratidão, esperança, humor, propósito.',
   600);

-- ─── 3. Strengths (24 leaf facets, under their virtue) ─────────────────────

insert into public.psych_facet
  (id, instrument_id, parent_facet_id, slug, name, position)
values
  -- Wisdom
  ('strengths:strength:creativity',       'strengths', 'strengths:virtue:wisdom', 'creativity',       'Criatividade',        110),
  ('strengths:strength:curiosity',        'strengths', 'strengths:virtue:wisdom', 'curiosity',        'Curiosidade',         120),
  ('strengths:strength:judgment',         'strengths', 'strengths:virtue:wisdom', 'judgment',         'Discernimento',       130),
  ('strengths:strength:love_of_learning', 'strengths', 'strengths:virtue:wisdom', 'love_of_learning', 'Amor ao Aprendizado', 140),
  ('strengths:strength:perspective',      'strengths', 'strengths:virtue:wisdom', 'perspective',      'Perspectiva',         150),
  -- Courage
  ('strengths:strength:bravery',      'strengths', 'strengths:virtue:courage', 'bravery',      'Bravura',       210),
  ('strengths:strength:perseverance', 'strengths', 'strengths:virtue:courage', 'perseverance', 'Perseverança',  220),
  ('strengths:strength:honesty',      'strengths', 'strengths:virtue:courage', 'honesty',      'Autenticidade', 230),
  ('strengths:strength:zest',         'strengths', 'strengths:virtue:courage', 'zest',         'Vitalidade',    240),
  -- Humanity
  ('strengths:strength:love',                'strengths', 'strengths:virtue:humanity', 'love',                'Amor',                310),
  ('strengths:strength:kindness',            'strengths', 'strengths:virtue:humanity', 'kindness',            'Bondade',             320),
  ('strengths:strength:social_intelligence', 'strengths', 'strengths:virtue:humanity', 'social_intelligence', 'Inteligência Social', 330),
  -- Justice
  ('strengths:strength:teamwork',   'strengths', 'strengths:virtue:justice', 'teamwork',   'Trabalho em Equipe', 410),
  ('strengths:strength:fairness',   'strengths', 'strengths:virtue:justice', 'fairness',   'Senso de Justiça',   420),
  ('strengths:strength:leadership', 'strengths', 'strengths:virtue:justice', 'leadership', 'Liderança',          430),
  -- Temperance
  ('strengths:strength:forgiveness',     'strengths', 'strengths:virtue:temperance', 'forgiveness',     'Perdão',         510),
  ('strengths:strength:humility',        'strengths', 'strengths:virtue:temperance', 'humility',        'Humildade',      520),
  ('strengths:strength:prudence',        'strengths', 'strengths:virtue:temperance', 'prudence',        'Prudência',      530),
  ('strengths:strength:self_regulation', 'strengths', 'strengths:virtue:temperance', 'self_regulation', 'Autorregulação', 540),
  -- Transcendence
  ('strengths:strength:appreciation_of_beauty', 'strengths', 'strengths:virtue:transcendence', 'appreciation_of_beauty', 'Apreciação da Beleza', 610),
  ('strengths:strength:gratitude',              'strengths', 'strengths:virtue:transcendence', 'gratitude',              'Gratidão',             620),
  ('strengths:strength:hope',                   'strengths', 'strengths:virtue:transcendence', 'hope',                   'Esperança',            630),
  ('strengths:strength:humor',                  'strengths', 'strengths:virtue:transcendence', 'humor',                  'Humor',                640),
  ('strengths:strength:spirituality',           'strengths', 'strengths:virtue:transcendence', 'spirituality',           'Propósito',            650);

-- ─── 4. Items (72 — 3 per strength, interleaved positions) ─────────────────

insert into public.psych_item
  (id, instrument_id, facet_id, position, text_pt, text_en, reverse_scored, options_jsonb)
values
  -- ── Wisdom · Creativity (idx 0 → pos 1/25/49) ──
  ('str_creativity_1', 'strengths', 'strengths:strength:creativity', 1,
   'Quando bate um problema, logo aparecem várias ideias diferentes na minha cabeça.',
   'When a problem shows up, a bunch of different ideas pop into my head.', false, null),
  ('str_creativity_2', 'strengths', 'strengths:strength:creativity', 25,
   'Gosto de fazer as coisas do meu jeito, mesmo que não seja o jeito de sempre.',
   'I like doing things my own way, even when it''s not the usual way.', false, null),
  ('str_creativity_3', 'strengths', 'strengths:strength:creativity', 49,
   'Junto coisas que não têm nada a ver e crio algo novo com elas.',
   'I combine unrelated things and make something new out of them.', false, null),

  -- ── Wisdom · Curiosity (idx 1 → pos 2/26/50) ──
  ('str_curiosity_1', 'strengths', 'strengths:strength:curiosity', 2,
   'Fico com vontade de entender como as coisas funcionam por dentro.',
   'I get an itch to understand how things work under the hood.', false, null),
  ('str_curiosity_2', 'strengths', 'strengths:strength:curiosity', 26,
   'Quando algo novo aparece, quero explorar e descobrir como é.',
   'When something new comes up, I want to explore it and find out what it''s like.', false, null),
  ('str_curiosity_3', 'strengths', 'strengths:strength:curiosity', 50,
   'Faço muitas perguntas quando algo desperta meu interesse.',
   'I ask a lot of questions when something sparks my interest.', false, null),

  -- ── Wisdom · Judgment (idx 2 → pos 3/27/51) ──
  ('str_judgment_1', 'strengths', 'strengths:strength:judgment', 3,
   'Antes de decidir, penso em como isso pode dar errado, não só em como pode dar certo.',
   'Before I decide, I think about how it could go wrong, not just how it could go right.', false, null),
  ('str_judgment_2', 'strengths', 'strengths:strength:judgment', 27,
   'Baseio minhas conclusões nos fatos, não no que eu gostaria que fosse verdade.',
   'I base my conclusions on the facts, not on what I''d like to be true.', false, null),
  ('str_judgment_3', 'strengths', 'strengths:strength:judgment', 51,
   'Procuro entender o outro lado antes de formar a minha posição.',
   'I try to understand the other side before I settle on where I stand.', false, null),

  -- ── Wisdom · Love of Learning (idx 3 → pos 4/28/52) ──
  ('str_love_of_learning_1', 'strengths', 'strengths:strength:love_of_learning', 4,
   'Sinto prazer em aprender um assunto novo, mesmo sem precisar dele pra nada.',
   'I get real pleasure from learning a new subject, even when I don''t need it for anything.', false, null),
  ('str_love_of_learning_2', 'strengths', 'strengths:strength:love_of_learning', 28,
   'Gosto de me aprofundar até entender um tema de verdade, não só por cima.',
   'I like going deep until I really understand a topic, not just skim the surface.', false, null),
  ('str_love_of_learning_3', 'strengths', 'strengths:strength:love_of_learning', 52,
   'Fico animado quando finalmente pego o jeito de uma habilidade difícil.',
   'I feel a rush when I finally get the hang of a hard skill.', false, null),

  -- ── Wisdom · Perspective (idx 4 → pos 5/29/53) ──
  ('str_perspective_1', 'strengths', 'strengths:strength:perspective', 5,
   'Quando um problema parece confuso, consigo separar o que realmente importa do que é ruído.',
   'When a problem feels tangled, I can separate what really matters from the noise.', false, null),
  ('str_perspective_2', 'strengths', 'strengths:strength:perspective', 29,
   'Consigo enxergar o quadro geral quando os outros estão presos nos detalhes.',
   'I can see the big picture when others are stuck in the details.', false, null),
  ('str_perspective_3', 'strengths', 'strengths:strength:perspective', 53,
   'Aprendo com o que já vivi e uso isso pra entender situações novas.',
   'I learn from what I''ve been through and use it to make sense of new situations.', false, null),

  -- ── Courage · Bravery (idx 5 → pos 6/30/54) ──
  ('str_bravery_1', 'strengths', 'strengths:strength:bravery', 6,
   'Quando algo é importante, eu ajo mesmo sentindo medo.',
   'When something matters, I act even when I''m afraid.', false, null),
  ('str_bravery_2', 'strengths', 'strengths:strength:bravery', 30,
   'Levanto a voz por uma causa justa, mesmo que isso me exponha.',
   'I speak up for what''s right, even when it puts me on the spot.', false, null),
  ('str_bravery_3', 'strengths', 'strengths:strength:bravery', 54,
   'Encaro situações difíceis que a maioria das pessoas prefere evitar.',
   'I face tough situations that most people would rather avoid.', false, null),

  -- ── Courage · Perseverance (idx 6 → pos 7/31/55) ──
  ('str_perseverance_1', 'strengths', 'strengths:strength:perseverance', 7,
   'Termino o que começo, mesmo quando o entusiasmo inicial já passou.',
   'I finish what I start, even after the initial excitement wears off.', false, null),
  ('str_perseverance_2', 'strengths', 'strengths:strength:perseverance', 31,
   'Quando bato num obstáculo, procuro um jeito de contornar em vez de desistir.',
   'When I hit an obstacle, I look for a way around it instead of giving up.', false, null),
  ('str_perseverance_3', 'strengths', 'strengths:strength:perseverance', 55,
   'Consigo manter o esforço em tarefas longas e cansativas.',
   'I can keep up the effort on long, tiring tasks.', false, null),

  -- ── Courage · Honesty (idx 7 → pos 8/32/56) ──
  ('str_honesty_1', 'strengths', 'strengths:strength:honesty', 8,
   'Digo o que penso de verdade, mesmo quando seria mais fácil concordar.',
   'I say what I really think, even when going along would be easier.', false, null),
  ('str_honesty_2', 'strengths', 'strengths:strength:honesty', 32,
   'Sou a mesma pessoa em qualquer ambiente, sem fingir ser quem não sou.',
   'I''m the same person in any setting, without pretending to be someone I''m not.', false, null),
  ('str_honesty_3', 'strengths', 'strengths:strength:honesty', 56,
   'Assumo meus erros em vez de inventar desculpas.',
   'I own my mistakes instead of making excuses for them.', false, null),

  -- ── Courage · Zest (idx 8 → pos 9/33/57) ──
  ('str_zest_1', 'strengths', 'strengths:strength:zest', 9,
   'Acordo com vontade de encarar o dia.',
   'I wake up looking forward to the day ahead.', false, null),
  ('str_zest_2', 'strengths', 'strengths:strength:zest', 33,
   'Me jogo de corpo e alma nas coisas que faço.',
   'I throw myself body and soul into what I do.', false, null),
  ('str_zest_3', 'strengths', 'strengths:strength:zest', 57,
   'Minha energia costuma contagiar as pessoas ao meu redor.',
   'My energy tends to rub off on the people around me.', false, null),

  -- ── Humanity · Love (idx 9 → pos 10/34/58) ──
  ('str_love_1', 'strengths', 'strengths:strength:love', 10,
   'Tenho pessoas com quem posso contar de verdade, e elas podem contar comigo.',
   'I have people I can truly count on, and they can count on me.', false, null),
  ('str_love_2', 'strengths', 'strengths:strength:love', 34,
   'Demonstro carinho de um jeito que a pessoa consegue sentir.',
   'I show affection in a way the other person can actually feel.', false, null),
  ('str_love_3', 'strengths', 'strengths:strength:love', 58,
   'Deixo alguém cuidar de mim quando estou precisando, sem me fechar.',
   'I let someone take care of me when I need it, instead of shutting them out.', false, null),

  -- ── Humanity · Kindness (idx 10 → pos 11/35/59) ──
  ('str_kindness_1', 'strengths', 'strengths:strength:kindness', 11,
   'Faço um favor pra alguém mesmo quando ninguém me pediu.',
   'I do someone a favor even when nobody asked me to.', false, null),
  ('str_kindness_2', 'strengths', 'strengths:strength:kindness', 35,
   'Quando vejo alguém em apuros, minha vontade é ajudar de imediato.',
   'When I see someone in trouble, my first instinct is to help.', false, null),
  ('str_kindness_3', 'strengths', 'strengths:strength:kindness', 59,
   'Trato bem até quem não pode me retribuir em nada.',
   'I treat people well even when they can''t give me anything back.', false, null),

  -- ── Humanity · Social Intelligence (idx 11 → pos 12/36/60) ──
  ('str_social_intelligence_1', 'strengths', 'strengths:strength:social_intelligence', 12,
   'Percebo como a pessoa está se sentindo mesmo quando ela não fala nada.',
   'I pick up on how someone''s feeling even when they don''t say a word.', false, null),
  ('str_social_intelligence_2', 'strengths', 'strengths:strength:social_intelligence', 36,
   'Percebo o que cada situação social está pedindo e ajo de acordo.',
   'I sense what each social situation calls for and act accordingly.', false, null),
  ('str_social_intelligence_3', 'strengths', 'strengths:strength:social_intelligence', 60,
   'Entendo o que faz as pessoas agirem do jeito que agem.',
   'I understand what makes people act the way they do.', false, null),

  -- ── Justice · Teamwork (idx 12 → pos 13/37/61) ──
  ('str_teamwork_1', 'strengths', 'strengths:strength:teamwork', 13,
   'Cumpro a minha parte pra não deixar o grupo na mão.',
   'I pull my weight so I don''t let the group down.', false, null),
  ('str_teamwork_2', 'strengths', 'strengths:strength:teamwork', 37,
   'Coloco o resultado do time acima de aparecer sozinho.',
   'I put the team''s result ahead of standing out on my own.', false, null),
  ('str_teamwork_3', 'strengths', 'strengths:strength:teamwork', 61,
   'Sou leal a quem está comigo, mesmo quando as coisas apertam.',
   'I stay loyal to the people with me, even when things get tough.', false, null),

  -- ── Justice · Fairness (idx 13 → pos 14/38/62) ──
  ('str_fairness_1', 'strengths', 'strengths:strength:fairness', 14,
   'Trato as pessoas pelo mesmo critério, mesmo as que eu não gosto.',
   'I judge people by the same standard, even the ones I don''t like.', false, null),
  ('str_fairness_2', 'strengths', 'strengths:strength:fairness', 38,
   'Dou a mesma chance de fala pra todos os envolvidos, não só pra quem eu conheço melhor.',
   'I give everyone involved the same chance to be heard, not just the people I know better.', false, null),
  ('str_fairness_3', 'strengths', 'strengths:strength:fairness', 62,
   'Não deixo minhas preferências pesarem numa decisão que afeta todo mundo.',
   'I don''t let my preferences tip a decision that affects everyone.', false, null),

  -- ── Justice · Leadership (idx 14 → pos 15/39/63) ──
  ('str_leadership_1', 'strengths', 'strengths:strength:leadership', 15,
   'Consigo organizar as pessoas em torno de um objetivo comum.',
   'I can organize people around a shared goal.', false, null),
  ('str_leadership_2', 'strengths', 'strengths:strength:leadership', 39,
   'Animo o grupo a seguir em frente mesmo quando o gás cai.',
   'I keep the group going even when the energy drops.', false, null),
  ('str_leadership_3', 'strengths', 'strengths:strength:leadership', 63,
   'Faço as coisas andarem sem estragar o clima entre as pessoas.',
   'I get things moving without souring the mood between people.', false, null),

  -- ── Temperance · Forgiveness (idx 15 → pos 16/40/64) ──
  ('str_forgiveness_1', 'strengths', 'strengths:strength:forgiveness', 16,
   'Consigo soltar uma mágoa antiga em vez de ficar remoendo.',
   'I can let go of an old hurt instead of replaying it in my head.', false, null),
  ('str_forgiveness_2', 'strengths', 'strengths:strength:forgiveness', 40,
   'Quando alguém me magoa, não fico planejando revanche.',
   'When someone hurts me, I don''t sit around plotting to get even.', false, null),
  ('str_forgiveness_3', 'strengths', 'strengths:strength:forgiveness', 64,
   'Dou uma segunda chance a quem se arrepende de verdade.',
   'I give a second chance to people who are genuinely sorry.', false, null),

  -- ── Temperance · Humility (idx 16 → pos 17/41/65) ──
  ('str_humility_1', 'strengths', 'strengths:strength:humility', 17,
   'Prefiro que meu trabalho fale por mim a ficar me gabando.',
   'I''d rather let my work speak for me than brag about it.', false, null),
  ('str_humility_2', 'strengths', 'strengths:strength:humility', 41,
   'Admito com tranquilidade quando não sei alguma coisa.',
   'I''m comfortable admitting when I don''t know something.', false, null),
  ('str_humility_3', 'strengths', 'strengths:strength:humility', 65,
   'Divido o crédito com quem ajudou, sem puxar tudo pra mim.',
   'I share credit with the people who helped, instead of taking it all.', false, null),

  -- ── Temperance · Prudence (idx 17 → pos 18/42/66) ──
  ('str_prudence_1', 'strengths', 'strengths:strength:prudence', 18,
   'Não me apresso em decisões importantes — prefiro dar um tempo antes de me comprometer.',
   'I don''t rush big decisions — I''d rather sit with them before committing.', false, null),
  ('str_prudence_2', 'strengths', 'strengths:strength:prudence', 42,
   'Escolho bem as palavras pra não falar algo de que vou me arrepender.',
   'I choose my words carefully so I don''t say something I''ll regret.', false, null),
  ('str_prudence_3', 'strengths', 'strengths:strength:prudence', 66,
   'Evito riscos desnecessários quando dá pra ir com mais calma.',
   'I avoid needless risks when there''s a calmer way to go about it.', false, null),

  -- ── Temperance · Self-Regulation (idx 18 → pos 19/43/67) ──
  ('str_self_regulation_1', 'strengths', 'strengths:strength:self_regulation', 19,
   'Consigo segurar um impulso no calor do momento em vez de agir na hora.',
   'I can hold back an impulse in the heat of the moment instead of acting on it.', false, null),
  ('str_self_regulation_2', 'strengths', 'strengths:strength:self_regulation', 43,
   'Mantenho meus hábitos mesmo nos dias em que a vontade some.',
   'I keep up my habits even on the days the motivation disappears.', false, null),
  ('str_self_regulation_3', 'strengths', 'strengths:strength:self_regulation', 67,
   'Mantenho a calma sob pressão em vez de perder a cabeça.',
   'I stay calm under pressure instead of losing my cool.', false, null),

  -- ── Transcendence · Appreciation of Beauty (idx 19 → pos 20/44/68) ──
  ('str_appreciation_of_beauty_1', 'strengths', 'strengths:strength:appreciation_of_beauty', 20,
   'Reparo em beleza que a maioria das pessoas passa sem ver.',
   'I notice beauty most people walk right past.', false, null),
  ('str_appreciation_of_beauty_2', 'strengths', 'strengths:strength:appreciation_of_beauty', 44,
   'Me emociono quando vejo alguém fazer algo com maestria.',
   'I get moved when I watch someone do something with real mastery.', false, null),
  ('str_appreciation_of_beauty_3', 'strengths', 'strengths:strength:appreciation_of_beauty', 68,
   'Uma paisagem ou uma música bonita consegue me tirar o fôlego.',
   'A beautiful view or piece of music can genuinely take my breath away.', false, null),

  -- ── Transcendence · Gratitude (idx 20 → pos 21/45/69) ──
  ('str_gratitude_1', 'strengths', 'strengths:strength:gratitude', 21,
   'Reconheço o quanto tenho de bom na vida e sou grato por isso.',
   'I recognize how much good I have in my life and feel thankful for it.', false, null),
  ('str_gratitude_2', 'strengths', 'strengths:strength:gratitude', 45,
   'Faço questão de agradecer quando alguém me ajuda.',
   'I make a point of saying thank you when someone helps me.', false, null),
  ('str_gratitude_3', 'strengths', 'strengths:strength:gratitude', 69,
   'Sinto gratidão até pelas pequenas coisas do dia.',
   'I feel grateful even for the small things in a day.', false, null),

  -- ── Transcendence · Hope (idx 21 → pos 22/46/70) ──
  ('str_hope_1', 'strengths', 'strengths:strength:hope', 22,
   'Acredito que o melhor ainda está por vir.',
   'I believe the best is still ahead of me.', false, null),
  ('str_hope_2', 'strengths', 'strengths:strength:hope', 46,
   'Mesmo diante de um problema, aposto que vai dar pra resolver.',
   'Even facing a problem, I bet there''s a way through it.', false, null),
  ('str_hope_3', 'strengths', 'strengths:strength:hope', 70,
   'Ajo hoje pensando no futuro que quero construir.',
   'I act today with the future I want to build in mind.', false, null),

  -- ── Transcendence · Humor (idx 22 → pos 23/47/71) ──
  ('str_humor_1', 'strengths', 'strengths:strength:humor', 23,
   'Gosto de fazer as pessoas rirem.',
   'I like making people laugh.', false, null),
  ('str_humor_2', 'strengths', 'strengths:strength:humor', 47,
   'Acho graça nas situações do dia a dia.',
   'I find the funny side of everyday situations.', false, null),
  ('str_humor_3', 'strengths', 'strengths:strength:humor', 71,
   'Consigo deixar o clima mais leve mesmo nos momentos tensos.',
   'I can lighten the mood even in tense moments.', false, null),

  -- ── Transcendence · Meaning & Purpose (idx 23 → pos 24/48/72) ──
  ('str_spirituality_1', 'strengths', 'strengths:strength:spirituality', 24,
   'Sinto que a minha vida tem um propósito claro.',
   'I feel my life has a clear purpose.', false, null),
  ('str_spirituality_2', 'strengths', 'strengths:strength:spirituality', 48,
   'Acredito que faço parte de algo maior do que eu.',
   'I believe I''m part of something bigger than myself.', false, null),
  ('str_spirituality_3', 'strengths', 'strengths:strength:spirituality', 72,
   'Minhas escolhas do dia a dia seguem aquilo que dá sentido pra mim.',
   'My everyday choices follow what gives my life meaning.', false, null);

commit;
