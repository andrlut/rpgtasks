-- migration: 20260525000005_task_icon.sql
-- purpose: let users pick a custom icon per task (parity with rewards).
--          Adds an optional `icon text` column. When null, the UI falls
--          back to the primary sub's iconName.
--
-- affected tables: task (new column icon, nullable)
-- new rpcs:        none
-- breaking?        no — column is nullable, existing reads ignore it
--                  and writers can omit it.
--
-- notes:
--   * Stored value is an Ionicons name (e.g. "barbell", "book"). Same
--     contract as `reward.icon`. No FK or check — the icon set is
--     versioned client-side.
--   * Templates (task_template) get the same column so curated system
--     templates can carry their own icons. Personal tasks adopted from
--     a template copy the icon at adoption time (start_task_from_template
--     already deep-clones template_sub allocations; adding the icon
--     copy is a follow-up if the curated set lands).
--   * Migrations are write-once; do not edit after applying.

begin;

alter table public.task
  add column if not exists icon text;

alter table public.task_template
  add column if not exists icon text;

commit;
