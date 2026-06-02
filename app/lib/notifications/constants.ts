/**
 * Catalog + config for the Perceva push notification system.
 *
 * Two notifications per day, both conditional:
 *   - Daily Brief — recurring, fires every day at the user's chosen
 *                   hour (default 8:00).
 *   - Checkpoint — one-shot, fires at 12:30 if the user hasn't opened
 *                  the app since midnight.
 *
 * Tone is invitation, never guilt-trip. Celebrations stay in-app.
 */

export const NOTIFICATION_IDS = {
  DAILY_BRIEF: 'perceva-daily-brief',
  CHECKPOINT: 'perceva-checkpoint',
} as const;

export const DAILY_BRIEF_HOUR_DEFAULT = 8;
export const DAILY_BRIEF_MINUTE_DEFAULT = 0;

export const CHECKPOINT_HOUR = 12;
export const CHECKPOINT_MINUTE = 30;

/** AsyncStorage key for "did the user open the app today?". */
export const LAST_OPEN_KEY = '@perceva/last_open_date';
/** AsyncStorage keys for the user's configured Daily Brief time. */
export const BRIEF_HOUR_KEY = '@perceva/brief_hour';
export const BRIEF_MINUTE_KEY = '@perceva/brief_minute';

export type NotificationLocale = 'pt-BR' | 'en-US';

export interface NotificationMessage {
  title: string;
  body: string;
}

export interface MessageCatalog {
  dailyBrief: readonly NotificationMessage[];
  checkpoint: readonly NotificationMessage[];
}

export const MESSAGES_PT: MessageCatalog = {
  dailyBrief: [
    { title: 'Bom dia 👋', body: 'Que tal ver o que tem planejado pra hoje?' },
    { title: 'Perceva', body: 'Suas tasks de hoje estão esperando.' },
    { title: 'Novo dia, nova chance', body: 'Dá uma olhada no que te espera hoje.' },
  ],
  checkpoint: [
    { title: 'Perceva', body: 'Suas tasks te esperam. Dá uma olhada quando puder.' },
    { title: 'Ainda dá tempo', body: 'Você ainda não abriu o app hoje.' },
  ],
};

export const MESSAGES_EN: MessageCatalog = {
  dailyBrief: [
    { title: 'Good morning 👋', body: "What's planned for you today?" },
    { title: 'Perceva', body: "Today's tasks are waiting for you." },
    { title: 'New day, new start', body: 'Take a look at what lies ahead today.' },
  ],
  checkpoint: [
    { title: 'Perceva', body: 'Your tasks are waiting. Check in when you can.' },
    { title: 'Still time left', body: "You haven't opened the app yet today." },
  ],
};

/** Random pick — one per scheduling call, fixed at schedule time. */
export function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}
