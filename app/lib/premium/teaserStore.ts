import { create } from 'zustand';

interface TeaserState {
  /** Instrument id whose teaser is showing, or null when closed. */
  instrumentId: string | null;
  open: (instrumentId: string) => void;
  close: () => void;
}

/**
 * Singleton controller for the locked-instrument teaser sheet. A single
 * `<InstrumentTeaserHost>` (mounted once in the root layout) renders the
 * sheet; any locked instrument card calls `open(id)` on tap. This keeps
 * per-card code to a single branch and avoids mounting six modals — mirrors
 * the pattern used by the tour's `useActiveTourStepStore`.
 */
export const useInstrumentTeaserStore = create<TeaserState>((set) => ({
  instrumentId: null,
  open: (instrumentId) => set({ instrumentId }),
  close: () => set({ instrumentId: null }),
}));
