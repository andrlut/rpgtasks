import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useBottomNavClearance } from '@/components/BottomNavBar';
import { HeroHeader } from '@/components/HeroHeader';
import { PillarSwitcher, type PillarKey } from '@/components/PillarSwitcher';
import { ScreenBackground } from '@/components/ScreenBackground';
import { SubSelector } from '@/components/SubSelector';
import { AutoconhecimentoView } from '@/components/pillars/AutoconhecimentoView';
import { AvaliacaoPanel } from '@/components/pillars/AvaliacaoPanel';
import { DedicacaoPanel } from '@/components/pillars/DedicacaoPanel';
import { GoalsPreview } from '@/components/pillars/GoalsPreview';
import { MomentumView } from '@/components/pillars/MomentumView';
import { SkillsPanel } from '@/components/pillars/SkillsPanel';
import { useCharacter } from '@/lib/api/character';
import { useMomentum } from '@/lib/api/momentum';
import { useSkillStates } from '@/lib/api/skills';
import { useT } from '@/lib/i18n';
import { TourModule } from '@/components/tour/TourModule';
import { emitTourEvent } from '@/lib/tour/eventBus';
import { buildM5Steps, M5_EVENTS } from '@/lib/tour/m5Steps';
import { useIsCurrentTourModule, useTourStore } from '@/lib/tour/store';
import { tokens } from '@/theme';

// Sub-pillar key types per pilar — kept narrow so TS catches mis-typings.
type PercebidaSub = 'avaliacao' | 'autoconhecimento';
type PraticadaSub = 'dedicacao' | 'momentum';
type DesejadaSub = 'goals' | 'skills';

interface ActiveSubState {
  percebida: PercebidaSub;
  praticada: PraticadaSub;
  desejada: DesejadaSub;
}

// Visual tones per pilar — match PillarSwitcher; reused by SubSelector
// so the sub-chip tint stays coherent with the pillar above.
const PILLAR_TONE: Record<PillarKey, { accent: string; halo: string; border: string }> = {
  percebida: {
    accent: tokens.brand.violet2,
    halo: 'rgba(155, 130, 255, 0.18)',
    border: 'rgba(155, 130, 255, 0.35)',
  },
  praticada: {
    accent: tokens.semantic.xp2,
    halo: 'rgba(111, 232, 170, 0.18)',
    border: 'rgba(61, 214, 140, 0.35)',
  },
  desejada: {
    accent: tokens.semantic.coin,
    halo: 'rgba(255, 200, 61, 0.18)',
    border: 'rgba(255, 200, 61, 0.35)',
  },
};

/**
 * Eu tab — full-width HeroHeader on top (Iris-Wrapped Avatar), then a
 * 3-icon pillar switcher followed by a 2-segment sub-selector for the
 * active pilar's sub-pilares. Content renders directly into the page
 * scroll (no card wrapper) so the chart / list / placeholder dominates.
 *
 * Default sub per pilar:
 *   - Percebida → Avaliação (hex chamariz)
 *   - Praticada → Dedicação (XP view)
 *   - Desejada → Skills (real content; Goals lands later)
 */
export default function CharacterScreen() {
  const { t } = useT();
  const router = useRouter();
  const character = useCharacter();
  const skillStates = useSkillStates();
  const momentum = useMomentum();
  const params = useLocalSearchParams<{ pillar?: PillarKey }>();

  const [activePillar, setActivePillar] = useState<PillarKey>(
    params.pillar ?? 'percebida',
  );

  // Honor `?pillar=` changes after mount — e.g. the Home XP card pushes
  // back to this tab to land on Praticada/Dedicação. Without this, the
  // first push works but subsequent re-pushes with the same param do
  // nothing because activePillar is already set.
  useEffect(() => {
    if (params.pillar && params.pillar !== activePillar) {
      setActivePillar(params.pillar);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.pillar]);
  const [activeSub, setActiveSub] = useState<ActiveSubState>({
    percebida: 'avaliacao',
    praticada: 'dedicacao',
    desejada: 'skills',
  });
  const bottomClearance = useBottomNavClearance();
  const scrollViewRef = useRef<ScrollView>(null);

  // ── M5 tour plumbing ────────────────────────────────────────────────
  const isM5Current = useIsCurrentTourModule('M5');
  const m5StepIndex = useTourStore((s) => s.stepIndices.M5 ?? 0);
  const m5Status = useTourStore((s) => s.modules.M5?.status);
  // Measured for the step-3 partial scroll: drop the user ~70% down so the
  // Avaliação sub-score boxes land in the open space above the tooltip.
  const contentH = useRef(0);
  const viewportH = useRef(0);

  // While an M5 tooltip is open on this tab (steps 2-5, all bottom-pinned)
  // add extra bottom room so the user can scroll content clear of the
  // tooltip card — same buffer pattern as the other modules.
  const m5OnMeStep =
    isM5Current && m5Status === 'in_progress' && m5StepIndex >= 1 && m5StepIndex <= 4;
  const m5Bump = m5OnMeStep ? 260 : 0;

  // M5 step 1 lives on Home and waits for the user to reach this tab.
  // Emit ME_NAVIGATED when the screen gains focus while step 1 is still
  // current, so the Home tooltip advances to step 2 (which renders here).
  useFocusEffect(
    useCallback(() => {
      const state = useTourStore.getState();
      const status = state.modules.M5?.status ?? 'pending';
      const idx = state.stepIndices.M5 ?? 0;
      if (isM5Current && idx === 0 && status !== 'completed' && status !== 'skipped') {
        emitTourEvent(M5_EVENTS.ME_NAVIGATED);
      }
    }, [isM5Current]),
  );

  // Drive the active pillar off the M5 step index so tapping Próximo
  // flips the portrait under the tooltip (steps 3-5 = the three pillars).
  // Scroll: step 3 (Percebida) drops ~70% down to the sub-score boxes;
  // every other step returns to the top so the switcher is in view.
  useEffect(() => {
    if (!isM5Current || m5Status !== 'in_progress') return;
    if (m5StepIndex === 3) setActivePillar('praticada');
    else if (m5StepIndex === 4) setActivePillar('desejada');
    else if (m5StepIndex === 1 || m5StepIndex === 2) setActivePillar('percebida');
    const id = setTimeout(() => {
      if (m5StepIndex === 2) {
        // Drop down to the Avaliação sub boxes. 70% of the real scroll
        // range wasn't quite enough in testing, so double it (1.4×); the
        // extra m5Bump buffer gives the room to go further without
        // clamping short.
        const range = Math.max(0, contentH.current - viewportH.current - m5Bump);
        scrollViewRef.current?.scrollTo({ y: range * 1.4, animated: true });
      } else {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }
    }, 180);
    return () => clearTimeout(id);
  }, [isM5Current, m5Status, m5StepIndex, m5Bump]);

  if (character.isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.loadingBox}>
          <ActivityIndicator color={tokens.brand.violet2} />
        </View>
      </SafeAreaView>
    );
  }

  if (!character.data) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.loadingBox}>
          <Text style={styles.errorText}>{t('character.failedToLoad')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { dimensions } = character.data;
  const tone = PILLAR_TONE[activePillar];

  const subOptions: [{ key: string; label: string }, { key: string; label: string }] =
    activePillar === 'percebida'
      ? [
          { key: 'avaliacao', label: t('pillar.sub.percebida.avaliacao') },
          { key: 'autoconhecimento', label: t('pillar.sub.percebida.autoconhecimento') },
        ]
      : activePillar === 'praticada'
        ? [
            { key: 'dedicacao', label: t('pillar.sub.praticada.dedicacao') },
            { key: 'momentum', label: t('pillar.sub.praticada.momentum') },
          ]
        : [
            { key: 'goals', label: t('pillar.sub.desejada.goals') },
            { key: 'skills', label: t('pillar.sub.desejada.skills') },
          ];
  const currentSub = activeSub[activePillar];

  const handleSubChange = (key: string) => {
    setActiveSub((prev) => ({ ...prev, [activePillar]: key } as ActiveSubState));
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenBackground>
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={{ paddingBottom: bottomClearance + m5Bump }}
          showsVerticalScrollIndicator={false}
          onLayout={(e) => {
            viewportH.current = e.nativeEvent.layout.height;
          }}
          onContentSizeChange={(_w, h) => {
            contentH.current = h;
          }}
          refreshControl={
            <RefreshControl
              refreshing={
                character.isRefetching ||
                skillStates.isRefetching ||
                momentum.isRefetching
              }
              onRefresh={() => {
                character.refetch();
                skillStates.refetch();
                momentum.refetch();
              }}
              tintColor={tokens.brand.violet2}
            />
          }
        >
          {/* Full-width header — sits flush against the SafeArea so the
              ambient halo bleeds from the screen edge. No surrounding
              padding; the header owns its own internal spacing. */}
          <HeroHeader />

          {/* Tab body — padded inset under the header. */}
          <View style={styles.body}>
            <PillarSwitcher active={activePillar} onChange={setActivePillar} />
            <SubSelector
              options={subOptions}
              active={currentSub}
              onChange={handleSubChange}
              accent={tone.accent}
              halo={tone.halo}
              border={tone.border}
            />
            <View style={styles.subViewWrap}>
              {activePillar === 'percebida' && currentSub === 'avaliacao' && (
                <AvaliacaoPanel subScores={character.data.subScores} />
              )}
              {activePillar === 'percebida' && currentSub === 'autoconhecimento' && (
                <AutoconhecimentoView />
              )}
              {activePillar === 'praticada' && currentSub === 'dedicacao' && (
                <DedicacaoPanel
                  dimensions={dimensions}
                  scrollViewRef={scrollViewRef}
                />
              )}
              {activePillar === 'praticada' && currentSub === 'momentum' && (
                <MomentumView momentum={momentum.data?.attributes} />
              )}
              {activePillar === 'desejada' && currentSub === 'goals' && (
                <GoalsPreview />
              )}
              {activePillar === 'desejada' && currentSub === 'skills' && (
                <SkillsPanel skills={skillStates.data ?? []} />
              )}
            </View>
          </View>
        </ScrollView>
      </ScreenBackground>

      {/* M5 steps 2-5 live here (pillar switcher + the three portraits).
         Step 1 is on Home (Eu tab spotlight). Finishing returns the user
         to the Tasks home so the next module's Home-anchored step 1 can
         show. No `flatNav` — this is a tab screen WITH the BottomNavBar. */}
      <TourModule
        module="M5"
        screen="me"
        steps={buildM5Steps(t)}
        enabled={isM5Current}
        onExitScreen={() => router.navigate('/(tabs)')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.bg.deep },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { ...tokens.type.body, color: tokens.text.mid },
  body: {
    paddingHorizontal: tokens.space[4],
    paddingTop: tokens.space[3],
    gap: tokens.space[4],
  },
  subViewWrap: {
    marginTop: 0,
  },
});
