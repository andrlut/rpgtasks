-- ============================================================================
-- Reward categories + template catalog.
--
-- - Adds reward.category ('indulgence' | 'good' | 'experience').
-- - New table reward_template: public-read catalog of suggestions users can
--   browse and clone into their own shop. Templates are NOT redeemable.
-- - Stops auto-seeding sample rewards on signup — new users start with an
--   empty shop and pick from the template catalog.
-- - Existing user-owned rewards default to 'indulgence' (matches the
--   original seed set).
-- ============================================================================

-- ──────────────────────────────────────────────────────────────────────────
-- 1. Add category to existing reward table
-- ──────────────────────────────────────────────────────────────────────────

alter table public.reward
  add column category text not null default 'indulgence'
  check (category in ('indulgence', 'good', 'experience'));

-- ──────────────────────────────────────────────────────────────────────────
-- 2. reward_template — public catalog
-- ──────────────────────────────────────────────────────────────────────────

create table public.reward_template (
  id text primary key,
  title text not null,
  description text,
  cost integer not null check (cost > 0),
  icon text not null default 'gift',
  category text not null check (category in ('indulgence', 'good', 'experience')),
  sort_order integer not null default 0
);

alter table public.reward_template enable row level security;

create policy "reward_template_read_authenticated"
  on public.reward_template for select
  to authenticated using (true);

-- ──────────────────────────────────────────────────────────────────────────
-- 3. Seed the template catalog
-- ──────────────────────────────────────────────────────────────────────────

insert into public.reward_template (id, title, description, cost, icon, category, sort_order) values
  -- INDULGENCES (recurring, cheap, quick loop)
  ('coffee',          'Premium coffee',       'Treat yourself.',                          40,   'cafe',            'indulgence', 1),
  ('tv30',            '30 min guilt-free TV', 'A drama, a doc, a dumb show. No phone.',   50,   'tv',              'indulgence', 2),
  ('gaming1h',        '1 hour of gaming',     'No grinding, no goal — just play.',        80,   'game-controller', 'indulgence', 3),
  ('dessert',         'Dessert run',          'Ice cream. Brigadeiro. Whatever.',         60,   'ice-cream',       'indulgence', 4),
  ('movie',           'Movie night',          'Pick the movie. Pop the corn.',            200,  'film',            'indulgence', 5),
  ('takeout',         'Order takeout',        'No cooking, no dishes, no judgment.',      150,  'pizza',           'indulgence', 6),
  ('beer',            'A cold one',           'Beer, drink of choice. Earn it first.',    80,   'beer',            'indulgence', 7),
  ('restday',         'Guilt-free rest day',  'No checklists, no apps, no shame.',        300,  'bed',             'indulgence', 8),
  ('musicsession',    'New album deep-listen','Headphones on. World off.',                40,   'musical-notes',   'indulgence', 9),

  -- GOODS (one-time material purchases — save up)
  ('book',            'New book',             'For the pile. Or finally start it.',       400,  'book',            'good',       1),
  ('headphones',      'Wireless earbuds',     'Replace the dying ones.',                  1500, 'headset',         'good',       2),
  ('runningshoes',    'Running shoes',        'Treat the feet that carry you.',           2000, 'walk',            'good',       3),
  ('keyboard',        'Mechanical keyboard',  'Click clack therapy.',                     3000, 'desktop',         'good',       4),
  ('phone',           'New phone',             'When the current one really has to go.',  10000,'phone-portrait',  'good',       5),
  ('appliance',       'Big appliance',        'Fridge, washer — the boring upgrades.',    8000, 'cube',            'good',       6),
  ('dreamitem',       'Dream item',           'The one big thing on the wishlist.',       15000,'star',            'good',       7),

  -- EXPERIENCES (one-time, non-material)
  ('dinner',          'Nice dinner out',      'Real restaurant, not takeout.',            500,  'restaurant',      'experience', 1),
  ('concert',         'Concert / live show',  'Lights, sound, a crowd.',                  1500, 'mic',             'experience', 2),
  ('course',          'Course / workshop',    'Learn something new on purpose.',          2500, 'school',          'experience', 3),
  ('weekendtrip',     'Weekend trip',         '2 days somewhere not here.',               5000, 'airplane',        'experience', 4),
  ('massage',         'Massage / spa day',    'Body says thanks.',                        800,  'flower',          'experience', 5),
  ('bigtrip',         'Big trip abroad',      'Passport, suitcase, the works.',           15000,'globe',           'experience', 6),
  ('event',           'Sports / event ticket','Game, fight, race — whatever.',            1200, 'trophy',          'experience', 7);

-- ──────────────────────────────────────────────────────────────────────────
-- 4. Stop auto-seeding sample rewards.
--    Old seed_sample_rewards() is kept for backfill safety but no longer
--    called from the signup trigger — new users start with an empty shop.
-- ──────────────────────────────────────────────────────────────────────────

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
  -- NOTE: no longer auto-seed rewards. Users browse the template catalog.

  return new;
end $$;
