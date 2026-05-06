-- ============================================================================
-- Recurrence model unification.
--
-- Old semantics:
--   weekly { days: [1,3,5] }, target_count=2  → "2× on each of Mon/Wed/Fri"
--                                                = 6 sessions/week implicit
--   monthly { day: 5 }, target_count=2         → "2× on the 5th of each month"
--
-- New semantics (uniform "per period" target_count + optional schedule):
--   weekly { days?: [1,3,5] }, target_count=6  → "6× per week, hint M/W/F"
--                                                days are PURELY a Today-promotion hint
--   monthly { day?: 5 }, target_count=2        → "2× per month, hint on the 5th"
--   weekly { } (no days), target_count=3       → "3× per week, dias livres" (NEW shape)
--   monthly { } (no day), target_count=5       → "5× per month, sem dia fixo" (NEW shape)
--
-- This Week / This Month buckets now ALWAYS show pending weekly/monthly tasks
-- (no day filter). Today bucket promotes weekly/monthly only on scheduled days
-- (when set), and clears once the user logs at least 1 completion that day.
--
-- Data migration: for existing weekly tasks, multiply target_count by the
-- number of scheduled days so total per-week count is preserved. Same for
-- monthly with day set (1× → 1× per month, no change since day was always 1).
-- ============================================================================

begin;

-- Convert existing weekly target_count from "per scheduled day" to "per week"
-- by multiplying by the number of days in the schedule. Preserves total
-- volume per-week so existing templates / tasks keep their meaning.
update public.task_template
set target_count = greatest(1, jsonb_array_length(recurrence->'days')) * target_count
where recurrence->>'type' = 'weekly'
  and jsonb_typeof(recurrence->'days') = 'array';

update public.task
set target_count = greatest(1, jsonb_array_length(recurrence->'days')) * target_count
where recurrence->>'type' = 'weekly'
  and jsonb_typeof(recurrence->'days') = 'array';

-- monthly old semantic was per-occurrence (single day per month), so
-- target_count of 1 = "1× per month" which matches the new semantic.
-- target_count > 1 with single day = "N× per month, all on the same day"
-- which is unusual; new semantic respects it as "N per month, hint on day X".

commit;
