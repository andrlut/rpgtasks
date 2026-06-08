-- migration: 20260602000002_start_task_from_template_fix.sql
-- purpose: fix `start_task_from_template` — the May-24 override-aware
--          version (20260524000003) kept references to legacy columns
--          (`sub_id`, `difficulty`, `metric_type`, `metric_label`,
--          `base_value`, `increment_per_star`) that the multi-sub
--          migration (20260505000002) had already dropped from
--          `task` and `task_template`. The function failed silently
--          for any caller until adoption was actually exercised end-
--          to-end — which the new M0.5 tour picker does on every fresh
--          user.
--
-- behaviour: identical to the May-24 intent (accept optional task_type,
--            recurrence, target_count overrides) minus the broken
--            column refs. Sub allocations still come from
--            task_template_sub; the new task copies the template's
--            optional icon, recurrence, and target_count.
--
-- migrations are write-once; this is the fix on top of the broken RPC
-- via CREATE OR REPLACE. The grants survive — no need to re-grant.

create or replace function public.start_task_from_template(
  p_template_id          text,
  p_task_type_override   text default null,
  p_recurrence_override  jsonb default null,
  p_target_count_override int default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_template   public.task_template%rowtype;
  v_new_id     uuid;
  v_task_type  text;
  v_recurrence jsonb;
  v_target     int;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_template
  from public.task_template
  where id = p_template_id;
  if not found then
    raise exception 'Unknown template: %', p_template_id;
  end if;

  -- Resolve task_type: explicit override > template default.
  v_task_type := coalesce(p_task_type_override, v_template.task_type);
  if v_task_type not in ('daily', 'weekly', 'monthly', 'one_shot') then
    raise exception 'Invalid task_type override: %', v_task_type;
  end if;

  -- Recurrence: explicit override > derived-from-type-override > template default.
  if p_recurrence_override is not null then
    v_recurrence := p_recurrence_override;
  elsif p_task_type_override is not null then
    v_recurrence := jsonb_build_object('type', p_task_type_override);
  else
    v_recurrence := v_template.recurrence;
  end if;

  -- Target count: explicit override > template default. Floor at 1.
  v_target := coalesce(p_target_count_override, v_template.target_count);
  if v_target < 1 then v_target := 1; end if;

  insert into public.task (
    character_id, title, description, task_type,
    recurrence, target_count, template_id, icon
  ) values (
    auth.uid(), v_template.title, v_template.description, v_task_type,
    v_recurrence, v_target, v_template.id, v_template.icon
  )
  returning id into v_new_id;

  -- Copy multi-sub allocations from task_template_sub. Each row carries
  -- a (sub_id, stars) pair — preserves the template's star distribution.
  insert into public.task_sub (task_id, sub_id, stars)
  select v_new_id, sub_id, stars
  from public.task_template_sub
  where template_id = p_template_id;

  return v_new_id;
end $$
;

-- The function signature is unchanged, so the existing grants from
-- 20260524000003 carry over — no need to re-grant.

-- end of migration
