-- ============================================================================
-- Rename: dim `strength` → `body`, sub `movement` → `strength`.
--
-- New shape:
--   Body (dim)
--     ├── Strength  (cardio, lifting — was `movement`)
--     └── Dexterity (unchanged)
--
-- All FKs are migrated; user data (XP, completions, scores) is preserved.
--
-- Note: `task_dimension` was dropped in migration 0009 (sub-first), and
-- `seed_sample_tasks` was dropped in migration 0007 (templates own seeding).
-- ============================================================================

begin;

-- ─── 1. Insert new dim `body` ────────────────────────────────────────────
insert into public.dimension (id, display_name, color, icon, sort_order)
values ('body', 'Body', '#FF8A3D', 'fitness', 2);

-- ─── 2. Migrate FKs from dim `strength` → `body` ─────────────────────────
update public.character_dimension set dimension_id = 'body' where dimension_id = 'strength';
update public.skill                set dimension_id = 'body' where dimension_id = 'strength';
update public.dimension_sub        set dimension_id = 'body' where dimension_id = 'strength';

-- ─── 3. Drop old dim `strength` ──────────────────────────────────────────
delete from public.dimension where id = 'strength';

-- ─── 4. Insert new sub `strength` (under `body`) ─────────────────────────
insert into public.dimension_sub (id, dimension_id, display_name, icon, sort_order)
values ('strength', 'body', 'Strength', 'barbell', 1);

-- ─── 5. Migrate FKs from sub `movement` → `strength` ─────────────────────
update public.task                 set sub_id = 'strength' where sub_id = 'movement';
update public.skill                set sub_id = 'strength' where sub_id = 'movement';
update public.task_template        set sub_id = 'strength' where sub_id = 'movement';
update public.character_sub_score  set sub_id = 'strength' where sub_id = 'movement';
update public.assessment_log       set sub_id = 'strength' where sub_id = 'movement';

-- ─── 6. Drop old sub `movement` ──────────────────────────────────────────
delete from public.dimension_sub where id = 'movement';

commit;
