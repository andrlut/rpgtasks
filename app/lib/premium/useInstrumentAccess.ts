import { isInstrumentPremium } from './constants';
import { useIsPremium } from './useIsPremium';

export interface InstrumentAccess {
  /** The instrument is premium AND the current user is on the free tier. */
  locked: boolean;
}

/**
 * Centralises the instrument gate rule so every surface agrees:
 *
 *   - Self-assessment (`avaliacao_*`) is never locked — always free.
 *   - The six deep instruments are locked for free users.
 *
 * Callers combine `locked` with "does the user already have a result?": a
 * locked instrument the user already completed stays viewable (only
 * starting/retaking is gated), per the frozen decision. This hook only owns
 * the tier/premium half of that rule — the "has result" half lives in each
 * card because it already fetches the last session for its summary.
 */
export function useInstrumentAccess(instrumentId: string): InstrumentAccess {
  const isPremium = useIsPremium();
  return { locked: !isPremium && isInstrumentPremium(instrumentId) };
}
