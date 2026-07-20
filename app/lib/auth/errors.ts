import type { AuthError } from '@supabase/supabase-js';

import type { TranslateOptions } from '../i18n';

/** The translator shape returned by `useT()`. */
type Translate = (key: string, options?: TranslateOptions) => string;

/**
 * Turn a GoTrue error into something a pt-BR user can read.
 *
 * Every auth screen used to pass `error.message` straight into an Alert body
 * under a localized title, so a Brazilian user got "Invalid login credentials"
 * or "For security purposes, you can only request this after 47 seconds".
 *
 * Match on `error.code` first — it is stable. The message text is not: the
 * throttle message embeds a countdown, which is exactly why the old
 * `/rate limit/i` regex in forgot-password never matched it.
 */
/**
 * GoTrue reports an unconfirmed address as a *sign-in* failure, so the login
 * screen has to recognise it to offer a way out. Without this the account is a
 * dead end: signing in fails forever, and signing up again hits GoTrue's
 * already-registered obfuscation, which bounces straight back to login.
 *
 * Same code-first, message-fallback shape as `localizeAuthError` — the code is
 * stable, the message is not.
 */
export function isUnconfirmedEmail(error: AuthError | null): boolean {
  if (!error) return false;

  const code = (error as AuthError & { code?: string }).code ?? '';
  if (code === 'email_not_confirmed') return true;

  return /email not confirmed/i.test(error.message ?? '');
}

export function localizeAuthError(error: AuthError | null, t: Translate): string {
  if (!error) return '';

  const code = (error as AuthError & { code?: string }).code ?? '';

  switch (code) {
    case 'invalid_credentials':
      return t('auth.errors.invalidCredentials');
    case 'email_not_confirmed':
      return t('auth.errors.emailNotConfirmed');
    case 'user_already_exists':
    case 'email_exists':
      return t('auth.errors.emailTaken');
    case 'weak_password':
      return t('auth.errors.weakPasswordBody');
    case 'same_password':
      return t('auth.errors.samePassword');
    case 'otp_expired':
    case 'otp_disabled':
      return t('auth.forgot.codeInvalid');
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
    case 'over_sms_send_rate_limit':
      return t('auth.errors.rateLimited');
    case 'validation_failed':
      return t('auth.errors.invalidEmail');
    default:
      break;
  }

  // Fallbacks for older GoTrue responses that carry no `code`.
  const msg = error.message ?? '';
  if (/only request this after/i.test(msg) || /rate limit/i.test(msg)) {
    return t('auth.errors.rateLimited');
  }
  if (/invalid login credentials/i.test(msg)) {
    return t('auth.errors.invalidCredentials');
  }
  if (/email not confirmed/i.test(msg)) {
    return t('auth.errors.emailNotConfirmed');
  }
  if (/expired|invalid/i.test(msg)) {
    return t('auth.forgot.codeInvalid');
  }

  // Unknown — showing the raw string beats showing nothing, but it means a
  // code we have not mapped yet.
  return msg;
}
