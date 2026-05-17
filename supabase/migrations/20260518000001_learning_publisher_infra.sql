-- ============================================================================
-- Learning publisher infra — schema for the autonomous content pipeline.
--
-- What this enables (the moving parts, with no agent code yet — agents
-- live in .claude/agents/ and read/write this schema at runtime):
--
--   1) Reasoning templates per material type, stored as data (editable in
--      Supabase Studio without a code PR). The drafting agent walks the
--      steps for the chosen type when producing a new article.
--   2) Topic backlog — both maintainer-curated and agent-proposed seeds
--      for what to write next. The planner agent picks from here + sub
--      gaps to choose the day's topic.
--   3) Per-material reasoning log — every published material carries the
--      structured answers the drafter produced for each step. Lets us
--      audit, improve, and reverse-engineer "why did this article come
--      out flat" by reading the log.
--   4) Revision history — every UPDATE to editorial fields (body /
--      takeaways / signs / tracking / reasoning_log) snapshots the
--      previous state to learning_material_revision. Bounded growth (a
--      few KB per revision) is cheap; the audit trail is priceless.
--   5) User feedback — 👍/👎 votes per material per user (with optional
--      comment). Becomes the long-term training signal for the planner
--      to prioritize reskinning poorly-rated materials.
--
-- Designed to coexist with the existing learning_material foundation
-- (#143, #145, #150). Pure additions — no changes to existing schema.
-- ============================================================================

begin;

-- ─── 1. material_type_template ───────────────────────────────────────────
-- Reasoning recipe per type. Stored as data so it can be tweaked without
-- a code PR. Seeded with 3 types: explainer, summary, news.

create table public.material_type_template (
  type text primary key check (type in ('explainer', 'summary', 'news')),

  -- Editorial reasoning checkpoints — array of { id, label_pt, label_en,
  -- prompt_pt, prompt_en }. The drafter agent walks them in order and
  -- writes a structured answer to each into the material's reasoning_log.
  reasoning_steps jsonb not null,

  -- Editorial rules that apply globally per type — e.g. each main point
  -- must answer { what, why, how_to_know }, source attribution always
  -- required, etc. Used by the reviewer agent as a checklist.
  editorial_rules jsonb not null,

  -- Target read time in minutes. Drafter aims at this; reviewer flags if
  -- the body is >2× the target.
  target_minutes int not null,

  -- Directives the body MUST include at least one of (e.g. an explainer
  -- without a stat block is suspicious; a summary without a quote is
  -- suspicious). Reviewer checks compliance.
  required_directives text[] not null default array[]::text[],

  -- Directives encouraged but not mandatory. Hint to the drafter.
  recommended_directives text[] not null default array[]::text[],

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.material_type_template enable row level security;

create policy "material_type_template_read_authenticated"
  on public.material_type_template for select
  to authenticated using (true);

create trigger material_type_template_touch_updated_at
  before update on public.material_type_template
  for each row execute function public.touch_updated_at();

-- Seed: explainer
insert into public.material_type_template (type, reasoning_steps, editorial_rules, target_minutes, required_directives, recommended_directives) values
('explainer',
$json${
  "steps": [
    {"id": "hook", "label_pt": "Curiosity gap", "label_en": "Curiosity gap",
     "prompt_pt": "Qual mal-entendido ou pergunta abre o leitor? 1-2 frases que provoquem curiosidade sobre o tema.",
     "prompt_en": "What misconception or question opens the reader? 1-2 sentences that spark curiosity about the topic."},
    {"id": "thesis", "label_pt": "Tese em 1 frase", "label_en": "Thesis in one sentence",
     "prompt_pt": "Qual é a única coisa que você quer que o leitor saia sabendo? Em 1 frase. Vai virar o stat block.",
     "prompt_en": "The single thing you want the reader to leave with, in one sentence. Will become the stat block."},
    {"id": "real_definition", "label_pt": "Definição que vence a comum", "label_en": "Definition that beats the common one",
     "prompt_pt": "O que isso REALMENTE é, contra o que as pessoas acham. Pode usar :::compare se a diferença for marcante.",
     "prompt_en": "What this REALLY is, vs what people think. Use :::compare if the contrast is sharp."},
    {"id": "stakes", "label_pt": "Por que importa com número duro", "label_en": "Why it matters with a hard number",
     "prompt_pt": "Por que isso pesa mais do que o leitor imagina. 1 stat ironclad com fonte peer-reviewed.",
     "prompt_en": "Why this matters more than the reader thinks. 1 ironclad stat with peer-reviewed source."},
    {"id": "mechanism", "label_pt": "Mecanismo com exemplo concreto", "label_en": "Mechanism with a concrete example",
     "prompt_pt": "Como funciona por baixo? 1-2 parágrafos. Termina com 1 exemplo concreto (:::ex se couber).",
     "prompt_en": "How it works under the hood? 1-2 paragraphs. End with 1 concrete example (:::ex if it fits)."},
    {"id": "myth_busts", "label_pt": "3 myth busts", "label_en": "3 myth busts",
     "prompt_pt": "O que o leitor provavelmente acredita errado. Steelman + correção. Use :::list-icon com close-circle nos itens.",
     "prompt_en": "What the reader probably believes wrong. Steelman + correction. Use :::list-icon with close-circle items."},
    {"id": "recipe", "label_pt": "Receita mínima", "label_en": "Minimum recipe",
     "prompt_pt": "O que fazer amanhã com isso. 3-5 ações concretas em :::list-icon.",
     "prompt_en": "What to do tomorrow with this. 3-5 concrete actions in :::list-icon."}
  ]
}$json$::jsonb,
$json${
  "rules": [
    {"id": "main_point_triple", "label_pt": "Cada main point responde: o que é · por que importa · como saber se aplica", "label_en": "Each main point answers: what is it · why it matters · how to know it applies"},
    {"id": "honest_caveats", "label_pt": "Estudos contestados ou simplificados precisam ser flaggeados", "label_en": "Contested or simplified studies must be flagged"},
    {"id": "translate_jargon", "label_pt": "Jargão técnico nunca aparece sem definição (ex: Zone 2 precisa explicar o que é)", "label_en": "Technical jargon never appears without a definition (e.g. Zone 2 must be defined)"},
    {"id": "source_required", "label_pt": "Bloco :::source no fim com fonte primária verificável", "label_en": ":::source block at the end with verifiable primary source"},
    {"id": "bilingual_parity", "label_pt": "PT e EN cobrem mesmos pontos, idioma natural em cada lado (não tradução literal)", "label_en": "PT and EN cover the same points in natural language for each (not literal translation)"}
  ]
}$json$::jsonb,
6,
array['stat', 'source'],
array['compare', 'callout', 'list-icon', 'progress']);

-- Seed: summary
insert into public.material_type_template (type, reasoning_steps, editorial_rules, target_minutes, required_directives, recommended_directives) values
('summary',
$json${
  "steps": [
    {"id": "author_question", "label_pt": "A pergunta do autor", "label_en": "The author's question",
     "prompt_pt": "O que o autor estava tentando responder? 1-2 frases que situam a obra.",
     "prompt_en": "What was the author trying to answer? 1-2 sentences that situate the work."},
    {"id": "author_thesis", "label_pt": "A tese do autor", "label_en": "The author's thesis",
     "prompt_pt": "Em uma frase, idealmente nas palavras do autor (com :::quote). Stat block fica reservado pro número headline da obra.",
     "prompt_en": "In one sentence, ideally in the author's words (with :::quote). Stat block reserved for the headline number of the work."},
    {"id": "core_ideas", "label_pt": "3 ideias load-bearing", "label_en": "3 load-bearing ideas",
     "prompt_pt": "As 3 ideias que sustentam a tese. Cada uma vira uma seção com cabeçalho próprio. Cada uma com 'o que é · por que importa · como aplicar'.",
     "prompt_en": "The 3 ideas that hold up the thesis. Each becomes its own section. Each with 'what · why · how to apply'."},
    {"id": "evidence", "label_pt": "Evidência e críticas", "label_en": "Evidence and critics",
     "prompt_pt": "O que o autor apresentou como prova, E o que os críticos legítimos dizem. :::callout{kind=warn} pra caveats honestos.",
     "prompt_en": "What the author marshalled, AND what legitimate critics say. :::callout{kind=warn} for honest caveats."},
    {"id": "actionable", "label_pt": "Takeaway acionável", "label_en": "Actionable takeaway",
     "prompt_pt": "O que muda na vida do leitor se ele aceitar essa tese? :::list-icon com 3-4 ações.",
     "prompt_en": "What changes in the reader's life if they accept this thesis? :::list-icon with 3-4 actions."},
    {"id": "verdict", "label_pt": "Veredito do destilador", "label_en": "Distiller's verdict",
     "prompt_pt": "Vale ler o original? Pra quem? Em 1 parágrafo. Honestidade > marketing.",
     "prompt_en": "Worth reading the original? For whom? In 1 paragraph. Honesty over marketing."}
  ]
}$json$::jsonb,
$json${
  "rules": [
    {"id": "attribute_clearly", "label_pt": "Toda ideia atribuída ao autor com :::quote ou nome explícito — não passar opinião do autor como fato", "label_en": "Every idea attributed to the author with :::quote or explicit naming — don't pass author's opinion as fact"},
    {"id": "critics_honestly", "label_pt": "Críticas reais e atribuídas (não 'alguns dizem que...')", "label_en": "Real critics attributed (no 'some say...')"},
    {"id": "source_required", "label_pt": "Bloco :::source com a obra + ano + ISBN/DOI quando aplicável", "label_en": ":::source block with the work + year + ISBN/DOI when applicable"},
    {"id": "no_spoiler_excess", "label_pt": "Distilar não é copiar — pegue a forma do raciocínio do autor, não cite blocos longos", "label_en": "Distilling is not copying — capture the shape of the author's reasoning, don't paste long blocks"}
  ]
}$json$::jsonb,
7,
array['quote', 'source'],
array['stat', 'callout', 'compare', 'list-icon']);

-- Seed: news
insert into public.material_type_template (type, reasoning_steps, editorial_rules, target_minutes, required_directives, recommended_directives) values
('news',
$json${
  "steps": [
    {"id": "fact", "label_pt": "O fato em 1 frase", "label_en": "The fact in one sentence",
     "prompt_pt": "Aconteceu o quê? Quem? Quando? Onde? Em 1 frase enxuta.",
     "prompt_en": "What happened? Who? When? Where? In one tight sentence."},
    {"id": "novelty", "label_pt": "Por que é notícia", "label_en": "Why this is news",
     "prompt_pt": "O que mudou vs o entendimento anterior? Use :::compare 'antes / depois' se a mudança for clara.",
     "prompt_en": "What changed vs prior understanding? Use :::compare 'before / after' if the shift is clear."},
    {"id": "evidence_status", "label_pt": "Status de evidência", "label_en": "Evidence status",
     "prompt_pt": "Paper peer-reviewed? Preprint? Press release? Rumor? Seja explícito. :::callout{kind=info} se houver caveat de qualidade da fonte.",
     "prompt_en": "Peer-reviewed paper? Preprint? Press release? Rumor? Be explicit. :::callout{kind=info} if the source quality has a caveat."},
    {"id": "implication", "label_pt": "Implicação prática", "label_en": "Practical implication",
     "prompt_pt": "O que isso muda no que o leitor faz/decide? Específico, não vago.",
     "prompt_en": "What does this change in what the reader does/decides? Specific, not vague."},
    {"id": "what_stays_true", "label_pt": "O que CONTINUA verdade", "label_en": "What STAYS true",
     "prompt_pt": "Crucial: a maior parte do conhecimento existente não muda com uma manchete. Reforce o que continua igual.",
     "prompt_en": "Crucial: most existing knowledge doesn't change with a headline. Reinforce what stays the same."},
    {"id": "action_or_not", "label_pt": "Agir ou ignorar?", "label_en": "Act or ignore?",
     "prompt_pt": "Veredito explícito: vale mudar algo agora, ou esperar mais dados? 1 parágrafo.",
     "prompt_en": "Explicit verdict: worth changing something now, or wait for more data? 1 paragraph."}
  ]
}$json$::jsonb,
$json${
  "rules": [
    {"id": "freshness", "label_pt": "Sempre cite a data do fato. News com >60 dias = arquivar.", "label_en": "Always cite the date of the fact. News >60 days = archive."},
    {"id": "calibrate_evidence", "label_pt": "Calibrar o tom à qualidade da evidência: preprint não é paper publicado.", "label_en": "Match tone to evidence quality: preprint isn't a published paper."},
    {"id": "no_clickbait", "label_pt": "Sem manchete sensacionalista. O 'novelty' precisa ser real.", "label_en": "No clickbait. The 'novelty' must be real."},
    {"id": "source_required", "label_pt": "Bloco :::source com link direto à fonte primária.", "label_en": ":::source block with a direct link to the primary source."}
  ]
}$json$::jsonb,
3,
array['source'],
array['compare', 'callout', 'stat']);

-- ─── 2. material_topic_seed ───────────────────────────────────────────────
-- Backlog of topic ideas for the planner agent. Mix of maintainer-curated
-- and agent-proposed.

create table public.material_topic_seed (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('explainer', 'summary', 'news')),
  topic text not null,                                       -- short label, e.g. "sleep regularity"
  angle_pt text,                                              -- proposed angle / hook
  angle_en text,
  preferred_sub text references public.dimension_sub(id) on delete set null,
  source text not null default 'maintainer'                  -- 'maintainer' | 'agent' | 'feedback'
    check (source in ('maintainer', 'agent', 'feedback')),
  notes text,                                                 -- free text notes (links, etc.)
  status text not null default 'pending'                     -- 'pending' | 'in_progress' | 'used' | 'dropped'
    check (status in ('pending', 'in_progress', 'used', 'dropped')),
  used_in_material_id uuid references public.learning_material(id) on delete set null,
  priority smallint not null default 5 check (priority between 1 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index material_topic_seed_status_idx
  on public.material_topic_seed (status, priority desc, created_at)
  where status = 'pending';

alter table public.material_topic_seed enable row level security;

create policy "material_topic_seed_read_authenticated"
  on public.material_topic_seed for select
  to authenticated using (true);

-- ─── 3. learning_material — reasoning_log column ──────────────────────────
-- Captures the drafter agent's structured answers per reasoning step, plus
-- editor review notes. NULL for legacy materials (Sleep + Strength v1).

alter table public.learning_material
  add column reasoning_log jsonb;

-- ─── 4. learning_material_revision ────────────────────────────────────────
-- Snapshot of editorial fields right before each UPDATE. Trigger fires
-- whenever any of those fields change.

create table public.learning_material_revision (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.learning_material(id) on delete cascade,
  version int not null,                                       -- version of the row BEING REPLACED
  body_pt text,
  body_en text,
  takeaways_pt text[],
  takeaways_en text[],
  signs_pt text[],
  signs_en text[],
  tracking_pt text,
  tracking_en text,
  reasoning_log jsonb,
  edited_by text not null default 'unknown',                  -- 'agent' | 'maintainer' | 'migration'
  edit_summary text,                                           -- 1-line description of what changed
  created_at timestamptz not null default now()
);

create index learning_material_revision_material_idx
  on public.learning_material_revision (material_id, version desc);

alter table public.learning_material_revision enable row level security;

-- Public read so the app can show "last updated" or revision count if it
-- wants. No write policies — only the trigger writes.
create policy "learning_material_revision_read_authenticated"
  on public.learning_material_revision for select
  to authenticated using (true);

-- Trigger function: snapshots the OLD row's editorial fields into a
-- revision row when any editorial field changes. Skips when the change is
-- pure metadata (touch_updated_at, archived flag, etc.).
create or replace function public.snapshot_material_revision()
returns trigger
language plpgsql
security definer
set search_path = public
as $func$
begin
  -- Only snapshot when the editorial content actually changed.
  if (
    old.body_pt is distinct from new.body_pt
    or old.body_en is distinct from new.body_en
    or old.takeaways_pt is distinct from new.takeaways_pt
    or old.takeaways_en is distinct from new.takeaways_en
    or old.signs_pt is distinct from new.signs_pt
    or old.signs_en is distinct from new.signs_en
    or old.tracking_pt is distinct from new.tracking_pt
    or old.tracking_en is distinct from new.tracking_en
    or old.reasoning_log is distinct from new.reasoning_log
  ) then
    insert into public.learning_material_revision (
      material_id, version,
      body_pt, body_en,
      takeaways_pt, takeaways_en,
      signs_pt, signs_en,
      tracking_pt, tracking_en,
      reasoning_log,
      edited_by,
      edit_summary
    ) values (
      old.id, old.version,
      old.body_pt, old.body_en,
      old.takeaways_pt, old.takeaways_en,
      old.signs_pt, old.signs_en,
      old.tracking_pt, old.tracking_en,
      old.reasoning_log,
      coalesce(current_setting('app.edited_by', true), 'unknown'),
      coalesce(current_setting('app.edit_summary', true), null)
    );

    -- Auto-bump version when content changed and caller didn't bump it.
    if new.version = old.version then
      new.version := old.version + 1;
    end if;
  end if;

  return new;
end $func$;

create trigger learning_material_snapshot_revisions
  before update on public.learning_material
  for each row execute function public.snapshot_material_revision();

-- ─── 5. learning_material_feedback ────────────────────────────────────────
-- 👍/👎 per user per material. Optional free-text comment for 👎.

create table public.learning_material_feedback (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.learning_material(id) on delete cascade,
  character_id uuid not null references public.character(id) on delete cascade,
  rating smallint not null check (rating in (-1, 1)),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (material_id, character_id)
);

create index learning_material_feedback_material_idx
  on public.learning_material_feedback (material_id, rating);

alter table public.learning_material_feedback enable row level security;

create policy "learning_material_feedback_self_select"
  on public.learning_material_feedback for select
  to authenticated using (character_id = auth.uid());

create policy "learning_material_feedback_self_insert"
  on public.learning_material_feedback for insert
  to authenticated with check (character_id = auth.uid());

create policy "learning_material_feedback_self_update"
  on public.learning_material_feedback for update
  to authenticated using (character_id = auth.uid())
  with check (character_id = auth.uid());

create policy "learning_material_feedback_self_delete"
  on public.learning_material_feedback for delete
  to authenticated using (character_id = auth.uid());

create trigger learning_material_feedback_touch_updated_at
  before update on public.learning_material_feedback
  for each row execute function public.touch_updated_at();

-- RPC: rate_material(slug, rating, comment?). Idempotent upsert keyed on
-- (material, user). Tapping the same rating twice clears the vote.

create or replace function public.rate_material(
  p_slug text,
  p_rating smallint,
  p_comment text default null
) returns json
language plpgsql
security definer
set search_path = public
as $func$
declare
  v_material_id uuid;
  v_existing record;
  v_action text;
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

  select * into v_existing
  from public.learning_material_feedback
  where material_id = v_material_id and character_id = auth.uid();

  if found and v_existing.rating = p_rating then
    -- Same rating tapped again — clear it.
    delete from public.learning_material_feedback
    where material_id = v_material_id and character_id = auth.uid();
    v_action := 'cleared';
  elsif found then
    -- Flipping the rating.
    update public.learning_material_feedback
    set rating = p_rating, comment = p_comment, updated_at = now()
    where material_id = v_material_id and character_id = auth.uid();
    v_action := 'updated';
  else
    insert into public.learning_material_feedback (material_id, character_id, rating, comment)
    values (v_material_id, auth.uid(), p_rating, p_comment);
    v_action := 'inserted';
  end if;

  return json_build_object('action', v_action, 'rating', p_rating);
end $func$;

grant execute on function public.rate_material(text, smallint, text) to authenticated;

commit;
