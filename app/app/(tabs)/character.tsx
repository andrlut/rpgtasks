import { useRef, useState } from 'react';
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
  const character = useCharacter();
  const skillStates = useSkillStates();
  const momentum = useMomentum();

  const [activePillar, setActivePillar] = useState<PillarKey>('percebida');
  const [activeSub, setActiveSub] = useState<ActiveSubState>({
    percebida: 'avaliacao',
    praticada: 'dedicacao',
    desejada: 'skills',
  });
  const bottomClearance = useBottomNavClearance();
  const scrollViewRef = useRef<ScrollView>(null);

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
          contentContainerStyle={{ paddingBottom: bottomClearance }}
          showsVerticalScrollIndicator={false}
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
