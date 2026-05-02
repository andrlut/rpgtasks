# RPG Tasks

Gamified habit tracker for Android. **V0 shipped and being tested live on device.** Sandbox project intended to grow with the user's brother as a second contributor later (not active yet).

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

## Stack

- **Mobile**: React Native + Expo SDK 54, TypeScript strict, Expo Router (file-based)
- **State**: TanStack Query (server) + Zustand (UI/local)
- **Backend**: Supabase — Postgres 17 + Auth + Edge Functions, project ref `uneqnpyzevosznwkmvvo`
- **Tooling**: pnpm workspaces, GitHub Actions CI, EAS Build for APKs
- **Icons**: `@expo/vector-icons` (Ionicons)
- **Animations**: `react-native-reanimated` v4

---

## Repo layout

```
.
├── app/                # Expo React Native app
│   ├── app/            # Expo Router file-based routes
│   │   ├── (tabs)/     # Home, Character, Rewards, Profile
│   │   ├── skill/[id]  # Skill detail
│   │   ├── login.tsx
│   │   ├── onboarding.tsx
│   │   ├── task-form.tsx
│   │   ├── reward-form.tsx
│   │   └── _layout.tsx (AuthGate + Stack)
│   ├── components/     # Reusable RN components
│   ├── lib/
│   │   ├── api/        # TanStack Query hooks: character, tasks, rewards, skills, streak
│   │   ├── auth/       # useSession hook
│   │   ├── db/         # TS types matching Supabase schema
│   │   ├── supabase/   # Client + URL polyfill + AsyncStorage session persistence
│   │   ├── time.ts
│   │   ├── xp.ts       # Difficulty → XP/coin mapping; level curve
│   │   └── onboarding.ts (Zustand store + AsyncStorage flag)
│   ├── theme/          # tokens.ts (ported from design/tokens.css), dimensions.ts
│   ├── eas.json        # Build profiles: development | preview | production
│   ├── app.json        # name=RPG Tasks, slug=rpgtasks, package=com.andrlut.rpgtasks
│   ├── .env.example    # Template for app/.env.local (gitignored)
│   └── package.json
├── supabase/
│   ├── migrations/     # SQL migrations applied via `supabase db push --linked`
│   ├── README.md
│   └── config.toml     # Local CLI config (Postgres 17 to match cloud)
├── shared/             # Cross-cutting types workspace (@rpgtasks/shared)
├── design/             # Original HTML/JSX prototype — open design/index.html in browser
├── docs/architecture.md
└── .github/workflows/ci.yml  # typecheck + lint on PRs
```

---

## Database schema (5 migrations applied to cloud)

Tables in `public`:

| Table | Notes |
|---|---|
| `profile` | 1:1 with `auth.users`. display_name, avatar_url |
| `character` | 1:1 with profile. total_xp, coins |
| `dimension` | catalog: health, strength, mind, wealth, social, discipline (color, icon) |
| `character_dimension` | per-user XP per dimension (composite PK) |
| `task` | character-owned. title, difficulty 1-5, type one_shot/daily/weekly, is_archived |
| `task_dimension` | M:N task ↔ dimension (a task can grant XP in multiple dims) |
| `task_completion` | **immutable** — guards xp_granted, coins_granted at the moment of completion |
| `reward` | character-owned. title, cost, icon, is_archived |
| `reward_redemption` | **immutable** — cost_paid history |
| `skill` | catalog: pushups, running, meditate, reading (display_name, unit, dimension_id, icon) |
| `skill_tier` | catalog ladder: 5 tiers per skill (beginner / bronze / silver / gold / master + threshold) |
| `skill_log` | per-user PR entries, immutable |

RLS on every table; "self-only" except catalog tables (dimension/skill/skill_tier are public-read for authenticated users).

RPCs:
- `complete_task(p_task_id uuid) → json` — atomic: validates ownership, computes XP/coins from difficulty, writes `task_completion`, bumps `character.total_xp` + `coins`, bumps `character_dimension.xp` for linked dims. Returns granted amounts.
- `redeem_reward(p_reward_id uuid) → json` — atomic balance debit with insufficient-funds error.

Trigger `handle_new_user()` on `auth.users` insert:
- creates profile + character + 6 character_dimension rows
- seeds 6 sample tasks (`seed_sample_tasks`)
- seeds 5 sample rewards (`seed_sample_rewards`)

Both `seed_sample_*` functions are idempotent and were backfilled for existing users when introduced.

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

If new routes don't show up (Unmatched Route screen), restart the dev server with `pnpm dev --clear` to flush Metro cache.

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
| Add a new screen | File under `app/app/`, register in `app/app/_layout.tsx` `<Stack>` |
| Add a new API hook | File under `app/lib/api/<domain>.ts`; mirror existing hook patterns |
| Add a new UI component | File under `app/components/`; use design tokens from `app/theme` |
| Tweak colors / spacing / radii | `app/theme/tokens.ts` (single source of truth — also reflected in `design/tokens.css`) |
| Build an APK | `cd app && eas build --platform android --profile preview --non-interactive --no-wait` |
| Apply migration to cloud | `cd "C:\Users\André Luthold\RPG"` then `supabase db push --linked` |

---

## Known caveats

- **Supabase CLI on Windows**: standalone binary at `%LOCALAPPDATA%\supabase\supabase.exe`. PATH set as user env var; new terminals see it. Smart App Control sometimes flags it — use absolute path if "term not recognized".
- **Service_role key flagging**: Supabase blocks calls from "browser-like" User-Agents. Use `User-Agent: supabase-cli/2.95.4` if you ever need to fall back to direct admin REST.
- **Email confirmation links** redirect to `localhost:3000` by default — bad for mobile. Reconfigure in Supabase dashboard → Auth → URL Configuration when this becomes a real signup flow.
- **expo-updates not yet installed** — OTA hot-fixes via `eas update` require this. Build warned about it; not critical until first deploy.

---

## Recent history (latest first)

1. EAS Build configured + first preview APK building — PR #11, #12
2. Onboarding loop fix (Zustand store) — PR #10
3. Postgres 17 alignment — PR #9
4. Polish: pull-to-refresh, time-aware greeting, dark splash — PR #8
5. Onboarding 3-slide flow — PR #7
6. Skills + tier ladders + PR logging — PR #6
7. Streaks chip on Home — PR #5
8. Rewards CRUD + redeem flow — PR #4
9. Task CRUD — PR #3
10. V0 core loop (home, complete, character) — PR #2
11. Foundations (auth, theme, schema, CI) — PR #1
12. Bootstrap monorepo — initial commit

See `git log --oneline` for the canonical record.
