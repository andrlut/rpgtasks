-- ============================================================================
-- One-time wipe of legacy user tasks ahead of the Tasks v2 visual refresh.
--
-- The user explicitly authorized this — every existing task on the account
-- was either test data or pre-dated the sub-first model. Re-adopting from
-- the catalog (task_template, 36 entries × 3 per sub) is the recommended
-- path forward.
--
-- Cascading effects:
--   - public.task_completion has FK task_id ON DELETE CASCADE → all
--     historical completions disappear too. Streak resets to 0 on next
--     compute since compute_streak_days() reads task_completion.
--   - public.character_dimension XP totals stay (we don't roll them back —
--     the user keeps the level they reached).
--
-- Idempotent: running again on an empty table is a no-op.
-- ============================================================================

begin;

delete from public.task;

commit;
