import type { ScreenedStep } from '@/components/tour/TourModule';
import type { TranslateOptions } from '@/lib/i18n';

type Translator = (key: string, options?: TranslateOptions) => string;

/**
 * M3 — Quests. The spec had 4 spotlights (strip → empty board → explore
 * → templates list → detail), but the real /quests board shows the
 * available templates inline (no separate "explore" hop), so we collapse
 * to 3 steps that match the actual surfaces:
 *
 *   1. (home)         quest chips strip          — awaitEvent QUESTS_NAVIGATED
 *   2. (quests)       board + available templates — awaitEvent QUEST_DETAIL_OPENED
 *   3. (quest-detail) criteria, accept later      — Next/X closes detail
 *
 * Important: tapping a template card on the board *starts* the quest (a
 * real commitment). The detail opens via long-press instead, so the tour
 * stays "0 commitment actions" as the spec requires — we ask the user to
 * long-press, not tap.
 */
export const M3_EVENTS = {
  QUESTS_NAVIGATED: 'quests:navigated',
  QUEST_DETAIL_OPENED: 'quest-detail:opened',
} as const;

export function buildM3Steps(t: Translator): ScreenedStep[] {
  return [
    {
      screen: 'home',
      title: t('tour.m3.step1.title'),
      body: t('tour.m3.step1.body'),
      position: 'bottom',
      awaitEvent: M3_EVENTS.QUESTS_NAVIGATED,
    },
    {
      screen: 'quests',
      title: t('tour.m3.step2.title'),
      body: t('tour.m3.step2.body'),
      position: 'bottom',
      awaitEvent: M3_EVENTS.QUEST_DETAIL_OPENED,
    },
    {
      screen: 'quest-detail',
      title: t('tour.m3.step3.title'),
      body: t('tour.m3.step3.body'),
      position: 'bottom',
    },
  ];
}
