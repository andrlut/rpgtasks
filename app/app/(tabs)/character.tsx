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
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CoinIcon } from '@/components/CoinIcon';
import { HexChart } from '@/components/HexChart';
import { LevelRing } from '@/components/LevelRing';
import { ProgressBar } from '@/components/ProgressBar';
import { ScreenBackground } from '@/components/ScreenBackground';
import { TierMedal } from '@/components/TierMedal';
import {
  useHeroSkillsExpand,
  useHydrateHeroSkillsExpand,
} from '@/lib/heroSkillsExpand';
import { pickSubScores, useCharacter } from '@/lib/api/character';
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

interface MedalCount {
  bronze: number;
  silver: number;
  gold: number;
  master: number;
}

/**
 * Per-dimension medal count: how many skills currently sit at each tier.
 * "Push-ups at Silver" + "Pull-ups at Bronze" → { bronze: 1, silver: 1 } for
 * Strength. Drives the chip beside each dim header in the Hero tab.
 */
function deriveMedalCountsByDim(
  states: SkillState[],
): Map<DimensionId, MedalCount> {
  const map = new Map<DimensionId, MedalCount>();
  for (const s of states) {
    const counts =
      map.get(s.skill.dimension_id) ?? { bronze: 0, silver: 0, gold: 0, master: 0 };
    const tier = s.currentTier.tier_name;
    if (tier !== 'beginner') {
      counts[tier as keyof MedalCount]++;
    }
    map.set(s.skill.dimension_id, counts);
  }
  return map;
}

const TIER_PILL_COLOR: Record<keyof MedalCount, string> = {
  bronze: '#E69559',
  silver: '#E8ECFF',
  gold: '#FFE08A',
  master: '#C2A1FF',
};

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
  const { width: screenWidth } = useWindowDimensions();
  // Chart bleeds outside the content padding to use the full screen width.
  const chartSize = Math.min(screenWidth - tokens.space[2] * 2, 480);

  useHydrateHeroSkillsExpand();
  const expanded = useHeroSkillsExpand((s) => s.expanded);
  const toggleExpand = useHeroSkillsExpand((s) => s.toggle);

  const title = useMemo(
    () => deriveTitle(character.data?.dimensions ?? []),
    [character.data?.dimensions],
  );
  const skillsByDim = useMemo(() => {
    const map = new Map<DimensionId, SkillState[]>();
    for (const s of skillStates.data ?? []) {
      const arr = map.get(s.skill.dimension_id) ?? [];
      arr.push(s);
      map.set(s.skill.dimension_id, arr);
    }
    return map;
  }, [skillStates.data]);
  const medalCounts = useMemo(
    () => deriveMedalCountsByDim(skillStates.data ?? []),
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

          {/* ── 2. HEX OF LIFE — subjective scores per sub ──── */}
          <View style={styles.hexHeader}>
            <Text style={styles.hexEyebrow}>SELF-ASSESSMENT</Text>
            <Text style={styles.hexEdit}>TAP TO EDIT</Text>
          </View>
          <Pressable
            onPress={() => router.push('/self-assessment')}
            style={({ pressed }) => [
              styles.hexBleed,
              pressed && { opacity: 0.85 },
            ]}
            hitSlop={4}
          >
            <HexChart
              scores={pickSubScores(character.data.subScores, 'self')}
              size={chartSize}
            />
          </Pressable>

          {/* ── 3. CATEGORIES (RPG stat block, XP per dim) ────── */}
          <Text style={styles.sectionTitle}>Dedication (XP)</Text>
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

          {/* ── 3. SKILLS BY CATEGORY (collapsible) ──────────── */}
          {skillStates.isLoading ? (
            <View style={{ paddingVertical: tokens.space[5] }}>
              <ActivityIndicator color={tokens.brand.violet2} />
            </View>
          ) : skillsByDim.size > 0 ? (
            <>
              <Text style={styles.sectionTitle}>Skills</Text>
              <View style={{ gap: tokens.space[3] }}>
                {DIMENSION_ORDER.filter((id) => skillsByDim.has(id)).map((id) => {
                  const meta = DIMENSION_META[id];
                  const skills = skillsByDim.get(id) ?? [];
                  const counts = medalCounts.get(id);
                  const isOpen = !!expanded[id];
                  return (
                    <View key={id} style={styles.skillsGroupCard}>
                      <Pressable
                        onPress={() => toggleExpand(id)}
                        style={({ pressed }) => [
                          styles.skillsGroupHeader,
                          isOpen && styles.skillsGroupHeaderOpen,
                          pressed && { opacity: 0.75 },
                        ]}
                        hitSlop={4}
                      >
                        <View
                          style={[
                            styles.skillsGroupIcon,
                            { backgroundColor: meta.bg },
                          ]}
                        >
                          <Ionicons
                            name={meta.iconName as never}
                            size={14}
                            color={meta.color}
                          />
                        </View>
                        <Text style={styles.skillsGroupTitle}>{meta.label}</Text>
                        <View style={styles.medalChips}>
                          {counts && counts.master > 0 && (
                            <View style={[styles.medalChip, { backgroundColor: 'rgba(194,161,255,0.18)' }]}>
                              <View style={[styles.medalDot, { backgroundColor: TIER_PILL_COLOR.master }]} />
                              <Text style={[styles.medalChipText, { color: TIER_PILL_COLOR.master }]}>{counts.master}</Text>
                            </View>
                          )}
                          {counts && counts.gold > 0 && (
                            <View style={[styles.medalChip, { backgroundColor: 'rgba(255,224,138,0.15)' }]}>
                              <View style={[styles.medalDot, { backgroundColor: TIER_PILL_COLOR.gold }]} />
                              <Text style={[styles.medalChipText, { color: TIER_PILL_COLOR.gold }]}>{counts.gold}</Text>
                            </View>
                          )}
                          {counts && counts.silver > 0 && (
                            <View style={[styles.medalChip, { backgroundColor: 'rgba(232,236,255,0.10)' }]}>
                              <View style={[styles.medalDot, { backgroundColor: TIER_PILL_COLOR.silver }]} />
                              <Text style={[styles.medalChipText, { color: TIER_PILL_COLOR.silver }]}>{counts.silver}</Text>
                            </View>
                          )}
                          {counts && counts.bronze > 0 && (
                            <View style={[styles.medalChip, { backgroundColor: 'rgba(230,149,89,0.18)' }]}>
                              <View style={[styles.medalDot, { backgroundColor: TIER_PILL_COLOR.bronze }]} />
                              <Text style={[styles.medalChipText, { color: TIER_PILL_COLOR.bronze }]}>{counts.bronze}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.skillsGroupCount}>{skills.length}</Text>
                        <Ionicons
                          name={isOpen ? 'chevron-up' : 'chevron-down'}
                          size={16}
                          color={tokens.text.dim}
                        />
                      </Pressable>
                      {isOpen && (
                        <View style={styles.skillsGroupBody}>
                          {skills.map((s, i) => (
                            <Pressable
                              key={s.skill.id}
                              style={({ pressed }) => [
                                styles.skillItem,
                                i > 0 && styles.skillItemDivider,
                                pressed && { opacity: 0.7 },
                              ]}
                              onPress={() =>
                                router.push({
                                  pathname: '/skill/[id]',
                                  params: { id: s.skill.id },
                                })
                              }
                            >
                              <TierMedal
                                tier={s.currentTier.tier_name}
                                size={32}
                              />
                              <View style={styles.skillItemBody}>
                                <Text
                                  style={styles.skillItemName}
                                  numberOfLines={1}
                                >
                                  {s.skill.display_name}
                                </Text>
                                <Text style={styles.skillItemTier}>
                                  {s.currentTier.tier_name.toUpperCase()}
                                  {s.nextTier && (
                                    <Text style={styles.skillItemNext}>
                                      {' '}
                                      · {Math.max(0, s.nextTier.threshold - s.currentPr)}{' '}
                                      to {s.nextTier.tier_name}
                                    </Text>
                                  )}
                                </Text>
                              </View>
                              <View style={styles.skillItemRight}>
                                <Text style={styles.skillItemPr}>
                                  {s.currentPr}
                                </Text>
                                <Text style={styles.skillItemUnit}>
                                  {s.skill.unit}
                                </Text>
                              </View>
                              <Ionicons
                                name="chevron-forward"
                                size={16}
                                color={tokens.text.dim}
                              />
                            </Pressable>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}
                <Pressable
                  onPress={() => router.push('/skills')}
                  style={({ pressed }) => [
                    styles.seeAllSkillsBtn,
                    pressed && { opacity: 0.85 },
                  ]}
                  hitSlop={4}
                >
                  <Ionicons name="grid" size={16} color={tokens.brand.violet2} />
                  <Text style={styles.seeAllSkillsText}>See all skills</Text>
                  <Ionicons
                    name="arrow-forward"
                    size={16}
                    color={tokens.brand.violet2}
                  />
                </Pressable>
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

  // Hex header sits in the normal padded content; chart below bleeds wider.
  hexHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: tokens.space[5],
    marginBottom: tokens.space[3],
  },
  hexEyebrow: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    color: tokens.text.mid,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  hexEdit: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    color: tokens.brand.violet2,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  hexBleed: {
    marginHorizontal: -tokens.space[4],
    paddingHorizontal: tokens.space[2],
  },

  // Categories — compact stat block, 6 cols across, BG3-inspired
  catStatBlock: {
    flexDirection: 'row',
    backgroundColor: tokens.bg.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.border.base,
    paddingHorizontal: tokens.space[2],
    paddingVertical: tokens.space[3],
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

  // Skills — grouped by category
  skillsGroupCard: {
    backgroundColor: tokens.bg.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.border.base,
    overflow: 'hidden',
  },
  skillsGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[3],
  },
  skillsGroupHeaderOpen: {
    borderBottomWidth: 1,
    borderBottomColor: tokens.border.divider,
  },
  medalChips: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    justifyContent: 'flex-end',
  },
  medalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: tokens.radius.pill,
  },
  medalDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  medalChipText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
  },
  seeAllSkillsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: tokens.space[3],
    borderRadius: tokens.radius.md,
    backgroundColor: 'rgba(123,92,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(123,92,255,0.30)',
    borderStyle: 'dashed',
    marginTop: tokens.space[1],
  },
  seeAllSkillsText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 13,
    color: tokens.brand.violet2,
    letterSpacing: 0.3,
  },
  skillsGroupIcon: {
    width: 26,
    height: 26,
    borderRadius: tokens.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skillsGroupTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 12,
    color: tokens.text.hi,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  skillsGroupCount: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    color: tokens.text.dim,
  },
  skillsGroupBody: {
    paddingHorizontal: tokens.space[4],
  },
  skillItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    paddingVertical: tokens.space[3],
  },
  skillItemDivider: {
    borderTopWidth: 1,
    borderTopColor: tokens.border.divider,
  },
  skillItemBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  skillItemName: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: tokens.text.hi,
  },
  skillItemTier: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    color: tokens.semantic.coin,
    letterSpacing: 0.5,
  },
  skillItemNext: {
    fontFamily: 'Manrope_500Medium',
    color: tokens.text.dim,
    letterSpacing: 0,
  },
  skillItemRight: {
    alignItems: 'flex-end',
  },
  skillItemPr: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 16,
    lineHeight: 18,
    color: tokens.text.hi,
  },
  skillItemUnit: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 10,
    color: tokens.text.dim,
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
