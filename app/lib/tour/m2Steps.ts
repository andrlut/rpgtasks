import type { ScreenedStep } from '@/components/tour/TourModule';
import type { TranslateOptions } from '@/lib/i18n';

type Translator = (key: string, options?: TranslateOptions) => string;

/**
 * M2 — Criar task customizada. Spec says 4 spotlights, but Home has no
 * direct `+` button (creation lives behind the manage screen), so we
 * use a 5-step flow that mirrors the user's real journey:
 *
 *   1. (home)   manage tasks button         — awaitEvent TASKS_NAVIGATED
 *   2. (tasks)  the `+` icon                — awaitEvent CREATE_TASK_TAPPED
 *   3. (create) subs + stars section        — Next
 *   4. (create) recurrence picker section   — Next
 *   5. (create) close button / wrap-up      — Next, closes form
 *
 * The form is passive: no requirement to fill or save anything. Step
 * 5's Next (or the X tap) just closes the modal-style task-form and
 * returns the user to Home.
 */
export const M2_EVENTS = {
  TASKS_NAVIGATED: 'tasks:navigated',
  CREATE_TASK_TAPPED: 'create-task:tapped',
} as const;

export function buildM2Steps(t: Translator): ScreenedStep[] {
  return [
    {
      screen: 'home',
      title: t('tour.m2.step1.title'),
      body: t('tour.m2.step1.body'),
      position: 'bottom',
      awaitEvent: M2_EVENTS.TASKS_NAVIGATED,
    },
    {
      screen: 'tasks',
      title: t('tour.m2.step2.title'),
      body: t('tour.m2.step2.body'),
      position: 'bottom',
      awaitEvent: M2_EVENTS.CREATE_TASK_TAPPED,
    },
    {
      screen: 'create',
      title: t('tour.m2.step3.title'),
      body: t('tour.m2.step3.body'),
      position: 'bottom',
    },
    {
      screen: 'create',
      title: t('tour.m2.step4.title'),
      body: t('tour.m2.step4.body'),
      position: 'bottom',
    },
    {
      screen: 'create',
      title: t('tour.m2.step5.title'),
      body: t('tour.m2.step5.body'),
      position: 'top',
    },
  ];
}
