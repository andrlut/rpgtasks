import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { TourModule } from '@/components/tour/TourModule';
import { buildM1Steps } from '@/lib/tour/m1Steps';
import { buildM2Steps } from '@/lib/tour/m2Steps';
import { useIsCurrentTourModule, useTourStore } from '@/lib/tour/store';
import { useT } from '@/lib/i18n';
import { freeLimitEntity, useLimitModalStore } from '@/lib/premium';
import { SUB_META } from '@/theme/dimensions';
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

/**
 * Curated Ionicons covering the main task archetypes. First row = the
 * sub-aligned icons (same defaults the SubIconTile uses) so picking
 * "default-y" stays one tap. Rest = expressive choices grouped by
 * domain. Same shape as `ICON_CHOICES` in reward-form.
 */
const TASK_ICON_CHOICES = [
  // Sub defaults (mirror SUB_META.iconName — keeps the auto-derived
  // look one tap away even after the user opens the picker)
  'moon',
  'restaurant',
  'barbell',
  'walk',
  'book',
  'flower',
  'cash',
  'briefcase',
  'people',
  'heart',
  'game-controller',
  'hammer',
  // Body / movement
  'bicycle',
  'fitness',
  'basketball',
  'football',
  'tennisball',
  // Mind / focus
  'library',
  'school',
  'pencil',
  'language',
  'bulb',
  'compass',
  // Wealth / craft
  'card',
  'wallet',
  'trending-up',
  'build',
  'color-palette',
  'brush',
  'camera',
  'musical-notes',
  // Bonds / social
  'call',
  'chatbubbles',
  'gift',
  // Misc daily
  'water',
  'sunny',
  'bed',
  'cafe',
  'leaf',
  'medkit',
  'time',
  'checkbox',
] as const;

export default function TaskFormScreen() {
  const router = useRouter();
  const { t } = useT();
  const params = useLocalSearchParams<{ id?: string; from_template?: string }>();

  const isEdit = !!params.id;
  const fromTemplateId = params.from_template;
  const isCreateMode = !isEdit && !fromTemplateId;
  const isM2Current = useIsCurrentTourModule('M2');

  // Auto-advance M1 / M2 when the user leaves this screen without
  // acting on the active tooltip. Covers the screen's own X, save,
  // archive, hardware back — any path that closes the form while a
  // step that lives on this screen is still current. Without this the
  // tour gets stranded: state stays at "step N on form" but no form is
  // mounted, so nothing renders and the user reads it as "tour ended".
  //
  //   M1 step 2 (detail mode)            → idx 1
  //   M2 steps 3, 4, 5 (create mode)     → idx 2, 3, 4 — last one
  //                                         finishes the module
  useFocusEffect(
    useCallback(() => {
      return () => {
        const state = useTourStore.getState();

        const m1Status = state.modules.M1?.status;
        const m1Idx = state.stepIndices.M1 ?? 0;
        if (m1Status === 'in_progress' && m1Idx === 1) {
          state.setStepIndex('M1', m1Idx + 1);
        }

        // M2 steps 3-5 all live on this form (subs / recurrence /
        // wrap-up). If the user closes the form via the screen's own
        // X (or hardware back) while any of those is active, the
        // remaining steps have nowhere to render — so just mark M2
        // completed instead of stranding the tour state.
        const m2Status = state.modules.M2?.status;
        const m2Idx = state.stepIndices.M2 ?? 0;
        if (m2Status === 'in_progress' && m2Idx >= 2 && m2Idx <= 4) {
          void state.setStatus('M2', 'completed');
          state.setStepIndex('M2', 0);
        }
      };
    }, []),
  );

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
  // null = auto (use the primary sub's icon at render time). User-picked
  // value sticks even if subs change later — predictable contract.
  const [icon, setIcon] = useState<string | null>(null);
  const [prefillApplied, setPrefillApplied] = useState(false);
  // Keep scroll content reachable while the keyboard is up. `endCoordinates`
  // doesn't always include the keyboard's tool/suggestion bar, so we add a
  // generous buffer below.
  const keyboardHeight = useKeyboardHeight();

  // M2 tour auto-scroll: steps 3 (subs) and 4 (recurrence) live below
  // the title/description/icon fold, so the tour scrolls them into view
  // as each step opens instead of leaving the user staring at a tooltip
  // that points at off-screen content.
  const scrollRef = useRef<ScrollView>(null);
  const subsY = useRef(0);
  const recurrenceY = useRef(0);
  const m2StepIndex = useTourStore((s) => s.stepIndices.M2 ?? 0);
  const m2Status = useTourStore((s) => s.modules.M2?.status);
  // Steps 3 (subs, idx 2) and 4 (recurrence, idx 3) sit low in the form
  // and use a bottom tooltip. Without extra scroll room the auto-scroll
  // can't lift the recurrence picker above the card (the list is too
  // short to scroll that far). This bump adds the room.
  const m2FormBump =
    isCreateMode &&
    isM2Current &&
    m2Status === 'in_progress' &&
    (m2StepIndex === 2 || m2StepIndex === 3)
      ? 245
      : 0;
  useEffect(() => {
    if (!isCreateMode || !isM2Current || m2Status !== 'in_progress') return;
    // step index 2 == M2 step 3 (subs); 3 == step 4 (recurrence)
    const targetY =
      m2StepIndex === 2 ? subsY.current : m2StepIndex === 3 ? recurrenceY.current : null;
    if (targetY == null) return;
    const id = setTimeout(
      () => scrollRef.current?.scrollTo({ y: Math.max(targetY - 72, 0), animated: true }),
      150,
    );
    return () => clearTimeout(id);
  }, [isCreateMode, isM2Current, m2Status, m2StepIndex]);

  // Hydrate from server when editing
  useEffect(() => {
    if (existing.data) {
      setTitle(existing.data.title);
      setDescription(existing.data.description ?? '');
      setRecurrence(existing.data.recurrence);
      setTargetCount(existing.data.target_count ?? 1);
      setSubs(existing.data.subs);
      setIcon(existing.data.icon ?? null);
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
    setIcon(templateSource.icon ?? null);
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
      icon,
    };
  }, [title, description, recurrence, targetCount, subs, totalStars, icon]);

  /** True when editing a template-adopted task AND the user has changed
   *  any field that triggers the template-link drop (title, description,
   *  or subs). Periodicity changes alone DON'T trigger this — the user
   *  is allowed to retune cadence without losing the link.
   *
   *  Used to render the inline warning and to set `dropTemplateLink` on
   *  the update payload at save time. */
  const breaksTemplateLink = useMemo(() => {
    if (!isEdit) return false;
    const orig = existing.data;
    if (!orig || !orig.template_id) return false;
    if (title.trim() !== orig.title) return true;
    const origDesc = (orig.description ?? '').trim();
    const curDesc = description.trim();
    if (origDesc !== curDesc) return true;
    // Subs: compare order-independently by (sub_id, stars).
    if (orig.subs.length !== subs.length) return true;
    const sortKey = (s: { sub_id: string; stars: number }) =>
      `${s.sub_id}:${s.stars}`;
    const origKey = orig.subs.map(sortKey).sort().join('|');
    const curKey = subs.map(sortKey).sort().join('|');
    return origKey !== curKey;
  }, [isEdit, existing.data, title, description, subs]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert(t('taskForm.titleRequired'), t('taskForm.titleRequiredBody'));
      return;
    }
    if (subs.length === 0 || !formInput) {
      Alert.alert(t('taskForm.subRequired'), t('taskForm.subRequiredBody'));
      return;
    }
    try {
      if (isEdit && params.id) {
        await updateTask.mutateAsync({
          ...formInput,
          // If the user edited title/description/subs on a template-adopted
          // task, drop the template link so the task is treated as custom
          // going forward.
          dropTemplateLink: breaksTemplateLink,
        });
      } else {
        await createTask.mutateAsync(formInput);
      }
      router.back();
    } catch (e) {
      const limited = freeLimitEntity(e);
      if (limited) {
        router.back();
        useLimitModalStore.getState().open(limited);
        return;
      }
      const msg = e instanceof Error ? e.message : t('common.unknownError');
      Alert.alert(t('taskForm.saveFailed'), msg);
    }
  };

  const handleArchive = async () => {
    if (!params.id) return;
    const ok = await confirmAction(
      t('taskForm.archiveConfirmTitle'),
      t('taskForm.archiveConfirmBody'),
      { okText: t('common.archive'), cancelText: t('common.cancel'), destructive: true },
    );
    if (!ok) return;
    try {
      await archiveTask.mutateAsync(params.id);
      router.back();
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('common.unknownError');
      Alert.alert(t('taskForm.archiveFailed'), msg);
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
        <Text style={styles.headerTitle}>
          {isEdit ? t('taskForm.editTitle') : t('taskForm.newTitle')}
        </Text>
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
            <Text style={styles.saveText}>{t('common.save')}</Text>
          )}
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            styles.content,
            m2FormBump > 0 && { paddingBottom: tokens.space[10] + m2FormBump },
            keyboardHeight > 0 && { paddingBottom: keyboardHeight + tokens.space[10] },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {breaksTemplateLink && (
            <View style={styles.breakWarning}>
              <Ionicons name="information-circle" size={18} color={tokens.semantic.warn} />
              <Text style={styles.breakWarningText}>
                {t('taskForm.breakWarning')}
              </Text>
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>{t('taskForm.titleLabel')}</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              style={styles.input}
              placeholder={t('taskForm.titlePlaceholder')}
              placeholderTextColor={tokens.text.faint}
              // Skip the auto-keyboard while the M2 tour walks the form
              // — the user is reading tooltips, not typing yet, and a
              // popped keyboard would shove the spotlight off-screen.
              autoFocus={!isEdit && !(isCreateMode && isM2Current)}
              returnKeyType="next"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t('taskForm.descLabel')}</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              style={[styles.input, styles.inputMultiline]}
              placeholder={t('taskForm.descPlaceholder')}
              placeholderTextColor={tokens.text.faint}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t('taskForm.iconLabel')}</Text>
            <Text style={styles.hint}>{t('taskForm.iconHint')}</Text>
            <View style={styles.iconGrid}>
              {/* "Auto" pick — clears the override, falls back to
                  primary sub icon at render time. */}
              <Pressable
                onPress={() => setIcon(null)}
                style={[
                  styles.iconCell,
                  icon === null && styles.iconCellSelected,
                ]}
                accessibilityLabel={t('taskForm.iconAutoA11y')}
              >
                {(() => {
                  const primarySubId = subs[0]?.sub_id;
                  const autoIcon = primarySubId
                    ? (SUB_META[primarySubId]?.iconName as never)
                    : ('ellipse-outline' as never);
                  return (
                    <Ionicons
                      name={autoIcon}
                      size={22}
                      color={
                        icon === null
                          ? tokens.brand.violet2
                          : tokens.text.mid
                      }
                    />
                  );
                })()}
              </Pressable>
              {TASK_ICON_CHOICES.map((name) => {
                const selected = name === icon;
                return (
                  <Pressable
                    key={name}
                    onPress={() => setIcon(name)}
                    style={[
                      styles.iconCell,
                      selected && styles.iconCellSelected,
                    ]}
                  >
                    <Ionicons
                      name={name as never}
                      size={22}
                      color={selected ? tokens.brand.violet2 : tokens.text.mid}
                    />
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View
            style={styles.field}
            onLayout={(e) => {
              subsY.current = e.nativeEvent.layout.y;
            }}
          >
            <Text style={styles.label}>{t('taskForm.subsLabel')}</Text>
            <Text style={styles.hint}>{t('taskForm.subsHint')}</Text>
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

          <View
            style={styles.field}
            onLayout={(e) => {
              recurrenceY.current = e.nativeEvent.layout.y;
            }}
          >
            <Text style={styles.label}>{t('taskForm.recurrenceLabel')}</Text>
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
              <Text style={styles.archiveText}>{t('taskForm.archiveBtn')}</Text>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Post-login tour — M1 step 2 lives here (detail screen). The
         module is also mounted on Home for steps 1, 3, 4, 5; the
         shared step index in the tour store routes each step to the
         right surface. Tapping Próximo OR X closes the detail screen
         so the next step (which lives on Home) is reachable without
         the user manually backing out. */}
      <TourModule
        module="M1"
        screen="detail"
        steps={buildM1Steps(t)}
        flatNav
        onExitScreen={() => router.back()}
      />

      {/* M2 steps 3-5 (subs / recurrence / wrap) live here when the
         form is in CREATE mode (no id, no template prefill). Step 5's
         Next closes the form to send the user back to Home where
         the next module would pick up. */}
      {isCreateMode && (
        <TourModule
          module="M2"
          screen="create"
          steps={buildM2Steps(t)}
          enabled={isM2Current}
          flatNav
          onExitScreen={() => router.back()}
        />
      )}
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
  breakWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: tokens.space[3],
    paddingHorizontal: tokens.space[3],
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 159, 67, 0.4)',
    backgroundColor: 'rgba(255, 159, 67, 0.10)',
    marginBottom: tokens.space[3],
  },
  breakWarningText: {
    flex: 1,
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    lineHeight: 17,
    color: tokens.text.base,
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
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.space[2],
  },
  iconCell: {
    width: 52,
    height: 52,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.bg.surface,
    borderWidth: 1,
    borderColor: tokens.border.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCellSelected: {
    // Violet accent matches the home check button — picks the task
    // domain palette (gold goes to rewards).
    borderColor: tokens.brand.violet2,
    backgroundColor: 'rgba(155, 130, 255, 0.16)',
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
