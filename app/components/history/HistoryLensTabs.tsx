import { useRouter } from 'expo-router';

import { SegmentedControl } from '@/components/SegmentedControl';
import { useT } from '@/lib/i18n';

export type HistoryLens = 'dias' | 'dedicacao' | 'insights';

const ROUTE: Record<HistoryLens, string> = {
  dias: '/history',
  dedicacao: '/dedicacao-history',
  insights: '/insights',
};

/**
 * Shared lens switcher stitching the three "looking back" surfaces into one
 * experience: Dias (the day browser + retro-log), Dedicação (XP analytics),
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
        { value: 'dias', label: t('historyHub.dias') },
        { value: 'dedicacao', label: t('historyHub.dedicacao') },
        { value: 'insights', label: t('historyHub.insights') },
      ]}
      value={current}
      onChange={go}
    />
  );
}
