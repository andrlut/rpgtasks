-- migration: 20260722000005_learning_media_foundation.sql
-- purpose: media attachments for learning materials (podcast audio, infographics,
--          rasterized decks) + storage bucket for learning media + optional bodies
--
-- affected tables: learning_material_media (new),
--                  learning_material (body_pt/body_en -> nullable),
--                  storage.buckets (new public bucket 'learning-media')
-- new rpcs:        none
-- breaking?       no — additive; existing rows/clients unaffected
--
-- notes:
--   migrations are write-once; never edit after applying
--   media files live in the public bucket 'learning-media'; the DB stores
--   bucket-relative paths (e.g. 'antifragil/audio.en.m4a') and the client builds
--   the public URL, so the storage backend can move later without touching rows.
--   locale is per-row ('pt'/'en') because NotebookLM output is often
--   single-language; the app falls back to the other locale with a badge.

begin;

-- 1) public read-only bucket for learning media. no client write policies on
--    purpose: uploads happen via CLI/service tooling only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'learning-media', 'learning-media', true,
  31457280, -- 30 MB per object
  array['audio/mp4','audio/mpeg','image/webp','image/png','image/jpeg']
)
on conflict (id) do nothing;

-- 2) media attachments: N per material, one row per (kind, locale)
create table if not exists public.learning_material_media (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.learning_material(id) on delete cascade,
  kind text not null check (kind in ('audio','infographic','deck')),
  locale text not null check (locale in ('pt','en')),
  path text not null,
  page_paths text[],
  duration_seconds integer check (duration_seconds > 0),
  source text not null default 'notebooklm'
    check (source in ('notebooklm','gemini-api','manual')),
  meta jsonb,
  created_at timestamptz not null default now(),
  unique (material_id, kind, locale)
);

comment on column public.learning_material_media.path is
  'bucket-relative path in learning-media (primary asset: audio file, infographic image, or deck page 1)';
comment on column public.learning_material_media.page_paths is
  'deck only: ordered bucket-relative paths of every rasterized page';

create index if not exists learning_material_media_material_idx
  on public.learning_material_media (material_id);

alter table public.learning_material_media enable row level security;

create policy "learning_material_media_read_authenticated"
  on public.learning_material_media for select
  to authenticated using (true);
-- catalog table: no insert/update/delete policies — writes only via migrations/service role

-- 3) a material may exist without a text body (e.g. podcast-only drops)
alter table public.learning_material alter column body_pt drop not null;
alter table public.learning_material alter column body_en drop not null;

commit;
