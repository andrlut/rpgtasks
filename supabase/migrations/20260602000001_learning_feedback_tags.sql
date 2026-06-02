-- ============================================================================
-- Learning feedback: add structured tags alongside the optional free-text
-- comment, and update rate_material RPC to accept them.
--
-- Tags are short slugs (e.g. 'confusing', 'well_explained') drawn from
-- predefined lists per rating direction. The app maps them to localized
-- labels for display. Standardized slugs make aggregation easy:
--   - "what % of 👎 say 'confusing'"
--   - "what % of 👍 say 'well_explained'"
--
-- The toggle-vs-save-follow-up semantics distinguish:
--   - Tapping the active rating chip again with NO comment/tags → CLEAR
--   - Tapping Save in the feedback sheet (with comment OR tags) → UPDATE
-- ============================================================================

begin;

set local app.edited_by = 'maintainer';
set local app.edit_summary = 'Add feedback tags column + RPC update';

alter table public.learning_material_feedback
  add column tags text[] not null default array[]::text[];

-- Replace the RPC with a 4-arg version. The old 3-arg signature is dropped.

drop function if exists public.rate_material(text, smallint, text);

create or replace function public.rate_material(
  p_slug text,
  p_rating smallint,
  p_comment text default null,
  p_tags text[] default null
) returns json
language plpgsql
security definer
set search_path = public
as $func$
declare
  v_material_id uuid;
  v_existing record;
  v_action text;
  v_final_tags text[];
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_rating not in (-1, 1) then
    raise exception 'Invalid rating: must be -1 (down) or 1 (up)';
  end if;

  select id into v_material_id
  from public.learning_material
  where slug = p_slug and is_archived = false;
  if v_material_id is null then
    raise exception 'Material not found: %', p_slug;
  end if;

  v_final_tags := coalesce(p_tags, array[]::text[]);

  select * into v_existing
  from public.learning_material_feedback
  where material_id = v_material_id and character_id = auth.uid();

  if found and v_existing.rating = p_rating then
    -- Same rating tapped again.
    -- If no comment AND no tags provided → treat as clear (toggle off).
    -- If comment OR tags provided → treat as save-follow-up (update).
    if p_comment is null and p_tags is null then
      delete from public.learning_material_feedback
      where material_id = v_material_id and character_id = auth.uid();
      v_action := 'cleared';
    else
      update public.learning_material_feedback
      set tags = v_final_tags,
          comment = coalesce(p_comment, v_existing.comment),
          updated_at = now()
      where material_id = v_material_id and character_id = auth.uid();
      v_action := 'updated';
    end if;
  elsif found then
    -- Flipping the rating. Reset tags + comment to the new submission.
    update public.learning_material_feedback
    set rating = p_rating,
        comment = p_comment,
        tags = v_final_tags,
        updated_at = now()
    where material_id = v_material_id and character_id = auth.uid();
    v_action := 'updated';
  else
    -- First rating for this user × material.
    insert into public.learning_material_feedback (
      material_id, character_id, rating, comment, tags
    ) values (
      v_material_id, auth.uid(), p_rating, p_comment, v_final_tags
    );
    v_action := 'inserted';
  end if;

  return json_build_object(
    'action', v_action,
    'rating', p_rating,
    'tags', v_final_tags
  );
end $func$;

grant execute on function public.rate_material(text, smallint, text, text[]) to authenticated;

commit;
