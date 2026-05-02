import { Ionicons } from '@expo/vector-icons';
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
import { TierBadge } from '@/components/TierBadge';
import { useLogSkillPR, useSkillLogHistory, useSkillStates } from '@/lib/api/skills';
import { tokens } from '@/theme';
import { DIMENSION_META } from '@/theme/dimensions';

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

      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.6 }]}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={24} color={tokens.text.hi} />
        </Pressable>
        <Text style={styles.headerTitle}>{state.skill.display_name}</Text>
        <View style={{ width: 36 }} />
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
            <View style={[styles.heroIcon, { backgroundColor: dim.bg }]}>
              <Ionicons name={state.skill.icon as never} size={32} color={dim.color} />
            </View>
            <Text style={styles.prValue}>{state.currentPr}</Text>
            <Text style={styles.prUnit}>{state.skill.unit}</Text>
            <View style={{ marginTop: tokens.space[3] }}>
              <TierBadge tier={state.currentTier.tier_name} size="lg" />
            </View>
            <View style={styles.barWrap}>
              <ProgressBar
                value={progressVal}
                max={progressNeeded}
                color={dim.color}
                height={6}
              />
            </View>
            {state.nextTier ? (
              <Text style={styles.nextTierText}>
                {Math.max(0, state.nextTier.threshold - state.currentPr)} {state.skill.unit} to{' '}
                {state.nextTier.tier_name.toUpperCase()}
              </Text>
            ) : (
              <Text style={styles.nextTierText}>Max tier reached</Text>
            )}
          </View>

          <Text style={styles.sectionLabel}>Tier ladder</Text>
          <View style={styles.tierLadder}>
            {sortedTiers.map((t) => {
              const reached = state.currentPr >= t.threshold;
              return (
                <View
                  key={t.id}
                  style={[
                    styles.tierRow,
                    !reached && { opacity: 0.5 },
                  ]}
                >
                  <TierBadge tier={t.tier_name} size="sm" />
                  <Text style={styles.tierThreshold}>
                    {t.threshold} {state.skill.unit}
                  </Text>
                  {reached ? (
                    <Ionicons name="checkmark-circle" size={18} color={tokens.semantic.xp} />
                  ) : (
                    <Ionicons name="lock-closed" size={16} color={tokens.text.dim} />
                  )}
                </View>
              );
            })}
          </View>

          <Text style={styles.sectionLabel}>Log new PR</Text>
          <View style={styles.logForm}>
            <TextInput
              value={valueStr}
              onChangeText={(v) => setValueStr(v.replace(/[^0-9]/g, ''))}
              style={styles.input}
              keyboardType="number-pad"
              placeholder={`How many ${state.skill.unit}?`}
              placeholderTextColor={tokens.text.faint}
            />
            <Pressable
              onPress={handleSubmit}
              disabled={logPR.isPending || valueStr === ''}
              style={({ pressed }) => [
                styles.submitButton,
                (pressed || logPR.isPending || valueStr === '') && { opacity: 0.6 },
              ]}
            >
              {logPR.isPending ? (
                <ActivityIndicator color={tokens.text.hi} size="small" />
              ) : (
                <Text style={styles.submitText}>Log</Text>
              )}
            </Pressable>
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.bg.base },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[3],
    borderBottomWidth: 1,
    borderBottomColor: tokens.border.base,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.bg.surface,
  },
  headerTitle: {
    ...tokens.type.h3,
    color: tokens.text.hi,
  },
  content: {
    padding: tokens.space[4],
    paddingBottom: tokens.space[10],
  },
  heroBlock: {
    alignItems: 'center',
    paddingVertical: tokens.space[5],
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.space[3],
  },
  prValue: {
    ...tokens.type.numXl,
    color: tokens.text.hi,
  },
  prUnit: {
    ...tokens.type.caption,
    color: tokens.text.mid,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2,
  },
  barWrap: {
    width: '70%',
    marginTop: tokens.space[3],
  },
  nextTierText: {
    ...tokens.type.caption,
    color: tokens.text.mid,
    marginTop: tokens.space[2],
  },
  sectionLabel: {
    ...tokens.type.eyebrow,
    color: tokens.text.mid,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: tokens.space[6],
    marginBottom: tokens.space[3],
  },
  tierLadder: {
    backgroundColor: tokens.bg.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.border.base,
    padding: tokens.space[3],
    gap: tokens.space[3],
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.space[3],
  },
  tierThreshold: {
    flex: 1,
    ...tokens.type.body,
    color: tokens.text.mid,
  },
  logForm: {
    flexDirection: 'row',
    gap: tokens.space[2],
  },
  input: {
    flex: 1,
    backgroundColor: tokens.bg.surface,
    borderWidth: 1,
    borderColor: tokens.border.base,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[3],
    color: tokens.text.hi,
    ...tokens.type.bodyLg,
  },
  submitButton: {
    paddingHorizontal: tokens.space[5],
    backgroundColor: tokens.brand.violet,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    ...tokens.type.body,
    color: tokens.text.hi,
    fontFamily: 'Manrope_800ExtraBold',
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
});
