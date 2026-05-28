-- migration: 20260527000003_start_quest_handles_sub_stars.sql
-- purpose: extend start_quest_from_template to propagate the new sub_id
--          field added in 20260527000001. Without this, starting a
--          sub_stars_* template would write NULL into sub_id and trip the
--          quest_requirement_kind_payload CHECK.
--
-- delta vs prior version (20260518000006_quest_start_normalize_req_keys):
--   - read v_sub_id from the requirement spec
--   - include sub_id in the INSERT into quest_requirement
--
-- notes:
--   write-once; do not edit after applying
--   this CREATE OR REPLACE preserves the function signature
--   so existing GRANTs survive the swap

create or replace function public.start_quest_from_template(p_template_id text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_template       public.quest_template;
  v_quest_id       uuid;
  v_req            jsonb;
  v_kind           text;
  v_task_id        uuid;
  v_task_title     text;
  v_dim_id         text;
  v_skill_id       text;
  v_sub_id         text;
  v_target         int;
  v_min            numeric;
  v_title          text;
  v_description    text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_template from public.quest_template where id = p_template_id;
  if not found then
    raise exception 'Quest template % not found', p_template_id;
  end if;

  v_title       := coalesce(v_template.title_pt,       v_template.title_en, v_template.title);
  v_description := coalesce(v_template.description_pt, v_template.description_en, v_template.description);

  if v_title is null then
    raise exception 'Quest template % has no title in any locale', p_template_id;
  end if;

  insert into public.quest (
    character_id, template_id, title, description,
    deadline, reward_xp, reward_coins, allow_partial,
    quest_type, challenge_target_value, challenge_unit_pt, challenge_unit_en
  )
  values (
    auth.uid(), v_template.id, v_title, v_description,
    now() + (v_template.suggested_duration_days || ' days')::interval,
    v_template.reward_xp, v_template.reward_coins, v_template.allow_partial,
    v_template.quest_type,
    v_template.challenge_target_value,
    v_template.challenge_unit_pt,
    v_template.challenge_unit_en
  )
  returning id into v_quest_id;

  for v_req in select jsonb_array_elements(v_template.requirements) loop
    v_kind       := v_req->>'kind';
    v_task_id    := null;
    v_task_title := v_req->>'task_title';
    v_dim_id     := v_req->>'dimension_id';
    v_skill_id   := v_req->>'skill_id';
    v_sub_id     := v_req->>'sub_id';

    -- Numeric routing: skill kinds use min_value; everything else uses
    -- target_count. v3 catalog unified on `target_value`; sub_stars seeds
    -- use the legacy `target_count`. Read either.
    if v_kind = 'reach_skill_value' then
      v_target := null;
      v_min := nullif(coalesce(v_req->>'min_value', v_req->>'target_value'), '')::numeric;
    else
      v_target := nullif(coalesce(v_req->>'target_count', v_req->>'target_value'), '')::int;
      v_min := null;
    end if;

    if v_kind = 'complete_task_n_times' and v_task_title is not null then
      select id into v_task_id
      from public.task
      where character_id = auth.uid()
        and lower(title) = lower(v_task_title)
        and is_archived = false
      limit 1;
    end if;

    insert into public.quest_requirement (
      quest_id, kind, task_id, dimension_id, skill_id, sub_id, target_count, min_value
    ) values (
      v_quest_id, v_kind, v_task_id, v_dim_id, v_skill_id, v_sub_id, v_target, v_min
    );
  end loop;

  return v_quest_id;
end $$;

grant execute on function public.start_quest_from_template(text) to authenticated;

-- end of migration
