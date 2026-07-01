import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus, Platform } from 'react-native';

import { useT } from '@/lib/i18n';
import { useLoadedSettings, useSettingsStore } from '@/lib/settings';

import type { NotificationLocale } from './constants';
import {
  configureNotificationHandler,
  registerAppOpen,
  scheduleCheckpoint,
  setupNotifications,
  cancelAllNotifications,
} from './index';
import { requestNotificationPermissions } from './permissions';

/**
 * `expo-notifications` has no web shim — calling any schedule/cancel
 * helper crashes the JS bundle with a "method not available on web"
 * error. We're a mobile-first app; the web target exists only for
 * local Metro debugging, where notifications are out of scope anyway.
 * Short-circuit the whole hook there.
 */
const NOTIFICATIONS_SUPPORTED = Platform.OS !== 'web';

/**
 * Boots the Perceva notification system.
 *
 *   1. Installs the global handler exactly once per app lifetime.
 *   2. When the user's notification master-switch is ON (in settings),
 *      requests OS permission, runs `setupNotifications` for the
 *      current locale, and registers today's open. When it flips OFF,
 *      cancels everything pending.
 *   3. Watches AppState — every time the app comes back to foreground,
 *      re-stamps today's open and re-arms tomorrow's 12:30 checkpoint
 *      (pushing the "no open today" nudge one more day ahead).
 *
 * Call from RootLayout so it lives for the app's lifetime. No-op when
 * settings are still hydrating.
 */
export function useNotificationsSetup() {
  const { locale } = useT();
  const settings = useLoadedSettings();
  const settingsStatus = useSettingsStore((s) => s.status);
  const handlerInstalled = useRef(false);

  // Map our app locale ('pt'/'en') to the OS-friendly variants the
  // notification module expects.
  const osLocale: NotificationLocale = locale === 'en' ? 'en-US' : 'pt-BR';

  // ── 1. Install the foreground handler once ─────────────────────────
  useEffect(() => {
    if (!NOTIFICATIONS_SUPPORTED) return;
    if (handlerInstalled.current) return;
    configureNotificationHandler();
    handlerInstalled.current = true;
  }, []);

  // ── 2. React to the master-switch and locale ───────────────────────
  useEffect(() => {
    if (!NOTIFICATIONS_SUPPORTED) return;
    if (settingsStatus !== 'ready') return;
    let cancelled = false;

    (async () => {
      if (!settings.notificationsEnabled) {
        await cancelAllNotifications();
        return;
      }
      const granted = await requestNotificationPermissions();
      if (cancelled || !granted) return;
      await setupNotifications(osLocale);
    })();

    return () => {
      cancelled = true;
    };
  }, [settingsStatus, settings.notificationsEnabled, osLocale]);

  // ── 3. AppState — foreground = register open + re-arm checkpoint ───
  useEffect(() => {
    if (!NOTIFICATIONS_SUPPORTED) return;
    const onChange = async (state: AppStateStatus) => {
      if (state !== 'active') return;
      await registerAppOpen();
      await scheduleCheckpoint(osLocale);
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [osLocale]);
}
