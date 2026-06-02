/**
 * Public surface of the Perceva notification system. Callers should
 * import from `@/lib/notifications` — never reach into individual
 * sub-modules. Keeps the implementation refactor-safe.
 */

export {
  hasNotificationPermission,
  requestNotificationPermissions,
} from './permissions';
export { hasOpenedToday, registerAppOpen } from './session';
export {
  cancelAllNotifications,
  cancelCheckpoint,
  configureNotificationHandler,
  getBriefTime,
  scheduleCheckpointIfNeeded,
  scheduleDailyBrief,
  setBriefTime,
} from './scheduler';
export {
  DAILY_BRIEF_HOUR_DEFAULT,
  DAILY_BRIEF_MINUTE_DEFAULT,
  NOTIFICATION_IDS,
  type NotificationLocale,
} from './constants';

import { hasOpenedToday, registerAppOpen } from './session';
import {
  cancelAllNotifications,
  cancelCheckpoint,
  getBriefTime,
  scheduleCheckpointIfNeeded,
  scheduleDailyBrief,
} from './scheduler';
import type { NotificationLocale } from './constants';

/**
 * Convenience: run the full setup the app needs after permissions
 * are granted. Re-runs are idempotent (safe to call from boot AND
 * when the user toggles the Settings master switch back on).
 *
 *   1. Schedule the recurring Daily Brief at the user's saved time
 *      (defaults 08:00) — cancels any previous one first.
 *   2. If the user hasn't already opened the app today, schedule
 *      the 12:30 checkpoint.
 *   3. Stamp today's open and cancel any leftover checkpoint —
 *      the user IS inside the app right now, no need to nag them
 *      at 12:30.
 */
export async function setupNotifications(
  locale: NotificationLocale,
): Promise<void> {
  const { hour, minute } = await getBriefTime();
  await scheduleDailyBrief(hour, minute, locale);

  const openedToday = await hasOpenedToday();
  if (!openedToday) {
    await scheduleCheckpointIfNeeded(locale);
  }
  await registerAppOpen();
  await cancelCheckpoint();
}

/** Toggle handler for the Settings master switch. */
export async function setNotificationsEnabled(
  enabled: boolean,
  locale: NotificationLocale,
): Promise<void> {
  if (!enabled) {
    await cancelAllNotifications();
    return;
  }
  await setupNotifications(locale);
}
