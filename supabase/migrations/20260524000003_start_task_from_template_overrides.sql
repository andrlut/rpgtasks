-- ============================================================================
-- start_task_from_template: accept optional periodicity overrides at adoption
-- time so the user can adopt a template as daily/weekly/one_shot regardless of
-- the template's default suggestion.
--
-- Pre-existing behavior preserved: when no overrides are passed, the template's
-- own task_type / recurrence / target_count are used (so existing call sites
-- keep working without changes).
--
-- Why this exists, not a separate table for "allocations": user explicitly
-- doesn't want simultaneous allocations of the same template (one task can
-- have one periodicity at a time). Editing the task's recurrence after
-- adoption is already supported per-row via RLS — this just shortens the
-- two-step "adopt then edit" into one tap.
-- ============================================================================

begin;

create or replace function public.start_task_from_template(
  p_template_id text,
  p_task_type_override text default null,
  p_recurrence_override jsonb default null,
  p_target_count_override int default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_template public.task_template%rowtype;
  v_dim text;
  v_new_id uuid;
  v_task_type text;
  v_recurrence jsonb;
  v_target_count int;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_template from public.task_template where id = p_template_id;
  if not found then
    raise exception 'Unknown template: %', p_template_id;
  end if;

  select dimension_id into v_dim
  from public.dimension_sub
  where id = v_template.sub_id;
  if v_dim is null then
    raise exception 'Sub % has no parent dimension', v_template.sub_id;
  end if;

  -- Validate task_type override if provided.
  v_task_type := coalesce(p_task_type_override, v_template.task_type);
  if v_task_type not in ('daily', 'weekly', 'monthly', 'one_shot') then
    raise exception 'Invalid task_type override: %', v_task_type;
  end if;

  -- Recurrence: explicit override > derived-from-type-override > template default
  if p_recurrence_override is not null then
    v_recurrence := p_recurrence_override;
  elsif p_task_type_override is not null then
    -- Build a sensible recurrence shape from the type override.
    v_recurrence := jsonb_build_object('type', p_task_type_override);
  else
    v_recurrence := v_template.recurrence;
  end if;

  -- Target count: explicit override > template default. Coerce to >= 1.
  v_target_count := coalesce(p_target_count_override, v_template.target_count);
  if v_target_count < 1 then
    v_target_count := 1;
  end if;

  insert into public.task (
    character_id, title, description, difficulty, task_type,
    recurrence, target_count, sub_id,
    metric_type, metric_label, base_value, increment_per_star
  ) values (
    auth.uid(), v_template.title, v_template.description,
    v_template.difficulty, v_task_type,
    v_recurrence, v_target_count, v_template.sub_id,
    v_template.metric_type, v_template.metric_label,
    v_template.base_value, v_template.increment_per_star
  )
  returning id into v_new_id;

  insert into public.task_dimension (task_id, dimension_id)
  values (v_new_id, v_dim);

  -- Copy multi-sub allocations from task_template_sub (if any) so the new
  -- task has the same per-sub star distribution as the template default.
  insert into public.task_sub (task_id, sub_id, stars)
  select v_new_id, sub_id, stars
  from public.task_template_sub
  where template_id = p_template_id
  on conflict do nothing;

  return v_new_id;
end $$;

grant execute on function public.start_task_from_template(text, text, jsonb, int)
  to authenticated;

commit;
