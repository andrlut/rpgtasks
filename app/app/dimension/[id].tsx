import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DimensionCrest } from '@/components/DimensionCrest';
import { ProgressBar } from '@/components/ProgressBar';
import { ScreenBackground } from '@/components/ScreenBackground';
import { SubPanel } from '@/components/SubPanel';
import { pickSubScores, useCharacter } from '@/lib/api/character';
import { useAssessmentHistoryAll } from '@/lib/api/questionnaire';
import { useTaskTemplates } from '@/lib/api/tasks';
import type { DimensionId, SubId, TaskTemplate } from '@/lib/db/types';
import { levelProgress } from '@/lib/xp';
import { tokens } from '@/theme';
import { DIMENSION_META, DIMENSION_ORDER, SUBS_BY_DIM } from '@/theme/dimensions';

const DIMENSION_IDS = new Set<DimensionId>(DIMENSION_ORDER);

function isDimensionId(v: string | undefined): v is DimensionId {
  return !!v && DIMENSION_IDS.has(v as DimensionId);
}

/**
 * Dimension detail — heraldic crest layout (v2).
 *
 * The user opens a dim from the Dedicação grid or the Avaliação hex
 * legend and lands on a screen built around a heraldic crest:
 *
 *   - Crest at top: round disc split into 2 hemispheres (one sub each),
 *     sealed by a diamond buckle, crowned by the dim icon, haloed in
 *     the dim color.
 *   - Tagline + description (the dim's identity copy).
 *   - Stat card with the dim's level + XP and a LV pill.
 *   - "DUAS FACES" spine header introduces the two SubPanels.
 *   - Two SubPanels stacked vertically, joined by a vertical connector
 *     (line · diamond · line) that mirrors the crest's seal.
 *
 * Each SubPanel carries: score 56pt + tier label, sparkline, 5-segment
 * tier bar, description, insight, and adoptable templates from the
 * task_template catalog.
 */
export default function DimensionInfoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const character = useCharacter();
  const history = useAssessmentHistoryAll('self');
  const templates = useTaskTemplates();

  const selfScores = useMemo(
    () => pickSubScores(character.data?.subScores ?? [], 'self'),
    [character.data?.subScores],
  );

  const templatesBySub = useMemo(() => {
    const map = new Map<SubId, TaskTemplate[]>();
    for (const t of templates.data ?? []) {
      const arr = map.get(t.sub_id) ?? [];
      arr.push(t);
      map.set(t.sub_id, arr);
    }
    return map;
  }, [templates.data]);

  const isLoading = character.isLoading || templates.isLoading;

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

  const dimId = params.id;
  const meta = DIMENSION_META[dimId];
  const [subA, subB] = SUBS_BY_DIM[dimId];

  const xp =
    character.data?.dimensions.find((d) => d.dimension_id === dimId)?.xp ?? 0;
  const lp = levelProgress(xp);
  const xpProgressPct =
    lp.xpNeededForLevel > 0
      ? Math.min(1, lp.xpInLevel / lp.xpNeededForLevel)
      : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenBackground>
        {/* ── Top bar ─────────────────────────────────────── */}
        <View style={styles.topBar}>
          <View style={{ width: 40 }} />
          <Text style={styles.topTitle}>Dimension</Text>
          <Pressable
            hitSlop={12}
            onPress={() => router.back()}
            style={styles.closeIconBtn}
          >
            <Ionicons name="close" size={24} color={tokens.text.hi} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Eyebrow ─────────────────────────────────────── */}
          <Text style={[styles.dimEyebrow, { color: meta.color }]}>
            DIMENSION · {meta.label.toUpperCase()}
          </Text>

          {/* ── Heraldic crest ──────────────────────────────── */}
          <View style={styles.crestWrap}>
            <DimensionCrest
              dimensionId={dimId}
              size={220}
              scores={selfScores}
            />
          </View>

          {/* ── Tagline + description ───────────────────────── */}
          <Text style={styles.tagline}>{meta.tagline}</Text>
          <Text style={styles.description}>{meta.description}</Text>

          {/* ── Stat card with LV pill ──────────────────────── */}
          <View
            style={[
              styles.statCard,
              {
                borderColor: `${meta.color}4D`,
                shadowColor: meta.color,
              },
            ]}
          >
            <View style={styles.statRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.statLabel}>Your level</Text>
                <Text style={styles.statSub}>
                  {lp.xpInLevel} / {lp.xpNeededForLevel} XP to LV{' '}
                  {lp.level + 1}
                </Text>
              </View>
              <View style={[styles.lvPill, { backgroundColor: meta.color }]}>
                <Text style={styles.lvPillLabel}>LV</Text>
                <Text style={styles.lvPillNum}>{lp.level}</Text>
              </View>
            </View>
            <ProgressBar
              value={Math.round(xpProgressPct * 100)}
              max={100}
              color={meta.color}
              height={8}
            />
            <Text style={styles.statTotal}>{xp.toLocaleString()} XP total</Text>
          </View>

          {/* ── Spine header ───────────────────────────────── */}
          <View style={styles.spineHead}>
            <View
              style={[styles.spineRule, { backgroundColor: `${meta.color}66` }]}
            />
            <Text style={[styles.spineLabel, { color: meta.color }]}>
              ⟢ DUAS FACES ⟣
            </Text>
            <View
              style={[styles.spineRule, { backgroundColor: `${meta.color}66` }]}
            />
          </View>

          {/* ── Sub panels with vertical connector ─────────── */}
          {isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={meta.color} />
            </View>
          ) : (
            <>
              <SubPanel
                subId={subA}
                selfScore={selfScores.get(subA) ?? 0}
                history={history.data?.get(subA) ?? []}
                templates={templatesBySub.get(subA) ?? []}
                side="left"
              />
              <View style={styles.connector}>
                <View
                  style={[
                    styles.connectorLine,
                    { backgroundColor: `${meta.color}80` },
                  ]}
                />
                <View
                  style={[styles.connectorDiamond, { backgroundColor: meta.color }]}
                />
                <View
                  style={[
                    styles.connectorLine,
                    { backgroundColor: `${meta.color}80` },
                  ]}
                />
              </View>
              <SubPanel
                subId={subB}
                selfScore={selfScores.get(subB) ?? 0}
                history={history.data?.get(subB) ?? []}
                templates={templatesBySub.get(subB) ?? []}
                side="right"
              />
            </>
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
    paddingVertical: tokens.space[3],
  },
  topTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: tokens.text.mid,
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
  },

  dimEyebrow: {
    textAlign: 'center',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
    letterSpacing: 2,
    marginTop: tokens.space[1],
  },
  crestWrap: {
    alignItems: 'center',
    marginTop: tokens.space[4],
    marginBottom: tokens.space[3],
  },
  tagline: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 28,
    color: tokens.text.hi,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginTop: tokens.space[2],
  },
  description: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 15,
    lineHeight: 22,
    color: tokens.text.mid,
    textAlign: 'center',
    marginTop: tokens.space[3],
    paddingHorizontal: tokens.space[2],
  },

  statCard: {
    backgroundColor: tokens.bg.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1.5,
    padding: tokens.space[4],
    marginTop: tokens.space[6],
    gap: tokens.space[3],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
    color: tokens.text.mid,
  },
  statSub: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    color: tokens.text.dim,
    marginTop: 2,
  },
  lvPill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: tokens.radius.pill,
  },
  lvPillLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    letterSpacing: 1,
    color: 'rgba(0,0,0,0.6)',
  },
  lvPillNum: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 22,
    color: '#0E1230',
  },
  statTotal: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    color: tokens.text.dim,
    textAlign: 'right',
  },

  spineHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    marginTop: tokens.space[7],
    marginBottom: tokens.space[5],
  },
  spineRule: {
    flex: 1,
    height: 1,
  },
  spineLabel: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
    letterSpacing: 2.5,
  },

  connector: {
    alignItems: 'center',
    paddingVertical: tokens.space[2],
    gap: 4,
  },
  connectorLine: {
    width: 2,
    height: 18,
  },
  connectorDiamond: {
    width: 12,
    height: 12,
    transform: [{ rotate: '45deg' }],
  },

  loadingBox: {
    paddingVertical: tokens.space[6],
    alignItems: 'center',
  },
  errorBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.space[4],
  },
  errorText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
    color: tokens.text.mid,
  },
  closeBtn: {
    backgroundColor: tokens.brand.violet,
    paddingHorizontal: tokens.space[5],
    paddingVertical: tokens.space[3],
    borderRadius: tokens.radius.md,
  },
  closeText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: tokens.text.hi,
  },
});
