import { Stack, useRouter } from 'expo-router';

import { FullScreenStep } from '@/components/tour/FullScreenStep';
import { useT } from '@/lib/i18n';
import { useTourStore } from '@/lib/tour/store';

/**
 * Wrap-up — the tour's closing full-screen (mirrors M0's layout). It
 * ALWAYS runs: M6 routes here on complete/skip, and since every content
 * module is sequential, even a user who skipped everything passes through
 * M6 first and lands here. Closes the tour with the identity message and
 * the reminder that any module can be revisited from Settings.
 */
export default function TourWrapScreen() {
  const router = useRouter();
  const { t } = useT();
  const setStatus = useTourStore((s) => s.setStatus);

  const handleDone = async () => {
    await setStatus('wrap', 'completed');
    router.replace('/(tabs)');
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <FullScreenStep
        eyebrow={t('tour.wrap.eyebrow')}
        title={t('tour.wrap.title')}
        body={t('tour.wrap.body')}
        primaryLabel={t('tour.wrap.primary')}
        onPrimary={handleDone}
      />
    </>
  );
}
