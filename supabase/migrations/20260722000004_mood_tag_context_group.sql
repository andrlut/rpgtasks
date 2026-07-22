-- migration: 20260722000004_mood_tag_context_group.sql
-- purpose: journal v2 — sub-group the 16 context ("what influenced you") tags
--          into 3 blocks (self / relationships / life) so the check-in can
--          render them Apple State-of-Mind style: separated by whitespace,
--          not one flat wrap. Emotion tags stay context_group null.
--
-- affected tables: mood_tag (new column `context_group`, populated for the
--                  16 context rows)
-- new rpcs:        none
-- breaking?       no — additive nullable column; shipped clients ignore it
--
-- notes:
--   migrations are write-once; never edit after applying
--   grouping is presentational only (no filter, no valence change). Order of
--   the blocks on screen follows the array below: self, relationships, life;
--   within a block the existing sort_order still orders the chips.

begin;

alter table public.mood_tag
  add column if not exists context_group text
  check (context_group in ('self', 'relationships', 'life'));

update public.mood_tag set context_group = g.grp
from (values
  -- self / body / self-care
  ('health',       'self'),
  ('fitness',      'self'),
  ('food',         'self'),
  ('sleep',        'self'),
  ('leisure',      'self'),
  ('home',         'self'),
  -- relationships
  ('family',       'relationships'),
  ('friends',      'relationships'),
  ('romance',      'relationships'),
  -- life / world
  ('work',         'life'),
  ('studies',      'life'),
  ('money',        'life'),
  ('travel',       'life'),
  ('weather',      'life'),
  ('news',         'life'),
  ('social_media', 'life')
) as g(slug, grp)
where mood_tag.slug = g.slug and mood_tag.tag_group = 'context';

commit;
