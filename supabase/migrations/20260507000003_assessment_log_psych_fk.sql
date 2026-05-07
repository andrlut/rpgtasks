-- ============================================================================
-- Fix: assessment_log.session_id FK now points at psych_session
--
-- The Phase 1 bug: submit_psych_session writes assessment_log rows with
-- session_id = psych_session.id, but the column's FK was still pointing at
-- the legacy questionnaire_session table. Only the v1 wrapper writes to
-- questionnaire_session, so any v2 submit hit 23503 foreign_key_violation
-- (which Postgrest surfaces as HTTP 409).
--
-- Fix: repoint the FK at psych_session. Every existing session_id in
-- assessment_log already resolves there too, because the foundation
-- migration backfilled questionnaire_session rows into psych_session
-- sharing the same UUIDs.
-- ============================================================================

begin;

alter table public.assessment_log
  drop constraint assessment_log_session_id_fkey;

alter table public.assessment_log
  add constraint assessment_log_session_id_fkey
    foreign key (session_id) references public.psych_session(id)
    on delete set null;

commit;
