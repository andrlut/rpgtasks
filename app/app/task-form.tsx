import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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

import { DifficultyPicker } from '@/components/DifficultyPicker';
import { RecurrencePicker } from '@/components/RecurrencePicker';
import { SubPicker } from '@/components/SubPicker';
import {
  useArchiveTask,
  useCreateTask,
  useTask,
  useUpdateTask,
  type TaskFormInput,
} from '@/lib/api/tasks';
import type { MetricType, Recurrence, SubId } from '@/lib/db/types';
import { confirmAction } from '@/lib/util/confirm';
import { formatScaledValue, scaledTargetValue, type Difficulty } from '@/lib/xp';
import { tokens } from '@/theme';

/** Map a Recurrence to the legacy task_type column (kept for compat). */
function legacyTypeFor(r: Recurrence): 'one_shot' | 'daily' | 'weekly' {
  if (r.type === 'one_shot') return 'one_shot';
  if (r.type === 'weekly') return 'weekly';
  // daily and monthly both map to daily for the legacy column
  return 'daily';
}

const METRIC_PRESETS: { id: MetricType; label: string; defaultUnit: string }[] = [
  { id: 'minutes', label: 'Minutes', defaultUnit: 'min' },
  { id: 'reps', label: 'Reps', defaultUnit: 'reps' },
  { id: 'km', label: 'Distance (km)', defaultUnit: 'km' },
  { id: 'pages', label: 'Pages', defaultUnit: 'pages' },
  { id: 'ml', label: 'Volume (ml)', defaultUnit: 'ml' },
  { id: 'custom', label: 'Custom', defaultUnit: '' },
];

export default function TaskFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!params.id;

  const existing = useTask(params.id);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>(2);
  const [recurrence, setRecurrence] = useState<Recurrence>({ type: 'daily' });
  const [targetCount, setTargetCount] = useState<number>(1);
  const [subId, setSubId] = useState<SubId | null>(null);

  // Optional metric scaling fields
  const [scalingEnabled, setScalingEnabled] = useState(false);
  const [metricType, setMetricType] = useState<MetricType>('minutes');
  const [metricLabel, setMetricLabel] = useState<string>('min');
  const [baseValueText, setBaseValueText] = useState<string>('');
  const [incrementText, setIncrementText] = useState<string>('');

  // Hydrate from server when editing
  useEffect(() => {
    if (existing.data) {
      setTitle(existing.data.title);
      setDescription(existing.data.description ?? '');
      setDifficulty(existing.data.difficulty);
      setRecurrence(existing.data.recurrence);
      setTargetCount(existing.data.target_count ?? 1);
      setSubId(existing.data.sub_id);
      if (existing.data.metric_type) {
        setScalingEnabled(true);
        setMetricType(existing.data.metric_type);
        setMetricLabel(existing.data.metric_label ?? '');
        setBaseValueText(String(existing.data.base_value ?? ''));
        setIncrementText(String(existing.data.increment_per_star ?? ''));
      }
    }
  }, [existing.data]);

  const createTask = useCreateTask();
  const updateTask = useUpdateTask(params.id ?? '');
  const archiveTask = useArchiveTask();

  const isSubmitting =
    createTask.isPending || updateTask.isPending || archiveTask.isPending;

  const baseValue = parseFloat(baseValueText);
  const incrementPerStar = parseFloat(incrementText);
  const baseValid = scalingEnabled && Number.isFinite(baseValue) && baseValue > 0;
  const incrementValid = scalingEnabled && Number.isFinite(incrementPerStar) && incrementPerStar >= 0;
  const scalingValid = !scalingEnabled || (baseValid && incrementValid);

  // Build the input only when sub_id is set — TaskFormInput requires it.
  const formInput = useMemo<TaskFormInput | null>(
    () => {
      if (!subId) return null;
      return {
        title: title.trim(),
        description: description.trim() === '' ? null : description.trim(),
        difficulty,
        task_type: legacyTypeFor(recurrence),
        recurrence,
        target_count: recurrence.type === 'one_shot' ? 1 : targetCount,
        sub_id: subId,
        metric_type: scalingEnabled ? metricType : null,
        metric_label: scalingEnabled ? (metricLabel.trim() || null) : null,
        base_value: scalingEnabled && baseValid ? baseValue : null,
        increment_per_star: scalingEnabled && incrementValid ? incrementPerStar : null,
      };
    },
    [
      title, description, difficulty, recurrence, targetCount, subId,
      scalingEnabled, metricType, metricLabel, baseValid, baseValue,
      incrementValid, incrementPerStar,
    ],
  );

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Title required', 'Give your quest a title.');
      return;
    }
    if (!subId || !formInput) {
      Alert.alert('Pick a sub-dimension', 'Choose where this quest contributes.');
      return;
    }
    if (!scalingValid) {
      Alert.alert(
        'Scaling needs values',
        'Set a positive base value and a non-negative increment, or turn scaling off.',
      );
      return;
    }
    try {
      if (isEdit && params.id) {
        await updateTask.mutateAsync(formInput);
      } else {
        await createTask.mutateAsync(formInput);
      }
      router.back();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      Alert.alert('Save failed', msg);
    }
  };

  const handleArchive = async () => {
    if (!params.id) return;
    const ok = await confirmAction(
      'Archive quest?',
      'Archived quests stop appearing on Home.',
      { okText: 'Archive', cancelText: 'Cancel', destructive: true },
    );
    if (!ok) return;
    try {
      await archiveTask.mutateAsync(params.id);
      router.back();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      Alert.alert('Archive failed', msg);
    }
  };

  if (isEdit && existing.isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingBox}>
          <ActivityIndicator color={tokens.brand.violet2} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen
        options={{ headerShown: false, presentation: 'modal' }}
      />

      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.6 }]}
          hitSlop={8}
        >
          <Ionicons name="close" size={24} color={tokens.text.hi} />
        </Pressable>
        <Text style={styles.headerTitle}>{isEdit ? 'Edit quest' : 'New quest'}</Text>
        <Pressable
          onPress={handleSave}
          disabled={isSubmitting}
          style={({ pressed }) => [
            styles.saveButton,
            (pressed || isSubmitting) && { opacity: 0.6 },
          ]}
          hitSlop={8}
        >
          {isSubmitting ? (
            <ActivityIndicator color={tokens.text.hi} size="small" />
          ) : (
            <Text style={styles.saveText}>Save</Text>
          )}
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
          <View style={styles.field}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              style={styles.input}
              placeholder="20 push-ups"
              placeholderTextColor={tokens.text.faint}
              autoFocus={!isEdit}
              returnKeyType="next"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Description (optional)</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              style={[styles.input, styles.inputMultiline]}
              placeholder="Notes, reminders…"
              placeholderTextColor={tokens.text.faint}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Default difficulty</Text>
            <DifficultyPicker value={difficulty} onChange={setDifficulty} />
            {scalingEnabled && (
              <Text style={styles.hint}>
                Stars can be changed per day with a swipe on the card.
              </Text>
            )}
          </View>

          <View style={styles.field}>
            <Pressable
              onPress={() => {
                const next = !scalingEnabled;
                setScalingEnabled(next);
                if (next && !baseValueText) {
                  // Sensible defaults to avoid an empty preview
                  const preset = METRIC_PRESETS.find((p) => p.id === metricType);
                  if (preset && !metricLabel) setMetricLabel(preset.defaultUnit);
                }
              }}
              style={({ pressed }) => [
                styles.scalingToggle,
                scalingEnabled && styles.scalingToggleOn,
                pressed && { opacity: 0.7 },
              ]}
            >
              <View style={[styles.checkbox, scalingEnabled && styles.checkboxOn]}>
                {scalingEnabled && (
                  <Ionicons name="checkmark" size={14} color={tokens.text.hi} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.scalingTitle}>Scale target with stars</Text>
                <Text style={styles.hint}>
                  Each extra star raises the target (e.g. ★ = 20 min, ★★ = 40 min…).
                </Text>
              </View>
            </Pressable>

            {scalingEnabled && (
              <View style={styles.scalingPanel}>
                <Text style={styles.label}>Metric</Text>
                <View style={styles.metricRow}>
                  {METRIC_PRESETS.map((p) => (
                    <Pressable
                      key={p.id}
                      onPress={() => {
                        setMetricType(p.id);
                        if (p.id !== 'custom') setMetricLabel(p.defaultUnit);
                      }}
                      style={({ pressed }) => [
                        styles.metricChip,
                        metricType === p.id && styles.metricChipOn,
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.metricChipText,
                          metricType === p.id && styles.metricChipTextOn,
                        ]}
                      >
                        {p.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {metricType === 'custom' && (
                  <View style={{ marginTop: tokens.space[3] }}>
                    <Text style={styles.label}>Unit label</Text>
                    <TextInput
                      value={metricLabel}
                      onChangeText={setMetricLabel}
                      style={styles.input}
                      placeholder="e.g. sets, hours, glasses"
                      placeholderTextColor={tokens.text.faint}
                    />
                  </View>
                )}

                <View style={styles.numericRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Base value (1★)</Text>
                    <TextInput
                      value={baseValueText}
                      onChangeText={setBaseValueText}
                      keyboardType="numeric"
                      style={styles.input}
                      placeholder="20"
                      placeholderTextColor={tokens.text.faint}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>+ per star</Text>
                    <TextInput
                      value={incrementText}
                      onChangeText={setIncrementText}
                      keyboardType="numeric"
                      style={styles.input}
                      placeholder="20"
                      placeholderTextColor={tokens.text.faint}
                    />
                  </View>
                </View>

                {baseValid && incrementValid && (
                  <View style={styles.previewBox}>
                    <Text style={styles.previewTitle}>Preview</Text>
                    {([1, 2, 3, 4, 5] as Difficulty[]).map((d) => {
                      const v = scaledTargetValue(baseValue, incrementPerStar, d);
                      return (
                        <View key={d} style={styles.previewRow}>
                          <Text style={styles.previewStars}>
                            {'★'.repeat(d)}
                            <Text style={styles.previewStarsDim}>{'★'.repeat(5 - d)}</Text>
                          </Text>
                          <Text style={styles.previewValue}>
                            {formatScaledValue(v, metricLabel || null)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>How often</Text>
            <RecurrencePicker
              recurrence={recurrence}
              onChange={setRecurrence}
              targetCount={targetCount}
              onChangeTargetCount={setTargetCount}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Sub-dimension</Text>
            <Text style={styles.hint}>
              Pick the sub this quest contributes to. The parent dimension gets the XP automatically.
            </Text>
            <SubPicker value={subId} onChange={setSubId} />
          </View>

          {isEdit && (
            <Pressable
              onPress={handleArchive}
              disabled={isSubmitting}
              style={({ pressed }) => [
                styles.archiveButton,
                pressed && { opacity: 0.6 },
              ]}
            >
              <Ionicons name="archive-outline" size={18} color={tokens.semantic.danger} />
              <Text style={styles.archiveText}>Archive quest</Text>
            </Pressable>
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
  iconButton: {
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
  saveButton: {
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[2],
    backgroundColor: tokens.brand.violet,
    borderRadius: tokens.radius.md,
    minWidth: 72,
    alignItems: 'center',
  },
  saveText: {
    ...tokens.type.body,
    fontFamily: 'Manrope_700Bold',
    color: tokens.text.hi,
  },
  content: {
    padding: tokens.space[4],
    gap: tokens.space[5],
    paddingBottom: tokens.space[10],
  },
  field: {
    gap: tokens.space[2],
  },
  label: {
    ...tokens.type.eyebrow,
    color: tokens.text.mid,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hint: {
    ...tokens.type.caption,
    color: tokens.text.dim,
    marginTop: -4,
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
  },
  inputMultiline: {
    minHeight: 80,
    paddingTop: tokens.space[3],
  },
  archiveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: tokens.space[4],
    borderWidth: 1,
    borderColor: 'rgba(255, 92, 122, 0.3)',
    borderRadius: tokens.radius.md,
    backgroundColor: 'rgba(255, 92, 122, 0.08)',
    marginTop: tokens.space[3],
  },
  archiveText: {
    ...tokens.type.body,
    color: tokens.semantic.danger,
    fontFamily: 'Manrope_700Bold',
  },
  scalingToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    padding: tokens.space[3],
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.border.base,
    backgroundColor: tokens.bg.surface,
  },
  scalingToggleOn: {
    borderColor: tokens.brand.violet,
    backgroundColor: 'rgba(124, 92, 255, 0.08)',
  },
  scalingTitle: {
    ...tokens.type.body,
    color: tokens.text.hi,
    fontFamily: 'Manrope_700Bold',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: tokens.border.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: tokens.brand.violet,
    borderColor: tokens.brand.violet,
  },
  scalingPanel: {
    marginTop: tokens.space[3],
    padding: tokens.space[3],
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.border.base,
    backgroundColor: tokens.bg.surface,
    gap: tokens.space[2],
  },
  metricRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricChip: {
    paddingVertical: 6,
    paddingHorizontal: tokens.space[3],
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.border.base,
    backgroundColor: tokens.bg.base,
  },
  metricChipOn: {
    borderColor: tokens.brand.violet,
    backgroundColor: 'rgba(124, 92, 255, 0.18)',
  },
  metricChipText: {
    ...tokens.type.caption,
    color: tokens.text.mid,
  },
  metricChipTextOn: {
    color: tokens.text.hi,
    fontFamily: 'Manrope_700Bold',
  },
  numericRow: {
    flexDirection: 'row',
    gap: tokens.space[3],
    marginTop: tokens.space[2],
  },
  previewBox: {
    marginTop: tokens.space[3],
    padding: tokens.space[3],
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.bg.base,
    borderWidth: 1,
    borderColor: tokens.border.base,
    gap: 6,
  },
  previewTitle: {
    ...tokens.type.eyebrow,
    color: tokens.text.mid,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewStars: {
    ...tokens.type.body,
    color: tokens.semantic.coin,
    letterSpacing: 1,
  },
  previewStarsDim: {
    color: tokens.text.faint,
  },
  previewValue: {
    ...tokens.type.body,
    color: tokens.text.hi,
    fontFamily: 'Manrope_700Bold',
  },
});
