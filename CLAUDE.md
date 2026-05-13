# RPG Tasks

Habit + wellness app for Android. **V2 in production** — multi-sub tasks, 4 psychometric instruments (Avaliação v1, Big Five 120, Schwartz Values, ECR-R Attachment), bilingual UI (pt-BR + en-US), quest system, skills with tier ladders, reward bank. **V3 refactor in planning** — see "V3 Roadmap" below for the 3-pillar repositioning.

Sandbox project; primary user is the maintainer's brother (testing) and eventual second contributor (not active yet).

---

## Read first — working style

The user is **visual and empirical**: they want to see things working to know what they want next. Strong preference for **action over planning** on this sandbox.

- Big PRs are OK (whole-feature shipping > many tiny PRs)
- Admin-merging own PRs on `main` is OK here (single-dev sandbox; protection exists for the future when their brother joins)
- Don't ask before routine decisions — pick something reasonable and ship
- "manda bala", "tá bala", "pode fazer tudo" = green light, full speed

This applies to **velocity and ceremony only** — security, RLS, secret hygiene stay strict.

(Durable record: `~/.claude/projects/.../memory/feedback_workstyle.md`.)

---

## V3 Roadmap (active planning)

The app is being repositioned around **3 pillars of identity** (filosofia v3):

1. **Identidade Percebida** — *how the user sees themselves now*. Built via autoavaliação (sub sliders) + the 4 psych instruments. Mostly done.
2. **Identidade Praticada** — *what their actions are training in them*. Tasks done; Quests partial; **Dedicação** (XP) needs window-based reads; **Momentum** (streak v2) needs full design.
3. **Identidade Desejada** — *who they want to become*. Skills mostly done; **Goals** doesn't exist yet.

**Phase 1 (current) — fundação + polimento without new big features:**

| # | Item | Status |
|---|---|---|
| 1 | Rewrite CLAUDE.md to reflect V2 state | this PR |
| 2 | Audit system/personal pattern across all entities; add `released_at`/`version` to template tables to support periodic content drops | next |
| 3 | Nav refactor — rename Profile → Settings, add Learning placeholder tab, embed History inside Tasks | |
| 4 | PT/EN audit + apply new glossary (Dedicação, Momentum, the 3 pillars) | |
| 5 | Skills CRUD polishing | |
| 6 | Rewards visual polish | |
| 7 | Transversal UI bugs (scroll w/ fixed buttons overlapping content) | |

**Phase 2+** — Quests completo, Goals (do zero), Momentum (nova fórmula), Onboarding completo recalibrável por categoria via Settings, Learning content (materiais semanais), Hero/Avatar exploration, Insights, Social.

**App name**: stays `RPG Tasks` for now. The slug `rpgtasks`, package `com.andrlut.rpgtasks`, and deep-link `rpgtasks://` are all internal; renaming is a final-polish task that doesn't gate anything.

**Live content lever**: periodic drops of new system templates (and promoting popular user-created entities to system) are explicit retention bets. The system/personal split makes this cheap; the schema audit in Phase 1 includes prep (`released_at`/`version`).

---

## Stack

- **Mobile**: React Native + Expo SDK 54, TypeScript strict, Expo Router (file-based)
- **State**: TanStack Query (server) + Zustand (UI/local)
- **i18n**: `i18next` + `react-i18next`; locale split: `pt-BR` (default) + `en-US`. Catalog tables carry `_pt` columns; client picks column by app locale.
- **Backend**: Supabase — Postgres 17 + Auth + Edge Functions, project ref `uneqnpyzevosznwkmvvo`
- **Tooling**: pnpm workspaces, GitHub Actions CI, EAS Build for APKs, EAS Update for OTA
- **Icons**: `@expo/vector-icons` (Ionicons)
- **Animations**: `react-native-reanimated` v4

---

## Repo layout

```
.
├── app/                # Expo React Native app
│   ├── app/            # Expo Router routes
│   │   ├── (tabs)/     # Home, History, Character, Rewards, Profile
│   │   ├── skill/[id]
│   │   ├── dimension/[id]
│   │   ├── sub/[id]
│   │   ├── login.tsx / forgot-password / reset-password
│   │   ├── onboarding.tsx
│   │   ├── tasks.tsx / task-form.tsx
│   │   ├── reward-form.tsx
│   │   ├── skills.tsx / skill-form.tsx
│   │   ├── quests.tsx
│   │   ├── questionnaire.tsx       # Avaliação v1
│   │   ├── self-assessment.tsx     # manual sub sliders
│   │   ├── big-five.tsx / schwartz.tsx / ecr-r.tsx
│   │   ├── profile-mirror.tsx      # self vs. questionnaire comparison
│   │   └── _layout.tsx (AuthGate + Stack)
│   ├── components/     # Reusable RN components
│   ├── lib/
│   │   ├── api/        # TanStack Query hooks (see "API hooks" below)
│   │   ├── auth/       # useSession + deep-link handler
│   │   ├── db/         # TS types matching Supabase schema
│   │   ├── i18n/       # locale files + setup
│   │   ├── supabase/   # Client + URL polyfill + AsyncStorage session persistence
│   │   └── ...
│   ├── theme/          # tokens.ts, dimensions.ts
│   ├── eas.json        # Build profiles: development | preview | production
│   ├── app.json        # name=RPG Tasks, slug=rpgtasks, package=com.andrlut.rpgtasks
│   └── package.json
├── supabase/
│   ├── migrations/     # 38+ SQL migrations applied via `supabase db push --linked`
│   ├── README.md
│   └── config.toml     # Local CLI config (Postgres 17 to match cloud)
├── shared/             # Cross-cutting types workspace (@rpgtasks/shared)
├── design/             # Original HTML/JSX prototype
├── docs/architecture.md
└── .github/workflows/ci.yml
```

---

## Database schema (V2, current cloud state)

RLS enabled on every table. "Self-only" by `auth.uid()` for personal tables; catalog tables are `public-read` for authenticated users.

### Auth & profile
| Table | Purpose |
|---|---|
| `profile` | 1:1 with `auth.users`. display_name, avatar_url |
| `character` | 1:1 with profile. total_xp, coins, locale |

### Dimensions & subs (fixed system catalog)
| Table | Purpose |
|---|---|
| `dimension` | 6 catalog dims: health, body, mind, wealth, bonds, craft |
| `dimension_sub` | 12 catalog subs (2 per dim): sleep, nutrition, strength, dexterity, learn, contemplate, money, career, circle, romance, play, build |
| `character_dimension` | per-character XP per dim |
| `character_sub_score` | per-sub decimal score (0..5) split by `source` ('self' \| 'questionnaire') |
| `assessment_log` | append-only history of every score recording; links to `psych_session` when sourced |

### Tasks (multi-sub model)
| Table | Purpose |
|---|---|
| `task` | user-owned. title, description, task_type ('one_shot'\|'daily'\|'weekly'), recurrence jsonb, target_count, is_archived, optional `template_id` |
| `task_sub` | per-task sub allocations: (task_id, sub_id) → stars (1..5). Total stars per task capped at 5 (DB-enforced) |
| `task_template` | **catalog (36 rows)** — 3 templates × 12 subs |
| `task_template_sub` | sub allocations for templates |
| `task_completion` | immutable. XP/coin grants cached at completion time |
| `task_completion_sub` | per-sub breakdown of each completion |
| `task_skip` | "not today" decisions per (task, character, date); preserves streak |

### Rewards
| Table | Purpose |
|---|---|
| `reward` | user-owned. title, description, cost, icon, category, is_archived, optional `template_id` |
| `reward_template` | **catalog (23 rows)** with bilingual `title_pt` |
| `reward_redemption` | immutable purchase log. `used_at` null = banked, non-null = consumed |
| `reward_tracking` | daily audit of reward creation (analytics) |

### Skills (dual-mode single table)
| Table | Purpose |
|---|---|
| `skill` | catalog rows (`character_id=null`) OR user-owned (`character_id=uuid`). `display_name_pt`, `description_pt`, `unit_pt`, dimension_id, optional sub_id, `population_stat_pt` (catalog only) |
| `skill_tier` | per-skill tier ladder (beginner/bronze/silver/gold/master), threshold, percentile |
| `skill_log` | per-user value entries, immutable |

### Quests
| Table | Purpose |
|---|---|
| `quest` | user-owned. status (active/completed/failed/expired/abandoned), deadline, reward_xp/coins, allow_partial, optional `template_id` |
| `quest_requirement` | per-quest. kind ('complete_task_n_times'\|'complete_any_in_dim'\|'reach_skill_value'); progress computed on read |
| `quest_template` | **catalog** with bilingual `title_pt`, `description_pt`, `requirements jsonb` |

### Psychometric instruments
Generic schema seeded with 4 scales: **Avaliação v1** (24-item wellbeing), **Big Five 120**, **Schwartz Values 57**, **ECR-R 36**.

| Table | Purpose |
|---|---|
| `psych_instrument` | catalog of instruments. category ('wellbeing'\|'self_knowledge'), version, item_count, scale_min/max, scoring_method, scale_labels jsonb |
| `psych_facet` | hierarchical facet structure per instrument (slug bridges to `dimension_sub.id` for wellbeing) |
| `psych_item` | bilingual question text (`text_pt`/`text_en`), reverse_scored, optional per-item options |
| `psych_session` | per-user session run. instrument_id, taken_at, duration_seconds, is_complete |
| `psych_session_item` | snapshot of items served (allows reconstruction after catalog edits) |
| `psych_answer` | raw answers |
| `psych_score` | computed per-facet scores. `score_decimal`, optional `percentile` |

`questionnaire_session` and `questionnaire_answer` are legacy mirrors of the psych tables, kept for backward-compat view layers (sharing UUIDs).

---

## RPCs exposed to authenticated users

| RPC | Purpose |
|---|---|
| `complete_task(uuid, timestamptz?, jsonb?)` | Log completion. Computes XP/coins by per-sub stars × streak multiplier. Bumps character, character_dimension, completion sub rows. Retro-friendly. |
| `delete_task_completion(uuid)` | Undo. Refunds XP/coins (clamped at 0); restores streak math. |
| `set_task_subs(uuid, jsonb)` | Idempotent update of a task's sub allocations. Enforces 1..5 total stars. |
| `start_task_from_template(text)` | Clone task template into user's task list. |
| `set_sub_score(text, text, smallint)` | Upsert `character_sub_score` + append `assessment_log` row. |
| `set_sub_scores_bulk(text, jsonb)` | Batch version of the above (one TX). |
| `compute_streak_days(uuid, date)` | Current streak ending on given date. |
| `streak_multiplier(integer)` | streak days → XP multiplier curve (1.0 → 1.5). |
| `start_psych_session(text)` | Create session, seed items, return items + metadata. |
| `submit_psych_session(uuid, jsonb, integer?)` | Record answers, compute per-facet scores, bridge wellbeing → `character_sub_score`. |
| `psych_seed_session_items(uuid)` | Populate `psych_session_item` (default: all catalog items in order). |
| `submit_questionnaire(jsonb, integer?)` | Legacy v1 entry point; mirrors to both legacy and psych tables. |
| `start_quest_from_template(text)` | Clone quest template (resolves task names case-insensitively). |
| `start_custom_quest(jsonb)` | Create user-defined quest + requirements. |
| `complete_quest(uuid)` | Credit reward_xp/coins, flip status to completed. |
| `expire_overdue_quests()` | Bulk-mark overdue active quests as expired. Cheap + idempotent. |
| `create_custom_skill(jsonb)` | Insert a user-owned skill row. |
| `redeem_reward(uuid)` / `use_reward(uuid)` | Buy → redemption row → coin debit (bank or instant). |

### Trigger: `handle_new_user()` on `auth.users` insert
- Creates `profile` + `character`
- Inserts 6 `character_dimension` rows + 12 `character_sub_score` rows (source='self', score 0)
- **Does NOT auto-seed any tasks or rewards** — user adopts from templates or creates custom

---

## API hooks (`app/lib/api/`)

| File | Domain |
|---|---|
| `character.ts` | profile, dimension XP, level progression |
| `tasks.ts` | pending, active, detail, templates, complete, delete, set_subs, skip |
| `streak.ts` | current streak days + multiplier |
| `rewards.ts` | owned, templates, redeem, create, edit, tracking |
| `skills.ts` | owned, catalog, custom create, log value, detail |
| `quests.ts` | active, completed, templates, start, complete, expire |
| `questionnaire.ts` | legacy v1 submit + history (being superseded) |
| `psych.ts` | start_psych_session, submit_psych_session, last session per instrument |
| `history.ts` | assessment log + completion history |
| `profile.ts` | display_name, avatar_url updates |

---

## System/Personal pattern (load-bearing for V3)

| Entity | System catalog | Personal | Pattern |
|---|---|---|---|
| Tasks | `task_template` (36) | `task` | Adopt via RPC or custom |
| Rewards | `reward_template` (23) | `reward` | Adopt via RPC or custom |
| Skills | `skill` where `character_id=null` | `skill` where `character_id=uuid` | Dual-mode single table |
| Quests | `quest_template` | `quest` | Adopt via RPC or custom |
| Dimensions/Subs | `dimension`, `dimension_sub` | — | Fixed system; no user customization |
| Psych instruments | `psych_instrument`+`psych_facet`+`psych_item` | `psych_session`+`psych_answer`+`psych_score` | Catalog-only instruments; user owns sessions |

**Rule**: anything user-created is `personal` (RLS-protected); anything default is `system` (public-read catalog). No per-user duplication of default content.

---

## Workflow conventions

- **Branches**: `feat/<short>`, `fix/<short>`, `chore/<short>`, `docs/<short>`
- **Commits**: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`)
- **Co-author trailer**: every commit ends with `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`
- **PRs**: open with `gh pr create`, merge with `gh pr merge <n> --squash --admin --delete-branch`
- **After merge**: `git switch main && git pull --rebase`
- **CI**: typecheck (app + shared) + lint (app); both must be green before merge
- **Branch protection**: `main` requires 1 approval — admin bypass is acceptable on this sandbox while solo

---

## Pre-commit checks (always run before opening a PR)

```bash
cd app && npx tsc --noEmit && npx expo lint
```

Both must pass clean. Lint catches `react/no-unescaped-entities` (apostrophes/quotes inside `<Text>`) — escape with HTML entities or rephrase.

---

## Local development

```bash
pnpm install                    # at root, once
cd app
pnpm dev                        # starts Expo dev server on port 8081
# scan QR with Expo Go on phone (same Wi-Fi)
# or pnpm dev --tunnel  for remote
```

If new routes don't show up (Unmatched Route screen), restart with `pnpm dev --clear` to flush Metro cache.

---

## Credentials & env state (NOT in repo)

User-level env vars (persist across all terminals on this machine):
- `SUPABASE_ACCESS_TOKEN` — PAT, used by `supabase` CLI and Management API
- `EXPO_TOKEN` — used by `eas` CLI for builds and login

App env (`app/.env.local`, gitignored):
```
EXPO_PUBLIC_SUPABASE_URL=https://uneqnpyzevosznwkmvvo.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_sWLt4U0F5J4S-Se-6V7SXw_1LyQqysV
```

The publishable key is safe in client (RLS protects). The service_role key has been flagged by Supabase as exposed — DO NOT reuse it from chat history. If admin DB access is needed, use `supabase` CLI (token-authed) or ask the user to rotate and provide a fresh value.

---

## Common change recipes

| Want to | Do this |
|---|---|
| Add a new feature with schema | New file `supabase/migrations/<timestamp>_<name>.sql` → `supabase db push --linked` |
| Add a new system template entity | Always create a `*_template` catalog + a user-owned table; clone via SECURITY DEFINER RPC. Never auto-seed personal copies. |
| Add a new screen | File under `app/app/`, register in `app/app/_layout.tsx` `<Stack>` |
| Add a new API hook | File under `app/lib/api/<domain>.ts`; mirror existing hook patterns |
| Add a new UI component | File under `app/components/`; use design tokens from `app/theme` |
| Tweak colors / spacing / radii | `app/theme/tokens.ts` (single source of truth — also reflected in `design/tokens.css`) |
| Build an APK | `cd app && eas build --platform android --profile preview --non-interactive --no-wait` |
| Ship JS-only hotfix to live APK | `cd app && eas update --channel preview` — prefer this over rebuild whenever no native code changed |
| Apply migration to cloud | `cd "C:\Users\André Luthold\RPG"` then `supabase db push --linked` |

---

## Known caveats

- **Supabase CLI on Windows**: standalone binary at `%LOCALAPPDATA%\supabase\supabase.exe`. PATH set as user env var; new terminals see it. Smart App Control sometimes flags it — use absolute path if "term not recognized".
- **Service_role key flagging**: Supabase blocks calls from "browser-like" User-Agents. Use `User-Agent: supabase-cli/2.95.4` if you ever need to fall back to direct admin REST.
- **Auth redirect URL** is the deep link `rpgtasks://auth/callback` (computed via `expo-linking`'s `createURL`). The app handles incoming auth URLs in `lib/auth/deep-link.ts` and exchanges them for a session. **Manual dashboard config required** in Supabase → Auth → URL Configuration: set **Site URL** = `rpgtasks://auth/callback` and add it under **Redirect URLs**. Without this step, email-confirmation links still go to `localhost:3000`. Magic links / OTP / PKCE / fragment-based flows are all handled.
- **Custom schemes need a dev/production build** — Expo Go strips them, so test the email-confirm flow in `eas build --profile development` (or `preview`/`production`), not in Expo Go.
- **expo-updates is installed and working** — OTA hot-fixes via `eas update --channel preview` push JS/TS changes to the existing APK without a rebuild. The Settings tab has a "check for updates" button users can tap to pull manually. Native code changes (new packages, native modules, version bumps) still require a fresh `eas build`. **Prefer `eas update` over `eas build`** whenever the change is JS/TS-only — saves ~15 min per change.
- **Bilingual catalogs**: every new user-facing catalog column should ship as `*_pt` (and optionally `*_en`). Client picks by `character.locale`.
- **Migrations are write-once**: never edit a merged migration; add a new one. Existing migrations use `IF EXISTS` / idempotent guards where possible.

---

## Recent history

See `git log --oneline` for the canonical record. Major V2 milestones, latest first:

- **Self-assessment redesign v1** + 120 anchor strings + slider redesign + sub glossary (PR #129, #130)
- **ECR-R Attachment** 36-item inventory + 4-quadrant UI (PR #128)
- **Schwartz Values** autoral 57-item inventory + ranking UI (PR #127)
- **Big Five** polish — non-hierarchical framing, level explorer, UI take + result + narrative (PR #122–#126)
- **Psych foundation** — generic instrument schema, self-knowledge prep, decimal scoring (PR #116, #121, #120)
- **Avaliação v2** — 96-item decimal scoring + Profile/Mirror (PR #117)
- **Bilingual app** — pt-BR + en-US infrastructure (PR #114)
- **Home completed-today drawer** — +extra / undo / unskip (PR #113)
- **Task skip + long-press action menu** (PR #112)
- **Unified recurrence** — schedule = hint, target = per-period (PR #111)
- **Multi-sub task model** + per-sub stars (cap 5/task) (PR #108–#110)
- **Tasks v2 visual** — compact header, 4 buckets, redesigned cards (PR #105)
- **Skill orbital medallion** + Lore/Stats/Path/Timeline rewrite (PR #103, #104)
- **Dimension rename** strength → body, movement → strength (PR #106)
- **V0 milestones** — foundations, task CRUD, rewards, skills, streaks, onboarding, EAS builds (PR #1–#12)
