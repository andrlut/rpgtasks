import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { type Href, Stack, useRouter } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useBottomSafeClearance } from '@/components/BottomNavBar';
import { ScreenBackground } from '@/components/ScreenBackground';
import { useT } from '@/lib/i18n';
import type { TourModule, TourModuleStatus } from '@/lib/tour/constants';
import { useTourStore } from '@/lib/tour/store';
import { tokens } from '@/theme';

/**
 * Settings → "Refazer tutorial". Lists every tour module with its
 * current status and a per-module "Refazer" button, plus a "Refazer
 * tour completo" at the bottom.
 *
 * Replaying a single module sets it to `pending` and every other module
 * to `completed` (see store.replayModule), so the sequential current-
 * module gate surfaces only that one — then routes to its target screen.
 * Full-tour replay resets everything and drops the user back on M0.
 */

interface ReplayModuleSpec {
  id: TourModule;
  /** Full-screen route to open; content modules (M1-M6) just go Home,
   *  where their step 1 lives. */
  route?: Href;
}

const REPLAY_MODULES: ReplayModuleSpec[] = [
  { id: 'M0', route: '/tour/m0' },
  { id: 'M0_5', route: '/tour/m0-5' },
  { id: 'M1' },
  { id: 'M2' },
  { id: 'M3' },
  { id: 'M4' },
  { id: 'M5' },
  { id: 'M6' },
];

const STATUS_TONE: Record<TourModuleStatus, { color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  pending: { color: tokens.text.dim, icon: 'ellipse-outline' },
  in_progress: { color: tokens.brand.violet2, icon: 'time-outline' },
  completed: { color: tokens.semantic.xp2, icon: 'checkmark-circle' },
  skipped: { color: tokens.semantic.coinLight, icon: 'play-skip-forward-outline' },
};

export default function TourReplayScreen() {
  const router = useRouter();
  const { t } = useT();
  const modules = useTourStore((s) => s.modules);
  const replayModule = useTourStore((s) => s.replayModule);
  const resetAll = useTourStore((s) => s.resetAll);
  const bottomClearance = useBottomSafeClearance();

  const handleReplay = async (spec: ReplayModuleSpec) => {
    Haptics.selectionAsync().catch(() => {});
    await replayModule(spec.id);
    router.replace(spec.route ?? '/(tabs)');
  };

  const handleReplayAll = async () => {
    Haptics.selectionAsync().catch(() => {});
    await resetAll();
    router.replace('/tour/m0');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenBackground>
        <Stack.Screen options={{ headerShown: false }} />

        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
          >
            <Ionicons name="chevron-back" size={22} color={tokens.text.hi} />
          </Pressable>
          <Text style={styles.headerTitle}>{t('tour.replay.title')}</Text>
          <View style={styles.backBtn} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: bottomClearance }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.subtitle}>{t('tour.replay.subtitle')}</Text>

          <View style={styles.list}>
            {REPLAY_MODULES.map((spec) => {
              const status: TourModuleStatus = modules[spec.id]?.status ?? 'pending';
              const tone = STATUS_TONE[status];
              return (
                <View key={spec.id} style={styles.row}>
                  <Ionicons name={tone.icon} size={18} color={tone.color} />
                  <View style={styles.rowBody}>
                    <Text style={styles.rowName}>
                      {t(`tour.replay.modules.${spec.id}.name` as const)}
                    </Text>
                    <Text style={styles.rowDesc}>
                      {t(`tour.replay.modules.${spec.id}.desc` as const)}
                    </Text>
                    <Text style={[styles.rowStatus, { color: tone.color }]}>
                      {t(`tour.replay.status.${status}` as const)}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => handleReplay(spec)}
                    style={({ pressed }) => [styles.replayBtn, pressed && { opacity: 0.7 }]}
                    accessibilityRole="button"
                  >
                    <Text style={styles.replayText}>{t('tour.replay.replayBtn')}</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>

          <Pressable
            onPress={handleReplayAll}
            style={({ pressed }) => [styles.allBtn, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
          >
            <Ionicons name="refresh" size={16} color={tokens.brand.violet2} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.allTitle}>{t('tour.replay.allTitle')}</Text>
              <Text style={styles.allDesc}>{t('tour.replay.allDesc')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={tokens.text.mid} />
          </Pressable>
        </ScrollView>
      </ScreenBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.bg.deep },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.space[3],
    paddingVertical: tokens.space[2],
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...tokens.type.h3,
    color: tokens.text.hi,
  },
  content: {
    paddingHorizontal: tokens.space[4],
    paddingTop: tokens.space[2],
    gap: tokens.space[3],
  },
  subtitle: {
    ...tokens.type.body,
    color: tokens.text.mid,
    marginBottom: tokens.space[2],
  },
  list: {
    gap: tokens.space[2],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    paddingVertical: tokens.space[3],
    paddingHorizontal: tokens.space[3],
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.border.base,
    backgroundColor: tokens.bg.surface,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  rowName: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 14,
    color: tokens.text.hi,
  },
  rowDesc: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    lineHeight: 15,
    color: tokens.text.mid,
  },
  rowStatus: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  replayBtn: {
    paddingHorizontal: tokens.space[3],
    paddingVertical: tokens.space[2],
    borderRadius: tokens.radius.md,
    backgroundColor: 'rgba(123, 92, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(123, 92, 255, 0.35)',
  },
  replayText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 12,
    color: tokens.brand.violet2,
  },
  allBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[3],
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: tokens.border.strong,
    backgroundColor: tokens.bg.surface,
    marginTop: tokens.space[2],
  },
  allTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 14,
    color: tokens.text.hi,
  },
  allDesc: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    color: tokens.text.mid,
    marginTop: 1,
  },
});
