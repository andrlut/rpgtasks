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

import { ProgressBar } from '@/components/ProgressBar';
import { ScreenBackground } from '@/components/ScreenBackground';
import { SkillRow } from '@/components/SkillRow';
import { useCharacter } from '@/lib/api/character';
import { useSkillStates } from '@/lib/api/skills';
import type { CharacterDimension, DimensionId } from '@/lib/db/types';
import { levelForXp, levelProgress } from '@/lib/xp';
import { tokens } from '@/theme';
import { DIMENSION_META, DIMENSION_ORDER } from '@/theme/dimensions';

export default function CharacterScreen() {
  const router = useRouter();
  const character = useCharacter();
  const skillStates = useSkillStates();

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
          <View style={styles.bigAvatar}>
            <Text style={styles.bigLevel}>{totalProgress.level}</Text>
          </View>
          <Text style={styles.name}>{profile.display_name}</Text>
          <Text style={styles.subtitle}>
            {totalProgress.xpInLevel} / {totalProgress.xpNeededForLevel} XP to LV{' '}
            {totalProgress.level + 1}
          </Text>
          <View style={styles.totalBar}>
            <ProgressBar
              value={totalProgress.xpInLevel}
              max={totalProgress.xpNeededForLevel}
              color={tokens.brand.violet}
              height={8}
            />
          </View>
          <View style={styles.coinRow}>
            <Ionicons name="ellipse" size={14} color={tokens.semantic.coin} />
            <Text style={styles.coinText}>{char.coins.toLocaleString()} coins</Text>
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

        <Text style={styles.sectionTitle}>Lifetime</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBlock}>
            <Text style={styles.statValue}>{char.total_xp.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total XP</Text>
          </View>
          <View style={styles.statBlock}>
            <Text style={styles.statValue}>{levelForXp(char.total_xp)}</Text>
            <Text style={styles.statLabel}>Level</Text>
          </View>
          <View style={styles.statBlock}>
            <Text style={styles.statValue}>{char.coins.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Coins</Text>
          </View>
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
  heroBlock: {
    alignItems: 'center',
    paddingTop: tokens.space[6],
    paddingBottom: tokens.space[6],
  },
  bigAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: tokens.brand.violetDeep,
    borderWidth: 3,
    borderColor: tokens.brand.violet2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.space[3],
  },
  bigLevel: {
    ...tokens.type.numLg,
    color: tokens.text.hi,
  },
  name: {
    ...tokens.type.h1,
    color: tokens.text.hi,
  },
  subtitle: {
    ...tokens.type.caption,
    color: tokens.text.mid,
    marginTop: 4,
  },
  totalBar: {
    width: '80%',
    marginTop: tokens.space[3],
  },
  coinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: tokens.space[3],
  },
  coinText: {
    ...tokens.type.body,
    color: tokens.semantic.coin,
    fontFamily: 'Manrope_700Bold',
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
    gap: tokens.space[3],
  },
  statBlock: {
    flex: 1,
    backgroundColor: tokens.bg.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.border.base,
    padding: tokens.space[4],
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    ...tokens.type.h2,
    color: tokens.text.hi,
  },
  statLabel: {
    ...tokens.type.caption,
    color: tokens.text.mid,
  },
});
