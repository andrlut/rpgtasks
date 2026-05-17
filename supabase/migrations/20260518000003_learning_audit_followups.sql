-- ============================================================================
-- Learning audit follow-ups — small fixes flagged by the editorial reviewer
-- agent after PR #166. All are warn-severity, none affect security or
-- structure. Two affect URLs (deep-link to primary sources); one expands an
-- acronym that was name-dropped without explanation; one fixes a sub mapping.
--
-- The two big concerns the auditor flagged (orforglipron DOI; Attia/Epstein
-- claim) both verified externally: DOI resolves to a real Nature Medicine
-- paper, Attia/CBS February 2026 confirmed by CBS, WaPo, CNN, NBC, Variety.
-- ============================================================================

begin;

set local app.edited_by = 'maintainer';
set local app.edit_summary = 'Audit follow-ups: MAF acronym, loneliness source_url, loneliness sub remap';

-- ─── 1. STRENGTH: expand "regra MAF" acronym ─────────────────────────────
-- Auditor flagged "regra MAF do Maffetone" as name-dropping without
-- defining the acronym. Fix per the editorial rule "translate_jargon".

update public.learning_material
set body_pt = replace(
      body_pt,
      'regra MAF do Maffetone',
      'regra MAF (Maximum Aerobic Function, do Phil Maffetone)'
    ),
    body_en = replace(
      body_en,
      'Maffetone''s MAF rule',
      'MAF (Maximum Aerobic Function) rule by Phil Maffetone'
    )
where slug = 'glossary-strength';

-- ─── 2. LONELINESS: source_url → direct DOI link ─────────────────────────
-- Auditor flagged that the source_url pointed to the journal landing page
-- instead of the specific paper. Replace with the DOI URL so the "Source"
-- chip in the app deep-links to the actual study.

update public.learning_material
set source_url = 'https://doi.org/10.1080/13607863.2026.2624569'
where slug = 'news-loneliness-memory-2026-04';

-- ─── 3. LONELINESS: swap "contemplate" sub for "learn" ───────────────────
-- The article's cognitive angle is memory/recall, which is a stronger fit
-- for the "learn" sub (Mind → learning, attention, comprehension) than for
-- "contemplate" (Mind → contemplative practice, meditation). Auditor's
-- suggested fix.

with m as (
  select id from public.learning_material where slug = 'news-loneliness-memory-2026-04'
)
delete from public.learning_material_sub
where material_id = (select id from m) and sub_id = 'contemplate';

with m as (
  select id from public.learning_material where slug = 'news-loneliness-memory-2026-04'
)
insert into public.learning_material_sub (material_id, sub_id)
select id, 'learn' from m
on conflict (material_id, sub_id) do nothing;

commit;
