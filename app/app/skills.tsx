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
import type { DimensionId, SkillState, TierName } from '@/lib/db/types';
import { tokens } from '@/theme';
import { DIMENSION_META, DIMENSION_ORDER } from '@/theme/dimensions';

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

export default function SkillsHubScreen() {
  const router = useRouter();
  const skillStates = useSkillStates();
  const [query, setQuery] = useState('');

  const summary = useMemo(
    () => totals(skillStates.data ?? []),
    [skillStates.data],
  );

  const filtered = useMemo(() => {
    const list = skillStates.data ?? [];
    const q = query.trim().toLowerCase();
    return q.length === 0
      ? list
      : list.filter((s) => s.skill.display_name.toLowerCase().includes(q));
  }, [skillStates.data, query]);

  const skillsByDim = useMemo(() => {
    const map = new Map<DimensionId, SkillState[]>();
    for (const s of filtered) {
      const arr = map.get(s.skill.dimension_id) ?? [];
      arr.push(s);
      map.set(s.skill.dimension_id, arr);
    }
    return map;
  }, [filtered]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenBackground>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.6 }]}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={22} color={tokens.text.hi} />
          </Pressable>
          <Text style={styles.title}>All Skills</Text>
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/skill-form',
                params: {},
              })
            }
            style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.6 }]}
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
          {/* Stats strip */}
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

          {/* Search */}
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={16} color={tokens.text.dim} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search skills..."
              placeholderTextColor={tokens.text.faint}
              style={styles.searchInput}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={tokens.text.dim} />
              </Pressable>
            )}
          </View>

          {/* Body */}
          {skillStates.isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={tokens.brand.violet2} />
            </View>
          ) : filtered.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons
                name={query ? 'search' : 'sparkles'}
                size={32}
                color={tokens.text.dim}
              />
              <Text style={styles.emptyTitle}>
                {query ? 'No matches' : 'No skills yet'}
              </Text>
              <Text style={styles.emptySub}>
                {query
                  ? `Nothing matches "${query}"`
                  : 'Create your first skill with the + button.'}
              </Text>
            </View>
          ) : (
            <View style={{ gap: tokens.space[3] }}>
              {DIMENSION_ORDER.filter((id) => skillsByDim.has(id)).map((id) => {
                const meta = DIMENSION_META[id];
                const skills = skillsByDim.get(id) ?? [];
                return (
                  <View key={id} style={styles.groupCard}>
                    <View style={styles.groupHeader}>
                      <View
                        style={[styles.groupIcon, { backgroundColor: meta.bg }]}
                      >
                        <Ionicons
                          name={meta.iconName as never}
                          size={14}
                          color={meta.color}
                        />
                      </View>
                      <Text style={styles.groupTitle}>{meta.label}</Text>
                      <Text style={styles.groupCount}>{skills.length}</Text>
                    </View>
                    <View style={styles.groupBody}>
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
                              {s.skill.description ? (
                                <Text
                                  style={styles.skillItemDesc}
                                  numberOfLines={1}
                                >
                                  {s.skill.description}
                                </Text>
                              ) : (
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
                              )}
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
  groupCard: {
    backgroundColor: tokens.bg.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.border.base,
    overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[3],
    borderBottomWidth: 1,
    borderBottomColor: tokens.border.divider,
  },
  groupIcon: {
    width: 26,
    height: 26,
    borderRadius: tokens.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupTitle: {
    flex: 1,
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 12,
    color: tokens.text.hi,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  groupCount: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    color: tokens.text.dim,
  },
  groupBody: {
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
  skillItemDesc: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    color: tokens.text.mid,
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
