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

import { RecurrencePicker } from '@/components/RecurrencePicker';
import { SubPicker } from '@/components/SubPicker';
import {
  useArchiveTask,
  useCreateTask,
  useTask,
  useTaskTemplates,
  useUpdateTask,
  type TaskFormInput,
} from '@/lib/api/tasks';
import type { Recurrence, TaskSub } from '@/lib/db/types';
import { useKeyboardHeight } from '@/lib/use-keyboard-height';
import { confirmAction } from '@/lib/util/confirm';
import { rewardForTaskSubs } from '@/lib/xp';
import { tokens } from '@/theme';

/** Map a Recurrence to the legacy task_type column (kept for compat). */
function legacyTypeFor(r: Recurrence): 'one_shot' | 'daily' | 'weekly' {
  if (r.type === 'one_shot') return 'one_shot';
  if (r.type === 'weekly') return 'weekly';
  // daily and monthly both map to daily for the legacy column
  return 'daily';
}

export default function TaskFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; from_template?: string }>();
  const isEdit = !!params.id;
  const fromTemplateId = params.from_template;

  const existing = useTask(params.id);
  const templates = useTaskTemplates();
  /** When the user picks "Customize" on the AdoptPeriodicitySheet, this
   *  screen opens with `from_template=X` so we pre-fill the form fields
   *  with the template's content. The resulting save goes through the
   *  regular createTask path — so the new task is `template_id IS NULL`
   *  (truly custom). That also means it counts as a custom slot under
   *  any future free-tier limit, which is the right thing. */
  const templateSource = useMemo(
    () =>
      fromTemplateId
        ? (templates.data ?? []).find((t) => t.id === fromTemplateId) ?? null
        : null,
    [fromTemplateId, templates.data],
  );

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [recurrence, setRecurrence] = useState<Recurrence>({ type: 'daily' });
  const [targetCount, setTargetCount] = useState<number>(1);
  const [subs, setSubs] = useState<TaskSub[]>([]);
  const [prefillApplied, setPrefillApplied] = useState(false);
  // Keep scroll content reachable while the keyboard is up. `endCoordinates`
  // doesn't always include the keyboard's tool/suggestion bar, so we add a
  // generous buffer below.
  const keyboardHeight = useKeyboardHeight();

  // Hydrate from server when editing
  useEffect(() => {
    if (existing.data) {
      setTitle(existing.data.title);
      setDescription(existing.data.description ?? '');
      setRecurrence(existing.data.recurrence);
      setTargetCount(existing.data.target_count ?? 1);
      setSubs(existing.data.subs);
    }
  }, [existing.data]);

  // Prefill from template when entering via "Customize" on the adopt sheet.
  // One-shot: we apply once, then stop reacting so user edits don't get
  // clobbered if templates query refetches.
  useEffect(() => {
    if (isEdit) return;
    if (prefillApplied) return;
    if (!templateSource) return;
    setTitle(templateSource.title);
    setDescription(templateSource.description ?? '');
    setRecurrence(templateSource.recurrence);
    setTargetCount(templateSource.target_count ?? 1);
    setSubs(templateSource.subs);
    setPrefillApplied(true);
  }, [isEdit, prefillApplied, templateSource]);

  const createTask = useCreateTask();
  const updateTask = useUpdateTask(params.id ?? '');
  const archiveTask = useArchiveTask();

  const isSubmitting =
    createTask.isPending || updateTask.isPending || archiveTask.isPending;

  const totalStars = subs.reduce((s, x) => s + x.stars, 0);
  const reward = useMemo(() => rewardForTaskSubs(subs), [subs]);

  const formInput = useMemo<TaskFormInput | null>(() => {
    if (subs.length === 0 || totalStars === 0) return null;
    return {
      title: title.trim(),
      description: description.trim() === '' ? null : description.trim(),
      task_type: legacyTypeFor(recurrence),
      recurrence,
      target_count: recurrence.type === 'one_shot' ? 1 : targetCount,
      subs,
    };
  }, [title, description, recurrence, targetCount, subs, totalStars]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Title required', 'Give your task a title.');
      return;
    }
    if (subs.length === 0 || !formInput) {
      Alert.alert(
        'Pick at least one sub',
        'Tasks contribute to one or more sub-dimensions. Pick the ones this task touches and how many stars each gets.',
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
      'Archive task?',
      'Archived tasks stop appearing on Home.',
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
      <Stack.Screen options={{ headerShown: false, presentation: 'modal' }} />

      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.6 }]}
          hitSlop={8}
        >
          <Ionicons name="close" size={24} color={tokens.text.hi} />
        </Pressable>
        <Text style={styles.headerTitle}>{isEdit ? 'Edit task' : 'New task'}</Text>
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
          contentContainerStyle={[
            styles.content,
            keyboardHeight > 0 && { paddingBottom: keyboardHeight + tokens.space[10] },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <View style={styles.field}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              style={styles.input}
              placeholder="Morning routine, 20 push-ups, ..."
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
            <Text style={styles.label}>Sub-dimensions + stars</Text>
            <Text style={styles.hint}>
              Pick which subs this task contributes to and how heavy each
              effort is. Per-sub stars cap at 5 — distribute honestly.
            </Text>
            <SubPicker value={subs} onChange={setSubs} />
            {subs.length > 0 && (
              <View style={styles.rewardPreview}>
                <Ionicons name="flag" size={13} color={tokens.semantic.xp} />
                <Text style={[styles.rewardText, { color: tokens.semantic.xp }]}>
                  +{reward.total.xp} XP
                </Text>
                <Ionicons
                  name="cash"
                  size={13}
                  color={tokens.semantic.coin}
                />
                <Text
                  style={[styles.rewardText, { color: tokens.semantic.coin }]}
                >
                  +{reward.total.coins}
                </Text>
                <Text style={styles.rewardSplit}>
                  {reward.perSub
                    .map((p) => `${p.stars}★`)
                    .join(' + ')}{' '}
                  = {reward.totalStars}★
                </Text>
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

          {isEdit && (
            <Pressable
              onPress={handleArchive}
              disabled={isSubmitting}
              style={({ pressed }) => [
                styles.archiveButton,
                pressed && { opacity: 0.6 },
              ]}
            >
              <Ionicons
                name="archive-outline"
                size={18}
                color={tokens.semantic.danger}
              />
              <Text style={styles.archiveText}>Archive task</Text>
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
  rewardPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    marginTop: tokens.space[2],
    paddingHorizontal: tokens.space[3],
    paddingVertical: tokens.space[2],
    backgroundColor: tokens.bg.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.border.base,
  },
  rewardText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 13,
  },
  rewardSplit: {
    flex: 1,
    textAlign: 'right',
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    color: tokens.text.dim,
    letterSpacing: 0.4,
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
});
