import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';
import { create } from 'zustand';

const KEY = 'rpgtasks.heroSkillsExpand.v1';

interface State {
  /** dim_id -> expanded? Defaults to false (collapsed) when key missing. */
  expanded: Record<string, boolean>;
  hydrated: boolean;
  toggle: (dimId: string) => void;
  hydrate: () => Promise<void>;
}

/**
 * Per-dim collapse state for the Hero tab "Skills" section. Persisted so the
 * user's expand choices survive across sessions; default state is "all
 * collapsed" so a freshly opened tab is short and the user expands what they
 * want to focus on.
 */
export const useHeroSkillsExpand = create<State>((set, get) => ({
  expanded: {},
  hydrated: false,
  toggle: (dimId) => {
    const next = { ...get().expanded, [dimId]: !get().expanded[dimId] };
    set({ expanded: next });
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  },
  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, boolean>;
        set({ expanded: parsed, hydrated: true });
      } else {
        set({ hydrated: true });
      }
    } catch {
      set({ hydrated: true });
    }
  },
}));

/** One-shot hook to hydrate the store on screen mount. */
export function useHydrateHeroSkillsExpand() {
  const hydrate = useHeroSkillsExpand((s) => s.hydrate);
  const hydrated = useHeroSkillsExpand((s) => s.hydrated);
  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrated, hydrate]);
}
