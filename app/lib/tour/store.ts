import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';
import { create } from 'zustand';

import { TOUR_MODULES, type TourModule, type TourModuleStatus } from './constants';

/**
 * Per-device, per-user post-login tour state. Tracks per-module status
 * and lets the AuthGate decide whether to push the user into M0 right
 * after their first successful login.
 *
 * Persistence is AsyncStorage for now (one key per session) — keeps
 * us off the critical Supabase write path. The shape is JSON-serialisable
 * so a future migration to a `profile.onboarding_modules` JSONB column
 * is just a swap of the persist layer.
 *
 * The key is namespaced by character_id so opening the app with a
 * different account doesn't inherit the previous user's tour progress.
 */

const KEY_PREFIX = 'rpgtasks.tour.v1.';

interface TourEntry {
  status: TourModuleStatus;
  /** Local ISO timestamp the entry was last updated. */
  updatedAt: string;
}

interface TourState {
  /** Which user's data is currently loaded. null = nothing loaded yet. */
  characterId: string | null;
  /** Hydration sentinel. */
  status: 'unknown' | 'ready';
  /** Per-module status map. Missing entry = `pending`. */
  modules: Partial<Record<TourModule, TourEntry>>;
  /**
   * Per-module step index — lives in-memory only (no persistence). It's
   * shared across every `<TourModule>` mount for the same module so two
   * screens (e.g. Home + task-form) can split the steps between them
   * without each one carrying its own counter.
   */
  stepIndices: Partial<Record<TourModule, number>>;
  /** Load (or reload, on character change) from AsyncStorage. */
  hydrate: (characterId: string | null) => Promise<void>;
  /** Set a module's status and persist. */
  setStatus: (module: TourModule, status: TourModuleStatus) => Promise<void>;
  /** Update the in-memory step index for a module. */
  setStepIndex: (module: TourModule, index: number) => void;
  /** Reset every module to pending — used by the "Refazer tour completo"
   *  button in Settings. */
  resetAll: () => Promise<void>;
  /** Replay a single module in isolation: set it to `pending` and every
   *  OTHER module to `completed`, so the sequential "current module" gate
   *  surfaces only this one and nothing else fires before or after it.
   *  Used by the per-module "Refazer" buttons in Settings. */
  replayModule: (module: TourModule) => Promise<void>;
}

function storageKey(characterId: string | null): string {
  return `${KEY_PREFIX}${characterId ?? 'anonymous'}`;
}

async function persistModules(
  characterId: string | null,
  modules: TourState['modules'],
): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey(characterId), JSON.stringify(modules));
  } catch {
    // Best-effort — losing tour state is acceptable, the user can
    // always replay from Settings.
  }
}

export const useTourStore = create<TourState>((set, get) => ({
  characterId: null,
  status: 'unknown',
  modules: {},
  stepIndices: {},

  hydrate: async (characterId) => {
    // If the same user is already loaded, nothing to do.
    if (get().status === 'ready' && get().characterId === characterId) return;

    try {
      const raw = await AsyncStorage.getItem(storageKey(characterId));
      const parsed = raw ? (JSON.parse(raw) as TourState['modules']) : {};
      set({ characterId, status: 'ready', modules: parsed });
    } catch {
      set({ characterId, status: 'ready', modules: {} });
    }
  },

  setStatus: async (module, status) => {
    const next: TourState['modules'] = {
      ...get().modules,
      [module]: { status, updatedAt: new Date().toISOString() },
    };
    set({ modules: next });
    await persistModules(get().characterId, next);
  },

  setStepIndex: (module, index) => {
    set({ stepIndices: { ...get().stepIndices, [module]: index } });
  },

  resetAll: async () => {
    set({ modules: {}, stepIndices: {} });
    await persistModules(get().characterId, {});
  },

  replayModule: async (module) => {
    const now = new Date().toISOString();
    const next: TourState['modules'] = {};
    for (const m of TOUR_MODULES) {
      next[m] = {
        status: m === module ? 'pending' : 'completed',
        updatedAt: now,
      };
    }
    set({ modules: next, stepIndices: {} });
    await persistModules(get().characterId, next);
  },
}));

/**
 * Hook that hydrates the store for the given character (call once with
 * the authenticated user's id, e.g. inside AuthGate) and returns true
 * when the store is ready to read.
 */
export function useTourReady(characterId: string | null | undefined): boolean {
  const normalizedId = characterId ?? null;
  const status = useTourStore((s) => s.status);
  const currentCharacterId = useTourStore((s) => s.characterId);
  const hydrate = useTourStore((s) => s.hydrate);

  // Hydrate (or re-hydrate on account change) for this character.
  useEffect(() => {
    void hydrate(normalizedId);
  }, [normalizedId, hydrate]);

  // Derive readiness straight from the store so it can NEVER report
  // "ready" while the store still holds another character's data.
  //
  // A lagging local `useState` here caused a cold-boot race: during the
  // `null → user.id` transition (session resolving), the hook briefly
  // returned `true` while the store still held the empty "anonymous"
  // modules, so `m0Status` read `pending` and the AuthGate redirected an
  // already-onboarded user into the tour — on every launch. Dev never
  // hit it because Fast Refresh keeps the store hydrated across reloads.
  return status === 'ready' && currentCharacterId === normalizedId;
}

/** Convenience: status for a single module (defaults to `pending`). */
export function useModuleStatus(module: TourModule): TourModuleStatus {
  return useTourStore((s) => s.modules[module]?.status ?? 'pending');
}

/**
 * True only when `module` is the first module in `TOUR_MODULES` order
 * that is still `pending` or `in_progress`. This is the gate every
 * inline `<TourModule>` mount uses to make sure only ONE module's
 * tooltips render at a time — e.g. M2's tooltip won't pop on Home
 * while M1 is mid-flow on the detail screen.
 *
 * M0 / M0_5 are typically completed via dedicated routes before any
 * inline module is reachable, but this selector still works for them
 * if we ever change that.
 */
export function useIsCurrentTourModule(module: TourModule): boolean {
  return useTourStore((s) => {
    for (const m of TOUR_MODULES) {
      const status = s.modules[m]?.status ?? 'pending';
      if (status === 'pending' || status === 'in_progress') {
        return m === module;
      }
    }
    return false;
  });
}

/**
 * Transient "what's on screen right now" descriptor for the active
 * tour step. Set by `<TourModule>` whenever its step changes, cleared
 * to null when the module finishes. Screens consume it to:
 *
 *   - bump bottom scroll padding so the user can scroll content all
 *     the way past the tooltip when it sits at the bottom of the
 *     screen;
 *   - reserve top padding for header-positioned tooltips.
 *
 * Lives in its own zustand store (not persisted) — it's pure runtime
 * UI plumbing, no need to round-trip AsyncStorage.
 */
export interface ActiveTourStep {
  module: TourModule;
  position: 'top' | 'bottom';
}

interface ActiveTourStepState {
  active: ActiveTourStep | null;
  set: (next: ActiveTourStep | null) => void;
}

export const useActiveTourStepStore = create<ActiveTourStepState>((set) => ({
  active: null,
  set: (next) => set({ active: next }),
}));

/** Returns the currently-visible tour step descriptor, or null. */
export function useActiveTourStep(): ActiveTourStep | null {
  return useActiveTourStepStore((s) => s.active);
}
