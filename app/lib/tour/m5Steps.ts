import type { ScreenedStep } from '@/components/tour/TourModule';
import type { TranslateOptions } from '@/lib/i18n';

type Translator = (key: string, options?: TranslateOptions) => string;

/**
 * M5 — Eu (identidade). The spec was written against the old "6 dims /
 * 12 subs map + Skills + instruments" layout, but the screen is now
 * organised around the THREE identity pillars — Percebida, Praticada,
 * Desejada — which ARE the perceber/praticar/tornar-se philosophy. So
 * M5 teaches the pillar switcher and walks all three:
 *
 *   1. (home) Eu bottom-nav tab        — awaitEvent ME_NAVIGATED
 *   2. (me)   pillar switcher overview — Next
 *   3. (me)   Percebida                — Next (tour switches the pillar)
 *   4. (me)   Praticada                — Next (tour switches the pillar)
 *   5. (me)   Desejada                 — Next → Tasks home
 *
 * The screen drives the active pillar off the M5 step index (steps 3-5),
 * so tapping Próximo flips the portrait under the tooltip — "show, don't
 * tell". The old spec's sub-map / instruments / skills all live inside
 * these pillars, so their copy folds in.
 */
export const M5_EVENTS = {
  ME_NAVIGATED: 'me:navigated',
} as const;

export function buildM5Steps(t: Translator): ScreenedStep[] {
  return [
    {
      screen: 'home',
      title: t('tour.m5.step1.title'),
      body: t('tour.m5.step1.body'),
      position: 'bottom',
      awaitEvent: M5_EVENTS.ME_NAVIGATED,
    },
    {
      screen: 'me',
      title: t('tour.m5.step2.title'),
      body: t('tour.m5.step2.body'),
      position: 'bottom',
    },
    {
      screen: 'me',
      title: t('tour.m5.step3.title'),
      body: t('tour.m5.step3.body'),
      position: 'bottom',
    },
    {
      screen: 'me',
      title: t('tour.m5.step4.title'),
      body: t('tour.m5.step4.body'),
      position: 'bottom',
    },
    {
      screen: 'me',
      title: t('tour.m5.step5.title'),
      body: t('tour.m5.step5.body'),
      position: 'bottom',
    },
  ];
}
