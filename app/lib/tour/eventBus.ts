import { create } from 'zustand';

/**
 * Simple counter-based event bus for the post-login product tour.
 *
 * Use case: a tour step says "tap a task to continue" — the underlying
 * screen (Home) calls `emitTourEvent('task:tapped')` from its onPress
 * handler. The active `TourModule` is subscribed via `useTourEvent` and
 * advances when the count changes from what it was when the step
 * mounted.
 *
 * Why a counter and not a boolean: the same event can fire many times
 * across a session. A counter lets `TourModule` capture "the value at
 * step mount" and detect any subsequent increment without having to
 * reset/clear the bus between steps. Cleaner than wiring per-step
 * resets and works correctly if the user fires the gesture twice.
 *
 * Event names are kebab-namespaced for readability: `task:tapped`,
 * `task:long-pressed`, `task:completed`, `drawer:expanded`. There's no
 * enum — keep this loose so each module can declare its own without
 * touching the bus implementation.
 */

interface TourEventBusState {
  /** Map from event name → monotonically-increasing count. */
  counts: Record<string, number>;
  emit: (event: string) => void;
}

export const useTourEventBus = create<TourEventBusState>((set) => ({
  counts: {},
  emit: (event) =>
    set((state) => ({
      counts: { ...state.counts, [event]: (state.counts[event] ?? 0) + 1 },
    })),
}));

/** Read-only hook to the current counter for an event (defaults to 0). */
export function useTourEvent(event: string | undefined): number {
  return useTourEventBus((s) =>
    event ? (s.counts[event] ?? 0) : 0,
  );
}

/** Fire-and-forget emit — call directly from event handlers. */
export function emitTourEvent(event: string): void {
  useTourEventBus.getState().emit(event);
}
