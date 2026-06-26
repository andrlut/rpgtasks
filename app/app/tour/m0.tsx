import { Stack, useRouter } from 'expo-router';
import { useMemo } from 'react';

import { FullScreenStep } from '@/components/tour/FullScreenStep';
import { useActiveTasks, useStartTaskFromTemplate } from '@/lib/api/tasks';
import { useCharacter } from '@/lib/api/character';
import { useT } from '@/lib/i18n';
import {
  INITIAL_PICK_TARGET,
  SILENT_SEED_TEMPLATE_IDS,
} from '@/lib/tour/constants';
import { useTourStore } from '@/lib/tour/store';

/**
 * M0 — Welcome screen. The tour's entry point. Fires automatically
 * the first time the user lands after a successful login (AuthGate
 * pushes them here). Two paths:
 *
 *   - "Começar" → marks M0 completed, routes to /tour/m0-5 (initial
 *     3-task picker).
 *   - "Pular" → silently adopts the 3 default templates so the Home
 *     isn't empty, marks M0+M0.5 skipped, and goes straight to /(tabs).
 */
export default function TourM0Screen() {
  const router = useRouter();
  const { t } = useT();
  const character = useCharacter();
  const activeTasks = useActiveTasks();
  const setStatus = useTourStore((s) => s.setStatus);
  const startFromTemplate = useStartTaskFromTemplate();

  const firstName = (character.data?.profile.display_name ?? '')
    .trim()
    .split(/\s+/)[0]!;

  // Skip seed bookkeeping — used by the "Pular" path to avoid
  // duplicate adoption when the user already has tasks.
  const adoptedIds = useMemo(() => {
    const s = new Set<string>();
    for (const t of activeTasks.data ?? []) {
      if (t.template_id) s.add(t.template_id);
    }
    return s;
  }, [activeTasks.data]);

  const handleStart = async () => {
    await setStatus('M0', 'completed');
    router.replace('/tour/m0-5');
  };

  const handleSkip = async () => {
    await setStatus('M0', 'skipped');
    // Only seed defaults when the user actually needs them. Skipping
    // M0 on a replay (e.g. via Settings) shouldn't duplicate existing
    // tasks; if there are already 3+ active, leave the list alone.
    const taskCount = activeTasks.data?.length ?? 0;
    if (taskCount < INITIAL_PICK_TARGET) {
      for (const id of SILENT_SEED_TEMPLATE_IDS) {
        if (adoptedIds.has(id)) continue;
        try {
          await startFromTemplate.mutateAsync(id);
        } catch {
          // best-effort — duplicates / RLS errors stay silent here
        }
      }
    }
    await setStatus('M0_5', 'skipped');
    router.replace('/(tabs)');
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <FullScreenStep
        eyebrow={t('tour.m0.eyebrow')}
        title={t('tour.m0.title', { name: firstName || 'aí' })}
        body={t('tour.m0.body')}
        primaryLabel={t('tour.m0.primary')}
        onPrimary={handleStart}
        secondaryLabel={t('tour.m0.secondary')}
        onSecondary={handleSkip}
      />
    </>
  );
}
