import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

import {
  BRIEF_HOUR_KEY,
  BRIEF_MINUTE_KEY,
  CHECKPOINT_HOUR,
  CHECKPOINT_MINUTE,
  DAILY_BRIEF_HOUR_DEFAULT,
  DAILY_BRIEF_MINUTE_DEFAULT,
  MESSAGES_EN,
  MESSAGES_PT,
  NOTIFICATION_IDS,
  type NotificationLocale,
  pickRandom,
} from './constants';

/**
 * Install the global notification handler. Call ONCE at app boot
 * (before any scheduling) — controls how foreground notifications
 * render. Sound + badge are off by default; the alert is shown so
 * the user still gets feedback when the app is in the background.
 */
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

function getMessages(locale: NotificationLocale) {
  return locale === 'en-US' ? MESSAGES_EN : MESSAGES_PT;
}

/**
 * Cancel a scheduled notification by our custom `data.id` tag. Expo
 * gives each scheduled notification a randomly-generated identifier;
 * we tag ours in `content.data.id` so we can find them later without
 * juggling those random ids.
 */
async function cancelById(id: string): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if ((n.content.data as { id?: string } | null)?.id === id) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
}

/**
 * Daily Brief — recurring trigger at hour:minute every day. Cancels
 * any previous Daily Brief first so it's idempotent (safe to call on
 * every app boot and on Settings save).
 */
export async function scheduleDailyBrief(
  hour: number = DAILY_BRIEF_HOUR_DEFAULT,
  minute: number = DAILY_BRIEF_MINUTE_DEFAULT,
  locale: NotificationLocale = 'pt-BR',
): Promise<void> {
  await cancelById(NOTIFICATION_IDS.DAILY_BRIEF);

  const msg = pickRandom(getMessages(locale).dailyBrief);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: msg.title,
      body: msg.body,
      data: { id: NOTIFICATION_IDS.DAILY_BRIEF },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

/**
 * Checkpoint — the 12:30 "haven't seen you today?" nudge. Armed for the
 * NEXT day's 12:30 and re-armed on every app open (cancel-and-reschedule).
 *
 * Why tomorrow and not today: setup + every foreground run *because* the
 * user just opened the app, so today is already "covered". A checkpoint
 * for today would either be cancelled immediately (the old bug) or fire
 * despite the user having shown up. Arming tomorrow gives the correct
 * "no open today" semantics: if the user opens again before tomorrow
 * 12:30, that open pushes it to the day after; if they DON'T open
 * tomorrow, it fires at 12:30.
 */
export async function scheduleCheckpoint(
  locale: NotificationLocale = 'pt-BR',
): Promise<void> {
  await cancelById(NOTIFICATION_IDS.CHECKPOINT);

  const trigger = new Date();
  trigger.setDate(trigger.getDate() + 1);
  trigger.setHours(CHECKPOINT_HOUR, CHECKPOINT_MINUTE, 0, 0);

  const msg = pickRandom(getMessages(locale).checkpoint);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: msg.title,
      body: msg.body,
      data: { id: NOTIFICATION_IDS.CHECKPOINT },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: trigger,
    },
  });
}

/** Drop the pending checkpoint. Called when the user opens the app —
 *  no point reminding them to open something they're already inside. */
export async function cancelCheckpoint(): Promise<void> {
  await cancelById(NOTIFICATION_IDS.CHECKPOINT);
}

/** Nuke every Perceva notification (and any other scheduled ones for
 *  this app). Used when the user toggles notifications OFF in Settings. */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/** Read the user's saved Daily Brief time from AsyncStorage. Returns
 *  defaults when unset — so first-time users still get an 8:00 brief. */
export async function getBriefTime(): Promise<{ hour: number; minute: number }> {
  const [h, m] = await Promise.all([
    AsyncStorage.getItem(BRIEF_HOUR_KEY),
    AsyncStorage.getItem(BRIEF_MINUTE_KEY),
  ]);
  return {
    hour: h !== null ? Number(h) : DAILY_BRIEF_HOUR_DEFAULT,
    minute: m !== null ? Number(m) : DAILY_BRIEF_MINUTE_DEFAULT,
  };
}

/** Persist the Daily Brief time. Settings UI calls this then immediately
 *  re-schedules so the new time takes effect without a reboot. */
export async function setBriefTime(hour: number, minute: number): Promise<void> {
  await AsyncStorage.multiSet([
    [BRIEF_HOUR_KEY, String(hour)],
    [BRIEF_MINUTE_KEY, String(minute)],
  ]);
}
