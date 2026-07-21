import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CoinIcon } from '@/components/CoinIcon';
import {
  useAbandonQuest,
  useCompleteQuest,
  useLogChallengeProgress,
  useQuestTemplates,
  useQuests,
  useStartQuestFromTemplate,
} from '@/lib/api/quests';
import { useActiveTasks } from '@/lib/api/tasks';
import { freeLimitEntity } from '@/lib/premium';
import { useT } from '@/lib/i18n';
import { useLocalizedPick } from '@/lib/i18n/catalog';
import { getSubMeta, useMetaLookup } from '@/lib/i18n/meta';
import { questProgressRatio } from '@/lib/quests/progress';
import { TourModule } from '@/components/tour/TourModule';
import { buildM3Steps } from '@/lib/tour/m3Steps';
import { useIsCurrentTourModule, useTourStore } from '@/lib/tour/store';
import { useKeyboardHeight } from '@/lib/use-keyboard-height';
import type {
  QuestTemplate,
  QuestTemplateRequirement,
  QuestWithProgress,
} from '@/lib/db/types';
import { confirmAction, showInfo } from '@/lib/util/confirm';
import { tokens } from '@/theme';
import { getQuestCategoryMeta } from '@/theme/quests';

/**
 * Full-screen detail view for a quest, reachable via long-press from the
 * Quest Board. Accepts the entity id as the dynamic route param and a
 * `kind` query string to disambiguate template-vs-quest. When `kind` is
 * absent, we infer from the id shape (UUID → quest, slug → template).
 */
type DetailKind = 'template' | 'quest';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function QuestDetailScreen() {
  const router = useRouter();
  const { t, locale } = useT();
  const { pickCascade, pickCascadeNullable } = useLocalizedPick();
  const meta = useMetaLookup();
  const params = useLocalSearchParams<{ id: string; kind?: string }>();
  const id = params.id;
  const inferredKind: DetailKind =
    (params.kind as DetailKind | undefined) ?? (UUID_RE.test(id) ? 'quest' : 'template');

  const quests = useQuests();
  const templates = useQuestTemplates();
  const tasks = useActiveTasks();
  const startTemplate = useStartQuestFromTemplate();
  const abandonQuest = useAbandonQuest();
  const completeQuest = useCompleteQuest();
  const logChallenge = useLogChallengeProgress();
  const [logValue, setLogValue] = useState('');
  const keyboardHeight = useKeyboardHeight();
  const isM3Current = useIsCurrentTourModule('M3');

  // M3 step 3 (criteria) is the last step and lives here. If the user
  // leaves via the screen's own back arrow / hardware back instead of
  // the tooltip, complete M3 so the tour doesn't strand at "step 3 on
  // quest-detail" with no detail mounted.
  useFocusEffect(
    useCallback(() => {
      return () => {
        const state = useTourStore.getState();
        const m3Status = state.modules.M3?.status;
        const m3Idx = state.stepIndices.M3 ?? 0;
        if (m3Status === 'in_progress' && m3Idx === 2) {
          void state.setStatus('M3', 'completed');
          state.setStepIndex('M3', 0);
        }
      };
    }, []),
  );

  const quest: QuestWithProgress | null = useMemo(() => {
    if (inferredKind !== 'quest') return null;
    return (quests.data ?? []).find((q) => q.quest.id === id) ?? null;
  }, [inferredKind, quests.data, id]);

  const template: QuestTemplate | null = useMemo(() => {
    if (inferredKind === 'template') {
      return (templates.data ?? []).find((tmpl) => tmpl.id === id) ?? null;
    }
    // Active quest case: look up its originating template (may be null for custom).
    if (quest?.quest.template_id) {
      return (
        (templates.data ?? []).find((tmpl) => tmpl.id === quest.quest.template_id) ??
        null
      );
    }
    return null;
  }, [inferredKind, templates.data, id, quest]);

  const isLoading = quests.isLoading || templates.isLoading;
  const notFound = !isLoading && !quest && !template;

  // ── Resolve display values ────────────────────────────────────────────
  const cat = template
    ? getQuestCategoryMeta(template.category)
    : getQuestCategoryMeta('');

  const title = quest
    ? quest.quest.title
    : template
      ? pickCascade(template.title_en, template.title_pt, template.title)
      : '';
  const description = quest
    ? quest.quest.description
    : template
      ? pickCascadeNullable(
          template.description_en,
          template.description_pt,
          template.description,
        )
      : null;
  const durationDays = template?.suggested_duration_days ?? totalDurationDays(quest);
  const allowPartial = quest?.quest.allow_partial ?? template?.allow_partial ?? false;
  const rewardXp = quest?.quest.reward_xp ?? template?.reward_xp ?? 0;
  const rewardCoins = quest?.quest.reward_coins ?? template?.reward_coins ?? 0;

  // Quest-type-aware progress. For `challenge`-type, progress is
  // currentChallengeValue / challenge_target_value; for `skill`-type
  // it's the aggregate across requirements.
  const isChallenge =
    (quest?.quest.quest_type ?? template?.quest_type ?? 'skill') === 'challenge';
  const challengeTarget = Number(
    quest?.quest.challenge_target_value ?? template?.challenge_target_value ?? 0,
  );
  const challengeUnit = pickCascadeNullable(
    quest?.quest.challenge_unit_en ?? template?.challenge_unit_en ?? null,
    quest?.quest.challenge_unit_pt ?? template?.challenge_unit_pt ?? null,
    null,
  );
  const currentChallengeValue = quest?.currentChallengeValue ?? 0;

  // `accumulate_sub_stars` wins over `quest_type` — the 12 seeded sub-star
  // templates carry quest_type='challenge' with a null challenge_target_value,
  // so branching on quest_type first pinned them at 0/0 forever and opened the
  // manual log input on a quest that fills itself.
  const subStarsReq = quest?.requirements.find(
    (r) => r.requirement.kind === 'accumulate_sub_stars',
  );
  const isSubStars = !!subStarsReq;
  const isManualChallenge = isChallenge && !isSubStars && challengeTarget > 0;

  const progress = quest ? questProgressRatio(quest) : 0;
  const totalReqs = quest?.requirements.length ?? 0;
  const metReqs = quest?.requirements.filter((r) => r.isMet).length ?? 0;
  const daysLeft = quest ? daysRemaining(quest.quest.deadline) : null;

  // Tasks linked rendering: for an active quest, use the resolved
  // task_id → user-task title; for a template, use the requirement's
  // task_title literal.
  const linkedTaskRows = useMemo(() => {
    if (quest) {
      const map = new Map((tasks.data ?? []).map((tk) => [tk.id, tk.title] as const));
      return quest.requirements.map((rr) => {
        const taskTitle = rr.requirement.task_id
          ? map.get(rr.requirement.task_id)
          : undefined;
        return {
          key: rr.requirement.id,
          label: requirementLabel(
            rr.requirement,
            taskTitle,
            rr.requirement.sub_id
              ? getSubMeta(rr.requirement.sub_id).label
              : undefined,
          ),
          isMet: rr.isMet,
          skillId: rr.requirement.skill_id ?? null,
          kind: rr.requirement.kind,
        };
      });
    }
    if (template) {
      return template.requirements.map((req, i) => ({
        key: `tpl-${i}`,
        label: templateRequirementLabel(
          req,
          req.sub_id ? getSubMeta(req.sub_id).label : undefined,
        ),
        isMet: false,
        skillId: req.skill_id ?? null,
        kind: req.kind,
      }));
    }
    return [];
    // `locale` looks unused to the linter but getSubMeta reads the active
    // locale at call time — drop it and the sub labels keep the old language
    // after a locale switch. The hook form (useMetaLookup) is not an option
    // here: it rebuilds its object every render, so depending on it would
    // recompute this memo on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quest, template, tasks.data, locale]);

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleStart = async () => {
    if (!template) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      await startTemplate.mutateAsync(template.id);
      router.back();
    } catch (e) {
      if (freeLimitEntity(e)) return; // limit modal handled globally
      const err = e as { message?: string; code?: string; details?: string; hint?: string };
      console.error('[start_quest_from_template] failed', err);
      showInfo(
        'Could not start quest',
        [err.message, err.code, err.details, err.hint].filter(Boolean).join('\n') ||
          t('common.unknownError'),
      );
    }
  };

  const handleAbandon = async () => {
    if (!quest) return;
    const ok = await confirmAction(
      t('quests.actions.confirmAbandon'),
      `"${quest.quest.title}"`,
      { okText: t('quests.actions.abandon'), cancelText: t('quests.detail.keep'), destructive: true },
    );
    if (!ok) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    try {
      await abandonQuest.mutateAsync(quest.quest.id);
      router.back();
    } catch (e) {
      const err = e as { message?: string };
      showInfo(t('quests.errAbandon'), err.message ?? t('common.unknownError'));
    }
  };

  const handleLogChallenge = async () => {
    if (!quest) return;
    const v = Number(logValue.replace(',', '.'));
    if (!Number.isFinite(v) || v < 0) {
      showInfo(t('quests.detail.invalidValue'), t('quests.detail.invalidValueBody'));
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      await logChallenge.mutateAsync({ questId: quest.quest.id, value: v });
      setLogValue('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {},
      );
    } catch (e) {
      const err = e as { message?: string; code?: string; details?: string; hint?: string };
      console.error('[log_quest_challenge_progress] failed', err);
      showInfo(
        t('quests.detail.logFail'),
        [err.message, err.code, err.details, err.hint].filter(Boolean).join('\n') ||
          t('common.unknownError'),
      );
    }
  };

  const handleClaim = async () => {
    if (!quest) return;
    try {
      const r = await completeQuest.mutateAsync(quest.quest.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      showInfo(
        t('quests.completeTitle'),
        t('quests.completeBody', { xp: r.reward_xp, coins: r.reward_coins }),
      );
      router.back();
    } catch (e) {
      const err = e as { message?: string };
      showInfo(t('quests.errClaim'), err.message ?? t('common.unknownError'));
    }
  };

  // ── Render ────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loading}>
          <ActivityIndicator color={tokens.brand.violet2} />
        </View>
      </SafeAreaView>
    );
  }

  if (notFound) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.empty}>
          <Ionicons name="alert-circle" size={36} color={tokens.text.dim} />
          <Text style={styles.emptyText}>{t('quests.detail.notFound')}</Text>
          <Pressable onPress={() => router.back()} style={styles.emptyBtn}>
            <Text style={styles.emptyBtnText}>{t('common.back')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          hitSlop={10}
        >
          <Ionicons name="arrow-back" size={16} color={tokens.text.mid} />
        </Pressable>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{t('quests.detail.title')}</Text>
          <Text style={styles.headerSubtitle}>
            {cat.label} · {durationDays}d
          </Text>
        </View>
        <View
          style={[
            styles.catChip,
            { backgroundColor: cat.bg, borderColor: cat.color + '55' },
          ]}
        >
          <Text style={[styles.catChipText, { color: cat.color }]}>{cat.label}</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          keyboardHeight > 0 && { paddingBottom: keyboardHeight + tokens.space[10] },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {/* Hero card */}
        <View style={styles.hero}>
          <View style={[styles.heroAccent, { backgroundColor: cat.color }]} />
          <View style={styles.heroTop}>
            <View style={[styles.heroIcon, { backgroundColor: cat.bg }]}>
              <Ionicons name={cat.icon as never} size={20} color={cat.color} />
            </View>
            <View style={styles.heroBody}>
              <Text style={styles.heroName} numberOfLines={2}>
                {title}
              </Text>
              <Text style={styles.heroCat}>
                {cat.label.toUpperCase()} · {durationDays}D
                {allowPartial ? ` · ${t('quests.partialOk').toUpperCase()}` : ''}
              </Text>
            </View>
          </View>
          {description && <Text style={styles.heroDesc}>{description}</Text>}

          {quest && (
            <View style={styles.progBlock}>
              <View style={styles.progHeader}>
                <Text style={styles.progTitle}>{t('quests.detail.yourProgress')}</Text>
                <Text style={styles.progNum}>
                  {isSubStars
                    ? `${subStarsReq.currentCount} / ${Number(
                        subStarsReq.requirement.target_count ?? 0,
                      )} ⭐ · ${meta.sub(subStarsReq.requirement.sub_id!).label}`
                    : isManualChallenge
                      ? `${currentChallengeValue} / ${challengeTarget}${challengeUnit ? ` ${challengeUnit}` : ''}`
                      : `${metReqs} / ${totalReqs}`}
                </Text>
              </View>
              <View style={styles.progTrack}>
                <View
                  style={[
                    styles.progFill,
                    { width: `${Math.round(progress * 100)}%`, backgroundColor: cat.color },
                  ]}
                />
              </View>
              <View style={styles.progMeta}>
                <Text style={styles.progMetaText}>
                  {quest.isComplete
                    ? t('quests.readyToClaim')
                    : progress > 0
                      ? t('quests.inProgress')
                      : t('quests.detail.notStarted')}
                </Text>
                {daysLeft !== null && (
                  <Text style={styles.progMetaText}>
                    {daysLeft <= 0
                      ? t('quests.dueToday')
                      : t('quests.daysLeft', { count: daysLeft })}
                  </Text>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Challenge log input — only for active challenge quests */}
        {quest && isManualChallenge && !quest.isComplete && (
          <View style={styles.section}>
            <Text style={styles.secTitle}>
              {challengeUnit
                ? t('quests.detail.logProgressIn', { unit: challengeUnit })
                : t('quests.detail.logProgress')}
            </Text>
            <View style={styles.logRow}>
              <View style={styles.logInputWrap}>
                <TextInput
                  value={logValue}
                  onChangeText={setLogValue}
                  placeholder={t('quests.detail.logPlaceholderShort')}
                  placeholderTextColor={tokens.text.faint}
                  keyboardType="numeric"
                  style={styles.logInput}
                />
              </View>
              <Pressable
                onPress={handleLogChallenge}
                disabled={logChallenge.isPending || logValue.trim() === ''}
                style={({ pressed }) => [
                  styles.logBtn,
                  (logChallenge.isPending || logValue.trim() === '') &&
                    styles.logBtnDisabled,
                  pressed && { opacity: 0.85 },
                ]}
              >
                {logChallenge.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="add" size={14} color="#fff" />
                    <Text style={styles.logBtnText}>{t('quests.detail.logCta')}</Text>
                  </>
                )}
              </Pressable>
            </View>
            <Text style={styles.logHint}>{t('quests.detail.logHint')}</Text>
          </View>
        )}

        {/* Tasks / skills / dims linked */}
        {linkedTaskRows.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.secTitle}>{t('quests.detail.linkedTasks')}</Text>
            {linkedTaskRows.map((row) => {
              const iconName =
                row.kind === 'reach_skill_value'
                  ? 'trending-up'
                  : row.kind === 'complete_any_in_dim'
                    ? 'grid'
                    : 'checkmark-done';
              const tappable = !!row.skillId;
              return (
                <Pressable
                  key={row.key}
                  disabled={!tappable}
                  onPress={
                    tappable
                      ? () =>
                          router.push({
                            pathname: '/skill/[id]',
                            params: { id: row.skillId! },
                          })
                      : undefined
                  }
                  style={({ pressed }) => [
                    styles.taskRow,
                    tappable && pressed && {
                      opacity: 0.85,
                      backgroundColor: tokens.bg.surface2,
                    },
                  ]}
                  accessibilityRole={tappable ? 'button' : 'text'}
                  accessibilityLabel={
                    tappable ? t('quests.detail.openSkill', { name: row.label }) : row.label
                  }
                >
                  <View style={[styles.taskIco, { backgroundColor: cat.bg }]}>
                    <Ionicons name={iconName} size={11} color={cat.color} />
                  </View>
                  <Text style={styles.taskName} numberOfLines={2}>
                    {row.label}
                  </Text>
                  {row.isMet ? (
                    <Ionicons name="checkmark" size={14} color={tokens.semantic.xp} />
                  ) : tappable ? (
                    <Ionicons
                      name="chevron-forward"
                      size={14}
                      color={tokens.text.mid}
                    />
                  ) : (
                    <View style={styles.taskPending} />
                  )}
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Rules */}
        <View style={styles.section}>
          <Text style={styles.secTitle}>{t('quests.detail.rules')}</Text>
          <View style={styles.ruleRow}>
            <View style={styles.ruleDot} />
            <Text style={styles.ruleText}>
              {allowPartial
                ? t('quests.detail.rulePartialOn')
                : t('quests.detail.rulePartialOff')}
            </Text>
          </View>
          <View style={styles.ruleRow}>
            <View style={styles.ruleDot} />
            <Text style={styles.ruleText}>
              {t('quests.detail.ruleDeadline', { days: durationDays })}
            </Text>
          </View>
        </View>

        {/* Rewards */}
        <View style={styles.rewardsRow}>
          <View style={styles.rewardBlock}>
            <Ionicons name="flash" size={18} color={tokens.brand.violet2} />
            <View style={{ marginLeft: 6 }}>
              <Text style={[styles.rewardVal, { color: tokens.brand.violet2 }]}>
                +{rewardXp}
              </Text>
              <Text style={styles.rewardLbl}>{t('quests.detail.xpOnComplete')}</Text>
            </View>
          </View>
          <View style={styles.rewardBlock}>
            <CoinIcon size={18} />
            <View style={{ marginLeft: 6 }}>
              <Text style={[styles.rewardVal, { color: tokens.semantic.coin }]}>
                +{rewardCoins}
              </Text>
              <Text style={styles.rewardLbl}>{t('quests.detail.coinsOnComplete')}</Text>
            </View>
          </View>
        </View>

        {/* Action button */}
        {quest ? (
          quest.isComplete ? (
            <Pressable
              onPress={handleClaim}
              style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
              disabled={completeQuest.isPending}
            >
              <Ionicons name="trophy" size={16} color="#3D2A00" />
              <Text style={styles.primaryBtnText}>{t('quests.actions.complete')}</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={handleAbandon}
              style={({ pressed }) => [styles.abandonBtn, pressed && { opacity: 0.85 }]}
              disabled={abandonQuest.isPending}
            >
              <Text style={styles.abandonText}>{t('quests.actions.abandon')}</Text>
            </Pressable>
          )
        ) : template ? (
          <Pressable
            onPress={handleStart}
            disabled={startTemplate.isPending}
            style={({ pressed }) => [styles.primaryBtnViolet, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name="play" size={14} color={tokens.text.hi} />
            <Text style={[styles.primaryBtnText, { color: tokens.text.hi }]}>
              {t('quests.detail.start')}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>

      {/* M3 step 3 lives here — read the criteria, then head back without
         accepting. Próximo / X ends the module and sends the user to the
         Tasks home. `replace('/(tabs)')` (the same target M0/M0.5 use)
         both selects the Home tab and clears the pushed quest screens,
         so the user always lands on Tasks regardless of where they
         entered the tour from (e.g. the Settings "replay" button).
         `flatNav` because this Stack screen has no floating BottomNavBar. */}
      <TourModule
        module="M3"
        screen="quest-detail"
        steps={buildM3Steps(t)}
        enabled={isM3Current}
        flatNav
        onExitScreen={() => router.replace('/(tabs)')}
      />
    </SafeAreaView>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function daysRemaining(deadlineIso: string): number | null {
  if (!deadlineIso) return null;
  return Math.ceil((new Date(deadlineIso).getTime() - Date.now()) / 86400000);
}

function totalDurationDays(quest: QuestWithProgress | null): number {
  if (!quest) return 0;
  const span =
    new Date(quest.quest.deadline).getTime() -
    new Date(quest.quest.started_at).getTime();
  return Math.max(1, Math.round(span / 86400000));
}

function requirementLabel(
  req: {
    kind: string;
    task_id: string | null;
    dimension_id: string | null;
    skill_id: string | null;
    sub_id: string | null;
    target_count: number | null;
    min_value: number | null;
  },
  taskTitle: string | undefined,
  subLabel: string | undefined,
): string {
  if (req.kind === 'complete_task_n_times') {
    return `${taskTitle ?? req.task_id ?? '?'} × ${req.target_count ?? 0}`;
  }
  if (req.kind === 'complete_any_in_dim') {
    return `${req.target_count ?? 0}× any in ${req.dimension_id}`;
  }
  if (req.kind === 'reach_skill_value') {
    return `${req.skill_id} ≥ ${req.min_value ?? 0}`;
  }
  if (req.kind === 'accumulate_sub_stars') {
    return `${req.target_count ?? 0}⭐ · ${subLabel ?? req.sub_id ?? '?'}`;
  }
  return req.kind;
}

function templateRequirementLabel(
  req: QuestTemplateRequirement,
  subLabel?: string,
): string {
  if (req.kind === 'complete_task_n_times') {
    return `${req.task_title ?? '?'} × ${req.target_count ?? 0}`;
  }
  if (req.kind === 'complete_any_in_dim') {
    return `${req.target_count ?? 0}× any in ${req.dimension_id}`;
  }
  if (req.kind === 'accumulate_sub_stars') {
    return `${req.target_count ?? 0}⭐ · ${subLabel ?? req.sub_id ?? '?'}`;
  }
  if (req.kind === 'reach_skill_value') {
    return `${req.skill_id} ≥ ${req.min_value ?? req.target_count ?? 0}`;
  }
  return req.kind;
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.bg.deep },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  emptyText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    color: tokens.text.dim,
    textAlign: 'center',
  },
  emptyBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.bg.surface,
    borderWidth: 1,
    borderColor: tokens.border.base,
  },
  emptyBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    color: tokens.text.mid,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: tokens.space[3],
    paddingVertical: tokens.space[2],
    borderBottomWidth: 1,
    borderBottomColor: tokens.border.base,
  },
  backBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: tokens.bg.surface2,
    borderWidth: 1,
    borderColor: tokens.border.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: { flex: 1, minWidth: 0 },
  headerTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 14,
    color: tokens.text.hi,
  },
  headerSubtitle: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 9,
    color: tokens.text.faint,
    marginTop: 1,
  },
  catChip: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  catChipText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
  },

  scroll: { padding: tokens.space[3] },

  hero: {
    position: 'relative',
    backgroundColor: 'rgba(20,23,48,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(123,92,255,0.25)',
    borderRadius: tokens.radius.md,
    padding: tokens.space[3] + 1,
    paddingLeft: tokens.space[3] + 5,
    overflow: 'hidden',
  },
  heroAccent: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: 3,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  heroIcon: {
    width: 38, height: 38,
    borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  heroBody: { flex: 1, minWidth: 0 },
  heroName: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 16,
    color: tokens.text.hi,
  },
  heroCat: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
    letterSpacing: 0.5,
    color: tokens.text.mid,
    marginTop: 1,
  },
  heroDesc: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    lineHeight: 16,
    color: tokens.text.mid,
    marginBottom: 8,
  },

  progBlock: { marginTop: 4 },
  progHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  progTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 9,
    letterSpacing: 0.5,
    color: tokens.text.mid,
    textTransform: 'uppercase',
  },
  progNum: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    color: tokens.brand.violet2,
  },
  progTrack: {
    height: 5,
    backgroundColor: tokens.bg.surface2,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progFill: { height: '100%', borderRadius: 3 },
  progMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 3,
  },
  progMetaText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 9,
    color: tokens.text.faint,
  },

  section: { paddingTop: tokens.space[3] },
  secTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    letterSpacing: 0.7,
    color: tokens.text.dim,
    textTransform: 'uppercase',
    marginBottom: tokens.space[2],
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: tokens.space[2] + 1,
    paddingVertical: 7,
    backgroundColor: tokens.bg.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: tokens.border.base,
    marginBottom: 3,
  },
  taskIco: {
    width: 22, height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskName: {
    flex: 1,
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    color: tokens.text.hi,
  },
  taskPending: {
    width: 14, height: 14,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: tokens.border.strong,
  },

  // Challenge log
  logRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'stretch',
  },
  logInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    backgroundColor: tokens.bg.surface,
    borderWidth: 1,
    borderColor: tokens.border.base,
    borderRadius: 9,
  },
  logInput: {
    flex: 1,
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: tokens.text.hi,
    paddingVertical: 9,
  },
  logUnit: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    color: tokens.text.mid,
    marginLeft: 4,
  },
  logBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 9,
    backgroundColor: tokens.brand.violet,
    minWidth: 80,
  },
  logBtnDisabled: {
    opacity: 0.45,
  },
  logBtnText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
    color: '#fff',
  },
  logHint: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 9,
    color: tokens.text.faint,
    fontStyle: 'italic',
    marginTop: 4,
  },

  ruleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 3,
  },
  ruleDot: {
    width: 4, height: 4,
    borderRadius: 2,
    backgroundColor: tokens.text.faint,
    marginTop: 6,
  },
  ruleText: {
    flex: 1,
    fontFamily: 'Manrope_500Medium',
    fontSize: 10,
    lineHeight: 14,
    color: tokens.text.mid,
  },

  rewardsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingTop: tokens.space[3],
  },
  rewardBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.space[2] + 2,
    paddingVertical: tokens.space[2] + 1,
    backgroundColor: tokens.bg.surface,
    borderWidth: 1,
    borderColor: tokens.border.base,
    borderRadius: 8,
  },
  rewardVal: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 14,
  },
  rewardLbl: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 8,
    color: tokens.text.faint,
    marginTop: 1,
  },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: tokens.space[3] + 1,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.semantic.coin,
    marginTop: tokens.space[3],
  },
  primaryBtnViolet: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: tokens.space[3] + 1,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.brand.violet,
    marginTop: tokens.space[3],
  },
  primaryBtnText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 13,
    color: '#3D2A00',
    letterSpacing: 0.3,
  },
  abandonBtn: {
    paddingVertical: tokens.space[3] + 1,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,107,122,0.25)',
    backgroundColor: 'rgba(255,107,122,0.06)',
    alignItems: 'center',
    marginTop: tokens.space[3],
  },
  abandonText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 12,
    color: tokens.semantic.danger,
    letterSpacing: 0.3,
  },
});
