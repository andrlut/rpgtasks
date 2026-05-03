import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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
import { SkillRow } from '@/components/SkillRow';
import { useCharacter } from '@/lib/api/character';
import { useSkillStates } from '@/lib/api/skills';
import { useStreak } from '@/lib/api/streak';
import type { CharacterDimension, DimensionId } from '@/lib/db/types';
import { levelProgress } from '@/lib/xp';
import { tokens } from '@/theme';
import { DIMENSION_META, DIMENSION_ORDER } from '@/theme/dimensions';

export default function CharacterScreen() {
  const router = useRouter();
  const character = useCharacter();
  const skillStates = useSkillStates();
  const streak = useStreak();

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
            refreshing={character.isRefetching || skillStates.isRefetching}
            onRefresh={() => {
              character.refetch();
              skillStates.refetch();
            }}
            tintColor={tokens.brand.violet2}
          />
        }
      >
        <View style={styles.heroBlock}>
          <View style={styles.eyebrowRow}>
            <Text style={styles.heroEyebrow}>Your Hero</Text>
          </View>
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
              <Ionicons name="person" size={56} color={tokens.brand.violet2} />
            </LevelRing>
            <View style={styles.heroInfo}>
              <Text style={styles.name} numberOfLines={1}>
                {profile.display_name}
              </Text>
              <Text style={styles.subtitle}>
                {totalProgress.xpInLevel} / {totalProgress.xpNeededForLevel} XP
              </Text>
              <View style={styles.totalBar}>
                <ProgressBar
                  value={totalProgress.xpInLevel}
                  max={totalProgress.xpNeededForLevel}
                  color={tokens.brand.violet}
                  height={6}
                />
              </View>
              <Text style={styles.toNext}>
                {Math.max(0, totalProgress.xpNeededForLevel - totalProgress.xpInLevel)} XP
                to Level {totalProgress.level + 1}
              </Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBlock}>
              <View style={styles.statTop}>
                <CoinIcon size={14} />
                <Text style={[styles.statValue, { color: tokens.semantic.coin }]}>
                  {char.coins.toLocaleString()}
                </Text>
              </View>
              <Text style={styles.statLabel}>Coins</Text>
            </View>
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
          </View>
        </View>

        <Text style={styles.sectionTitle}>Dimensions</Text>

        <View style={styles.dimensionGrid}>
          {DIMENSION_ORDER.map((id) => {
            const meta = DIMENSION_META[id];
            const row = dimMap.get(id);
            const xp = row?.xp ?? 0;
            const lp = levelProgress(xp);
            return (
              <Pressable
                key={id}
                style={({ pressed }) => [styles.dimCard, pressed && styles.dimCardPressed]}
                onPress={() => router.push({ pathname: '/dimension/[id]', params: { id } })}
              >
                <View
                  style={[styles.dimBlob, { backgroundColor: meta.color }]}
                  pointerEvents="none"
                />
                <View style={[styles.dimIconWrap, { backgroundColor: meta.bg }]}>
                  <Ionicons name={meta.iconName as never} size={20} color={meta.color} />
                </View>
                <Text style={styles.dimLabel}>{meta.label}</Text>
                <Text style={styles.dimLevel}>LV {lp.level}</Text>
                <View style={styles.dimBar}>
                  <ProgressBar
                    value={lp.xpInLevel}
                    max={lp.xpNeededForLevel}
                    color={meta.color}
                    height={5}
                  />
                </View>
                <Text style={styles.dimXp}>{xp} XP</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Skills</Text>
        {skillStates.isLoading ? (
          <ActivityIndicator color={tokens.brand.violet2} />
        ) : (
          <View style={styles.skillList}>
            {skillStates.data?.map((s) => (
              <SkillRow
                key={s.skill.id}
                state={s}
                onPress={() =>
                  router.push({ pathname: '/skill/[id]', params: { id: s.skill.id } })
                }
              />
            ))}
          </View>
        )}

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
  heroBlock: {
    paddingTop: tokens.space[3],
    paddingBottom: tokens.space[5],
    gap: tokens.space[4],
  },
  eyebrowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroEyebrow: {
    ...tokens.type.eyebrow,
    color: tokens.brand.violet2,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
  heroBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[4],
  },
  heroInfo: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    ...tokens.type.h2,
    color: tokens.text.hi,
  },
  subtitle: {
    ...tokens.type.caption,
    color: tokens.text.mid,
    marginTop: 4,
  },
  totalBar: {
    marginTop: tokens.space[2],
  },
  toNext: {
    ...tokens.type.caption,
    color: tokens.brand.violet2,
    fontFamily: 'Manrope_700Bold',
    marginTop: 6,
  },
  sectionTitle: {
    ...tokens.type.eyebrow,
    color: tokens.text.mid,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: tokens.space[5],
    marginBottom: tokens.space[3],
  },
  dimensionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.space[3],
  },
  dimCard: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: tokens.bg.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.border.base,
    padding: tokens.space[4],
    gap: 4,
    overflow: 'hidden',
  },
  dimBlob: {
    position: 'absolute',
    top: -28,
    right: -28,
    width: 84,
    height: 84,
    borderRadius: 42,
    opacity: 0.14,
  },
  dimCardPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  dimIconWrap: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.space[2],
  },
  dimLabel: {
    ...tokens.type.caption,
    color: tokens.text.mid,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dimLevel: {
    ...tokens.type.h2,
    color: tokens.text.hi,
  },
  dimBar: {
    marginTop: tokens.space[2],
  },
  dimXp: {
    ...tokens.type.caption,
    color: tokens.text.dim,
    marginTop: 2,
  },
  skillList: {
    gap: tokens.space[2],
    marginBottom: tokens.space[2],
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
});
