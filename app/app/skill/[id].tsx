import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
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

import { ProgressBar } from '@/components/ProgressBar';
import { ScreenBackground } from '@/components/ScreenBackground';
import { TierMedal } from '@/components/TierMedal';
import { useLogSkillPR, useSkillLogHistory, useSkillStates } from '@/lib/api/skills';
import type { TierName } from '@/lib/db/types';
import { tokens } from '@/theme';
import { DIMENSION_META } from '@/theme/dimensions';

const TIER_ORDER: TierName[] = ['beginner', 'bronze', 'silver', 'gold', 'master'];

export default function SkillDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const skillId = params.id;

  const skillStates = useSkillStates();
  const log = useSkillLogHistory(skillId);
  const logPR = useLogSkillPR();

  const [valueStr, setValueStr] = useState('');

  const state = skillStates.data?.find((s) => s.skill.id === skillId);

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

  const dim = DIMENSION_META[state.skill.dimension_id];
  const sortedTiers = [...state.tiers].sort((a, b) => a.sort_order - b.sort_order);
  const progressMin = state.currentTier.threshold;
  const progressMax = state.nextTier?.threshold ?? state.currentTier.threshold;
  const progressVal = state.currentPr - progressMin;
  const progressNeeded = Math.max(1, progressMax - progressMin);
  const tierIdx = TIER_ORDER.indexOf(state.currentTier.tier_name);

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
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
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
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.6 }]}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={22} color={tokens.text.hi} />
          </Pressable>
          <View style={{ width: 40 }} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.heroBlock}>
              <TierMedal tier={state.currentTier.tier_name} size={120} />
              <Text style={styles.tierEyebrow}>
                {state.currentTier.tier_name} Tier
              </Text>
              <Text style={styles.skillName}>{state.skill.display_name}</Text>
              <View style={styles.prRow}>
                <Text style={styles.prValue}>{state.currentPr}</Text>
                <Text style={styles.prUnit}>{state.skill.unit}</Text>
              </View>
            </View>

            {state.nextTier ? (
              <View style={styles.nextTierCard}>
                <View style={styles.nextTierTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.eyebrow}>Next tier</Text>
                    <Text style={styles.nextTierTitle}>
                      {Math.max(0, state.nextTier.threshold - state.currentPr)} more{' '}
                      {state.skill.unit} to {state.nextTier.tier_name}
                    </Text>
                  </View>
                  <TierMedal tier={state.nextTier.tier_name} size={44} />
                </View>
                <View style={{ marginTop: tokens.space[3] }}>
                  <ProgressBar
                    value={progressVal}
                    max={progressNeeded}
                    color={tokens.semantic.coin}
                    height={8}
                  />
                </View>
                <View style={styles.progressLabels}>
                  <Text style={styles.progressLabelText}>{state.currentPr}</Text>
                  <Text style={styles.progressLabelText}>{state.nextTier.threshold}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.nextTierCard}>
                <Text style={styles.maxTierText}>Max tier reached — keep going!</Text>
              </View>
            )}

            <Text style={styles.sectionLabel}>Tier ladder</Text>
            <View style={styles.tierLadderCard}>
              <View style={styles.ladderRow}>
                {sortedTiers.map((t) => {
                  const i = TIER_ORDER.indexOf(t.tier_name);
                  const reached = state.currentPr >= t.threshold;
                  const isCurrent = i === tierIdx;
                  return (
                    <View key={t.id} style={styles.ladderCol}>
                      <TierMedal
                        tier={t.tier_name}
                        size={40}
                        active={reached || isCurrent}
                      />
                      <Text
                        style={[
                          styles.ladderLabel,
                          isCurrent && { color: tokens.semantic.coin },
                          !reached && !isCurrent && { color: tokens.text.dim },
                        ]}
                      >
                        {t.tier_name.toUpperCase()}
                      </Text>
                      <Text style={styles.ladderThreshold}>{t.threshold}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            <Text style={styles.sectionLabel}>Log new PR</Text>
            <View style={styles.logForm}>
              <View style={styles.inputWrap}>
                <Ionicons name={state.skill.icon as never} size={18} color={dim.color} />
                <TextInput
                  value={valueStr}
                  onChangeText={(v) => setValueStr(v.replace(/[^0-9]/g, ''))}
                  style={styles.input}
                  keyboardType="number-pad"
                  placeholder={`How many ${state.skill.unit}?`}
                  placeholderTextColor={tokens.text.faint}
                />
              </View>
            </View>

            {log.data && log.data.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Recent</Text>
                <View style={styles.logList}>
                  {log.data.slice(0, 12).map((entry) => (
                    <View key={entry.id} style={styles.logRow}>
                      <Text style={styles.logValue}>
                        {entry.value} {state.skill.unit}
                      </Text>
                      <Text style={styles.logDate}>
                        {new Date(entry.logged_at).toLocaleDateString()}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </ScrollView>

          <View style={styles.ctaBar}>
            <Pressable
              onPress={handleSubmit}
              disabled={logPR.isPending || valueStr === ''}
              style={({ pressed }) => [
                styles.ctaWrap,
                (pressed || logPR.isPending || valueStr === '') && { opacity: 0.7 },
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
                    <Ionicons name="add" size={20} color="#3D2A00" />
                    <Text style={styles.ctaText}>Log new PR</Text>
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
  },
  content: {
    paddingHorizontal: tokens.space[4],
    paddingBottom: 120,
  },
  heroBlock: {
    alignItems: 'center',
    paddingVertical: tokens.space[4],
    gap: tokens.space[2],
  },
  tierEyebrow: {
    ...tokens.type.eyebrow,
    color: tokens.text.mid,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: tokens.space[3],
  },
  skillName: {
    ...tokens.type.h1,
    color: tokens.text.hi,
    marginTop: 2,
  },
  prRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 2,
  },
  prValue: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 40,
    lineHeight: 42,
    color: tokens.text.hi,
  },
  prUnit: {
    ...tokens.type.body,
    color: tokens.text.mid,
    fontFamily: 'Manrope_600SemiBold',
  },
  nextTierCard: {
    marginTop: tokens.space[4],
    backgroundColor: tokens.bg.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.border.base,
    padding: tokens.space[4],
  },
  nextTierTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
  },
  eyebrow: {
    ...tokens.type.eyebrow,
    color: tokens.text.mid,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
  nextTierTitle: {
    ...tokens.type.h3,
    color: tokens.text.hi,
    marginTop: 4,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  progressLabelText: {
    ...tokens.type.caption,
    color: tokens.text.mid,
    fontFamily: 'Manrope_700Bold',
  },
  maxTierText: {
    ...tokens.type.body,
    color: tokens.text.hi,
    textAlign: 'center',
    fontFamily: 'Manrope_700Bold',
  },
  sectionLabel: {
    ...tokens.type.eyebrow,
    color: tokens.text.mid,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: tokens.space[6],
    marginBottom: tokens.space[3],
  },
  tierLadderCard: {
    backgroundColor: tokens.bg.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.border.base,
    padding: tokens.space[4],
  },
  ladderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  ladderCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  ladderLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
    color: tokens.text.mid,
    letterSpacing: 0.5,
    marginTop: 4,
  },
  ladderThreshold: {
    ...tokens.type.caption,
    color: tokens.text.dim,
    fontSize: 10,
  },
  logForm: {
    gap: tokens.space[2],
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    backgroundColor: tokens.bg.surface,
    borderWidth: 1,
    borderColor: tokens.border.base,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space[4],
    height: 52,
  },
  input: {
    flex: 1,
    color: tokens.text.hi,
    ...tokens.type.bodyLg,
    fontFamily: 'Manrope_700Bold',
  },
  logList: {
    backgroundColor: tokens.bg.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.border.base,
    overflow: 'hidden',
  },
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[3],
    borderBottomWidth: 1,
    borderBottomColor: tokens.border.base,
  },
  logValue: {
    ...tokens.type.body,
    color: tokens.text.hi,
    fontFamily: 'Manrope_700Bold',
  },
  logDate: {
    ...tokens.type.caption,
    color: tokens.text.mid,
  },
  ctaBar: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  ctaWrap: {
    borderRadius: tokens.radius.md,
    shadowColor: tokens.semantic.coin,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 10,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  ctaText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 16,
    color: '#3D2A00',
    letterSpacing: 0.3,
  },
});
