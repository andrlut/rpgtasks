import { useRouter } from 'expo-router';

import { SegmentedControl } from '@/components/SegmentedControl';
import { useT } from '@/lib/i18n';

export type HistoryLens = 'rotina' | 'dedicacao' | 'insights';

/** The route stays `/history` — Expo Router is file-based, and renaming the
 *  file to match the new label costs call sites for no user-visible gain. */
const ROUTE: Record<HistoryLens, string> = {
  rotina: '/history',
  dedicacao: '/dedicacao-history',
  insights: '/insights',
};

/**
 * Shared lens switcher stitching the three "looking back" surfaces into one
 * experience: Rotina (the day browser + retro-log), Dedicação (XP analytics),
 * Insights (mood↔activity correlation). Switching replaces the current route
 * so the back stack stays a single "Histórico" entry rather than growing per
 * tab. Each screen keeps its own body — this is the connective tissue.
 */
export function HistoryLensTabs({ current }: { current: HistoryLens }) {
  const { t } = useT();
  const router = useRouter();

  const go = (lens: HistoryLens) => {
    if (lens === current) return;
    router.replace(ROUTE[lens] as never);
  };

  return (
    <SegmentedControl<HistoryLens>
      options={[
        { value: 'rotina', label: t('historyHub.rotina') },
        { value: 'dedicacao', label: t('historyHub.dedicacao') },
        { value: 'insights', label: t('historyHub.insights') },
      ]}
      value={current}
      onChange={go}
    />
  );
}
