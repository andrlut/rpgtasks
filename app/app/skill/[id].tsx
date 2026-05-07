import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenBackground } from '@/components/ScreenBackground';
import { SkillMedallionOrbital } from '@/components/SkillMedallionOrbital';
import {
  tierForValue,
  useLogSkillPR,
  useSkillLogHistory,
  useSkillStates,
} from '@/lib/api/skills';
import type { SkillLog, SkillTier, TierName } from '@/lib/db/types';
import { useLocalizedPick } from '@/lib/i18n/catalog';
import { tokens } from '@/theme';
import {
  alpha,
  TIER_ORDER,
  TIER_VISUAL_META,
} from '@/theme/skillTiers';

// ─── Timeline derivation ────────────────────────────────────────────────────

type TimelineEntryType = 'pr' | 'tier-up' | 'log';

interface TimelineEntry {
  id: string;
  type: TimelineEntryType;
  value: number;
  date: string;
  /** For tier-up rows: the tier the user reached. */
  tierReached?: TierName;
}

/**
 * Walk the skill_log entries chronologically to classify each as a plain
 * LOG, a new PR (strictly greater than running max), or a TIER UP (a PR
 * that crossed a threshold). Output is reversed to newest-first for the
 * UI which renders top-to-bottom.
 */
function buildTimeline(logs: SkillLog[], tiers: SkillTier[]): TimelineEntry[] {
  const sortedAsc = [...logs].sort(
    (a, b) =>
      new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime(),
  );
  let runningPr = 0;
  let runningTier: TierName = 'beginner';
  const out: TimelineEntry[] = [];
  for (const log of sortedAsc) {
    let type: TimelineEntryType = 'log';
    let tierReached: TierName | undefined;
    if (log.value > runningPr) {
      runningPr = log.value;
      const newTier = tierForValue(tiers, runningPr).current.tier_name;
      if (newTier !== runningTier) {
        type = 'tier-up';
        tierReached = newTier;
        runningTier = newTier;
      } else {
        type = 'pr';
      }
    }
    out.push({
      id: log.id,
      type,
      value: log.value,
      date: log.logged_at,
      tierReached,
    });
  }
  return out.reverse();
}

function daysBetween(fromIso: string | null, toIso: string): number {
  if (!fromIso) return 0;
  const ms = new Date(toIso).getTime() - new Date(fromIso).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  // M/D/YYYY local — matches the html prototype's format
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

// ─── Screen ─────────────────────────────────────────────────────────────────

export default function SkillDetailScreen() {
  const router = useRouter();
  const { pick, pickNullable } = useLocalizedPick();
  const params = useLocalSearchParams<{ id: string }>();
  const skillId = params.id;

  const skillStates = useSkillStates();
  const log = useSkillLogHistory(skillId);
  const logPR = useLogSkillPR();

  const [valueStr, setValueStr] = useState('');

  const state = skillStates.data?.find((s) => s.skill.id === skillId);

  const timeline = useMemo(
    () => (state && log.data ? buildTimeline(log.data, state.tiers) : []),
    [log.data, state],
  );

  if (skillStates.isLoading || !state) {
    return (
      <SafeAreaView style={styles.safe}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingBox}>
          <ActivityIndicator color={tokens.brand.violet2} />
        </View>
      </SafeAreaView>
    );
  }

  const currentMeta = TIER_VISUAL_META[state.currentTier.tier_name];
  const sortedTiers = [...state.tiers].sort(
    (a, b) => a.sort_order - b.sort_order,
  );
  const tierIdx = TIER_ORDER.indexOf(state.currentTier.tier_name);
  const isMaster = state.nextTier === null;
  const nextMeta = state.nextTier
    ? TIER_VISUAL_META[state.nextTier.tier_name]
    : null;

  // Stats
  const daysSinceLastPr = daysBetween(state.lastLoggedAt, new Date().toISOString());
  const totalLogs = log.data?.length ?? 0;

  // Next-tier progress
  const progressMin = state.currentTier.threshold;
  const progressMax = state.nextTier?.threshold ?? state.currentTier.threshold;
  const progressVal = state.currentPr - progressMin;
  const progressNeeded = Math.max(1, progressMax - progressMin);
  const progressPct = Math.min(100, Math.max(0, (progressVal / progressNeeded) * 100));

  const handleSubmit = async () => {
    const v = parseInt(valueStr, 10);
    if (!Number.isFinite(v) || v < 0) {
      Alert.alert('Invalid value', `Enter a number of ${state.skill.unit}.`);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      const result = await logPR.mutateAsync({
        skillId,
        value: v,
        tiers: state.tiers,
        previousPr: state.currentPr,
      });
      setValueStr('');
      if (result.newTier) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
          () => {},
        );
        Alert.alert(
          'Tier up!',
          `You reached ${result.newTier.toUpperCase()} in ${state.skill.display_name}.`,
        );
      } else if (result.isPR) {
        Alert.alert('New PR', `${v} ${state.skill.unit} — your best yet.`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      Alert.alert('Could not log', msg);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenBackground>
        {/* Topbar */}
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
          <Pressable
            onPress={() => {
              // Future: edit/delete menu for custom skills, share, etc. The
              // brief left this open; keep the affordance visible so users
              // know more is coming.
            }}
            style={({ pressed }) => [
              styles.iconButton,
              pressed && { opacity: 0.6 },
            ]}
            hitSlop={8}
            accessibilityLabel="More"
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={22}
              color={tokens.text.hi}
            />
          </Pressable>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            {/* Hero — orbital medallion + tier eyebrow + skill name + PR row */}
            <View style={styles.hero}>
              <SkillMedallionOrbital
                tier={state.currentTier.tier_name}
                pr={state.currentPr}
                size={180}
              />
              <Text
                style={[
                  styles.tierEyebrow,
                  { color: currentMeta.c1 },
                ]}
              >
                {state.currentTier.tier_name.toUpperCase()} TIER
              </Text>
              <Text style={styles.skillName}>
                {pick(state.skill.display_name, state.skill.display_name_pt)}
              </Text>
              <View style={styles.prRow}>
                <Text style={styles.prValue}>{state.currentPr}</Text>
                <Text style={styles.prUnit}>{pick(state.skill.unit, state.skill.unit_pt)}</Text>
              </View>
            </View>

            {/* Lore card — description + pop stat (always visible now, no toggle) */}
            {(pickNullable(state.skill.description, state.skill.description_pt) ||
              pickNullable(state.skill.population_stat, state.skill.population_stat_pt)) && (
              <View
                style={[
                  styles.loreCard,
                  { borderColor: alpha(currentMeta.c1, 0.35) },
                ]}
              >
                {/* Tiny ornament — dot + line in the tier color */}
                <View style={styles.loreOrnament}>
                  <View
                    style={[
                      styles.loreOrnamentDot,
                      { backgroundColor: currentMeta.c1 },
                    ]}
                  />
                  <View
                    style={[
                      styles.loreOrnamentLine,
                      { backgroundColor: alpha(currentMeta.c1, 0.5) },
                    ]}
                  />
                </View>
                <Text
                  style={[
                    styles.loreEyebrow,
                    { color: currentMeta.c1 },
                  ]}
                >
                  ⟢ LORE
                </Text>
                {pickNullable(state.skill.description, state.skill.description_pt) && (
                  <Text style={styles.loreDesc}>
                    {pickNullable(state.skill.description, state.skill.description_pt)}
                  </Text>
                )}
                {state.skill.population_stat && (
                  <View style={styles.lorePop}>
                    <View
                      style={[
                        styles.lorePopIcon,
                        {
                          backgroundColor: alpha(currentMeta.c1, 0.18),
                          borderColor: alpha(currentMeta.c1, 0.5),
                        },
                      ]}
                    >
                      <Ionicons
                        name="people"
                        size={14}
                        color={currentMeta.c1}
                      />
                    </View>
                    <Text
                      style={[styles.lorePopText, { color: currentMeta.c1 }]}
                    >
                      {pickNullable(state.skill.population_stat, state.skill.population_stat_pt)}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Stat strip — 3 tiles */}
            <View style={styles.statStrip}>
              <View style={styles.statTile}>
                <Text style={styles.statTileNum}>{state.currentPr}</Text>
                <Text style={styles.statTileLabel}>CURRENT PR</Text>
              </View>
              <View style={styles.statTile}>
                <Text style={styles.statTileNum}>{daysSinceLastPr}d</Text>
                <Text style={styles.statTileLabel}>SINCE LAST PR</Text>
              </View>
              <View style={styles.statTile}>
                <Text style={styles.statTileNum}>{totalLogs}</Text>
                <Text style={styles.statTileLabel}>TOTAL LOGS</Text>
              </View>
            </View>

            {/* Next tier card — hidden when at master */}
            {!isMaster && state.nextTier && nextMeta && (
              <View
                style={[
                  styles.nextCard,
                  { borderColor: alpha(nextMeta.c1, 0.35) },
                ]}
              >
                <View style={styles.nextTop}>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.nextEyebrow,
                        { color: nextMeta.c1 },
                      ]}
                    >
                      NEXT TIER · {state.nextTier.tier_name.toUpperCase()}
                    </Text>
                    <Text style={styles.nextTitle}>
                      {Math.max(0, state.nextTier.threshold - state.currentPr)}{' '}
                      more {state.skill.unit}
                    </Text>
                  </View>
                  <SkillMedallionOrbital
                    tier={state.nextTier.tier_name}
                    pr={state.nextTier.threshold}
                    size={48}
                    showGlyph={false}
                  />
                </View>
                {/* Progress bar with gradient from current → next tier color */}
                <View style={styles.barTrack}>
                  <LinearGradient
                    colors={[currentMeta.c1, nextMeta.c1]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[
                      styles.barFill,
                      { width: `${progressPct}%` },
                    ]}
                  />
                </View>
                <View style={styles.barLabels}>
                  <Text style={styles.barLabel}>{state.currentPr}</Text>
                  <Text style={styles.barLabel}>{state.nextTier.threshold}</Text>
                </View>
              </View>
            )}

            {/* Tier path — horizontal ladder of mini medallions */}
            <Text style={styles.sectionEyebrow}>⟢ TIER PATH</Text>
            <View style={styles.tierPath}>
              <View style={styles.pathNodes}>
                {sortedTiers.map((t) => {
                  const i = TIER_ORDER.indexOf(t.tier_name);
                  const reached = state.currentPr >= t.threshold;
                  const isCurrent = i === tierIdx;
                  const nodeSize = isCurrent ? 56 : 40;
                  return (
                    <View key={t.id} style={styles.pathNode}>
                      <View style={{ opacity: reached || isCurrent ? 1 : 0.45 }}>
                        <SkillMedallionOrbital
                          tier={t.tier_name}
                          pr={t.threshold}
                          size={nodeSize}
                          showGlyph={false}
                        />
                      </View>
                      <Text
                        style={[
                          styles.pathLabel,
                          isCurrent && {
                            color: TIER_VISUAL_META[t.tier_name].c1,
                          },
                          !reached &&
                            !isCurrent && { color: tokens.text.dim },
                        ]}
                      >
                        {t.tier_name.toUpperCase()}
                      </Text>
                      <Text style={styles.pathThresh}>{t.threshold}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Timeline — newest first */}
            <Text style={styles.sectionEyebrow}>⟢ HISTÓRICO</Text>
            <View style={styles.timeline}>
              {timeline.length === 0 ? (
                <Text style={styles.timelineEmpty}>
                  No entries yet. Log your first PR below.
                </Text>
              ) : (
                timeline.slice(0, 12).map((entry, i) => (
                  <TimelineRow
                    key={entry.id}
                    entry={entry}
                    unit={state.skill.unit}
                    isFirst={i === 0}
                    isLast={i === Math.min(11, timeline.length - 1)}
                  />
                ))
              )}
            </View>
          </ScrollView>

          {/* CTA bar — sticky at bottom */}
          <View style={styles.ctaBar}>
            <View style={styles.inputPill}>
              <Ionicons
                name={state.skill.icon as never}
                size={16}
                color={currentMeta.c1}
              />
              <TextInput
                value={valueStr}
                onChangeText={(v) => setValueStr(v.replace(/[^0-9]/g, ''))}
                style={styles.inputPillField}
                keyboardType="number-pad"
                placeholder={`How many ${state.skill.unit}?`}
                placeholderTextColor={tokens.text.faint}
              />
            </View>
            <Pressable
              onPress={handleSubmit}
              disabled={logPR.isPending || valueStr === ''}
              style={({ pressed }) => [
                styles.ctaWrap,
                (pressed || logPR.isPending || valueStr === '') && {
                  opacity: 0.7,
                },
              ]}
              hitSlop={4}
            >
              <LinearGradient
                colors={tokens.gradient.coinBtn}
                locations={tokens.gradient.coinBtnLocations}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.cta}
              >
                {logPR.isPending ? (
                  <ActivityIndicator color="#3D2A00" size="small" />
                ) : (
                  <>
                    <Ionicons name="add" size={18} color="#3D2A00" />
                    <Text style={styles.ctaText}>Log</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </ScreenBackground>
    </SafeAreaView>
  );
}

// ─── Timeline row ───────────────────────────────────────────────────────────

interface TimelineRowProps {
  entry: TimelineEntry;
  unit: string;
  isFirst: boolean;
  isLast: boolean;
}

function TimelineRow({ entry, unit, isFirst, isLast }: TimelineRowProps) {
  const isPr = entry.type === 'pr';
  const isTierUp = entry.type === 'tier-up';
  const tierMeta = entry.tierReached
    ? TIER_VISUAL_META[entry.tierReached]
    : null;
  const dotColor = isTierUp
    ? tokens.brand.violet2
    : isPr
      ? tokens.semantic.coin
      : tokens.text.dim;
  const dotSize = isTierUp ? 10 : 8;
  return (
    <View style={styles.tlRow}>
      {/* Rail with vertical line + dot — line gets clipped at the ends */}
      <View style={styles.tlRail}>
        <View
          style={[
            styles.tlRailLine,
            { top: isFirst ? 12 : 0, bottom: isLast ? '50%' : 0 },
          ]}
        />
        <View
          style={[
            styles.tlDot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: dotColor,
              shadowColor: dotColor,
              shadowOpacity: isPr || isTierUp ? 0.8 : 0,
              shadowRadius: isTierUp ? 12 : 10,
              shadowOffset: { width: 0, height: 0 },
              elevation: isPr || isTierUp ? 4 : 0,
            },
          ]}
        />
      </View>

      <View style={styles.tlBody}>
        <Text style={styles.tlVal}>
          {entry.value} <Text style={styles.tlValUnit}>{unit}</Text>
        </Text>
        <View style={styles.tlMeta}>
          {isTierUp && tierMeta ? (
            <View
              style={[
                styles.tlFlag,
                {
                  backgroundColor: alpha(tokens.brand.violet2, 0.22),
                },
              ]}
            >
              <Text
                style={[
                  styles.tlFlagText,
                  { color: tokens.brand.violet2 },
                ]}
              >
                {entry.tierReached?.toUpperCase()}
              </Text>
            </View>
          ) : isPr ? (
            <View
              style={[
                styles.tlFlag,
                { backgroundColor: 'rgba(255,200,61,0.18)' },
              ]}
            >
              <Text
                style={[
                  styles.tlFlagText,
                  { color: tokens.semantic.coin },
                ]}
              >
                PR
              </Text>
            </View>
          ) : null}
          <Text style={styles.tlDate}>{formatShortDate(entry.date)}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.bg.deep },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },

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
    borderWidth: 1,
    borderColor: tokens.border.base,
  },

  content: {
    paddingHorizontal: tokens.space[4],
    paddingBottom: 110,
  },

  hero: {
    alignItems: 'center',
    paddingTop: tokens.space[3],
    paddingBottom: tokens.space[2],
  },
  tierEyebrow: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
    letterSpacing: 2.5,
    marginTop: 18,
  },
  skillName: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 28,
    color: tokens.text.hi,
    letterSpacing: -0.5,
    marginTop: 4,
    textAlign: 'center',
  },
  prRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 10,
  },
  prValue: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 56,
    lineHeight: 56,
    letterSpacing: -2,
    color: tokens.text.hi,
  },
  prUnit: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 18,
    color: tokens.text.mid,
  },

  // Lore
  loreCard: {
    marginTop: 22,
    backgroundColor: tokens.bg.surface,
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  loreOrnament: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  loreOrnamentDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  loreOrnamentLine: {
    width: 24,
    height: 1,
    opacity: 0.55,
  },
  loreEyebrow: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    letterSpacing: 1.3,
    marginTop: 16,
    marginBottom: 8,
    paddingLeft: 24,
  },
  loreDesc: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
    lineHeight: 21,
    color: tokens.text.base,
  },
  lorePop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: tokens.border.divider,
  },
  lorePopIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  lorePopText: {
    flex: 1,
    fontFamily: 'Manrope_700Bold',
    fontSize: 12.5,
    lineHeight: 18,
  },

  // Stat strip
  statStrip: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  statTile: {
    flex: 1,
    backgroundColor: tokens.bg.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: tokens.border.base,
    padding: 12,
    gap: 2,
  },
  statTileNum: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 22,
    lineHeight: 22,
    color: tokens.text.hi,
  },
  statTileLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9.5,
    color: tokens.text.dim,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 6,
  },

  // Next tier card
  nextCard: {
    marginTop: 16,
    backgroundColor: tokens.bg.surface,
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 16,
  },
  nextTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  nextEyebrow: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    letterSpacing: 1.3,
  },
  nextTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 17,
    color: tokens.text.hi,
    marginTop: 4,
  },
  barTrack: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 12,
  },
  barFill: {
    height: '100%',
    borderRadius: 999,
  },
  barLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  barLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    color: tokens.text.mid,
  },

  // Section eyebrows for path/timeline
  sectionEyebrow: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
    letterSpacing: 1.5,
    color: tokens.text.mid,
    textTransform: 'uppercase',
    marginTop: 28,
    marginBottom: 12,
  },

  // Tier path
  tierPath: {
    backgroundColor: tokens.bg.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: tokens.border.base,
    paddingHorizontal: 12,
    paddingVertical: 18,
  },
  pathNodes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pathNode: {
    alignItems: 'center',
    gap: 4,
    minWidth: 56,
  },
  pathLabel: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 9,
    letterSpacing: 0.6,
    marginTop: 6,
    color: tokens.text.mid,
  },
  pathThresh: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    color: tokens.text.dim,
  },

  // Timeline
  timeline: {
    backgroundColor: tokens.bg.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: tokens.border.base,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  timelineEmpty: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    color: tokens.text.dim,
    textAlign: 'center',
    paddingVertical: 24,
    fontStyle: 'italic',
  },
  tlRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: tokens.border.divider,
  },
  tlRail: {
    width: 16,
    flexShrink: 0,
    alignItems: 'center',
    paddingTop: 6,
    position: 'relative',
  },
  tlRailLine: {
    position: 'absolute',
    left: '50%',
    width: 1,
    marginLeft: -0.5,
    backgroundColor: tokens.border.divider,
  },
  tlDot: {
    zIndex: 1,
  },
  tlBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  tlVal: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 15,
    color: tokens.text.hi,
  },
  tlValUnit: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    color: tokens.text.mid,
  },
  tlMeta: {
    alignItems: 'flex-end',
    gap: 2,
  },
  tlFlag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tlFlagText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 9,
    letterSpacing: 0.8,
  },
  tlDate: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    color: tokens.text.dim,
  },

  // CTA
  ctaBar: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 8,
  },
  inputPill: {
    flex: 1,
    height: 56,
    backgroundColor: 'rgba(26,31,68,0.92)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: tokens.border.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  inputPillField: {
    flex: 1,
    color: tokens.text.hi,
    fontFamily: 'Manrope_700Bold',
    fontSize: 15,
  },
  ctaWrap: {
    height: 56,
    borderRadius: 14,
    shadowColor: tokens.semantic.coin,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 22,
    elevation: 10,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 56,
    paddingHorizontal: 18,
    borderRadius: 14,
  },
  ctaText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 15,
    color: '#3D2A00',
    letterSpacing: 0.3,
  },
});
