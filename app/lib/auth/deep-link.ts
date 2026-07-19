import * as Linking from 'expo-linking';
import { useEffect } from 'react';

import { supabase } from '../supabase';
import { useRecoveryStore } from './recovery';

/**
 * Deep link the app uses for Supabase auth callbacks (email confirmation,
 * password reset, magic link). Resolves to `rpgtasks://auth/callback` in
 * production builds. Must match the Site URL + Redirect URLs configured
 * in the Supabase dashboard (Auth → URL Configuration).
 */
export const AUTH_REDIRECT_URL = Linking.createURL('auth/callback');

/**
 * Process an incoming URL that may carry auth credentials. Supports both
 * the legacy fragment-based magic link format and the PKCE query-string
 * format.
 *
 * Examples:
 *   rpgtasks://auth/callback#access_token=...&refresh_token=...&type=signup
 *   rpgtasks://auth/callback?code=...
 *   rpgtasks://auth/callback?token_hash=...&type=email
 */
async function handleAuthUrl(url: string) {
  const parsed = Linking.parse(url);
  // Allow either path === 'auth/callback' (production builds) or anywhere
  // with auth params (Expo Go dev URL doesn't include the path cleanly).
  // `createURL` emits a double slash, so `rpgtasks://auth/callback` parses
  // as hostname='auth' + path='callback' — the path check alone never
  // matches in production builds. Check the host too.
  const looksLikeAuth =
    parsed.path?.includes('auth/callback') ||
    parsed.hostname === 'auth' ||
    url.includes('access_token=') ||
    url.includes('token_hash=') ||
    url.includes('code=');
  if (!looksLikeAuth) return;

  // Fragment params (#access_token=...&refresh_token=...)
  const fragment = url.split('#')[1];
  if (fragment) {
    const fragParams = new URLSearchParams(fragment);
    const accessToken = fragParams.get('access_token');
    const refreshToken = fragParams.get('refresh_token');
    if (accessToken && refreshToken) {
      await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      // setSession only ever emits SIGNED_IN, so a recovery link arriving
      // as a fragment would drop the user on Home with no chance to pick a
      // new password. The intent is in the fragment's own `type`.
      if (fragParams.get('type') === 'recovery') {
        useRecoveryStore.getState().setRecovering(true);
      }
      return;
    }
  }

  const params = parsed.queryParams ?? {};
  const code = typeof params.code === 'string' ? params.code : null;
  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
    return;
  }

  const tokenHash = typeof params.token_hash === 'string' ? params.token_hash : null;
  const type = typeof params.type === 'string' ? params.type : null;
  if (tokenHash && type) {
    // Supabase email-confirm / recovery / invite all use verifyOtp with
    // the token_hash returned by the email link.
    await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      type: type as any,
    });
  }
}

/**
 * Register handlers so any auth URL — whether the app was cold-started by
 * the link or already running — gets exchanged for a session.
 */
export function useAuthDeepLink() {
  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url) handleAuthUrl(url);
    });
    const sub = Linking.addEventListener('url', ({ url }) => handleAuthUrl(url));
    return () => sub.remove();
  }, []);
}
