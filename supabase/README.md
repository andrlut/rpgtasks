# Supabase

Database, auth, and edge functions for RPG Tasks.

## Layout

```
supabase/
├── config.toml      # Supabase CLI config (local dev)
├── migrations/      # SQL migrations (versioned, run in order)
├── functions/       # Edge functions (Deno/TS) — added later
└── seed.sql         # Seed data for local dev — added later
```

## Setup (when Docker is installed)

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop) and start it.
2. Install Supabase CLI:
   ```bash
   # Windows (Scoop)
   scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
   scoop install supabase

   # Or via npm (works cross-platform):
   npm i -g supabase
   ```
3. Link to the cloud project (run once):
   ```bash
   supabase link --project-ref uneqnpyzevosznwkmvvo
   ```
4. Start local stack:
   ```bash
   supabase start
   ```
5. Apply migrations:
   ```bash
   supabase db push          # to cloud
   supabase db reset         # to local (drops + replays migrations)
   ```

## Creating a migration

```bash
supabase migration new add_character_table
# edits the generated SQL file under migrations/
supabase db push
```
