import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';
import { create } from 'zustand';

const KEY = 'rpgtasks.onboardingSeen.v1';

type Status = 'unknown' | 'seen' | 'unseen';

interface Store {
  status: Status;
  load: () => Promise<void>;
  markSeen: () => Promise<void>;
  reset: () => Promise<void>;
}

export const useOnboardingStore = create<Store>((set, get) => ({
  status: 'unknown',
  load: async () => {
    if (get().status !== 'unknown') return;
    try {
      const v = await AsyncStorage.getItem(KEY);
      set({ status: v === '1' ? 'seen' : 'unseen' });
    } catch {
      set({ status: 'unseen' });
    }
  },
  markSeen: async () => {
    set({ status: 'seen' });
    try {
      await AsyncStorage.setItem(KEY, '1');
    } catch {
      // best-effort; show again next time on storage failure
    }
  },
  reset: async () => {
    set({ status: 'unseen' });
    try {
      await AsyncStorage.removeItem(KEY);
    } catch {
      // best-effort
    }
  },
}));

/**
 * Hook that triggers a one-time load of the onboarding flag from storage.
 * Returns the current status. Call once near the app root.
 */
export function useLoadOnboarding(): Status {
  const status = useOnboardingStore((s) => s.status);
  const load = useOnboardingStore((s) => s.load);
  useEffect(() => {
    load();
  }, [load]);
  return status;
}
