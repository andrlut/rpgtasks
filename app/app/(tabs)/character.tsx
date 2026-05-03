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
import { LevelRing } from '@/components/LevelRing';
import { ProgressBar } from '@/components/ProgressBar';
import { ScreenBackground } from '@/components/ScreenBackground';
import { TierMedal } from '@/components/TierMedal';
import { useCharacter } from '@/lib/api/character';
import { useRewards } from '@/lib/api/rewards';
import { useSkillStates } from '@/lib/api/skills';
import { useStreak } from '@/lib/api/streak';
import type {
  CharacterDimension,
  DimensionId,
  Reward,
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
 * Featured skills: rank by tier achieved (descending), then by progress to next.
 * Caller takes the top N for display.
 */
function rankSkills(states: SkillState[]): SkillState[] {
  return [...states].sort((a, b) => {
    const rankDiff =
      TIER_RANK[b.currentTier.tier_name] - TIER_RANK[a.currentTier.tier_name];
    if (rankDiff !== 0) return rankDiff;
    return b.currentPr - a.currentPr;
  });
}

/**
 * Badges = every non-beginner tier the user has reached, across all skills.
 * Each entry is one (skill, tier) badge unlocked.
 */
function deriveBadges(states: SkillState[]): { skillId: string; skillName: string; tier: TierName }[] {
  const badges: { skillId: string; skillName: string; tier: TierName }[] = [];
  for (const s of states) {
    const reached = TIER_RANK[s.currentTier.tier_name];
    if (reached === 0) continue;
    // include all tiers up to and including current (sorted ascending then we reverse)
    for (const tier of s.tiers.sort((a, b) => a.sort_order - b.sort_order)) {
      if (s.currentPr >= tier.threshold && tier.tier_name !== 'beginner') {
        badges.push({
          skillId: s.skill.id,
          skillName: s.skill.display_name,
          tier: tier.tier_name,
        });
      }
    }
  }
  // sort by tier desc so the rare ones (Master, Gold) come first
  return badges.sort((a, b) => TIER_RANK[b.tier] - TIER_RANK[a.tier]);
}

interface RewardsSummary {
  available: number;
  next: Reward | null;
}

function summarizeRewards(rewards: Reward[], coins: number): RewardsSummary {
  let available = 0;
  let next: Reward | null = null;
  for (const r of rewards) {
    if (r.cost <= coins) {
      available++;
    } else if (!next || r.cost < next.cost) {
      next = r;
    }
  }
  return { available, next };
}

export default function CharacterScreen() {
  const router = useRouter();
  const character = useCharacter();
  const skillStates = useSkillStates();
  const streak = useStreak();
  const rewards = useRewards();

  const title = useMemo(
    () => deriveTitle(character.data?.dimensions ?? []),
    [character.data?.dimensions],
  );
  const featured = useMemo(
    () => rankSkills(skillStates.data ?? []).slice(0, 4),
    [skillStates.data],
  );
  const badges = useMemo(
    () => deriveBadges(skillStates.data ?? []),
    [skillStates.data],
  );
  const summary = useMemo(
    () =>
      summarizeRewards(rewards.data ?? [], character.data?.character.coins ?? 0),
    [rewards.data, character.data?.character.coins],
  );

  const states = skillStates.data ?? [];
  const rewardsList = rewards.data ?? [];

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

  // Map dim id → dim row
  const dimMap = new Map<DimensionId, CharacterDimension>(
    dimensions.map((d) => [d.dimension_id, d]),
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenBackground>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={
                character.isRefetching ||
                skillStates.isRefetching ||
                rewards.isRefetching
              }
              onRefresh={() => {
                character.refetch();
                skillStates.refetch();
                rewards.refetch();
              }}
              tintColor={tokens.brand.violet2}
            />
          }
        >
          {/* ── 1. HEADER ─────────────────────────────────────── */}
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
          </View>

          {/* ── 2. CATEGORIES ─────────────────────────────────── */}
          <Text style={styles.sectionTitle}>Categories</Text>
          <View style={styles.dimensionList}>
            {DIMENSION_ORDER.map((id, idx) => {
              const meta = DIMENSION_META[id];
              const row = dimMap.get(id);
              const xp = row?.xp ?? 0;
              const lp = levelProgress(xp);
              const pct = lp.xpNeededForLevel === 0
                ? 0
                : Math.round((lp.xpInLevel / lp.xpNeededForLevel) * 100);
              return (
                <Pressable
                  key={id}
                  style={({ pressed }) => [
                    styles.dimRow,
                    idx > 0 && styles.dimRowDivider,
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={() =>
                    router.push({ pathname: '/dimension/[id]', params: { id } })
                  }
                >
                  <View style={[styles.dimRowIcon, { backgroundColor: meta.bg }]}>
                    <Ionicons name={meta.iconName as never} size={16} color={meta.color} />
                  </View>
                  <View style={styles.dimRowBody}>
                    <View style={styles.dimRowTopRow}>
                      <Text style={styles.dimRowLabel}>{meta.label}</Text>
                      <View style={styles.dimRowLevel}>
                        <Text style={styles.dimRowLevelLv}>LV</Text>
                        <Text style={[styles.dimRowLevelNum, { color: meta.color }]}>
                          {lp.level}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.dimRowBarWrap}>
                      <ProgressBar
                        value={lp.xpInLevel}
                        max={lp.xpNeededForLevel}
                        color={meta.color}
                        height={6}
                      />
                    </View>
                    <View style={styles.dimRowFooter}>
                      <Text style={styles.dimRowXp}>
                        {lp.xpInLevel.toLocaleString()} / {lp.xpNeededForLevel.toLocaleString()} XP
                      </Text>
                      <Text style={[styles.dimRowPct, { color: meta.color }]}>
                        {pct}%
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* ── 3. FEATURED SKILLS ────────────────────────────── */}
          {skillStates.isLoading ? (
            <View style={{ paddingVertical: tokens.space[5] }}>
              <ActivityIndicator color={tokens.brand.violet2} />
            </View>
          ) : featured.length > 0 ? (
            <>
              <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>Top Skills</Text>
                <Text style={styles.sectionMeta}>{states.length} total</Text>
              </View>
              <View style={styles.skillGrid}>
                {featured.map((s) => (
                  <Pressable
                    key={s.skill.id}
                    style={({ pressed }) => [
                      styles.skillCard,
                      pressed && { opacity: 0.7 },
                    ]}
                    onPress={() =>
                      router.push({
                        pathname: '/skill/[id]',
                        params: { id: s.skill.id },
                      })
                    }
                  >
                    <TierMedal tier={s.currentTier.tier_name} size={42} />
                    <Text style={styles.skillName} numberOfLines={1}>
                      {s.skill.display_name}
                    </Text>
                    <Text
                      style={[
                        styles.skillTier,
                        s.currentTier.tier_name === 'beginner' && {
                          color: tokens.text.dim,
                        },
                      ]}
                    >
                      {s.currentTier.tier_name.toUpperCase()}
                    </Text>
                    <Text style={styles.skillPr}>
                      {s.currentPr} {s.skill.unit}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}

          {/* ── 4. RECENT BADGES ──────────────────────────────── */}
          {badges.length > 0 && (
            <>
              <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>Badges</Text>
                <Text style={styles.sectionMeta}>{badges.length} earned</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.badgesScroll}
              >
                {badges.slice(0, 12).map((b, i) => (
                  <View key={`${b.skillId}-${b.tier}-${i}`} style={styles.badgeItem}>
                    <TierMedal tier={b.tier} size={48} />
                    <Text style={styles.badgeSkill} numberOfLines={1}>
                      {b.skillName}
                    </Text>
                    <Text style={styles.badgeTier}>{b.tier.toUpperCase()}</Text>
                  </View>
                ))}
              </ScrollView>
            </>
          )}

          {/* ── 5. REWARDS SUMMARY ────────────────────────────── */}
          <Text style={styles.sectionTitle}>Rewards</Text>
          <View style={styles.rewardsSummary}>
            <View style={styles.rewardsHeader}>
              <View style={styles.rewardsCoinPill}>
                <CoinIcon size={16} />
                <Text style={styles.rewardsCoinText}>
                  {char.coins.toLocaleString()}
                </Text>
              </View>
              <Text style={styles.rewardsAvailable}>
                {summary.available > 0
                  ? `${summary.available} available now`
                  : rewardsList.length === 0
                  ? 'No rewards yet'
                  : 'Keep grinding'}
              </Text>
            </View>
            {summary.next && (
              <View style={styles.rewardsNext}>
                <Text style={styles.rewardsEyebrow}>Next unlockable</Text>
                <View style={styles.rewardsNextRow}>
                  <Text style={styles.rewardsNextTitle} numberOfLines={1}>
                    {summary.next.title}
                  </Text>
                  <View style={styles.rewardsNextCost}>
                    <CoinIcon size={11} />
                    <Text style={styles.rewardsNextCostText}>
                      {summary.next.cost.toLocaleString()}
                    </Text>
                  </View>
                </View>
                <Text style={styles.rewardsNextDeficit}>
                  {(summary.next.cost - char.coins).toLocaleString()} coins to go
                </Text>
              </View>
            )}
            <Pressable
              onPress={() => router.push('/(tabs)/rewards')}
              style={({ pressed }) => [
                styles.openRewardsBtn,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={styles.openRewardsText}>Open Rewards</Text>
              <Ionicons name="arrow-forward" size={16} color={tokens.brand.violet2} />
            </Pressable>
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
  },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { ...tokens.type.body, color: tokens.text.mid },

  // Header
  heroBlock: {
    paddingTop: tokens.space[3],
    paddingBottom: tokens.space[4],
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

  // Section header
  sectionTitle: {
    ...tokens.type.eyebrow,
    color: tokens.text.mid,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: tokens.space[5],
    marginBottom: tokens.space[3],
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: tokens.space[5],
    marginBottom: tokens.space[3],
  },
  sectionMeta: {
    ...tokens.type.caption,
    color: tokens.text.dim,
    fontFamily: 'Manrope_600SemiBold',
  },

  // Categories — RPG sheet style: vertical rows in a single card
  dimensionList: {
    backgroundColor: tokens.bg.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.border.base,
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[2],
  },
  dimRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    paddingVertical: tokens.space[3],
  },
  dimRowDivider: {
    borderTopWidth: 1,
    borderTopColor: tokens.border.divider,
  },
  dimRowIcon: {
    width: 32,
    height: 32,
    borderRadius: tokens.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dimRowBody: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  dimRowTopRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  dimRowLabel: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 13,
    color: tokens.text.hi,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  dimRowLevel: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  dimRowLevelLv: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
    color: tokens.text.dim,
    letterSpacing: 1,
  },
  dimRowLevelNum: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 18,
    lineHeight: 18,
  },
  dimRowBarWrap: {
    marginTop: 2,
  },
  dimRowFooter: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  dimRowXp: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10,
    color: tokens.text.dim,
  },
  dimRowPct: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    letterSpacing: 0.3,
  },

  // Skills
  skillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.space[3],
  },
  skillCard: {
    width: '48%',
    flexGrow: 1,
    alignItems: 'center',
    backgroundColor: tokens.bg.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.border.base,
    paddingVertical: tokens.space[4],
    paddingHorizontal: tokens.space[3],
    gap: 4,
  },
  skillName: {
    ...tokens.type.body,
    color: tokens.text.hi,
    fontFamily: 'Manrope_700Bold',
    marginTop: tokens.space[2],
  },
  skillTier: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    color: tokens.semantic.coin,
    letterSpacing: 0.6,
  },
  skillPr: {
    ...tokens.type.caption,
    color: tokens.text.mid,
    fontSize: 11,
  },

  // Badges
  badgesScroll: {
    gap: tokens.space[3],
    paddingRight: tokens.space[2],
  },
  badgeItem: {
    width: 80,
    alignItems: 'center',
    gap: 2,
  },
  badgeSkill: {
    ...tokens.type.caption,
    color: tokens.text.hi,
    fontFamily: 'Manrope_700Bold',
    marginTop: 6,
    fontSize: 11,
    textAlign: 'center',
  },
  badgeTier: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 9,
    color: tokens.text.dim,
    letterSpacing: 0.5,
  },

  // Rewards summary
  rewardsSummary: {
    backgroundColor: tokens.bg.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.border.base,
    padding: tokens.space[4],
    gap: tokens.space[3],
  },
  rewardsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rewardsCoinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: tokens.space[3],
    paddingVertical: 5,
    borderRadius: tokens.radius.pill,
    backgroundColor: 'rgba(255,200,61,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,200,61,0.35)',
  },
  rewardsCoinText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 14,
    color: tokens.semantic.coin,
  },
  rewardsAvailable: {
    ...tokens.type.caption,
    color: tokens.text.hi,
    fontFamily: 'Manrope_700Bold',
  },
  rewardsNext: {
    paddingTop: tokens.space[3],
    borderTopWidth: 1,
    borderTopColor: tokens.border.divider,
    gap: 4,
  },
  rewardsEyebrow: {
    ...tokens.type.eyebrow,
    color: tokens.text.dim,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 10,
  },
  rewardsNextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.space[3],
  },
  rewardsNextTitle: {
    ...tokens.type.bodyLg,
    color: tokens.text.hi,
    fontFamily: 'Manrope_700Bold',
    flex: 1,
  },
  rewardsNextCost: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rewardsNextCostText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 13,
    color: tokens.semantic.coin,
  },
  rewardsNextDeficit: {
    ...tokens.type.caption,
    color: tokens.text.dim,
  },
  openRewardsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: tokens.space[3],
    borderRadius: tokens.radius.md,
    backgroundColor: 'rgba(123,92,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(123,92,255,0.35)',
  },
  openRewardsText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 13,
    color: tokens.brand.violet2,
    letterSpacing: 0.3,
  },
});
