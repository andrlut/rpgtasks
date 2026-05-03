import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LevelRing } from '@/components/LevelRing';
import { PillarTabs, type PillarKey } from '@/components/PillarTabs';
import { ProgressBar } from '@/components/ProgressBar';
import { ScreenBackground } from '@/components/ScreenBackground';
import { AvaliacaoPanel } from '@/components/pillars/AvaliacaoPanel';
import { DedicacaoPanel } from '@/components/pillars/DedicacaoPanel';
import { SkillsPanel } from '@/components/pillars/SkillsPanel';
import { pickSubScores, useCharacter } from '@/lib/api/character';
import { useSkillStates } from '@/lib/api/skills';
import { useStreak } from '@/lib/api/streak';
import type { CharacterDimension, DimensionId } from '@/lib/db/types';
import { levelProgress } from '@/lib/xp';
import { tokens } from '@/theme';
import { DIMENSION_META } from '@/theme/dimensions';

/**
 * Title derived from the user's strongest dimension. Cosmetic flavor —
 * gives the avatar a personality without a separate titles table.
 */
function deriveTitle(
  dimensions: CharacterDimension[],
): { label: string; dim: DimensionId } | null {
  if (dimensions.length === 0) return null;
  let best: CharacterDimension | undefined;
  for (const d of dimensions) {
    if (!best || d.xp > best.xp) best = d;
  }
  if (!best || best.xp === 0) return null;
  const lvl = levelProgress(best.xp).level;
  const dimLabel = DIMENSION_META[best.dimension_id].label;
  const rank =
    lvl >= 10 ? 'Master' : lvl >= 6 ? 'Adept' : lvl >= 3 ? 'Builder' : 'Apprentice';
  return { label: `${dimLabel} ${rank}`, dim: best.dimension_id };
}

/** Compact 1.2k / 12.3k formatter for the Dedicação tab KPI. */
function formatXp(xp: number): string {
  if (xp < 1000) return String(xp);
  if (xp < 10000) return (xp / 1000).toFixed(1) + 'k';
  return Math.floor(xp / 1000) + 'k';
}

/**
 * Hero tab — identity on top, then a 3-segment switcher between the pilares
 * (Avaliação · Dedicação · Skills). Body changes based on the active tab;
 * default is Avaliação so the hex chart greets the user on open.
 *
 * The pilares get tone-distinct chassis (see PillarTabs for the tone map):
 *   - Avaliação  → contemplative (violet)
 *   - Dedicação  → dopaminergic (xp green)
 *   - Skills     → ceremonious (coin gold)
 */
export default function CharacterScreen() {
  const character = useCharacter();
  const skillStates = useSkillStates();
  const streak = useStreak();
  const [activePillar, setActivePillar] = useState<PillarKey>('avaliacao');

  const title = useMemo(
    () => deriveTitle(character.data?.dimensions ?? []),
    [character.data?.dimensions],
  );

  // ── KPIs surfaced on each tab ───────────────────────────────────────
  // Same calc as HexChart's center "overall" — sum of 12 sub scores divided
  // by 6 dims, range 0-10. Keeps the tab KPI and the hex center identical.
  const avaliacaoKpi = useMemo(() => {
    if (!character.data) return { kpi: '—' };
    const scores = pickSubScores(character.data.subScores, 'self');
    if (scores.size === 0) return { kpi: '—' };
    let sum = 0;
    for (const s of scores.values()) sum += s;
    const overall = sum / 6;
    return { kpi: overall.toFixed(1), unit: '/10' };
  }, [character.data]);

  const dedicacaoKpi = useMemo(() => {
    const xp = character.data?.character.total_xp ?? 0;
    return { kpi: formatXp(xp), unit: ' XP' };
  }, [character.data]);

  const skillsKpi = useMemo(() => {
    const states = skillStates.data ?? [];
    const earned = states.filter(
      (s) => s.currentTier.tier_name !== 'beginner',
    ).length;
    return { kpi: String(earned) };
  }, [skillStates.data]);

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
          <Text style={styles.errorText}>Failed to load character.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { profile, character: char, dimensions } = character.data;
  const totalProgress = levelProgress(char.total_xp);
  const titleDim = title ? DIMENSION_META[title.dim] : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenBackground>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={
                character.isRefetching || skillStates.isRefetching
              }
              onRefresh={() => {
                character.refetch();
                skillStates.refetch();
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
                    : totalProgress.xpInLevel /
                      totalProgress.xpNeededForLevel
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
                <Text style={styles.levelLine}>
                  Level {totalProgress.level}
                </Text>
                <View style={styles.chipRow}>
                  {title && titleDim && (
                    <View
                      style={[
                        styles.titleChip,
                        {
                          backgroundColor: titleDim.bg,
                          borderColor: `${titleDim.color}55`,
                        },
                      ]}
                    >
                      <Ionicons
                        name={titleDim.iconName as never}
                        size={11}
                        color={titleDim.color}
                      />
                      <Text
                        style={[styles.titleText, { color: titleDim.color }]}
                      >
                        {title.label}
                      </Text>
                    </View>
                  )}
                  {(streak.data?.currentStreak ?? 0) > 0 && (
                    <View style={styles.streakChip}>
                      <Ionicons
                        name="flame"
                        size={11}
                        color={tokens.semantic.warn}
                      />
                      <Text style={styles.streakChipText}>
                        {streak.data?.currentStreak}d
                      </Text>
                    </View>
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
                    totalProgress.xpNeededForLevel -
                      totalProgress.xpInLevel,
                  )}{' '}
                  XP to LV {totalProgress.level + 1}
                </Text>
              </View>
            </View>

          </View>

          {/* ── PILLAR TABS ──────────────────────────────────── */}
          <PillarTabs
            active={activePillar}
            onChange={setActivePillar}
            avaliacao={avaliacaoKpi}
            dedicacao={dedicacaoKpi}
            skills={skillsKpi}
          />

          {/* ── ACTIVE PANEL ─────────────────────────────────── */}
          <View style={styles.panelWrap}>
            {activePillar === 'avaliacao' && (
              <AvaliacaoPanel subScores={character.data.subScores} />
            )}
            {activePillar === 'dedicacao' && (
              <DedicacaoPanel dimensions={dimensions} />
            )}
            {activePillar === 'skills' && (
              <SkillsPanel skills={skillStates.data ?? []} />
            )}
          </View>
        </ScrollView>
      </ScreenBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.bg.deep },
  content: {
    padding: tokens.space[4],
    paddingBottom: tokens.layout.bottomNavClearance,
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
  streakChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: tokens.space[3],
    paddingVertical: 4,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 159, 67, 0.12)',
    borderColor: 'rgba(255, 159, 67, 0.35)',
  },
  streakChipText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
    color: tokens.semantic.warn,
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

  panelWrap: {
    marginTop: 0,
  },
});
