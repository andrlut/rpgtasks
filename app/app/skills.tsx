import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenBackground } from '@/components/ScreenBackground';
import { TierMedal } from '@/components/TierMedal';
import { useSkillStates } from '@/lib/api/skills';
import type { DimensionId, SkillState, SubId, TierName } from '@/lib/db/types';
import { tokens } from '@/theme';
import {
  DIMENSION_META,
  DIMENSION_ORDER,
  SUB_META,
  SUBS_BY_DIM,
} from '@/theme/dimensions';

const TIER_RANK: Record<TierName, number> = {
  beginner: 0,
  bronze: 1,
  silver: 2,
  gold: 3,
  master: 4,
};

interface MedalTotals {
  tracked: number;
  medals: number;
  topTier: TierName;
}

function totals(states: SkillState[]): MedalTotals {
  let medals = 0;
  let topRank = 0;
  let topTier: TierName = 'beginner';
  for (const s of states) {
    const r = TIER_RANK[s.currentTier.tier_name];
    if (r > 0) medals++;
    if (r > topRank) {
      topRank = r;
      topTier = s.currentTier.tier_name;
    }
  }
  return { tracked: states.length, medals, topTier };
}

/**
 * Skills hub — single category at a time.
 *
 * The user picks one of the 6 dimensions via a chip row at the top; only
 * that dim's skills render below, organized by sub. Skills with
 * sub_id = null in the active dim land under "Outros". Search filters
 * within the active dim. This respects the rule: never lump categories
 * together; always split, and let the user drill in.
 */
export default function SkillsHubScreen() {
  const router = useRouter();
  const skillStates = useSkillStates();
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeDim, setActiveDim] = useState<DimensionId>('health');

  const summary = useMemo(
    () => totals(skillStates.data ?? []),
    [skillStates.data],
  );

  // Per-dim counts for the chip subtext (medals in that dim).
  const medalsByDim = useMemo(() => {
    const map = new Map<DimensionId, number>();
    for (const s of skillStates.data ?? []) {
      if (s.currentTier.tier_name === 'beginner') continue;
      map.set(s.skill.dimension_id, (map.get(s.skill.dimension_id) ?? 0) + 1);
    }
    return map;
  }, [skillStates.data]);

  // Filter to active dim + search.
  const dimSkills = useMemo(() => {
    const all = skillStates.data ?? [];
    const q = query.trim().toLowerCase();
    return all.filter((s) => {
      if (s.skill.dimension_id !== activeDim) return false;
      if (q && !s.skill.display_name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [skillStates.data, query, activeDim]);

  // Group active-dim skills by sub_id (with a virtual "outros" bucket for nulls).
  const groupedBySub = useMemo(() => {
    const subIds = SUBS_BY_DIM[activeDim];
    const buckets = new Map<SubId | 'outros', SkillState[]>();
    for (const sub of subIds) buckets.set(sub, []);
    buckets.set('outros', []);
    for (const s of dimSkills) {
      const key: SubId | 'outros' = s.skill.sub_id ?? 'outros';
      const arr = buckets.get(key) ?? [];
      arr.push(s);
      buckets.set(key, arr);
    }
    // Drop empty buckets but preserve canonical sub order, then "outros" last.
    const result: { key: SubId | 'outros'; skills: SkillState[] }[] = [];
    for (const sub of subIds) {
      const arr = buckets.get(sub) ?? [];
      if (arr.length > 0) result.push({ key: sub, skills: arr });
    }
    const outros = buckets.get('outros') ?? [];
    if (outros.length > 0) result.push({ key: 'outros', skills: outros });
    return result;
  }, [dimSkills, activeDim]);

  const activeMeta = DIMENSION_META[activeDim];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenBackground>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.iconButton,
              pressed && { opacity: 0.6 },
            ]}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={22} color={tokens.text.hi} />
          </Pressable>
          <Text style={styles.title}>All Skills</Text>
          <Pressable
            onPress={() => router.push({ pathname: '/skill-form', params: {} })}
            style={({ pressed }) => [
              styles.iconButton,
              pressed && { opacity: 0.6 },
            ]}
            hitSlop={8}
          >
            <Ionicons name="add" size={22} color={tokens.brand.violet2} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Stats strip — totals across all dims (kept as global anchor). */}
          <View style={styles.statsStrip}>
            <View style={styles.statBlock}>
              <Text style={styles.statValue}>{summary.tracked}</Text>
              <Text style={styles.statLabel}>Skills tracked</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBlock}>
              <Text style={[styles.statValue, { color: tokens.semantic.coin }]}>
                {summary.medals}
              </Text>
              <Text style={styles.statLabel}>Medals earned</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={[styles.statBlock, { alignItems: 'center' }]}>
              <TierMedal tier={summary.topTier} size={28} />
              <Text style={styles.statLabel}>Best tier</Text>
            </View>
          </View>

          {/* Category chips — single row, all 6 visible, icon-only + medal
              count badge. Search icon at the end toggles the input below. */}
          <View style={styles.chipsRow}>
            {DIMENSION_ORDER.map((id) => {
              const meta = DIMENSION_META[id];
              const active = id === activeDim;
              const medals = medalsByDim.get(id) ?? 0;
              return (
                <Pressable
                  key={id}
                  onPress={() => setActiveDim(id)}
                  style={({ pressed }) => [
                    styles.chip,
                    active && {
                      backgroundColor: meta.bg,
                      borderColor: meta.color,
                    },
                    pressed && { opacity: 0.85 },
                  ]}
                  hitSlop={2}
                  accessibilityLabel={meta.label}
                >
                  <Ionicons
                    name={meta.iconName as never}
                    size={16}
                    color={active ? meta.color : tokens.text.dim}
                  />
                  {medals > 0 && (
                    <View
                      style={[
                        styles.chipBadge,
                        active && { borderColor: meta.color },
                      ]}
                    >
                      <Text style={styles.chipBadgeText}>{medals}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => {
                if (searchOpen) setQuery('');
                setSearchOpen((v) => !v);
              }}
              style={({ pressed }) => [
                styles.searchIconBtn,
                searchOpen && {
                  backgroundColor: 'rgba(155,130,255,0.15)',
                  borderColor: tokens.brand.violet2,
                },
                pressed && { opacity: 0.7 },
              ]}
              hitSlop={2}
              accessibilityLabel="Search"
            >
              <Ionicons
                name={searchOpen ? 'close' : 'search'}
                size={16}
                color={searchOpen ? tokens.brand.violet2 : tokens.text.dim}
              />
            </Pressable>
          </View>

          {searchOpen && (
            <View style={styles.searchWrap}>
              <Ionicons name="search" size={16} color={tokens.text.dim} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={`Search in ${activeMeta.label}...`}
                placeholderTextColor={tokens.text.faint}
                style={styles.searchInput}
                autoCorrect={false}
                autoCapitalize="none"
                autoFocus
              />
              {query.length > 0 && (
                <Pressable onPress={() => setQuery('')} hitSlop={8}>
                  <Ionicons
                    name="close-circle"
                    size={16}
                    color={tokens.text.dim}
                  />
                </Pressable>
              )}
            </View>
          )}

          {/* Body */}
          {skillStates.isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={tokens.brand.violet2} />
            </View>
          ) : groupedBySub.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons
                name={query ? 'search' : (activeMeta.iconName as never)}
                size={32}
                color={tokens.text.dim}
              />
              <Text style={styles.emptyTitle}>
                {query ? 'Sem resultados' : `Nada em ${activeMeta.label}`}
              </Text>
              <Text style={styles.emptySub}>
                {query
                  ? `Nada combina com "${query}"`
                  : 'Toque + pra criar uma skill nessa categoria.'}
              </Text>
            </View>
          ) : (
            <View style={styles.subGroups}>
              {groupedBySub.map(({ key, skills }) => {
                const subLabel =
                  key === 'outros'
                    ? 'Outros'
                    : SUB_META[key as SubId].label;
                const subIconName =
                  key === 'outros'
                    ? 'apps'
                    : (SUB_META[key as SubId].iconName as never);
                return (
                  <View key={key} style={styles.subGroup}>
                    <View style={styles.subHeader}>
                      <Ionicons
                        name={subIconName}
                        size={13}
                        color={activeMeta.color}
                      />
                      <Text
                        style={[styles.subLabel, { color: activeMeta.color }]}
                      >
                        {subLabel.toUpperCase()}
                      </Text>
                      <Text style={styles.subCount}>{skills.length}</Text>
                    </View>
                    <View style={styles.subBody}>
                      {skills.map((s, i) => {
                        const isCustom = s.skill.character_id !== null;
                        return (
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
                              size={36}
                            />
                            <View style={styles.skillItemBody}>
                              <View style={styles.skillItemTitleRow}>
                                <Text
                                  style={styles.skillItemName}
                                  numberOfLines={1}
                                >
                                  {s.skill.display_name}
                                </Text>
                                {isCustom && (
                                  <View style={styles.customChip}>
                                    <Text style={styles.customChipText}>
                                      CUSTOM
                                    </Text>
                                  </View>
                                )}
                              </View>
                              <Text style={styles.skillItemTier}>
                                {s.currentTier.tier_name.toUpperCase()}
                                {s.nextTier && (
                                  <Text style={styles.skillItemNext}>
                                    {' · '}
                                    {Math.max(
                                      0,
                                      s.nextTier.threshold - s.currentPr,
                                    )}{' '}
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
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </ScreenBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.bg.deep },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[2],
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.bg.surface,
  },
  title: {
    ...tokens.type.h3,
    color: tokens.text.hi,
  },
  content: {
    paddingHorizontal: tokens.space[4],
    paddingBottom: tokens.space[8],
  },
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.bg.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.border.base,
    paddingVertical: tokens.space[3],
    paddingHorizontal: tokens.space[3],
    marginTop: tokens.space[2],
  },
  statBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 22,
    lineHeight: 24,
    color: tokens.text.hi,
  },
  statLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
    color: tokens.text.mid,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: tokens.border.divider,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingTop: tokens.space[4],
    paddingBottom: tokens.space[2],
  },
  chip: {
    flex: 1,
    minWidth: 0,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.border.base,
    backgroundColor: tokens.bg.surface,
  },
  chipBadge: {
    minWidth: 16,
    paddingHorizontal: 4,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255, 200, 61, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 200, 61, 0.30)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipBadgeText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 9,
    color: tokens.semantic.coin,
  },
  searchIconBtn: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.border.base,
    backgroundColor: tokens.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    backgroundColor: tokens.bg.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.border.base,
    paddingHorizontal: tokens.space[3],
    height: 44,
    marginTop: tokens.space[3],
    marginBottom: tokens.space[4],
  },
  searchInput: {
    flex: 1,
    color: tokens.text.hi,
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
  },
  loadingBox: {
    paddingVertical: tokens.space[8],
    alignItems: 'center',
  },
  emptyBox: {
    paddingVertical: tokens.space[8],
    alignItems: 'center',
    gap: tokens.space[2],
  },
  emptyTitle: {
    ...tokens.type.h3,
    color: tokens.text.hi,
    marginTop: tokens.space[2],
  },
  emptySub: {
    ...tokens.type.body,
    color: tokens.text.mid,
    textAlign: 'center',
    paddingHorizontal: tokens.space[6],
  },
  subGroups: {
    gap: tokens.space[3],
  },
  subGroup: {
    backgroundColor: tokens.bg.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.border.base,
    overflow: 'hidden',
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[3],
    borderBottomWidth: 1,
    borderBottomColor: tokens.border.divider,
  },
  subLabel: {
    flex: 1,
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
    letterSpacing: 1.2,
  },
  subCount: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    color: tokens.text.dim,
  },
  subBody: {
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
  skillItemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  skillItemName: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: tokens.text.hi,
    flexShrink: 1,
  },
  customChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: tokens.radius.pill,
    backgroundColor: 'rgba(123,92,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(123,92,255,0.4)',
  },
  customChipText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 8,
    color: tokens.brand.violet2,
    letterSpacing: 0.6,
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
});
