# Delete Account — auditoria, Edge Function e wiring

> A Edge Function já está escrita em `supabase/functions/delete-account/`.
> O **client wiring** (item CLIENT DIFF) NÃO foi aplicado ainda — ele entra
> no dia da execução, DEPOIS de `supabase functions deploy` (senão o botão
> chamaria um endpoint inexistente). Ver README desta pasta.

## Auditoria de cascade (por que 1 deleteUser basta)
Backbone (all cascade): `auth.users.id` → `profile.id` (ON DELETE CASCADE) → `character.id` (ON DELETE CASCADE) → every personal table via `character_id ... ON DELETE CASCADE`. Deleting the row in `auth.users` therefore cascades the entire personal tree. Below, "→char→prof→user" means the standard `character_id → character → profile → auth.users` chain, all cascade.

| Table | FK chain to auth.users | Cascades? | Action |
|---|---|---|---|
| `profile` | `profile.id → auth.users(id)` CASCADE | YES | none (cascades from deleteUser) |
| `character` | `character.id → profile.id` CASCADE | YES | none |
| `character_dimension` | `character_id → character` CASCADE | YES | none |
| `character_sub` | `character_id → character` CASCADE | YES | none |
| `character_sub_score` | `character_id → character` CASCADE | YES | none |
| `assessment_log` | `character_id → character` CASCADE (its `session_id → psych_session` is SET NULL, irrelevant — row still dies via character_id) | YES | none |
| `task` | `character_id → character` CASCADE | YES | none |
| `task_dimension` | `task_id → task` CASCADE (legacy) | YES | none |
| `task_sub` | `task_id → task` CASCADE | YES | none |
| `task_completion` | `character_id → character` CASCADE (also `task_id → task` CASCADE) | YES | none |
| `task_completion_sub` | `completion_id → task_completion` CASCADE | YES | none |
| `task_skip` | `character_id → character` CASCADE (also `task_id → task` CASCADE) | YES | none |
| `reward` | `character_id → character` CASCADE | YES | none |
| `reward_redemption` | `character_id → character` CASCADE (also `reward_id → reward` CASCADE) | YES | none |
| `reward_tracking` | `character_id → character` CASCADE (PK) | YES | none |
| `skill` (custom rows, `character_id=uuid`) | `character_id → character` CASCADE | YES | none |
| `skill_tier` (of custom skills) | `skill_id → skill` CASCADE | YES | none |
| `skill_log` | `character_id → character` CASCADE (also `skill_id → skill` CASCADE) | YES | none |
| `quest` | `character_id → character` CASCADE | YES | none |
| `quest_requirement` | `quest_id → quest` CASCADE | YES | none |
| `quest_challenge_log` | `character_id → character` CASCADE (also `quest_id → quest` CASCADE) | YES | none |
| `psych_session` | `character_id → character` CASCADE | YES | none |
| `psych_session_item` | `session_id → psych_session` CASCADE | YES | none |
| `psych_answer` | `session_id → psych_session` CASCADE | YES | none |
| `psych_score` | `session_id → psych_session` CASCADE | YES | none |
| `questionnaire_session` (legacy) | `character_id → character` CASCADE | YES | none |
| `questionnaire_answer` (legacy) | `session_id → questionnaire_session` CASCADE | YES | none |
| `learning_view` | `character_id → character` CASCADE (also `material_id → learning_material` CASCADE) | YES | none |
| `learning_material_feedback` | `character_id → character` CASCADE (also `material_id` CASCADE) | YES | none |

Catalog / system tables (no user PII, must NOT be touched): `dimension`, `dimension_sub`, `skill`(catalog rows, `character_id=null`), `skill_tier`(catalog), `task_template`, `task_template_sub`, `reward_template`, `quest_template`, `psych_instrument`, `psych_facet`, `psych_item`, `learning_material`, `learning_material_sub`, `learning_material_revision`, `material_type_template`, `material_topic_seed`.

**Verdict: ZERO orphan gaps.** Every table that stores personal data reaches `auth.users` through an unbroken ON DELETE CASCADE chain rooted at `profile.id` / `character.id`. A single `auth.admin.deleteUser(uid)` is sufficient and complete — no table is left dangling, and no schema migration is required.

Two non-issues worth noting explicitly (both correct, no action):
- `assessment_log.session_id → psych_session(id)` is ON DELETE SET NULL, but the row is still destroyed by its own `character_id` cascade. The delete order (psych_session dies first, nulling the column, then character cascade removes the log row) is handled internally by Postgres.
- Catalog-owned custom skills: a user's custom `skill` row has `character_id=uuid` and cascades; catalog rows have `character_id=null` and are untouched. Correct by construction.

Because the cascade is airtight, the Edge Function below relies on `deleteUser` alone. It includes an **optional** explicit `delete from profile` as a defensive belt-and-suspenders step (harmless, idempotent, and future-proofs against anyone later adding a personal table that forgets the cascade) — clearly commented as not strictly necessary today.

## Edge Function (já criada nesta branch)
File: `supabase/functions/delete-account/index.ts`

```ts
// ============================================================================
// delete-account — permanently delete the *requester's own* account.
//
// Apple 5.1.1(v) + Google Play data-deletion policy require an in-app,
// self-service account deletion. This function:
//   1. Authenticates the caller from their JWT (never trusts a body-supplied
//      uid — the uid is extracted from the verified token only).
//   2. Uses a service_role client to delete the auth user, which CASCADES the
//      entire personal data tree (profile → character → tasks/rewards/skills/
//      quests/psych/learning/etc.). See CASCADE_AUDIT: zero orphan tables.
//
// Security notes:
//   - SUPABASE_SERVICE_ROLE_KEY lives only in this server-side function's
//     secrets, never in the client. This is the one place service_role is safe.
//   - We verify the token with the anon key + the caller's Authorization header
//     (getUser validates the JWT signature and expiry server-side).
//   - CORS is permissive on the response but auth is enforced: no valid JWT,
//     no deletion.
// ============================================================================

import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Permissive CORS — the app calls this from a native WebView/fetch context.
// Auth is enforced via the JWT, not via origin, so `*` is acceptable here.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  // ── CORS preflight ──────────────────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only POST mutates. Reject anything else early.
  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  try {
    // ── 1. Extract + verify the caller's JWT ───────────────────────────────
    // The Authorization header carries the user's access token. We create a
    // client bound to that header and ask Supabase Auth who it belongs to.
    // getUser() validates the signature/expiry, so a forged or stale token
    // yields no user and we bail. The uid comes ONLY from this verified token.
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.toLowerCase().startsWith('bearer ')) {
      return json({ error: 'missing_authorization' }, 401);
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return json({ error: 'invalid_token' }, 401);
    }

    const uid = user.id; // trusted: derived from the verified JWT only

    // ── 2. Service-role client for the privileged delete ───────────────────
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // ── 2a. (Optional, defensive) explicit personal-tree delete ────────────
    // Deleting the auth user (2b) already CASCADES the whole personal tree via
    // profile → character → * (see CASCADE_AUDIT — zero orphans today). This
    // explicit profile delete is NOT strictly required. It's kept as a cheap,
    // idempotent belt-and-suspenders: it removes the personal tree first, so
    // if a future table is ever added with a broken/missing cascade, deletion
    // still degrades safely instead of silently orphaning PII. If it errors we
    // do NOT abort — the authoritative deleteUser below is what matters.
    const { error: profileError } = await adminClient
      .from('profile')
      .delete()
      .eq('id', uid);
    if (profileError) {
      // Log only; the cascade from deleteUser is the source of truth.
      console.error('profile pre-delete (non-fatal):', profileError.message);
    }

    // ── 2b. Authoritative delete: remove the auth user ─────────────────────
    // This is the operation that guarantees the account is gone and cascades
    // profile/character/all personal rows. shouldSoftDelete=false → hard delete.
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(
      uid,
      false,
    );

    if (deleteError) {
      console.error('deleteUser failed:', deleteError.message);
      return json({ error: 'delete_failed', detail: deleteError.message }, 500);
    }

    // ── 3. Success ─────────────────────────────────────────────────────────
    return json({ ok: true }, 200);
  } catch (err) {
    console.error('unexpected error:', err);
    return json({ error: 'internal_error' }, 500);
  }
});
```

File: `supabase/functions/delete-account/deno.json`

```json
{
  "imports": {
    "@supabase/supabase-js": "jsr:@supabase/supabase-js@2"
  }
}
```

Notes:
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are the three env vars available inside a deployed Supabase Edge Function. The first two are injected automatically by the platform; only `SUPABASE_SERVICE_ROLE_KEY` must be set as a secret (see DEPLOY_STEPS). Nothing is hardcoded.
- `verify_jwt` is left at its default (on). The function still re-verifies via `getUser()` to obtain the uid — the gateway JWT check and the in-function check are complementary. No config change needed.
- No schema migration. This is function-only; it satisfies the "ZERO migration for the publish track" constraint and does not collide with the parallel V3 chat (which owns `supabase/functions/` for the Learn pipeline — this adds a *new sibling* directory `delete-account/`, no shared files touched).

## Client wiring — APLICAR no dia (depois do deploy)
Three surgical edits to files owned here for the diff (`profile.tsx`, `pt.ts`, `en.ts`). All self-contained; no new imports needed (`supabase`, `confirmAction`, `showInfo`, `useRouter`, `t` are already imported in `profile.tsx`).

**1) `app/app/(tabs)/profile.tsx` — replace `handleDeleteAccount` (currently lines 62–77).**

BEFORE:
```tsx
  const handleDeleteAccount = async () => {
    const ok = await confirmAction(
      t('profile.actions.confirmDelete'),
      t('profile.actions.confirmDeleteBody'),
      {
        okText: t('common.delete'),
        cancelText: t('common.cancel'),
        destructive: true,
      },
    );
    if (!ok) return;
    showInfo(
      t('profile.actions.deleteNotYet'),
      t('profile.actions.deleteNotYetBody'),
    );
  };
```

AFTER:
```tsx
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (isDeleting) return;
    const ok = await confirmAction(
      t('profile.actions.confirmDelete'),
      t('profile.actions.confirmDeleteBody'),
      {
        okText: t('common.delete'),
        cancelText: t('common.cancel'),
        destructive: true,
      },
    );
    if (!ok) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase.functions.invoke('delete-account', {
        method: 'POST',
      });
      if (error) throw error;

      // Account (and its whole data tree) is gone server-side. Drop the local
      // session and send the user to login. signOut may 401 now that the user
      // no longer exists — that's expected, so we ignore its result.
      await supabase.auth.signOut().catch(() => {});
      router.replace('/login');
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('profile.actions.deleteFailedBody');
      showInfo(t('profile.actions.deleteFailed'), msg);
    } finally {
      setIsDeleting(false);
    }
  };
```

Note: `isDeleting` state can also be threaded into the Delete `ButtonRow` (line 142–147) as `disabled={isDeleting} spinning={isDeleting}` using the existing `ButtonRow` props, mirroring the update-check button — optional polish, not required for correctness. `useState` and `useRouter` are already imported.

**2) `app/lib/i18n/locales/pt.ts` — replace the two `deleteNotYet*` keys (lines 1363–1364).**

BEFORE:
```ts
      deleteNotYet: 'Ainda não disponível',
      deleteNotYetBody: 'A exclusão de conta está conectada ao servidor mas o endpoint admin ainda não está ativo. Por enquanto, saia da conta e entre em contato se precisar remover.',
```

AFTER:
```ts
      deleteFailed: 'Não deu pra excluir',
      deleteFailedBody: 'Algo deu errado ao excluir sua conta. Verifique sua conexão e tente de novo.',
```

**3) `app/lib/i18n/locales/en.ts` — replace the two `deleteNotYet*` keys (lines 1366–1367).**

BEFORE:
```ts
      deleteNotYet: 'Not yet available',
      deleteNotYetBody: 'Account deletion is wired to the server but the admin endpoint is not active yet. For now, sign out and contact us if you need the account removed.',
```

AFTER:
```ts
      deleteFailed: "Couldn't delete account",
      deleteFailedBody: 'Something went wrong deleting your account. Check your connection and try again.',
```

Key rename: `deleteNotYet`/`deleteNotYetBody` are removed and replaced by `deleteFailed`/`deleteFailedBody`. After this diff, grep the app for `deleteNotYet` — the only consumer is `handleDeleteAccount`, which the diff above updates in the same change, so there are no dangling references. `confirmDelete`/`confirmDeleteBody` are reused unchanged (their existing copy already says "permanently delete... cannot be undone", which is accurate now).

## Deploy da Edge Function
Run from repo root `C:\Users\André Luthold\Projetos\RPG` (Supabase CLI is token-authed via `SUPABASE_ACCESS_TOKEN`).

1. Set the service_role secret (server-side only — safe here; user supplies the fresh key, since the old one was flagged/exposed and must not be reused):
```
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<fresh_service_role_key> --project-ref uneqnpyzevosznwkmvvo
```

2. Deploy the function:
```
supabase functions deploy delete-account --project-ref uneqnpyzevosznwkmvvo
```
(`SUPABASE_URL` and `SUPABASE_ANON_KEY` are injected automatically by the platform — do NOT set them as secrets. Only the service_role key needs step 1. Leave `--no-verify-jwt` OFF: the function requires a valid JWT.)

3. Verify secrets are present (should list `SUPABASE_SERVICE_ROLE_KEY`):
```
supabase secrets list --project-ref uneqnpyzevosznwkmvvo
```

4. Smoke test with a real user JWT (grab an access token from a logged-in session; a disposable test account is ideal since this is destructive):
```
curl -i -X POST "https://uneqnpyzevosznwkmvvo.supabase.co/functions/v1/delete-account" ^
  -H "Authorization: Bearer <user_access_token>" ^
  -H "apikey: <publishable_key>"
```
Expect `200 {"ok":true}`. Re-running with the same token should return `401 invalid_token` (user no longer exists). In Supabase Studio, confirm the user is gone from Auth and that their `profile`/`character` rows (and cascaded children) are removed.

Notes / coordination:
- No schema migration, no shared-file collision. The function lives in a brand-new `supabase/functions/delete-account/` directory (the parallel V3 chat owns other subdirs under `supabase/functions/` for the Learn pipeline — no overlap).
- The three client-side edits (`profile.tsx`, `pt.ts`, `en.ts`) are JS/TS-only. They can ship to the live APK via `eas update --channel preview` (OTA) once the function is deployed — no native rebuild required. Deploy the Edge Function FIRST, then push the client change, so the button never calls a missing endpoint.

Relevant files (absolute):
- `C:\Users\André Luthold\Projetos\RPG\supabase\functions\delete-account\index.ts` (to create — full source above)
- `C:\Users\André Luthold\Projetos\RPG\supabase\functions\delete-account\deno.json` (to create)
- `C:\Users\André Luthold\Projetos\RPG\app\app\(tabs)\profile.tsx` (edit `handleDeleteAccount`, lines 62–77)
- `C:\Users\André Luthold\Projetos\RPG\app\lib\i18n\locales\pt.ts` (lines 1363–1364)
- `C:\Users\André Luthold\Projetos\RPG\app\lib\i18n\locales\en.ts` (lines 1366–1367)
