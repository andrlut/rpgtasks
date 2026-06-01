import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

/**
 * Request OS-level notification permission. No-op on simulators
 * (Device.isDevice is false there — Expo refuses to register).
 * Android 13+ requires an explicit POST_NOTIFICATIONS prompt; older
 * Android grants implicitly on install.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/** Cheap read-only check — useful before deciding whether to render
 *  a "permission denied" hint in Settings. */
export async function hasNotificationPermission(): Promise<boolean> {
  if (!Device.isDevice) return false;
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}
