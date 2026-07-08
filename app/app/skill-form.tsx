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
import { SkillMedallionOrbital } from '@/components/SkillMedallionOrbital';
import {
  useCreateCustomSkill,
  type CustomSkillTierInput,
} from '@/lib/api/skills';
import type { SubId, TierName } from '@/lib/db/types';
import { useT } from '@/lib/i18n';
import { freeLimitEntity, useLimitModalStore } from '@/lib/premium';
import { useKeyboardHeight } from '@/lib/use-keyboard-height';
import { tokens } from '@/theme';
import { useMetaLookup } from '@/lib/i18n/meta';
import { DIMENSION_ORDER, SUBS_BY_DIM, SUB_META } from '@/theme/dimensions';

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
  const { t } = useT();
  const metaLookup = useMetaLookup();
  const createSkill = useCreateCustomSkill();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('reps');
  // Sub-first: the user picks an area (sub); parent dimension is derived
  // on submit from SUB_META.
  const [subId, setSubId] = useState<SubId>(SUBS_BY_DIM[DIMENSION_ORDER[0]][0]);
  const [icon, setIcon] = useState<string>('flash');
  const [tiers, setTiers] = useState<TierFormState[]>(DEFAULT_TIERS);
  const keyboardHeight = useKeyboardHeight();

  const updateTier = (index: number, patch: Partial<TierFormState>) => {
    setTiers((prev) => prev.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  };

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      Alert.alert(t('skill.form.missingNameTitle'), t('skill.form.missingNameBody'));
      return;
    }
    if (unit.trim().length === 0) {
      Alert.alert(t('skill.form.missingUnitTitle'), t('skill.form.missingUnitBody'));
      return;
    }

    // Parse + validate tiers
    const parsed: CustomSkillTierInput[] = [];
    for (let i = 0; i < 5; i++) {
      const ti = tiers[i]!;
      const threshold = parseInt(ti.threshold, 10);
      if (!Number.isFinite(threshold) || threshold < 0) {
        Alert.alert(
          t('skill.form.badThresholdTitle'),
          t('skill.form.badThresholdBody', { tier: TIER_NAMES[i] ?? '' }),
        );
        return;
      }
      if (i > 0) {
        const prev = parsed[i - 1]!.threshold;
        if (threshold <= prev) {
          Alert.alert(
            t('skill.form.tiersAscendTitle'),
            t('skill.form.tiersAscendBody', {
              tier: TIER_NAMES[i] ?? '',
              value: threshold,
              prevTier: TIER_NAMES[i - 1] ?? '',
              prevValue: prev,
            }),
          );
          return;
        }
      }
      const percentileNum = ti.percentile.trim() === '' ? null : parseFloat(ti.percentile);
      if (percentileNum !== null && (!Number.isFinite(percentileNum) || percentileNum < 0 || percentileNum > 100)) {
        Alert.alert(
          t('skill.form.badPercentileTitle'),
          t('skill.form.badPercentileBody', { tier: TIER_NAMES[i] ?? '' }),
        );
        return;
      }
      parsed.push({
        tier_name: TIER_NAMES[i]!,
        threshold,
        description: ti.description.trim() === '' ? null : ti.description.trim(),
        percentile: percentileNum,
      });
    }

    try {
      await createSkill.mutateAsync({
        display_name: trimmedName,
        unit: unit.trim(),
        dimension_id: SUB_META[subId].dimensionId,
        sub_id: subId,
        icon,
        description: description.trim() === '' ? null : description.trim(),
        tiers: parsed,
      });
      router.back();
    } catch (e) {
      const limited = freeLimitEntity(e);
      if (limited) {
        router.back();
        useLimitModalStore.getState().open(limited);
        return;
      }
      const msg = e instanceof Error ? e.message : t('common.unknownError');
      Alert.alert(t('skill.form.createFail'), msg);
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
          <Text style={styles.title}>{t('skill.form.newTitle')}</Text>
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
              {createSkill.isPending ? t('skill.form.saving') : t('skill.form.save')}
            </Text>
          </Pressable>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={[
              styles.content,
              keyboardHeight > 0 && { paddingBottom: keyboardHeight + tokens.space[10] },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          >
            {/* Name */}
            <Text style={styles.label}>{t('skill.form.nameLabel')}</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t('skill.form.namePlaceholder')}
              placeholderTextColor={tokens.text.faint}
              style={styles.input}
              maxLength={60}
            />

            {/* Unit */}
            <Text style={styles.label}>{t('skill.form.unitLabel')}</Text>
            <TextInput
              value={unit}
              onChangeText={setUnit}
              placeholder={t('skill.form.unitPlaceholder')}
              placeholderTextColor={tokens.text.faint}
              style={styles.input}
              maxLength={20}
              autoCapitalize="none"
            />

            {/* Description */}
            <Text style={styles.label}>{t('skill.form.descLabel')}</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder={t('skill.form.descPlaceholder')}
              placeholderTextColor={tokens.text.faint}
              style={[styles.input, styles.textArea]}
              multiline
              maxLength={300}
            />

            {/* Sub (area) — grouped by parent dim for visual structure */}
            <Text style={styles.label}>{t('skill.form.subLabel')}</Text>
            {DIMENSION_ORDER.map((dimId) => {
              const dimMeta = metaLookup.dim(dimId);
              return (
                <View key={dimId} style={styles.subGroup}>
                  <Text style={[styles.subGroupLabel, { color: dimMeta.color }]}>
                    {dimMeta.label.toUpperCase()}
                  </Text>
                  <View style={styles.chipRow}>
                    {SUBS_BY_DIM[dimId].map((sId) => {
                      const sMeta = metaLookup.sub(sId);
                      const active = sId === subId;
                      return (
                        <Pressable
                          key={sId}
                          onPress={() => setSubId(sId)}
                          style={[
                            styles.chip,
                            active && {
                              backgroundColor: dimMeta.bg,
                              borderColor: dimMeta.color,
                            },
                          ]}
                        >
                          <Ionicons
                            name={sMeta.iconName as never}
                            size={14}
                            color={active ? dimMeta.color : tokens.text.mid}
                          />
                          <Text
                            style={[
                              styles.chipText,
                              { color: active ? dimMeta.color : tokens.text.mid },
                            ]}
                          >
                            {sMeta.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              );
            })}

            {/* Icon */}
            <Text style={styles.label}>{t('skill.form.iconLabel')}</Text>
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
            <Text style={styles.label}>{t('skill.form.tierLabel')}</Text>
            <Text style={styles.helperText}>{t('skill.form.tierHelper')}</Text>
            <View style={{ gap: tokens.space[3], marginTop: tokens.space[2] }}>
              {TIER_NAMES.map((name, i) => (
                <View key={name} style={styles.tierCard}>
                  <View style={styles.tierHeader}>
                    <SkillMedallionOrbital
                      tier={name}
                      pr={0}
                      size={36}
                      showGlyph={false}
                    />
                    <Text style={styles.tierName}>{name.toUpperCase()}</Text>
                  </View>
                  <View style={styles.tierFieldsRow}>
                    <View style={styles.tierFieldCol}>
                      <Text style={styles.tierFieldLabel}>{t('skill.form.tierThreshold')}</Text>
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
                      <Text style={styles.tierFieldLabel}>{t('skill.form.tierTop')}</Text>
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
                    placeholder={t('skill.form.tierDescPlaceholder', { tier: name })}
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
  subGroup: {
    marginTop: tokens.space[2],
    gap: 6,
  },
  subGroupLabel: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    letterSpacing: 1.2,
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
