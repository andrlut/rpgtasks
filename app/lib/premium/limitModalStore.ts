import { create } from 'zustand';

import type { LimitedEntity } from './limits';

interface LimitModalState {
  /** Entity whose free-limit modal is showing, or null when closed. */
  entity: LimitedEntity | null;
  open: (entity: LimitedEntity) => void;
  close: () => void;
}

/**
 * Singleton controller for the "limite atingido" modal. A single
 * `<LimitReachedHost>` (mounted in the root layout) renders it; each create
 * button calls `open(entity)` when the free cap is hit. Mirrors the pattern
 * used by the instrument teaser / confirm hosts.
 */
export const useLimitModalStore = create<LimitModalState>((set) => ({
  entity: null,
  open: (entity) => set({ entity }),
  close: () => set({ entity: null }),
}));
