import type { ScreenedStep } from '@/components/tour/TourModule';
import type { TranslateOptions } from '@/lib/i18n';

type Translator = (key: string, options?: TranslateOptions) => string;

/**
 * M6 — Learn. The spec was a single spotlight on the Learning tab. We
 * keep it light at 2 steps so the user actually lands on the tab:
 *
 *   1. (home)  Learn bottom-nav tab    — awaitEvent LEARN_NAVIGATED
 *   2. (learn) "fresh content" explainer — Next → Wrap-up
 *
 * On completion (or skip) the caller routes to /tour/wrap, the always-
 * runs closing screen.
 */
export const M6_EVENTS = {
  LEARN_NAVIGATED: 'learn:navigated',
} as const;

export function buildM6Steps(t: Translator): ScreenedStep[] {
  return [
    {
      screen: 'home',
      title: t('tour.m6.step1.title'),
      body: t('tour.m6.step1.body'),
      position: 'bottom',
      awaitEvent: M6_EVENTS.LEARN_NAVIGATED,
    },
    {
      screen: 'learn',
      title: t('tour.m6.step2.title'),
      body: t('tour.m6.step2.body'),
      position: 'bottom',
    },
  ];
}
