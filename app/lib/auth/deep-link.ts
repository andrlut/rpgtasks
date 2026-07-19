import * as Linking from 'expo-linking';

/**
 * Redirect target handed to GoTrue as `redirect_to` / `emailRedirectTo`.
 * Resolves to `rpgtasks://auth/callback` in production builds and must stay
 * allowlisted in the dashboard (Auth → URL Configuration) — dropping it
 * silently falls back to the project Site URL.
 *
 * Nothing in this app consumes the resulting link. Both signup confirmation
 * and password recovery deliver a code the user types in; the value exists
 * only because GoTrue wants a valid redirect on the request.
 *
 * THE APP NO LONGER HANDLES INBOUND AUTH DEEP LINKS AT ALL. It used to, via
 * three branches, and two of them were session-fixation vectors:
 *
 *   1. `#access_token=…&refresh_token=…` → setSession()
 *   2. `?token_hash=…&type=…`            → verifyOtp()
 *   3. `?code=…`                         → exchangeCodeForSession()
 *
 * `rpgtasks://` is an unverified custom scheme (no `intentFilters`, no
 * `autoVerify` in app.json), so any installed app or tapped web page can
 * invoke it with attacker-chosen values. (1) accepted an attacker's session
 * tokens outright. (2) let an attacker request a magic link for their own
 * account and replay the `token_hash` from their own inbox. Either way the
 * victim is silently signed into the attacker's account and their
 * assessments, tasks and journal entries land there.
 *
 * (3) is PKCE and is safe *when PKCE is actually in use* — the code is
 * redeemed against a `code_verifier` in this app's storage, which an attacker
 * cannot write. But this client sets no `flowType`, so auth-js runs its
 * `'implicit'` default, and auth-js only enforces the verifier's presence
 * under `flowType === 'pkce'`. An attacker-supplied `?code=` would therefore
 * be POSTed with an empty verifier and the outcome would rest on server-side
 * behaviour rather than on anything this app guarantees. Since no code path
 * here ever sends a `code_challenge`, the branch had no legitimate producer
 * either — it was pure attack surface, so it went with the others.
 *
 * If this app ever adopts `flowType: 'pkce'` or an OAuth provider, restore a
 * handler for (3) ONLY, and leave (1) and (2) deleted.
 */
export const AUTH_REDIRECT_URL = Linking.createURL('auth/callback');
