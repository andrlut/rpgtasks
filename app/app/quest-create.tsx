import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Stack, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CoinIcon } from '@/components/CoinIcon';
import { useStartCustomQuest } from '@/lib/api/quests';
import { useActiveTasks } from '@/lib/api/tasks';
import { useT } from '@/lib/i18n';
import { useMetaLookup } from '@/lib/i18n/meta';
import { freeLimitEntity, useLimitModalStore } from '@/lib/premium';
import { useKeyboardHeight } from '@/lib/use-keyboard-height';
import { showInfo } from '@/lib/util/confirm';
import { tokens } from '@/theme';

/**
 * Custom quest creation. Form fields:
 *   - title (required, max 60)
 *   - description (optional, max 200)
 *   - duration in days (7 / 14 / 21 / 30 / custom)
 *   - linked tasks (multi-select against the user's active task list)
 *   - allow_partial toggle
 *
 * Category is intentionally NOT in this form — `quest` has no category
 * column, so saving one for a custom quest would have nowhere to land.
 * Custom quests show up under the "custom" bucket on the board.
 *
 * Reward XP/coins are derived from duration (preview-only, no slider):
 *   xp    = 50 + 10 * durationDays
 *   coins = floor(xp / 4)
 *
 * Per-task target_count defaults to `max(7, floor(durationDays / 2))`
 * — a rough "do this regularly" baseline that scales with the window.
 */
const DURATION_PRESETS = [7, 14, 21, 30];
const MAX_TITLE = 60;
const MAX_DESCRIPTION = 200;

function deriveRewardXp(days: number): number {
  return Math.max(20, 50 + 10 * days);
}

function deriveRewardCoins(xp: number): number {
  return Math.max(5, Math.floor(xp / 4));
}

function defaultTaskTarget(days: number): number {
  return Math.max(7, Math.floor(days / 2));
}

export default function QuestCreateScreen() {
  const router = useRouter();
  const { t } = useT();
  const meta = useMetaLookup();
  const tasks = useActiveTasks();
  const startCustomQuest = useStartCustomQuest();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationDays, setDurationDays] = useState<number>(21);
  const [linkedTaskIds, setLinkedTaskIds] = useState<Set<string>>(new Set());
  const [partial, setPartial] = useState(true);
  const keyboardHeight = useKeyboardHeight();

  const rewardXp = useMemo(() => deriveRewardXp(durationDays), [durationDays]);
  const rewardCoins = useMemo(() => deriveRewardCoins(rewardXp), [rewardXp]);
  const canSave = title.trim().length > 0 && !startCustomQuest.isPending;

  const toggleTask = (taskId: string) => {
    Haptics.selectionAsync().catch(() => {});
    setLinkedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const handleSave = async () => {
    if (!canSave) return;
    const deadline = new Date(Date.now() + durationDays * 86400000).toISOString();
    const requirements = [...linkedTaskIds].map((taskId) => ({
      kind: 'complete_task_n_times' as const,
      task_id: taskId,
      target_count: defaultTaskTarget(durationDays),
    }));

    try {
      await startCustomQuest.mutateAsync({
        title: title.trim(),
        description: description.trim() || null,
        deadline,
        reward_xp: rewardXp,
        reward_coins: rewardCoins,
        allow_partial: partial,
        requirements,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {},
      );
      router.back();
    } catch (e) {
      const limited = freeLimitEntity(e);
      if (limited) {
        router.back();
        useLimitModalStore.getState().open(limited);
        return;
      }
      const err = e as { message?: string; code?: string; details?: string; hint?: string };
      console.error('[start_custom_quest] failed', err);
      showInfo(
        t('quests.create.saveFail'),
        [err.message, err.code, err.details, err.hint].filter(Boolean).join('\n') ||
          'Unknown error',
      );
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
          hitSlop={10}
        >
          <Ionicons name="close" size={16} color={tokens.text.mid} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('quests.create.title')}</Text>
        <Pressable
          onPress={handleSave}
          disabled={!canSave}
          style={({ pressed }) => [
            styles.saveBtn,
            !canSave && styles.saveBtnDisabled,
            pressed && canSave && { opacity: 0.85 },
          ]}
        >
          {startCustomQuest.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>{t('common.save')}</Text>
          )}
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            keyboardHeight > 0 && { paddingBottom: keyboardHeight + tokens.space[10] },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {/* Title */}
          <View style={styles.field}>
            <Text style={styles.label}>{t('quests.create.nameLabel')}</Text>
            <TextInput
              value={title}
              onChangeText={(v) => setTitle(v.slice(0, MAX_TITLE))}
              placeholder={t('quests.create.namePlaceholder')}
              placeholderTextColor={tokens.text.faint}
              style={styles.input}
              maxLength={MAX_TITLE}
            />
          </View>

          {/* Description */}
          <View style={styles.field}>
            <Text style={styles.label}>{t('quests.create.descLabel')}</Text>
            <TextInput
              value={description}
              onChangeText={(v) => setDescription(v.slice(0, MAX_DESCRIPTION))}
              placeholder={t('quests.create.descPlaceholder')}
              placeholderTextColor={tokens.text.faint}
              style={[styles.input, styles.inputMultiline]}
              multiline
              maxLength={MAX_DESCRIPTION}
            />
          </View>

          {/* Duration */}
          <View style={styles.field}>
            <Text style={styles.label}>{t('quests.create.durationLabel')}</Text>
            <View style={styles.durationRow}>
              {DURATION_PRESETS.map((d) => {
                const selected = durationDays === d;
                return (
                  <Pressable
                    key={d}
                    onPress={() => setDurationDays(d)}
                    style={({ pressed }) => [
                      styles.durationPill,
                      selected && styles.durationPillSelected,
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.durationText,
                        selected && styles.durationTextSelected,
                      ]}
                    >
                      {d}d
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Linked tasks */}
          <View style={styles.field}>
            <Text style={styles.label}>{t('quests.create.tasksLabel')}</Text>
            <View style={styles.tasksWrap}>
              {tasks.isLoading ? (
                <View style={styles.tasksLoading}>
                  <ActivityIndicator color={tokens.brand.violet2} />
                </View>
              ) : (tasks.data ?? []).length === 0 ? (
                <Text style={styles.tasksEmpty}>{t('quests.create.tasksEmpty')}</Text>
              ) : (
                (tasks.data ?? []).map((task, idx) => {
                  const selected = linkedTaskIds.has(task.id);
                  const dim = meta.dim(task.primary_dimension_id);
                  return (
                    <Pressable
                      key={task.id}
                      onPress={() => toggleTask(task.id)}
                      style={({ pressed }) => [
                        styles.taskRow,
                        idx === (tasks.data ?? []).length - 1 && styles.taskRowLast,
                        pressed && { opacity: 0.85 },
                        !selected && { opacity: 0.55 },
                      ]}
                    >
                      <View style={[styles.taskIcon, { backgroundColor: dim.bg }]}>
                        <Ionicons
                          name={dim.iconName as never}
                          size={11}
                          color={dim.color}
                        />
                      </View>
                      <Text style={styles.taskName} numberOfLines={1}>
                        {task.title}
                      </Text>
                      <View
                        style={[
                          styles.taskCheck,
                          selected
                            ? { backgroundColor: tokens.brand.violet }
                            : styles.taskCheckEmpty,
                        ]}
                      >
                        {selected && <Ionicons name="checkmark" size={11} color="#fff" />}
                      </View>
                    </Pressable>
                  );
                })
              )}
            </View>
          </View>

          {/* Partial toggle */}
          <View style={styles.field}>
            <View style={styles.partialRow}>
              <View style={styles.partialInfo}>
                <Text style={styles.partialTitle}>{t('quests.create.partialTitle')}</Text>
                <Text style={styles.partialSub}>{t('quests.create.partialSub')}</Text>
              </View>
              <Switch
                value={partial}
                onValueChange={setPartial}
                trackColor={{ false: tokens.bg.surface2, true: tokens.brand.violet }}
                thumbColor={tokens.text.hi}
              />
            </View>
          </View>

          {/* Reward preview */}
          <View style={styles.field}>
            <Text style={styles.label}>{t('quests.create.rewardLabel')}</Text>
            <View style={styles.rewardPreview}>
              <View style={styles.rewardChip}>
                <Ionicons name="flash" size={13} color={tokens.brand.violet2} />
                <Text style={[styles.rewardChipText, { color: tokens.brand.violet2 }]}>
                  +{rewardXp} XP
                </Text>
              </View>
              <View style={styles.rewardChip}>
                <CoinIcon size={13} />
                <Text style={[styles.rewardChipText, { color: tokens.semantic.coin }]}>
                  +{rewardCoins}
                </Text>
              </View>
              <Text style={styles.rewardNote}>{t('quests.create.rewardNote')}</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.bg.deep },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: tokens.space[3],
    paddingVertical: tokens.space[2],
    borderBottomWidth: 1,
    borderBottomColor: tokens.border.base,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: tokens.bg.surface2,
    borderWidth: 1,
    borderColor: tokens.border.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 14,
    color: tokens.text.hi,
  },
  saveBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: tokens.brand.violet,
    minWidth: 60,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    backgroundColor: tokens.bg.surface2,
  },
  saveBtnText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
    color: '#fff',
  },

  scroll: {
    padding: tokens.space[3],
    gap: tokens.space[3],
  },
  field: {
    gap: 5,
  },
  label: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    letterSpacing: 0.7,
    color: tokens.text.dim,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: tokens.bg.surface,
    borderWidth: 1,
    borderColor: tokens.border.base,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    color: tokens.text.hi,
  },
  inputMultiline: {
    minHeight: 60,
    textAlignVertical: 'top',
  },

  durationRow: {
    flexDirection: 'row',
    gap: 4,
  },
  durationPill: {
    flex: 1,
    backgroundColor: tokens.bg.surface,
    borderWidth: 1,
    borderColor: tokens.border.base,
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: 'center',
  },
  durationPillSelected: {
    backgroundColor: 'rgba(123,92,255,0.12)',
    borderColor: tokens.brand.violet,
  },
  durationText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    color: tokens.text.dim,
  },
  durationTextSelected: {
    color: tokens.brand.violet2,
    fontFamily: 'Manrope_800ExtraBold',
  },

  tasksWrap: {
    backgroundColor: tokens.bg.surface,
    borderWidth: 1,
    borderColor: tokens.border.base,
    borderRadius: 9,
    overflow: 'hidden',
  },
  tasksLoading: {
    padding: tokens.space[3],
    alignItems: 'center',
  },
  tasksEmpty: {
    padding: tokens.space[3],
    textAlign: 'center',
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    color: tokens.text.dim,
    fontStyle: 'italic',
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: tokens.border.base,
  },
  taskRowLast: {
    borderBottomWidth: 0,
  },
  taskIcon: {
    width: 22,
    height: 22,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskName: {
    flex: 1,
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    color: tokens.text.hi,
  },
  taskCheck: {
    width: 18,
    height: 18,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskCheckEmpty: {
    borderWidth: 1,
    borderColor: tokens.border.strong,
    backgroundColor: 'transparent',
  },

  partialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: tokens.bg.surface,
    borderWidth: 1,
    borderColor: tokens.border.base,
    borderRadius: 9,
  },
  partialInfo: {
    flex: 1,
  },
  partialTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    color: tokens.text.hi,
  },
  partialSub: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 10,
    color: tokens.text.dim,
    marginTop: 1,
  },

  rewardPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: tokens.bg.surface,
    borderWidth: 1,
    borderColor: tokens.border.base,
    borderRadius: 9,
    flexWrap: 'wrap',
  },
  rewardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rewardChipText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 12,
  },
  rewardNote: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 9,
    color: tokens.text.faint,
    fontStyle: 'italic',
    flex: 1,
    minWidth: 100,
  },
});
