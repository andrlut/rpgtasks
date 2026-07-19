/**
 * Shared shape of the emailed one-time codes used by signup confirmation
 * and password recovery.
 *
 * Both flows type a code into the app rather than following an emailed link.
 * Links are dead on Android: GoTrue answers /auth/v1/verify with a 303 into
 * `rpgtasks://`, and Chrome refuses to follow a server-initiated redirect
 * into a custom scheme, burning the token on the way.
 */

/**
 * `mailer_otp_length` is a project-wide Supabase setting — 8 at time of
 * writing, and it governs every email template, not just one. Accept the
 * whole plausible range rather than pinning a single value: the client
 * cannot read the setting, so hardcoding one length means a silent
 * "invalid code" for correctly-typed codes the next time it changes.
 */
export const CODE_MIN_LENGTH = 6;
export const CODE_MAX_LENGTH = 10;

/**
 * Mirrors the server's `smtp_max_frequency` (60s) so the UI never invites a
 * tap the server will reject. Matters more than it looks: the project has no
 * custom SMTP, so the built-in mailer caps the whole project at a couple of
 * emails per hour, shared across recovery AND signup confirmation.
 */
export const RESEND_COOLDOWN_SECONDS = 60;

/** Strip anything a numeric code cannot contain. */
export function sanitizeCode(value: string): string {
  return value.replace(/[^0-9]/g, '');
}
