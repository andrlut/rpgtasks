import type { ScreenedStep } from '@/components/tour/TourModule';
import type { TranslateOptions } from '@/lib/i18n';

type Translator = (key: string, options?: TranslateOptions) => string;

/**
 * M4 — Rewards. The spec had 3 spotlights ending on a reward *detail*
 * screen, but the real Rewards tab has no detail route — suggestions
 * ("Inspiração") live inline at the bottom of the scroll and tapping one
 * adds it to the shop. So we keep 3 steps but fold the cost/bank/refund
 * explanation into the inspiration step:
 *
 *   1. (home)    Rewards bottom-nav tab     — awaitEvent REWARDS_NAVIGATED
 *   2. (rewards) balance + your rewards      — Next (auto-scroll to top)
 *   3. (rewards) Inspiration + how it works  — Next (auto-scroll to end)
 *
 * No commitment: we never ask the user to redeem or add anything.
 */
export const M4_EVENTS = {
  REWARDS_NAVIGATED: 'rewards:navigated',
} as const;

export function buildM4Steps(t: Translator): ScreenedStep[] {
  return [
    {
      screen: 'home',
      title: t('tour.m4.step1.title'),
      body: t('tour.m4.step1.body'),
      position: 'bottom',
      awaitEvent: M4_EVENTS.REWARDS_NAVIGATED,
    },
    {
      screen: 'rewards',
      title: t('tour.m4.step2.title'),
      body: t('tour.m4.step2.body'),
      position: 'bottom',
    },
    {
      screen: 'rewards',
      title: t('tour.m4.step3.title'),
      body: t('tour.m4.step3.body'),
      position: 'top',
    },
  ];
}
