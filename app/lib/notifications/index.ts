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
  scheduleCheckpoint,
  scheduleDailyBrief,
  scheduleNightlyCheckin,
  setBriefTime,
} from './scheduler';
export {
  DAILY_BRIEF_HOUR_DEFAULT,
  DAILY_BRIEF_MINUTE_DEFAULT,
  NOTIFICATION_IDS,
  type NotificationLocale,
} from './constants';

import { registerAppOpen } from './session';
import {
  cancelAllNotifications,
  getBriefTime,
  scheduleCheckpoint,
  scheduleDailyBrief,
  scheduleNightlyCheckin,
} from './scheduler';
import type { NotificationLocale } from './constants';

/** Per-type notification toggles from Settings (the master switch is
 *  handled separately). Each maps to a real scheduled notification. */
export interface NotificationToggles {
  /** Morning Daily Brief (08:00) + the 12:30 "come back" checkpoint. */
  dailyReminder: boolean;
  /** Evening mood check-in (21:00), deep-links to /mood-checkin. */
  moodCheckin: boolean;
}

/**
 * Run the setup the app needs after permissions are granted. Re-runs are
 * idempotent — it clears everything first, then schedules only the
 * notifications whose Settings toggle is on. Safe to call on boot and on
 * every Settings change.
 *
 *   - `dailyReminder` on → Daily Brief (saved time, default 08:00) + the
 *     12:30 checkpoint armed for tomorrow (see scheduleCheckpoint).
 *   - `moodCheckin` on → the 21:00 nightly mood check-in.
 *   - Today's open is always stamped so the checkpoint has correct semantics.
 */
export async function setupNotifications(
  locale: NotificationLocale,
  toggles: NotificationToggles,
): Promise<void> {
  // Clean slate so flipping a sub-toggle OFF actually removes its notification.
  await cancelAllNotifications();

  if (toggles.dailyReminder) {
    const { hour, minute } = await getBriefTime();
    await scheduleDailyBrief(hour, minute, locale);
    await scheduleCheckpoint(locale);
  }
  if (toggles.moodCheckin) {
    await scheduleNightlyCheckin(locale);
  }

  await registerAppOpen();
}

/** Toggle handler for the Settings master switch. */
export async function setNotificationsEnabled(
  enabled: boolean,
  locale: NotificationLocale,
  toggles: NotificationToggles,
): Promise<void> {
  if (!enabled) {
    await cancelAllNotifications();
    return;
  }
  await setupNotifications(locale, toggles);
}
