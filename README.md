# RPG Tasks

Gamified habit tracker for Android — turn real-life tasks into XP, coins and character progression.

> Status: 🚧 Phase 0 — bootstrap. Not runnable yet.

## Stack

- **Mobile:** React Native + Expo (TypeScript), Expo Router
- **Backend:** Supabase (Postgres + Auth + Edge Functions)
- **State:** TanStack Query (server) + Zustand (UI)
- **Tooling:** pnpm workspaces, ESLint, Prettier, GitHub Actions

See [docs/architecture.md](docs/architecture.md) (TODO) for the full plan.

## Repository layout

```
.
├── app/         # Expo React Native app
├── supabase/    # Migrations + edge functions
├── shared/      # Types shared across app and edge functions
├── design/      # Design handoff (HTML/JSX prototype)
└── docs/        # Architecture and decisions
```

## Setup (development)

### Prerequisites

- Node.js 20+ (24 works) — install via [Volta](https://volta.sh/) or [fnm](https://github.com/Schniz/fnm)
- pnpm 10+ — `npm i -g pnpm`
- Git, GitHub CLI
- Docker Desktop (for local Supabase) — install from [docker.com](https://www.docker.com/products/docker-desktop)
- **Expo Go** app on your Android device (Play Store)

### First-time install

```bash
pnpm install
cp app/.env.example app/.env.local
# Fill in app/.env.local with Supabase URL + publishable key
```

### Run the app

```bash
pnpm dev
```

Scan the QR code with Expo Go on your Android device.

### Browse the design

Open `design/index.html` in any browser to see the design canvas with all 8 screens.

## Contributing (you and your brother)

- Branch protected: `main`. Open a PR for every change.
- Branch names: `feat/<short>`, `fix/<short>`, `chore/<short>`.
- Commits: [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, `docs:`).
- One review approval required to merge.

## License

Private — all rights reserved (for now).
