-- ============================================================================
-- Bilingual catalogs — pt-BR alongside the existing en-US text.
--
-- Strategy: every catalog row now carries both `<field>` (EN, source of truth)
-- and `<field>_pt` (Portuguese). The client picks the right column based on
-- the user's app locale. Default to EN when `_pt` is null so partial
-- translations still render.
--
-- Catalogs touched:
--   * dimension              display_name_pt
--   * dimension_sub          display_name_pt
--   * skill                  display_name_pt, description_pt, population_stat_pt
--                            unit_pt
--   * reward_template        title_pt, description_pt
--   * quest_template         title_pt, description_pt
--
-- Backfill: the small, well-known sets (dimensions, sub-attributes, units)
-- are translated inline below. The large content-heavy sets (skill catalog
-- with 39 rows of multi-paragraph description, reward_template with 23
-- rows, quest_template with ~10 rows) are seeded with their EN copy as a
-- placeholder so queries don't return null. Translating those rows is
-- follow-up content work — track in CLAUDE.md / docs.
-- ============================================================================

begin;

-- ─── 1. Add columns ──────────────────────────────────────────────────────

alter table public.dimension
  add column display_name_pt text;

alter table public.dimension_sub
  add column display_name_pt text;

alter table public.skill
  add column display_name_pt    text,
  add column description_pt     text,
  add column population_stat_pt text,
  add column unit_pt            text;

alter table public.reward_template
  add column title_pt       text,
  add column description_pt text;

alter table public.quest_template
  add column title_pt       text,
  add column description_pt text;

-- ─── 2. Backfill dimensions (6) ──────────────────────────────────────────

update public.dimension set display_name_pt = 'Saúde'    where id = 'health';
update public.dimension set display_name_pt = 'Corpo'    where id = 'body';
update public.dimension set display_name_pt = 'Mente'    where id = 'mind';
update public.dimension set display_name_pt = 'Riqueza'  where id = 'wealth';
update public.dimension set display_name_pt = 'Vínculos' where id = 'bonds';
update public.dimension set display_name_pt = 'Criação'  where id = 'craft';

-- ─── 3. Backfill dimension_sub (12) ──────────────────────────────────────

update public.dimension_sub set display_name_pt = 'Sono'             where id = 'sleep';
update public.dimension_sub set display_name_pt = 'Nutrição'         where id = 'nutrition';
update public.dimension_sub set display_name_pt = 'Força'            where id = 'strength';
update public.dimension_sub set display_name_pt = 'Destreza'         where id = 'dexterity';
update public.dimension_sub set display_name_pt = 'Aprender'         where id = 'learn';
update public.dimension_sub set display_name_pt = 'Contemplar'       where id = 'contemplate';
update public.dimension_sub set display_name_pt = 'Dinheiro'         where id = 'money';
update public.dimension_sub set display_name_pt = 'Carreira'         where id = 'career';
update public.dimension_sub set display_name_pt = 'Amigos e Família' where id = 'circle';
update public.dimension_sub set display_name_pt = 'Romance'          where id = 'romance';
update public.dimension_sub set display_name_pt = 'Lazer'            where id = 'play';
update public.dimension_sub set display_name_pt = 'Construir'        where id = 'build';

-- ─── 4. Backfill skill units (small finite set) ──────────────────────────
-- Generic units the skills use. Translate the small set explicitly; let
-- everything else fall back to the EN string at read time.

update public.skill set unit_pt = 'reps'   where unit = 'reps';
update public.skill set unit_pt = 'km'     where unit = 'km';
update public.skill set unit_pt = 'min'    where unit = 'min';
update public.skill set unit_pt = 'pgs'    where unit = 'pgs';
update public.skill set unit_pt = 'dias'   where unit = 'days';
update public.skill set unit_pt = 'horas'  where unit = 'hours';
update public.skill set unit_pt = 'kg'     where unit = 'kg';
update public.skill set unit_pt = 'lbs'    where unit = 'lbs';
update public.skill set unit_pt = 'pessoas'      where unit = 'people';
update public.skill set unit_pt = 'sessões'      where unit = 'sessions';
update public.skill set unit_pt = 'projetos'     where unit = 'projects';
update public.skill set unit_pt = 'meses'        where unit = 'months';
update public.skill set unit_pt = 'semanas'      where unit = 'weeks';

-- ─── 5. Placeholder backfill for content-heavy rows ──────────────────────
-- Copy the EN text into the _pt slot so queries always return a non-null
-- string. The actual translations land in a follow-up content PR.

update public.skill
  set display_name_pt    = display_name,
      description_pt     = description,
      population_stat_pt = population_stat
  where display_name_pt is null;

update public.reward_template
  set title_pt       = title,
      description_pt = description
  where title_pt is null;

update public.quest_template
  set title_pt       = title,
      description_pt = description
  where title_pt is null;

-- ─── 6. Make _pt columns NOT NULL with safe defaults ─────────────────────
-- (skip for skill.description_pt and skill.population_stat_pt — those
-- match the nullability of their EN counterparts.)

alter table public.dimension
  alter column display_name_pt set not null;

alter table public.dimension_sub
  alter column display_name_pt set not null;

alter table public.skill
  alter column display_name_pt set not null,
  alter column unit_pt set not null;

alter table public.reward_template
  alter column title_pt set not null;

alter table public.quest_template
  alter column title_pt set not null;

commit;
