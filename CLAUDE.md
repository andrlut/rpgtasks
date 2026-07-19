# RPG Tasks

Habit + wellness app for Android. **V2 in production** — multi-sub tasks, 4 psychometric instruments (Avaliação v1, Big Five 120, Schwartz Values, ECR-R Attachment), bilingual UI (pt-BR + en-US), quest system, skills with tier ladders, reward bank. **V3 largely shipped** (brand **Perceva**, Today Hub, Eu 3-pillar tab, Learning, Missões, Vault, notifications) — see "V3 Roadmap" → *V3 status snapshot* below.

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

1. **Identidade Percebida** — *how the user sees themselves now*. Built via autoavaliação (sub sliders) + the 4 psych instruments. Done; surfaced in the **Eu** tab (Avaliação + Autoconhecimento panels).
2. **Identidade Praticada** — *what their actions are training in them*. Tasks done; Quests→**Missões** shipped (skill/challenge types, partial rewards); **Dedicação** (XP) has windowed reads (period selector + donut + sparklines); **Momentum** shipped as the streak-v2 successor — a 30-day exponentially-decayed per-sub bonus (cap +25%) applied in `complete_task`/`complete_template`. It **replaced** the old `streak_multiplier` (now fully removed) — do NOT re-add streak on top of Momentum.
3. **Identidade Desejada** — *who they want to become*. Skills done; **Goals→Metas** exists as a preview (GoalsPreview) — full CRUD still Phase 2.

**Phase 1 (current) — fundação + polimento without new big features:**

| # | Item | Status |
|---|---|---|
| 1 | Rewrite CLAUDE.md to reflect V2 state | ✅ (kept current; last refresh 2026-07-01) |
| 2 | Audit system/personal pattern; add `released_at`/`version` to template tables | ✅ shipped |
| 3 | Nav refactor — Profile → Settings, Learning tab, History inside Tasks | ✅ shipped |
| 4 | PT/EN audit + new glossary (Dedicação, Momentum, the 3 pillars) | ✅ shipped (#251/#252, 969 keys) |
| 5 | Skills CRUD polishing | 🟢 mostly — i18n gaps on Skills tab + pillar panel closed (#260); a few `skill/[id]` detail strings still hardcoded |
| 6 | Rewards visual polish | ✅ shipped (Vault redesign, editable cards, drag-reorder, Buy/Sell modals, celebration) |
| 7 | Transversal UI bugs (scroll behind fixed buttons) | 🟢 audited 2026-07-01 — the form modals already reserve `space[10]`; self-assessment is the one borderline case (deferred) |

**Phase 2+** — Missões completo, **Metas** CRUD (do preview → full), Onboarding recalibrável por categoria via Settings, Learning content contínuo, Hero/Avatar exploration, Insights, Social.

**Brand**: the product brand is now **Perceva** (PercevaGlyph, Vault rewards, Iris identity). Identifiers are mid-migration: Android `package` is **`perceva.app`** (renamed in #275 to match Play Console), but slug `rpgtasks`, iOS `bundleIdentifier` `com.andrlut.rpgtasks`, deep-link `rpgtasks://`, and EAS project `rpgtasks` are still internal. The Android package is load-bearing (must match Play Console); the rest is final-polish that doesn't gate anything. **The deep-link scheme is independent of the package** — changing `rpgtasks://` would require re-pointing Supabase Auth → URL Configuration.

### V3 status snapshot (updated 2026-07-01)

Much of what earlier docs list as "pending" has **shipped to production** — don't re-investigate from scratch:

- **Perceva rebrand**, V3 **Today Hub** home, **Eu** tab (3-pillar switcher), **Learning** feed (Netflix-style carousel + publisher infra + 5 learning sub-agents in `.claude/agents/`), **Missões** (quest v3), **Vault** rewards.
- **Notifications** (`app/lib/notifications/`): Daily Brief (08:00 default) + 12:30 Checkpoint. Boot-order bug fixed 2026-07-01 (checkpoint is now armed for *tomorrow* and re-armed per open). Native module needs an `eas build` to activate (OTA can't).
- **XP curve**: rewards rebalanced (ratio 50×→8×, `base_xp_for_stars`); level curve recalibrated to flat-linear `(level-1)×100` (2026-07-01, client-only `xp.ts`).
- **Premium badge** (2026-07-01): cosmetic flag `profile.subscription_tier` (`free`/`premium`, default free) with a `lock_subscription_tier` trigger blocking self-grant. Granted manually via Studio. **Not** a tiered entitlement system.
- **Post-login tour** (M0–M6 + wrap) in prod; cold-boot re-trigger fixed (#253).

**Live content lever**: periodic drops of new system templates (and promoting popular user-created entities to system) are explicit retention bets. The system/personal split makes this cheap; the schema audit in Phase 1 includes prep (`released_at`/`version`).

---

## Stack

- **Mobile**: React Native + Expo SDK 54, TypeScript strict, Expo Router (file-based)
- **State**: TanStack Query (server) + Zustand (UI/local)
- **i18n**: `i18n-js` (NOT `i18next` — no `react-i18next`, no `TFunction` type); `useT()` from `app/lib/i18n` returns `{ t, locale }`. Locale split: `pt-BR` (default) + `en-US`. Catalog tables carry `_pt` columns; client picks column by app locale.
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
│   ├── app.json        # name=RPG Tasks, slug=rpgtasks, android package=perceva.app
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
- **Co-author trailer**: every commit ends with `Co-Authored-By: Claude <model> <noreply@anthropic.com>` — Claude Code adds it automatically using whichever model is actually running (e.g. `Sonnet 4.6`, `Opus 4.7 (1M context)`). Don't hardcode a specific model; each contributor's machine signs with its own.
- **PRs**: open with `gh pr create`, merge with `gh pr merge <n> --squash --admin --delete-branch`
- **After merge**: `git switch main && git pull --rebase`
- **CI**: typecheck (app + shared) + lint (app); both must be green before merge
- **Branch protection**: `main` requires 1 approval — admin bypass is acceptable on this sandbox while solo

---

## Claude Code skills available in this repo

Auto-loaded from `.claude/skills/`. Invoke via `/<name>` in chat.

| Skill | Use it when |
|---|---|
| **`/db-migration`** | Creating any new SQL migration — handles the full flow (pull → create counter-style file → push to cloud → commit) so history stays aligned between the two contributors |
| **`/db-migration-review`** | Reviewing a PR with `.sql` changes — does the dry-run + schema audit the author (typically Artur) couldn't run himself |
| **`/pr-cycle`** | Closing out a branch — precommit check + push + open PR + admin merge + cleanup in one shot (aggressive, mergeia sozinho) |
| **`/precommit-check`** | Just running typecheck + lint to know if you're CI-green before pushing |
| **`/sync-all`** | Start-of-day status — pull main + audit worktrees + verify cloud↔git migration alignment |
| **`/ota-update`** | Publishing a JS-only hotfix via `eas update` (no rebuild) — channel `production` for the Play Store app, `preview` for the internal APK |
| **`/worktree-cleanup`** | Removing stale/abandoned/prunable worktrees with confirmation — execute the cleanup `/sync-all` only suggests |

### Auto-invoke rules (use these without being asked)

These plugin skills should be reached for automatically when the conversation shifts to the matching kind of work — don't wait for the user to type the slash command:

- **`/design:ux-copy`** — when user is reviewing/writing microcopy, error messages, empty states, CTAs, button labels, or onboarding text (frequent in this repo because of the `_pt`/`_en` bilingual catalogs). Use it for *both* the pt-BR and en-US variants.
- **`/design:design-critique`** — when user shares a screenshot of an app screen for feedback, or asks "what do you think of this layout?".
- **`/design:accessibility-review`** — when user mentions color contrast, touch target size, screen reader, WCAG, or "is this accessible?".
- **`/security-review`** — automatically before merging any PR that touches RLS policies, RPCs with `security definer`, auth flow, or storage of credentials.
- **`/simplify`** — after finishing a feature implementation, before opening the PR. Pairs naturally with `/pr-cycle`.

Built-ins worth knowing (invoke explicitly): `/review`, `/fewer-permission-prompts` (especially useful for Artur's first weeks), `/init`, `/consolidate-memory`.

Plugins enabled: `design` (ux-copy, design-critique, accessibility-review — others available but rarely useful here), `anthropic-skills` (skill-creator, memory consolidation).

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
| Ship JS-only hotfix to the Play Store app | `cd app && eas update --channel production` — prefer this over rebuild whenever no native code changed |
| Ship JS-only hotfix to the internal test APK | `cd app && eas update --channel preview` |
| Apply migration to cloud | `cd "C:\Users\André Luthold\RPG"` then `supabase db push --linked` |

---

## Known caveats

- **Supabase CLI on Windows**: standalone binary at `%LOCALAPPDATA%\supabase\supabase.exe`. PATH set as user env var; new terminals see it. Smart App Control sometimes flags it — use absolute path if "term not recognized".
- **Service_role key flagging**: Supabase blocks calls from "browser-like" User-Agents. Use `User-Agent: supabase-cli/2.95.4` if you ever need to fall back to direct admin REST.
- **Auth redirect URL** is the deep link `rpgtasks://auth/callback` (computed via `expo-linking`'s `createURL`). The app handles incoming auth URLs in `lib/auth/deep-link.ts` and exchanges them for a session. **Manual dashboard config required** in Supabase → Auth → URL Configuration: set **Site URL** = `rpgtasks://auth/callback` and add it under **Redirect URLs**. Without this step, email-confirmation links still go to `localhost:3000`. Magic links / OTP / PKCE / fragment-based flows are all handled.
- **Custom schemes need a dev/production build** — Expo Go strips them, so test the email-confirm flow in `eas build --profile development` (or `preview`/`production`), not in Expo Go.
- **Emailed auth links do NOT work on Android — both flows use typed OTP codes.** Supabase answers `/auth/v1/verify` with a `303` into `rpgtasks://…`, and Chrome refuses to follow a *server-initiated* redirect into a custom scheme (no user gesture in the chain) → `ERR_UNKNOWN_URL_SCHEME`, with the token already burned. Password recovery (`app/app/forgot-password.tsx`) and signup confirmation (`app/app/login.tsx`) both collect a code and call `verifyOtp({ email, token, type })`.
  - ⚠️ **DASHBOARD PREREQUISITE, NOT YET APPLIED as of 2026-07-19.** Both the **Reset Password** and **Confirm signup** templates still emit `{{ .ConfirmationURL }}`. Until they are switched to `{{ .Token }}` (Authentication → Emails), the app asks for a code that no email contains. Verify with the Management API before assuming otherwise — an earlier revision of this file claimed it was done when it was not.
  - Code length is **not 6**. `mailer_otp_length` is a project-wide setting, currently **8**, and it governs every email template. The client cannot read it, so `app/lib/auth/otp.ts` accepts a range instead of pinning a value — pinning 6 is exactly what broke #276.
  - `resend()` accepts `'signup' | 'email_change' | 'sms' | 'phone_change'` — **not `'recovery'`**. Recovery re-sends by calling `resetPasswordForEmail` again.
  - Traps if you touch this: `setSession()` emits `SIGNED_IN`, **never** `PASSWORD_RECOVERY`, so a fragment-borne recovery link silently skips `/reset-password`; only `verifyOtp` and PKCE `exchangeCodeForSession` emit it. And GoTrue obfuscates already-registered addresses — `signUp` returns 200 with `data.user.identities === []` and sends nothing.
  - **The app no longer handles inbound auth deep links at all** (`app/lib/auth/deep-link.ts` exports only `AUTH_REDIRECT_URL`). The `#access_token=` and `?token_hash=` branches were session-fixation vectors on the unverified `rpgtasks://` scheme; `?code=` went too, since nothing here sends a `code_challenge`. Restore a PKCE-only handler if the app ever adopts `flowType: 'pkce'` or OAuth.
  - Long-term fix remains Android App Links (https + `assetlinks.json`), which needs a domain and a native rebuild.
- **expo-updates is installed and working** — OTA hot-fixes via `eas update` push JS/TS changes to an existing build without a rebuild. The Settings tab has a "check for updates" button users can tap to pull manually. Native code changes (new packages, native modules, version bumps) still require a fresh `eas build`. **Prefer `eas update` over `eas build`** whenever the change is JS/TS-only — saves ~15 min per change.
- **Two OTA channels, and the wrong one fails silently.** `production` is the Play Store app (profile `production`, live since 2026-07-15); `preview` is the internal APK. `eas update --channel preview` exits 0 even when the app you meant to fix is on `production` — no error, no warning, the update just never arrives. Always name the channel deliberately.
- **Release path**: merging to `main` auto-publishes to `preview` only (`ci.yml` → `publish-ota`) — real users see nothing. Promoting is deliberate: **Actions → Promote to Production → Run workflow** (`promote-production.yml`, requires typing `production` to confirm, and refuses to run if the last commit touched `app.json` / `eas.json` / lockfiles, since OTA cannot ship native changes). Locally the equivalent is `/ota-update`. So: merge → validate on the internal APK → promote.
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
