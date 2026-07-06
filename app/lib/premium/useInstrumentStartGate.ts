import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { useInstrumentAccess } from './useInstrumentAccess';

/**
 * Screen-side defense-in-depth for a psych instrument route (§3.2). The card
 * teaser is the primary gate, but a locked user can still reach a route by
 * deep link or stale navigation — so the screen checks too.
 *
 * Call near the top of the screen, passing whether the lookup for a prior
 * completed session has resolved (`ready`) and whether one exists
 * (`hasResult`). Behaviour:
 *
 *   - On mount, a locked user with NO prior result is bounced to the paywall
 *     so they never see the questionnaire intro.
 *   - `assertCanStart()` (call it first thing in the start/retake handler)
 *     returns `false` and redirects when locked, so grandfathered free users
 *     who kept a visible result still can't start a *new* application.
 *
 * Premium users pass through untouched.
 */
export function useInstrumentStartGate(
  instrumentId: string,
  opts: { ready: boolean; hasResult: boolean },
): { locked: boolean; assertCanStart: () => boolean } {
  const router = useRouter();
  const { locked } = useInstrumentAccess(instrumentId);
  const { ready, hasResult } = opts;

  useEffect(() => {
    if (locked && ready && !hasResult) {
      router.replace('/premium?source=instrument');
    }
  }, [locked, ready, hasResult, router]);

  const assertCanStart = (): boolean => {
    if (locked) {
      router.replace('/premium?source=instrument');
      return false;
    }
    return true;
  };

  return { locked, assertCanStart };
}
