import type { ScreenedStep } from '@/components/tour/TourModule';
import type { TranslateOptions } from '@/lib/i18n';

type Translator = (key: string, options?: TranslateOptions) => string;

/**
 * Tour event names the Home and task-form screens emit so M1 can
 * drive its advancement off real gestures.
 */
export const M1_EVENTS = {
  TASK_TAPPED: 'task:tapped',
  TASK_LONG_PRESSED: 'task:long-pressed',
  TASK_COMPLETED: 'task:completed',
  DRAWER_EXPANDED: 'drawer:expanded',
} as const;

/**
 * M1 — Tasks module copy. Five steps:
 *
 *   1. (home)   tap a task                   — awaitEvent
 *   2. (detail) "what does this train"        — Next on the detail screen
 *   3. (home)   long-press                    — awaitEvent
 *   4. (home)   mark as done                  — awaitEvent
 *   5. (home)   expand Concluídas drawer      — awaitEvent
 *
 * The original spec had a 6th "watch the XP animation" step but it
 * felt redundant next to the completion step itself — dropped per user
 * feedback. We retain the home key-numbering 1..5 so future analytics
 * tags stay stable.
 */
export function buildM1Steps(t: Translator): ScreenedStep[] {
  return [
    {
      screen: 'home',
      title: t('tour.m1.step1.title'),
      body: t('tour.m1.step1.body'),
      position: 'bottom',
      awaitEvent: M1_EVENTS.TASK_TAPPED,
    },
    {
      // Fires on the task-form (detail) screen the user lands on after
      // tapping a task in step 1. Next-to-advance — the user reads then
      // taps back to Home where step 3 picks up.
      screen: 'detail',
      title: t('tour.m1.step2.title'),
      body: t('tour.m1.step2.body'),
      position: 'bottom',
    },
    {
      screen: 'home',
      title: t('tour.m1.step3.title'),
      body: t('tour.m1.step3.body'),
      position: 'bottom',
      awaitEvent: M1_EVENTS.TASK_LONG_PRESSED,
    },
    {
      screen: 'home',
      title: t('tour.m1.step4.title'),
      body: t('tour.m1.step4.body'),
      position: 'bottom',
      awaitEvent: M1_EVENTS.TASK_COMPLETED,
    },
    {
      screen: 'home',
      title: t('tour.m1.step6.title'),
      body: t('tour.m1.step6.body'),
      position: 'bottom',
      awaitEvent: M1_EVENTS.DRAWER_EXPANDED,
    },
  ];
}
