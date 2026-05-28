-- migration: 20260527000002_quest_templates_sub_stars.sql
-- purpose: seed 12 quest templates (one per sub) using the new
--          'accumulate_sub_stars' requirement kind from 20260527000001.
--
-- tiers (per refinement D2):
--   Daily       — 20 stars / 14 days  → 200 xp / 40 coins
--                 subs: sleep, nutrition, strength, contemplate
--   Weekly      — 12 stars / 21 days  → 120 xp / 24 coins
--                 subs: learn, money, career, play, build
--   Fortnightly —  8 stars / 30 days  →  80 xp / 16 coins
--                 subs: dexterity, circle, romance
--
-- on conflict: do nothing, so re-running the migration is harmless.
--
-- notes:
--   write-once; do not edit after applying
--   bilingual: title_pt/title_en + description_pt/description_en

insert into public.quest_template (
  id,
  title_pt, title_en,
  description_pt, description_en,
  category,
  suggested_duration_days,
  quest_type,
  reward_xp, reward_coins,
  allow_partial,
  challenge_target_value,
  challenge_unit_pt, challenge_unit_en,
  requirements,
  sort_order
)
values
  -- ── Daily tier (20★ / 14d) ────────────────────────────────────────────
  (
    'sub_stars_sleep',
    'Acumular 20★ em Sono em 14 dias',
    'Stack 20★ in Sleep over 14 days',
    'Toda task que toca este sub conta as estrelas dela aqui.',
    'Every task that touches this sub counts its stars here.',
    'sleep', 14, 'challenge', 200, 40, true,
    null, null, null,
    '[{"kind":"accumulate_sub_stars","sub_id":"sleep","target_count":20}]'::jsonb,
    200
  ),
  (
    'sub_stars_nutrition',
    'Acumular 20★ em Nutrição em 14 dias',
    'Stack 20★ in Nutrition over 14 days',
    'Toda task que toca este sub conta as estrelas dela aqui.',
    'Every task that touches this sub counts its stars here.',
    'nutrition', 14, 'challenge', 200, 40, true,
    null, null, null,
    '[{"kind":"accumulate_sub_stars","sub_id":"nutrition","target_count":20}]'::jsonb,
    201
  ),
  (
    'sub_stars_strength',
    'Acumular 20★ em Força em 14 dias',
    'Stack 20★ in Strength over 14 days',
    'Toda task que toca este sub conta as estrelas dela aqui.',
    'Every task that touches this sub counts its stars here.',
    'strength', 14, 'challenge', 200, 40, true,
    null, null, null,
    '[{"kind":"accumulate_sub_stars","sub_id":"strength","target_count":20}]'::jsonb,
    202
  ),
  (
    'sub_stars_contemplate',
    'Acumular 20★ em Contemplar em 14 dias',
    'Stack 20★ in Contemplate over 14 days',
    'Toda task que toca este sub conta as estrelas dela aqui.',
    'Every task that touches this sub counts its stars here.',
    'contemplate', 14, 'challenge', 200, 40, true,
    null, null, null,
    '[{"kind":"accumulate_sub_stars","sub_id":"contemplate","target_count":20}]'::jsonb,
    203
  ),

  -- ── Weekly tier (12★ / 21d) ───────────────────────────────────────────
  (
    'sub_stars_learn',
    'Acumular 12★ em Aprender em 21 dias',
    'Stack 12★ in Learn over 21 days',
    'Toda task que toca este sub conta as estrelas dela aqui.',
    'Every task that touches this sub counts its stars here.',
    'learn', 21, 'challenge', 120, 24, true,
    null, null, null,
    '[{"kind":"accumulate_sub_stars","sub_id":"learn","target_count":12}]'::jsonb,
    204
  ),
  (
    'sub_stars_money',
    'Acumular 12★ em Dinheiro em 21 dias',
    'Stack 12★ in Money over 21 days',
    'Toda task que toca este sub conta as estrelas dela aqui.',
    'Every task that touches this sub counts its stars here.',
    'money', 21, 'challenge', 120, 24, true,
    null, null, null,
    '[{"kind":"accumulate_sub_stars","sub_id":"money","target_count":12}]'::jsonb,
    205
  ),
  (
    'sub_stars_career',
    'Acumular 12★ em Carreira em 21 dias',
    'Stack 12★ in Career over 21 days',
    'Toda task que toca este sub conta as estrelas dela aqui.',
    'Every task that touches this sub counts its stars here.',
    'career', 21, 'challenge', 120, 24, true,
    null, null, null,
    '[{"kind":"accumulate_sub_stars","sub_id":"career","target_count":12}]'::jsonb,
    206
  ),
  (
    'sub_stars_play',
    'Acumular 12★ em Jogar em 21 dias',
    'Stack 12★ in Play over 21 days',
    'Toda task que toca este sub conta as estrelas dela aqui.',
    'Every task that touches this sub counts its stars here.',
    'play', 21, 'challenge', 120, 24, true,
    null, null, null,
    '[{"kind":"accumulate_sub_stars","sub_id":"play","target_count":12}]'::jsonb,
    207
  ),
  (
    'sub_stars_build',
    'Acumular 12★ em Construir em 21 dias',
    'Stack 12★ in Build over 21 days',
    'Toda task que toca este sub conta as estrelas dela aqui.',
    'Every task that touches this sub counts its stars here.',
    'build', 21, 'challenge', 120, 24, true,
    null, null, null,
    '[{"kind":"accumulate_sub_stars","sub_id":"build","target_count":12}]'::jsonb,
    208
  ),

  -- ── Fortnightly tier (8★ / 30d) ───────────────────────────────────────
  (
    'sub_stars_dexterity',
    'Acumular 8★ em Destreza em 30 dias',
    'Stack 8★ in Dexterity over 30 days',
    'Toda task que toca este sub conta as estrelas dela aqui.',
    'Every task that touches this sub counts its stars here.',
    'dexterity', 30, 'challenge', 80, 16, true,
    null, null, null,
    '[{"kind":"accumulate_sub_stars","sub_id":"dexterity","target_count":8}]'::jsonb,
    209
  ),
  (
    'sub_stars_circle',
    'Acumular 8★ em Círculo em 30 dias',
    'Stack 8★ in Circle over 30 days',
    'Toda task que toca este sub conta as estrelas dela aqui.',
    'Every task that touches this sub counts its stars here.',
    'circle', 30, 'challenge', 80, 16, true,
    null, null, null,
    '[{"kind":"accumulate_sub_stars","sub_id":"circle","target_count":8}]'::jsonb,
    210
  ),
  (
    'sub_stars_romance',
    'Acumular 8★ em Romance em 30 dias',
    'Stack 8★ in Romance over 30 days',
    'Toda task que toca este sub conta as estrelas dela aqui.',
    'Every task that touches this sub counts its stars here.',
    'romance', 30, 'challenge', 80, 16, true,
    null, null, null,
    '[{"kind":"accumulate_sub_stars","sub_id":"romance","target_count":8}]'::jsonb,
    211
  )
on conflict (id) do nothing;

-- end of migration
