// ============================================================================
// delete-account — permanently delete the *requester's own* account.
//
// Apple 5.1.1(v) + Google Play data-deletion policy require an in-app,
// self-service account deletion. This function:
//   1. Authenticates the caller from their JWT (never trusts a body-supplied
//      uid — the uid is extracted from the verified token only).
//   2. Uses a service_role client to delete the auth user, which CASCADES the
//      entire personal data tree (profile → character → tasks/rewards/skills/
//      quests/psych/learning/etc.). See docs/publish/delete-account.md
//      (CASCADE AUDIT): zero orphan tables.
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

// Permissive CORS — the app calls this from a native fetch context.
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
  // ── CORS preflight ────────────────────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only POST mutates. Reject anything else early.
  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  try {
    // ── 1. Extract + verify the caller's JWT ─────────────────────────────────
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

    // ── 2. Service-role client for the privileged delete ─────────────────────
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // ── 2a. (Optional, defensive) explicit personal-tree delete ──────────────
    // Deleting the auth user (2b) already CASCADES the whole personal tree via
    // profile → character → * (see the cascade audit — zero orphans today).
    // This explicit profile delete is NOT strictly required. It's kept as a
    // cheap, idempotent belt-and-suspenders: it removes the personal tree
    // first, so if a future table is ever added with a broken/missing cascade,
    // deletion still degrades safely instead of silently orphaning PII. If it
    // errors we do NOT abort — the authoritative deleteUser below is what
    // matters.
    const { error: profileError } = await adminClient
      .from('profile')
      .delete()
      .eq('id', uid);
    if (profileError) {
      // Log only; the cascade from deleteUser is the source of truth.
      console.error('profile pre-delete (non-fatal):', profileError.message);
    }

    // ── 2b. Authoritative delete: remove the auth user ───────────────────────
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

    // ── 3. Success ───────────────────────────────────────────────────────────
    return json({ ok: true }, 200);
  } catch (err) {
    console.error('unexpected error:', err);
    return json({ error: 'internal_error' }, 500);
  }
});
