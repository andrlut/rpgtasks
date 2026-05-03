import { useSettingsStore } from '@/lib/settings';

import { confirmAction } from './confirm';

/**
 * Show a confirmation dialog before completing a high-difficulty (4★ or 5★)
 * task, but only if the user has the setting enabled. Returns true if the
 * caller should proceed with completion, false if the user cancelled or the
 * confirm wasn't needed but caller should still proceed.
 *
 * Usage at a call site:
 *   if (!(await maybeConfirmHardCompletion(difficulty, title))) return;
 *   completeTask.mutate(...)
 */
export async function maybeConfirmHardCompletion(
  difficulty: number,
  title: string,
): Promise<boolean> {
  const enabled = useSettingsStore.getState().settings.confirmHighDifficultyComplete;
  if (!enabled || difficulty < 4) return true;
  return confirmAction(
    `Complete "${title}"?`,
    `This is a ${difficulty}★ task. Make sure you actually did it — it'll grant ${difficulty === 5 ? '250 XP / 250 coins' : '100 XP / 100 coins'}.`,
    { okText: 'Complete', cancelText: 'Cancel' },
  );
}
