import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import {
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
import { TierMedal } from '@/components/TierMedal';
import {
  useCreateCustomSkill,
  type CustomSkillTierInput,
} from '@/lib/api/skills';
import type { TierName } from '@/lib/db/types';
import { tokens } from '@/theme';
import { DIMENSION_META, DIMENSION_ORDER } from '@/theme/dimensions';

const ICON_CHOICES = [
  'flash',
  'fitness',
  'walk',
  'bicycle',
  'barbell',
  'leaf',
  'book',
  'bulb',
  'cash',
  'people',
  'heart',
  'pulse',
  'water',
  'moon',
  'restaurant',
  'sparkles',
  'school',
  'briefcase',
] as const;

const TIER_NAMES: TierName[] = ['beginner', 'bronze', 'silver', 'gold', 'master'];

interface TierFormState {
  threshold: string; // string for input handling
  description: string;
  percentile: string;
}

const DEFAULT_TIERS: TierFormState[] = [
  { threshold: '0',  description: '', percentile: '' },
  { threshold: '10', description: '', percentile: '' },
  { threshold: '25', description: '', percentile: '' },
  { threshold: '50', description: '', percentile: '' },
  { threshold: '100', description: '', percentile: '' },
];

export default function SkillFormScreen() {
  const router = useRouter();
  const createSkill = useCreateCustomSkill();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('reps');
  const [dimensionId, setDimensionId] = useState<string>(DIMENSION_ORDER[0]);
  const [icon, setIcon] = useState<string>('flash');
  const [tiers, setTiers] = useState<TierFormState[]>(DEFAULT_TIERS);

  const updateTier = (index: number, patch: Partial<TierFormState>) => {
    setTiers((prev) => prev.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  };

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      Alert.alert('Missing name', 'Give the skill a name.');
      return;
    }
    if (unit.trim().length === 0) {
      Alert.alert('Missing unit', 'Set a unit (reps, min, km, etc.).');
      return;
    }

    // Parse + validate tiers
    const parsed: CustomSkillTierInput[] = [];
    for (let i = 0; i < 5; i++) {
      const t = tiers[i]!;
      const threshold = parseInt(t.threshold, 10);
      if (!Number.isFinite(threshold) || threshold < 0) {
        Alert.alert('Bad threshold', `Tier ${TIER_NAMES[i]}: enter a non-negative number.`);
        return;
      }
      if (i > 0) {
        const prev = parsed[i - 1]!.threshold;
        if (threshold <= prev) {
          Alert.alert(
            'Tiers must ascend',
            `${TIER_NAMES[i]} threshold (${threshold}) must be greater than ${TIER_NAMES[i - 1]} (${prev}).`,
          );
          return;
        }
      }
      const percentileNum = t.percentile.trim() === '' ? null : parseFloat(t.percentile);
      if (percentileNum !== null && (!Number.isFinite(percentileNum) || percentileNum < 0 || percentileNum > 100)) {
        Alert.alert('Bad percentile', `Tier ${TIER_NAMES[i]}: percentile must be 0–100 or empty.`);
        return;
      }
      parsed.push({
        tier_name: TIER_NAMES[i]!,
        threshold,
        description: t.description.trim() === '' ? null : t.description.trim(),
        percentile: percentileNum,
      });
    }

    try {
      await createSkill.mutateAsync({
        display_name: trimmedName,
        unit: unit.trim(),
        dimension_id: dimensionId,
        icon,
        description: description.trim() === '' ? null : description.trim(),
        tiers: parsed,
      });
      router.back();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      Alert.alert('Could not create skill', msg);
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
            <Ionicons name="close" size={22} color={tokens.text.hi} />
          </Pressable>
          <Text style={styles.title}>New Skill</Text>
          <Pressable
            onPress={handleSubmit}
            disabled={createSkill.isPending}
            style={({ pressed }) => [
              styles.saveBtn,
              (pressed || createSkill.isPending) && { opacity: 0.6 },
            ]}
            hitSlop={8}
          >
            <Text style={styles.saveText}>
              {createSkill.isPending ? '...' : 'Save'}
            </Text>
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
            {/* Name */}
            <Text style={styles.label}>Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Burpees, Sprint 100m, 5K run"
              placeholderTextColor={tokens.text.faint}
              style={styles.input}
              maxLength={60}
            />

            {/* Unit */}
            <Text style={styles.label}>Unit</Text>
            <TextInput
              value={unit}
              onChangeText={setUnit}
              placeholder="reps · min · km · pages · sec"
              placeholderTextColor={tokens.text.faint}
              style={styles.input}
              maxLength={20}
              autoCapitalize="none"
            />

            {/* Description */}
            <Text style={styles.label}>Description (optional)</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="What is this skill? Why does it matter?"
              placeholderTextColor={tokens.text.faint}
              style={[styles.input, styles.textArea]}
              multiline
              maxLength={300}
            />

            {/* Dimension */}
            <Text style={styles.label}>Category</Text>
            <View style={styles.chipRow}>
              {DIMENSION_ORDER.map((id) => {
                const meta = DIMENSION_META[id];
                const active = id === dimensionId;
                return (
                  <Pressable
                    key={id}
                    onPress={() => setDimensionId(id)}
                    style={[
                      styles.chip,
                      active && {
                        backgroundColor: meta.bg,
                        borderColor: meta.color,
                      },
                    ]}
                  >
                    <Ionicons
                      name={meta.iconName as never}
                      size={14}
                      color={active ? meta.color : tokens.text.mid}
                    />
                    <Text
                      style={[
                        styles.chipText,
                        { color: active ? meta.color : tokens.text.mid },
                      ]}
                    >
                      {meta.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Icon */}
            <Text style={styles.label}>Icon</Text>
            <View style={styles.iconGrid}>
              {ICON_CHOICES.map((ic) => {
                const active = icon === ic;
                return (
                  <Pressable
                    key={ic}
                    onPress={() => setIcon(ic)}
                    style={[
                      styles.iconCell,
                      active && {
                        backgroundColor: 'rgba(123,92,255,0.18)',
                        borderColor: tokens.brand.violet2,
                      },
                    ]}
                  >
                    <Ionicons
                      name={ic as never}
                      size={20}
                      color={active ? tokens.brand.violet2 : tokens.text.mid}
                    />
                  </Pressable>
                );
              })}
            </View>

            {/* Tiers */}
            <Text style={styles.label}>Tier ladder</Text>
            <Text style={styles.helperText}>
              Threshold values must ascend. Percentile is optional (0–100, what
              % of adults reach this tier — leave blank if you don&apos;t know).
            </Text>
            <View style={{ gap: tokens.space[3], marginTop: tokens.space[2] }}>
              {TIER_NAMES.map((name, i) => (
                <View key={name} style={styles.tierCard}>
                  <View style={styles.tierHeader}>
                    <TierMedal tier={name} size={32} />
                    <Text style={styles.tierName}>{name.toUpperCase()}</Text>
                  </View>
                  <View style={styles.tierFieldsRow}>
                    <View style={styles.tierFieldCol}>
                      <Text style={styles.tierFieldLabel}>Threshold</Text>
                      <TextInput
                        value={tiers[i]!.threshold}
                        onChangeText={(v) =>
                          updateTier(i, { threshold: v.replace(/[^0-9]/g, '') })
                        }
                        keyboardType="number-pad"
                        style={styles.tierInput}
                        editable={i > 0}
                        // beginner stays at 0; we lock it for clarity
                      />
                    </View>
                    <View style={styles.tierFieldCol}>
                      <Text style={styles.tierFieldLabel}>Top %</Text>
                      <TextInput
                        value={tiers[i]!.percentile}
                        onChangeText={(v) =>
                          updateTier(i, {
                            percentile: v.replace(/[^0-9.]/g, ''),
                          })
                        }
                        placeholder="—"
                        placeholderTextColor={tokens.text.faint}
                        keyboardType="decimal-pad"
                        style={styles.tierInput}
                      />
                    </View>
                  </View>
                  <TextInput
                    value={tiers[i]!.description}
                    onChangeText={(v) => updateTier(i, { description: v })}
                    placeholder={`What does ${name} look like?`}
                    placeholderTextColor={tokens.text.faint}
                    style={[styles.tierInput, styles.tierDescInput]}
                    maxLength={140}
                  />
                </View>
              ))}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
  saveBtn: {
    paddingHorizontal: tokens.space[4],
    height: 40,
    borderRadius: 12,
    backgroundColor: tokens.brand.violet,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 13,
    color: tokens.text.hi,
    letterSpacing: 0.3,
  },
  content: {
    paddingHorizontal: tokens.space[4],
    paddingBottom: tokens.space[10],
    gap: tokens.space[1],
  },
  label: {
    ...tokens.type.eyebrow,
    color: tokens.text.mid,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: tokens.space[4],
    marginBottom: tokens.space[2],
  },
  helperText: {
    ...tokens.type.caption,
    color: tokens.text.dim,
    fontStyle: 'italic',
  },
  input: {
    backgroundColor: tokens.bg.surface,
    borderWidth: 1,
    borderColor: tokens.border.base,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[3],
    color: tokens.text.hi,
    ...tokens.type.bodyLg,
    fontFamily: 'Manrope_500Medium',
  },
  textArea: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.space[2],
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: tokens.space[3],
    paddingVertical: tokens.space[2],
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.bg.surface,
    borderWidth: 1,
    borderColor: tokens.border.base,
  },
  chipText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    letterSpacing: 0.3,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.space[2],
  },
  iconCell: {
    width: 44,
    height: 44,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.bg.surface,
    borderWidth: 1,
    borderColor: tokens.border.base,
  },
  tierCard: {
    backgroundColor: tokens.bg.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.border.base,
    padding: tokens.space[3],
    gap: tokens.space[2],
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
  },
  tierName: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 12,
    color: tokens.text.hi,
    letterSpacing: 1,
  },
  tierFieldsRow: {
    flexDirection: 'row',
    gap: tokens.space[2],
  },
  tierFieldCol: {
    flex: 1,
    gap: 4,
  },
  tierFieldLabel: {
    ...tokens.type.caption,
    color: tokens.text.dim,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tierInput: {
    backgroundColor: tokens.bg.surface2,
    borderWidth: 1,
    borderColor: tokens.border.base,
    borderRadius: tokens.radius.sm,
    paddingHorizontal: tokens.space[3],
    paddingVertical: tokens.space[2],
    color: tokens.text.hi,
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
  },
  tierDescInput: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    color: tokens.text.mid,
  },
});
