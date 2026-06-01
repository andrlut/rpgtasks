import AsyncStorage from '@react-native-async-storage/async-storage';

import { LAST_OPEN_KEY } from './constants';

/** Local YYYY-MM-DD — Note: uses ISO (UTC) for portability across timezones
 *  on the device. Acceptable for day-boundary deduping. */
function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Stamp "the user opened the app today". Idempotent within a day. */
export async function registerAppOpen(): Promise<void> {
  await AsyncStorage.setItem(LAST_OPEN_KEY, todayString());
}

/** True when registerAppOpen ran at least once since 00:00 local. */
export async function hasOpenedToday(): Promise<boolean> {
  const stored = await AsyncStorage.getItem(LAST_OPEN_KEY);
  return stored === todayString();
}
