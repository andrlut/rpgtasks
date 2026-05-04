import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';
import { create } from 'zustand';

/**
 * Home screen bucket-collapse state. Persisted so the user's preferred
 * layout sticks across launches (e.g. they keep One-time collapsed and
 * Today expanded). Pattern intentionally mirrors lib/onboarding.ts —
 * AsyncStorage-backed, hydrated once near the app root.
 */

const KEY = 'rpgtasks.homeBuckets.collapsed.v2';

export type HomeBucket = 'today' | 'this_week' | 'this_month' | 'one_time';

type Collapsed = Record<HomeBucket, boolean>;

const DEFAULT: Collapsed = {
  today: false,       // expanded — the action surface
  this_week: true,    // collapsed by default — preview, not the focus
  this_month: true,   // collapsed by default — long-horizon
  one_time: true,     // collapsed by default — only matters when the user opts in
};

interface Store {
  collapsed: Collapsed;
  hydrated: boolean;
  load: () => Promise<void>;
  toggle: (b: HomeBucket) => void;
}

export const useHomeBucketsStore = create<Store>((set, get) => ({
  collapsed: DEFAULT,
  hydrated: false,
  load: async () => {
    if (get().hydrated) return;
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Collapsed>;
        set({
          collapsed: {
            today: parsed.today ?? DEFAULT.today,
            this_week: parsed.this_week ?? DEFAULT.this_week,
            this_month: parsed.this_month ?? DEFAULT.this_month,
            one_time: parsed.one_time ?? DEFAULT.one_time,
          },
          hydrated: true,
        });
        return;
      }
    } catch {
      // best-effort; fall through to default below
    }
    set({ hydrated: true });
  },
  toggle: (b) => {
    const next = { ...get().collapsed, [b]: !get().collapsed[b] };
    set({ collapsed: next });
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  },
}));

/** Hook that hydrates collapsed state on first mount. */
export function useLoadHomeBuckets() {
  const load = useHomeBucketsStore((s) => s.load);
  useEffect(() => {
    load();
  }, [load]);
}
