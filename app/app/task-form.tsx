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
import { DimensionMultiSelect } from '@/components/DimensionMultiSelect';
import { RecurrencePicker } from '@/components/RecurrencePicker';
import {
  useArchiveTask,
  useCreateTask,
  useTask,
  useUpdateTask,
  type TaskFormInput,
} from '@/lib/api/tasks';
import type { DimensionId, Recurrence } from '@/lib/db/types';
import type { Difficulty } from '@/lib/xp';
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
  const params = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!params.id;

  const existing = useTask(params.id);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>(2);
  const [recurrence, setRecurrence] = useState<Recurrence>({ type: 'daily' });
  const [targetCount, setTargetCount] = useState<number>(1);
  const [dimensions, setDimensions] = useState<DimensionId[]>([]);

  // Hydrate from server when editing
  useEffect(() => {
    if (existing.data) {
      setTitle(existing.data.title);
      setDescription(existing.data.description ?? '');
      setDifficulty(existing.data.difficulty);
      setRecurrence(existing.data.recurrence);
      setTargetCount(existing.data.target_count ?? 1);
      setDimensions(existing.data.dimensions);
    }
  }, [existing.data]);

  const createTask = useCreateTask();
  const updateTask = useUpdateTask(params.id ?? '');
  const archiveTask = useArchiveTask();

  const isSubmitting =
    createTask.isPending || updateTask.isPending || archiveTask.isPending;

  const formInput = useMemo<TaskFormInput>(
    () => ({
      title: title.trim(),
      description: description.trim() === '' ? null : description.trim(),
      difficulty,
      task_type: legacyTypeFor(recurrence),
      recurrence,
      target_count: recurrence.type === 'one_shot' ? 1 : targetCount,
      dimensions,
    }),
    [title, description, difficulty, recurrence, targetCount, dimensions],
  );

  const handleSave = async () => {
    if (!formInput.title) {
      Alert.alert('Title required', 'Give your quest a title.');
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

  const handleArchive = () => {
    if (!params.id) return;
    Alert.alert('Archive quest?', 'Archived quests stop appearing on Home.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive',
        style: 'destructive',
        onPress: async () => {
          if (!params.id) return;
          try {
            await archiveTask.mutateAsync(params.id);
            router.back();
          } catch (e) {
            const msg = e instanceof Error ? e.message : 'Unknown error';
            Alert.alert('Archive failed', msg);
          }
        },
      },
    ]);
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
            <Text style={styles.label}>Difficulty</Text>
            <DifficultyPicker value={difficulty} onChange={setDifficulty} />
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
            <Text style={styles.label}>Dimensions</Text>
            <Text style={styles.hint}>Pick which stats this quest grants XP in.</Text>
            <DimensionMultiSelect value={dimensions} onChange={setDimensions} />
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
});
