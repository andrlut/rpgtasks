import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
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

import { CoinIcon } from '@/components/CoinIcon';
import { HexChart } from '@/components/HexChart';
import { LevelRing } from '@/components/LevelRing';
import { PillarCard } from '@/components/PillarCard';
import { ProgressBar } from '@/components/ProgressBar';
import { ScreenBackground } from '@/components/ScreenBackground';
import { TierMedal } from '@/components/TierMedal';
import { pickSubScores, useCharacter } from '@/lib/api/character';
import { useSkillStates } from '@/lib/api/skills';
import { useStreak } from '@/lib/api/streak';
import type {
  CharacterDimension,
  DimensionId,
  SkillState,
  TierName,
} from '@/lib/db/types';
import { levelProgress } from '@/lib/xp';
import { tokens } from '@/theme';
import { DIMENSION_META, DIMENSION_ORDER } from '@/theme/dimensions';

const TIER_RANK: Record<TierName, number> = {
  beginner: 0,
  bronze: 1,
  silver: 2,
  gold: 3,
  master: 4,
};

/** 3-letter abbreviations for the compact RPG-stat-block category row. */
const DIM_ABBREV: Record<DimensionId, string> = {
  health: 'HEA',
  strength: 'STR',
  mind: 'MIN',
  wealth: 'WEA',
  bonds: 'BND',
  craft: 'CRA',
};

/**
 * "Title" derived from the user's strongest dimension. Pure cosmetic flavor —
 * gives the avatar a personality without needing a separate titles table.
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
  const rank = lvl >= 10 ? 'Master' : lvl >= 6 ? 'Adept' : lvl >= 3 ? 'Builder' : 'Apprentice';
  return { label: `${dimLabel} ${rank}`, dim: best.dimension_id };
}

/**
 * Top medals across all skills, rare-tier-first. The Hero tab shows a small
 * trophy strip; the full list lives in the dedicated Skills hub.
 */
function deriveTopBadges(
  states: SkillState[],
): { skillId: string; skillName: string; tier: TierName }[] {
  const badges: { skillId: string; skillName: string; tier: TierName }[] = [];
  for (const s of states) {
    if (TIER_RANK[s.currentTier.tier_name] === 0) continue;
    badges.push({
      skillId: s.skill.id,
      skillName: s.skill.display_name,
      tier: s.currentTier.tier_name,
    });
  }
  return badges.sort((a, b) => TIER_RANK[b.tier] - TIER_RANK[a.tier]);
}

export default function CharacterScreen() {
  const router = useRouter();
  const character = useCharacter();
  const skillStates = useSkillStates();
  const streak = useStreak();

  const title = useMemo(
    () => deriveTitle(character.data?.dimensions ?? []),
    [character.data?.dimensions],
  );
  const topBadges = useMemo(
    () => deriveTopBadges(skillStates.data ?? []),
    [skillStates.data],
  );

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

  const dimMap = new Map<DimensionId, CharacterDimension>(
    dimensions.map((d) => [d.dimension_id, d]),
  );
  const skillsByDim = (() => {
    const map = new Map<DimensionId, SkillState[]>();
    for (const s of skillStates.data ?? []) {
      const arr = map.get(s.skill.dimension_id) ?? [];
      arr.push(s);
      map.set(s.skill.dimension_id, arr);
    }
    return map;
  })();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenBackground>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={character.isRefetching || skillStates.isRefetching}
              onRefresh={() => {
                character.refetch();
                skillStates.refetch();
              }}
              tintColor={tokens.brand.violet2}
            />
          }
        >
          {/* ── PILLAR 1 · AVALIAÇÃO (top — hex is the splash) ───
            * "Como estou?" — contemplative.
            * The hex chart is the most striking visual on the screen, so
            * it leads. Identity block sits below as supporting context.
            */}
          <PillarCard
            eyebrow="AVALIAÇÃO"
            question="Como estou?"
            tone="contemplative"
            iconName="pulse"
            cta={{
              label: 'Atualizar self-assessment',
              onPress: () => router.push('/self-assessment'),
            }}
          >
            <HexChart
              scores={pickSubScores(character.data.subScores, 'self')}
              size={300}
            />
          </PillarCard>

          {/* ── HERO IDENTITY ────────────────────────────────────
            * "Quem estou me tornando?" — aspirational.
            * Avatar/level ring + name + title + 3 stat tiles + badges strip.
            */}
          <View style={styles.heroBlock}>
            <View style={styles.heroBody}>
              <LevelRing
                size={120}
                level={totalProgress.level}
                progress={
                  totalProgress.xpNeededForLevel === 0
                    ? 0
                    : totalProgress.xpInLevel / totalProgress.xpNeededForLevel
                }
              >
                <Ionicons
                  name={(titleDim?.iconName as never) ?? ('person' as never)}
                  size={56}
                  color={titleDim?.color ?? tokens.brand.violet2}
                />
              </LevelRing>
              <View style={styles.heroInfo}>
                <Text style={styles.name} numberOfLines={1}>
                  {profile.display_name}
                </Text>
                <Text style={styles.levelLine}>Level {totalProgress.level}</Text>
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
                    <Text style={[styles.titleText, { color: titleDim.color }]}>
                      {title.label}
                    </Text>
                  </View>
                )}
                <View style={styles.totalBar}>
                  <ProgressBar
                    value={totalProgress.xpInLevel}
                    max={totalProgress.xpNeededForLevel}
                    color={tokens.brand.violet}
                    height={6}
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

            <View style={styles.statsRow}>
              <View style={styles.statBlock}>
                <View style={styles.statTop}>
                  <Ionicons name="flame" size={14} color={tokens.semantic.warn} />
                  <Text style={[styles.statValue, { color: tokens.semantic.warn }]}>
                    {streak.data?.currentStreak ?? 0}
                  </Text>
                </View>
                <Text style={styles.statLabel}>Day streak</Text>
              </View>
              <View style={styles.statBlock}>
                <View style={styles.statTop}>
                  <Ionicons name="flash" size={14} color={tokens.semantic.xp} />
                  <Text style={[styles.statValue, { color: tokens.semantic.xp }]}>
                    {char.total_xp.toLocaleString()}
                  </Text>
                </View>
                <Text style={styles.statLabel}>Total XP</Text>
              </View>
              <View style={styles.statBlock}>
                <View style={styles.statTop}>
                  <CoinIcon size={14} />
                  <Text style={[styles.statValue, { color: tokens.semantic.coin }]}>
                    {char.coins.toLocaleString()}
                  </Text>
                </View>
                <Text style={styles.statLabel}>Coins</Text>
              </View>
            </View>

            {/* Trophy strip — compact identity proof. Tap → /skills. */}
            {topBadges.length > 0 && (
              <Pressable
                onPress={() => router.push('/skills')}
                style={({ pressed }) => [
                  styles.trophyStrip,
                  pressed && { opacity: 0.85 },
                ]}
                hitSlop={4}
              >
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.trophyScroll}
                >
                  {topBadges.slice(0, 8).map((b, i) => (
                    <View key={`${b.skillId}-${b.tier}-${i}`} style={styles.trophyItem}>
                      <TierMedal tier={b.tier} size={36} />
                      <Text style={styles.trophyLabel} numberOfLines={1}>
                        {b.skillName}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
                <Text style={styles.trophyCount}>
                  {topBadges.length} {topBadges.length === 1 ? 'badge' : 'badges'}
                </Text>
              </Pressable>
            )}
          </View>

          {/* ── PILLAR 2 · DEDICAÇÃO ────────────────────────────
            * "O que estou fazendo?" — dopaminergic.
            * 6-col XP stat block per dim, tappable to drill in.
            */}
          <PillarCard
            eyebrow="DEDICAÇÃO"
            question="O que estou fazendo?"
            tone="dopaminergic"
            iconName="flash"
            cta={{
              label: 'Ver quests',
              onPress: () => router.push('/quests'),
            }}
          >
            <View style={styles.catStatBlock}>
              {DIMENSION_ORDER.map((id) => {
                const meta = DIMENSION_META[id];
                const row = dimMap.get(id);
                const xp = row?.xp ?? 0;
                const lp = levelProgress(xp);
                return (
                  <Pressable
                    key={id}
                    style={({ pressed }) => [
                      styles.statCol,
                      pressed && { opacity: 0.65 },
                    ]}
                    onPress={() =>
                      router.push({ pathname: '/dimension/[id]', params: { id } })
                    }
                  >
                    <Ionicons
                      name={meta.iconName as never}
                      size={16}
                      color={meta.color}
                    />
                    <Text style={[styles.statAbbrev, { color: meta.color }]}>
                      {DIM_ABBREV[id]}
                    </Text>
                    <Text style={styles.statBigLevel}>{lp.level}</Text>
                    <View style={styles.statBarWrap}>
                      <ProgressBar
                        value={lp.xpInLevel}
                        max={lp.xpNeededForLevel}
                        color={meta.color}
                        height={3}
                      />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </PillarCard>

          {/* ── PILLAR 3 · SKILLS ──────────────────────────────
            * "No que fiquei melhor?" — ceremonial.
            * Top medals per dim + count, full list lives at /skills.
            */}
          <PillarCard
            eyebrow="SKILLS"
            question="No que fiquei melhor?"
            tone="ceremonious"
            iconName="trophy"
            cta={{
              label: 'Ver todas as skills',
              onPress: () => router.push('/skills'),
            }}
          >
            {skillStates.isLoading ? (
              <View style={{ paddingVertical: tokens.space[5] }}>
                <ActivityIndicator color={tokens.semantic.coin} />
              </View>
            ) : (skillStates.data ?? []).length === 0 ? (
              <Text style={styles.skillsEmpty}>
                Comece a registrar PRs no Skills Hub pra ganhar medalhas.
              </Text>
            ) : (
              <View style={styles.skillsTopList}>
                {DIMENSION_ORDER.filter((id) => skillsByDim.has(id)).map((id) => {
                  const meta = DIMENSION_META[id];
                  const skills = (skillsByDim.get(id) ?? [])
                    .slice()
                    .sort(
                      (a, b) =>
                        TIER_RANK[b.currentTier.tier_name] -
                        TIER_RANK[a.currentTier.tier_name],
                    );
                  const top = skills[0];
                  if (!top) return null;
                  return (
                    <Pressable
                      key={id}
                      onPress={() =>
                        router.push({
                          pathname: '/skill/[id]',
                          params: { id: top.skill.id },
                        })
                      }
                      style={({ pressed }) => [
                        styles.skillsTopRow,
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <TierMedal tier={top.currentTier.tier_name} size={28} />
                      <View style={styles.skillsTopBody}>
                        <Text style={styles.skillsTopName} numberOfLines={1}>
                          {top.skill.display_name}
                        </Text>
                        <Text
                          style={[styles.skillsTopDim, { color: meta.color }]}
                          numberOfLines={1}
                        >
                          {meta.label.toUpperCase()} ·{' '}
                          {top.currentTier.tier_name.toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.skillsTopPr}>
                        {top.currentPr}
                        <Text style={styles.skillsTopUnit}> {top.skill.unit}</Text>
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </PillarCard>
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
    paddingTop: tokens.space[3],
    gap: tokens.space[4],
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
  titleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: tokens.space[3],
    paddingVertical: 4,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginTop: 2,
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
  statsRow: {
    flexDirection: 'row',
    gap: tokens.space[2],
  },
  statBlock: {
    flex: 1,
    backgroundColor: tokens.bg.glass,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.border.base,
    paddingHorizontal: tokens.space[3],
    paddingVertical: tokens.space[3],
    gap: 4,
  },
  statTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 16,
    lineHeight: 18,
    color: tokens.text.hi,
  },
  statLabel: {
    ...tokens.type.caption,
    color: tokens.text.mid,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 10,
  },

  // Trophy strip
  trophyStrip: {
    backgroundColor: tokens.bg.glass,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.border.base,
    paddingVertical: tokens.space[3],
    paddingLeft: tokens.space[3],
    paddingRight: tokens.space[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
  },
  trophyScroll: {
    gap: tokens.space[3],
    alignItems: 'center',
  },
  trophyItem: {
    width: 64,
    alignItems: 'center',
    gap: 2,
  },
  trophyLabel: {
    ...tokens.type.caption,
    color: tokens.text.hi,
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    textAlign: 'center',
  },
  trophyCount: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
    color: tokens.semantic.coin,
    letterSpacing: 0.5,
  },

  // Dedicação stat block
  catStatBlock: {
    flexDirection: 'row',
    paddingVertical: tokens.space[2],
    gap: 2,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: tokens.space[2],
    paddingHorizontal: 2,
  },
  statAbbrev: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 9,
    letterSpacing: 1,
    marginTop: 2,
  },
  statBigLevel: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 22,
    lineHeight: 24,
    color: tokens.text.hi,
    marginTop: 1,
  },
  statBarWrap: {
    width: '85%',
    marginTop: 4,
  },

  // Skills top list
  skillsEmpty: {
    ...tokens.type.body,
    color: tokens.text.mid,
    paddingVertical: tokens.space[3],
    textAlign: 'center',
  },
  skillsTopList: {
    gap: tokens.space[2],
  },
  skillsTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    paddingVertical: tokens.space[2],
  },
  skillsTopBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  skillsTopName: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: tokens.text.hi,
  },
  skillsTopDim: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  skillsTopPr: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 16,
    color: tokens.text.hi,
  },
  skillsTopUnit: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 10,
    color: tokens.text.dim,
  },
});
