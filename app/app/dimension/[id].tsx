import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProgressBar } from '@/components/ProgressBar';
import { useCharacter } from '@/lib/api/character';
import type { DimensionId } from '@/lib/db/types';
import { levelProgress } from '@/lib/xp';
import { tokens } from '@/theme';
import { DIMENSION_META, DIMENSION_ORDER } from '@/theme/dimensions';

const DIMENSION_IDS = new Set<DimensionId>(DIMENSION_ORDER);

function isDimensionId(v: string | undefined): v is DimensionId {
  return !!v && DIMENSION_IDS.has(v as DimensionId);
}

export default function DimensionInfoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const character = useCharacter();

  if (!isDimensionId(params.id)) {
    return (
      <SafeAreaView style={styles.safe}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>Unknown dimension.</Text>
          <Pressable style={styles.closeBtn} onPress={() => router.back()}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const meta = DIMENSION_META[params.id];
  const xp = character.data?.dimensions.find((d) => d.dimension_id === params.id)?.xp ?? 0;
  const lp = levelProgress(xp);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.topBar}>
        <View style={{ width: 40 }} />
        <Text style={styles.topTitle}>Dimension</Text>
        <Pressable hitSlop={12} onPress={() => router.back()} style={styles.closeIconBtn}>
          <Ionicons name="close" size={24} color={tokens.text.hi} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.iconBubble, { backgroundColor: meta.bg }]}>
          <Ionicons name={meta.iconName as never} size={56} color={meta.color} />
        </View>

        <Text style={[styles.eyebrow, { color: meta.color }]}>{meta.label.toUpperCase()}</Text>
        <Text style={styles.title}>{meta.tagline}</Text>
        <Text style={styles.description}>{meta.description}</Text>

        <View style={styles.statCard}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Your level</Text>
            <Text style={[styles.statValue, { color: meta.color }]}>LV {lp.level}</Text>
          </View>
          <View style={styles.bar}>
            <ProgressBar
              value={lp.xpInLevel}
              max={lp.xpNeededForLevel}
              color={meta.color}
              height={6}
            />
          </View>
          <Text style={styles.statSub}>
            {lp.xpInLevel} / {lp.xpNeededForLevel} XP to LV {lp.level + 1} · {xp} total
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Examples of tasks</Text>
        <View style={styles.examplesList}>
          {meta.examples.map((ex) => (
            <View key={ex} style={styles.exampleRow}>
              <View style={[styles.bullet, { backgroundColor: meta.color }]} />
              <Text style={styles.exampleText}>{ex}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.footnote}>
          Tag your tasks with this dimension to earn XP here every time you complete them.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.bg.base },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[3],
  },
  topTitle: {
    ...tokens.type.eyebrow,
    color: tokens.text.mid,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  closeIconBtn: {
    width: 40,
    height: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: tokens.space[5],
    paddingBottom: tokens.space[8],
    alignItems: 'stretch',
  },
  iconBubble: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: tokens.space[4],
    marginBottom: tokens.space[4],
  },
  eyebrow: {
    ...tokens.type.eyebrow,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  title: {
    ...tokens.type.h1,
    color: tokens.text.hi,
    textAlign: 'center',
    marginTop: tokens.space[2],
  },
  description: {
    ...tokens.type.bodyLg,
    color: tokens.text.mid,
    textAlign: 'center',
    marginTop: tokens.space[3],
    paddingHorizontal: tokens.space[2],
  },
  statCard: {
    backgroundColor: tokens.bg.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.border.base,
    padding: tokens.space[4],
    marginTop: tokens.space[6],
    gap: tokens.space[2],
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    ...tokens.type.body,
    color: tokens.text.mid,
  },
  statValue: {
    ...tokens.type.h2,
  },
  bar: {
    marginTop: tokens.space[1],
  },
  statSub: {
    ...tokens.type.caption,
    color: tokens.text.dim,
  },
  sectionTitle: {
    ...tokens.type.eyebrow,
    color: tokens.text.mid,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: tokens.space[6],
    marginBottom: tokens.space[3],
  },
  examplesList: {
    gap: tokens.space[2],
  },
  exampleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    backgroundColor: tokens.bg.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.border.base,
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[3],
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  exampleText: {
    ...tokens.type.body,
    color: tokens.text.hi,
    flex: 1,
  },
  footnote: {
    ...tokens.type.caption,
    color: tokens.text.dim,
    textAlign: 'center',
    marginTop: tokens.space[6],
    paddingHorizontal: tokens.space[3],
  },
  errorBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.space[4],
  },
  errorText: {
    ...tokens.type.body,
    color: tokens.text.mid,
  },
  closeBtn: {
    backgroundColor: tokens.brand.violet,
    paddingHorizontal: tokens.space[5],
    paddingVertical: tokens.space[3],
    borderRadius: tokens.radius.md,
  },
  closeText: {
    ...tokens.type.body,
    color: tokens.text.hi,
    fontFamily: 'Manrope_700Bold',
  },
});
