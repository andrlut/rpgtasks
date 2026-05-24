import { Ionicons } from '@expo/vector-icons';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useBottomNavClearance } from '@/components/BottomNavBar';
import { InfoSheet } from '@/components/InfoSheet';
import { LevelRing } from '@/components/LevelRing';
import { PillarSwitcher, type PillarKey } from '@/components/PillarSwitcher';
import { ProgressBar } from '@/components/ProgressBar';
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
import type { CharacterDimension, DimensionId } from '@/lib/db/types';
import { levelProgress } from '@/lib/xp';
import { useT } from '@/lib/i18n';
import { useMetaLookup } from '@/lib/i18n/meta';
import { tokens } from '@/theme';

/**
 * Pick the user's strongest dimension. Caller composes the visible label —
 * keeping i18n out of this pure helper so it stays trivially testable.
 */
function pickStrongestDim(
  dimensions: CharacterDimension[],
): { dim: DimensionId; rankKey: 'master' | 'adept' | 'builder' | 'apprentice' } | null {
  if (dimensions.length === 0) return null;
  let best: CharacterDimension | undefined;
  for (const d of dimensions) {
    if (!best || d.xp > best.xp) best = d;
  }
  if (!best || best.xp === 0) return null;
  const lvl = levelProgress(best.xp).level;
  const rankKey = lvl >= 10 ? 'master' : lvl >= 6 ? 'adept' : lvl >= 3 ? 'builder' : 'apprentice';
  return { dim: best.dimension_id, rankKey };
}

const TITLE_INFO_BODY =
  'Derivado em runtime da sua dimensão mais forte (a com mais XP).\n\n' +
  'O nível dessa dimensão define o rank:\n' +
  '• Apprentice — nível 0 a 2\n' +
  '• Builder — nível 3 a 5\n' +
  '• Adept — nível 6 a 9\n' +
  '• Master — nível 10+\n\n' +
  'Muda sozinho conforme você ganha XP em outras dimensões.';

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
 * Eu (formerly Hero) tab — identity header on top, then a 3-icon pillar
 * switcher followed by a 2-segment sub-selector for the active pilar's
 * sub-pilares. Content renders directly into the page scroll (no card
 * wrapper) so the hex / list / placeholder dominate the screen.
 *
 * Default sub per pilar:
 *   - Percebida → Avaliação (hex chamariz)
 *   - Praticada → Dedicação (XP view)
 *   - Desejada → Skills (real content; Goals lands later)
 */
export default function CharacterScreen() {
  const { t } = useT();
  const metaLookup = useMetaLookup();
  const character = useCharacter();
  const skillStates = useSkillStates();
  const momentum = useMomentum();

  const [activePillar, setActivePillar] = useState<PillarKey>('percebida');
  const [activeSub, setActiveSub] = useState<ActiveSubState>({
    percebida: 'avaliacao',
    praticada: 'dedicacao',
    desejada: 'skills',
  });
  const [infoOpen, setInfoOpen] = useState<null | 'title'>(null);
  const bottomClearance = useBottomNavClearance();
  const scrollViewRef = useRef<ScrollView>(null);

  const strongest = useMemo(
    () => pickStrongestDim(character.data?.dimensions ?? []),
    [character.data?.dimensions],
  );
  const title = strongest
    ? {
        label: `${metaLookup.dim(strongest.dim).label} ${t(`character.ranks.${strongest.rankKey}`)}`,
        dim: strongest.dim,
      }
    : null;

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

  const { profile, character: char, dimensions } = character.data;
  const totalProgress = levelProgress(char.total_xp);
  const titleDim = title ? metaLookup.dim(title.dim) : null;

  const tone = PILLAR_TONE[activePillar];

  // Build the sub-selector options for the active pillar.
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
          contentContainerStyle={[styles.content, { paddingBottom: bottomClearance }]}
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
          {/* ── HERO IDENTITY (top) ─────────────────────────────
            * "Quem estou me tornando?" — aspirational anchor that
            * doesn't change as the user switches between pilares.
            */}
          <View style={styles.heroBlock}>
            <View style={styles.heroBody}>
              <LevelRing
                size={96}
                level={totalProgress.level}
                progress={
                  totalProgress.xpNeededForLevel === 0
                    ? 0
                    : totalProgress.xpInLevel / totalProgress.xpNeededForLevel
                }
              >
                <Ionicons
                  name={(titleDim?.iconName as never) ?? ('person' as never)}
                  size={44}
                  color={titleDim?.color ?? tokens.brand.violet2}
                />
              </LevelRing>
              <View style={styles.heroInfo}>
                <Text style={styles.name} numberOfLines={1}>
                  {profile.display_name}
                </Text>
                <Text style={styles.levelLine}>Level {totalProgress.level}</Text>
                <View style={styles.chipRow}>
                  {title && titleDim && (
                    <Pressable
                      onPress={() => setInfoOpen('title')}
                      style={({ pressed }) => [
                        styles.titleChip,
                        {
                          backgroundColor: titleDim.bg,
                          borderColor: `${titleDim.color}55`,
                        },
                        pressed && { opacity: 0.7 },
                      ]}
                      hitSlop={6}
                    >
                      <Ionicons
                        name={titleDim.iconName as never}
                        size={11}
                        color={titleDim.color}
                      />
                      <Text style={[styles.titleText, { color: titleDim.color }]}>
                        {title.label}
                      </Text>
                      <Ionicons
                        name="information-circle-outline"
                        size={11}
                        color={titleDim.color}
                        style={{ opacity: 0.55 }}
                      />
                    </Pressable>
                  )}
                </View>
                <View style={styles.totalBar}>
                  <ProgressBar
                    value={totalProgress.xpInLevel}
                    max={totalProgress.xpNeededForLevel}
                    color={tokens.brand.violet}
                    height={5}
                  />
                </View>
                <Text style={styles.toNext}>
                  {Math.max(
                    0,
                    totalProgress.xpNeededForLevel - totalProgress.xpInLevel,
                  )}{' '}
                  XP to LV {totalProgress.level + 1}
                </Text>
              </View>
            </View>
          </View>

          {/* ── 3-icon pillar switcher ───────────────────────── */}
          <PillarSwitcher active={activePillar} onChange={setActivePillar} />

          {/* ── 2-segment sub-selector (current pillar's pair) ── */}
          <SubSelector
            options={subOptions}
            active={currentSub}
            onChange={handleSubChange}
            accent={tone.accent}
            halo={tone.halo}
            border={tone.border}
          />

          {/* ── SUB-VIEW (no card wrapper — content breathes) ── */}
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
        </ScrollView>
      </ScreenBackground>

      <InfoSheet
        visible={infoOpen === 'title'}
        onClose={() => setInfoOpen(null)}
        title="Título"
        body={TITLE_INFO_BODY}
        accent={titleDim?.color ?? tokens.brand.violet2}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.bg.deep },
  content: {
    padding: tokens.space[4],
    gap: tokens.space[4],
  },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { ...tokens.type.body, color: tokens.text.mid },

  // Hero identity
  heroBlock: {
    paddingTop: tokens.space[2],
    gap: tokens.space[3],
  },
  heroBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[4],
  },
  heroInfo: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  name: {
    ...tokens.type.h2,
    color: tokens.text.hi,
  },
  levelLine: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: tokens.text.mid,
    letterSpacing: 0.3,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    marginTop: 2,
  },
  titleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: tokens.space[3],
    paddingVertical: 4,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
  },
  titleText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
    letterSpacing: 0.3,
  },
  totalBar: {
    marginTop: tokens.space[2],
  },
  toNext: {
    ...tokens.type.caption,
    color: tokens.brand.violet2,
    fontFamily: 'Manrope_700Bold',
    marginTop: 4,
  },

  subViewWrap: {
    marginTop: 0,
  },
});
