# Architecture

This document is a living summary. See the full original plan at:
`C:\Users\André Luthold\.claude\plans\wise-jumping-flute.md` (locally).

## High-level

```
[Android device]
   Expo (React Native) app
     ├── UI (RN + Reanimated)
     ├── State: TanStack Query (server) + Zustand (UI)
     ├── Local SQLite (offline cache, future)
     └── supabase-js (HTTPS + WSS)
              │
              ▼
[Supabase cloud]
   Auth (JWT) + Postgres + RLS + Edge Functions + Storage
```

## Stack

| Layer | Tech |
|---|---|
| Mobile | React Native + Expo SDK 54, TypeScript |
| Routing | Expo Router (file-based) |
| State | TanStack Query, Zustand |
| Backend | Supabase (Postgres, Auth, Edge Functions) |
| ORM (future) | Drizzle |
| Tooling | pnpm workspaces, ESLint, Prettier |

## Decisions

- **Online-first for v1.** Optimistic updates via TanStack Query. Offline-first sync queue is a future concern.
- **Edge Functions for sensitive mutations** (XP/coin grants) to prevent client-side cheating. v1 may use SQL triggers as a simpler stand-in.
- **Level is derived** from XP via formula — never stored.
- **Each `task_completion` is immutable** and stores the XP/coins granted at that moment (audit trail).

## Folder layout

```
.
├── app/         # Expo React Native app
├── supabase/    # Migrations + edge functions
├── shared/      # Types shared across app and edge functions
├── design/      # Design handoff (HTML/JSX prototype)
└── docs/        # Architecture, decisions, runbooks
```
