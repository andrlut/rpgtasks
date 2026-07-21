-- migration: 20260720000001_quest_seed_type_fix.sql
-- purpose: unbreak the 12 sub-star Missão templates, and close the
--          expire_overdue_quests() privilege hole.
--
-- affected tables: quest_template, quest
-- new rpcs:        none
-- breaking?        no — both changes are data/grant only, no schema change
--
-- notes:
--   migrations são write-once; nunca editar depois de aplicar
--
-- background (1): 20260527000002_quest_templates_sub_stars.sql seeded all 12
--   sub-star templates with quest_type='challenge' AND challenge_target_value
--   = null. The detail screen branches on quest_type rather than on the
--   requirement kind, so it computed Number(null ?? 0) = 0 as the target and
--   pinned every one of these quests at 0/0 — "Não iniciada", 0% bar — while
--   ALSO opening the manual "Registrar progresso" number input, on a quest
--   whose entire point is that it fills itself. The board card disagreed and
--   showed the correct `9 / 20 ⭐` because it happens to test the sub-star
--   requirement before quest_type.
--
--   These quests are 'skill'-type: progress comes from accumulate_sub_stars,
--   derived by sub_stars_progress() over the quest window. The client fix
--   ships alongside this migration; correcting the seed removes the
--   contradiction at the source rather than papering over it.
--
-- background (2): the v3 rewrite of expire_overdue_quests()
--   (20260517000003_quest_v3_challenge.sql:219-239) dropped the function and
--   recreated it WITHOUT re-granting execute, so it fell back to the default
--   PUBLIC EXECUTE — and in the same rewrite it lost its
--   `character_id = auth.uid()` filter while staying SECURITY DEFINER. Any
--   caller, including anon, could expire every user's quests. In practice it
--   aborts at runtime (it references quest_requirement.target_value, a column
--   that never existed → 42703), and the app swallows that in a try/catch
--   (app/lib/api/quests.ts:35-39), so revoking is invisible to the running
--   app. The function is dropped outright in the Missões sunset migration.

begin;

-- 1. sub-star templates are skill-type, not challenge-type
update public.quest_template
   set quest_type = 'skill'
 where id like 'sub_stars_%'
   and quest_type <> 'skill';

-- 2. same correction for quests already adopted from those templates
update public.quest
   set quest_type = 'skill'
 where template_id like 'sub_stars_%'
   and quest_type <> 'skill';

-- 3. close the privilege hole
revoke execute on function public.expire_overdue_quests() from public;
revoke execute on function public.expire_overdue_quests() from authenticated;

commit;

-- end of migration
