import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useBottomNavClearance } from '@/components/BottomNavBar';
import { CompactHeader } from '@/components/CompactHeader';
import { CompleteTaskSheet } from '@/components/CompleteTaskSheet';
import { ScreenBackground } from '@/components/ScreenBackground';
import { TaskActionSheet } from '@/components/TaskActionSheet';
import { TaskCard } from '@/components/TaskCard';
import { TemplateCompletionCard } from '@/components/TemplateCompletionCard';
import { TodayActivityDrawer } from '@/components/TodayActivityDrawer';
import { XPCoinFloat } from '@/components/XPCoinFloat';
import { useCharacter } from '@/lib/api/character';
import { useT } from '@/lib/i18n';
import {
  useCompleteTask,
  useCompleteTemplate,
  useHomeBuckets,
  useSkipTaskToday,
  useTaskTemplates,
  useUndoCompletion,
  useUnskipTaskToday,
} from '@/lib/api/tasks';
import type { TaskSub, TaskTemplateWithSubs, TaskWithSubs } from '@/lib/db/types';
import { formatCompactDate } from '@/lib/time';
import { levelProgress, rewardForTaskSubs } from '@/lib/xp';
import { tokens } from '@/theme';

interface FloatItem {
  id: number;
  xp: number;
  coins: number;
}

type TypeTab = 'daily' | 'weekly' | 'one_shot' | 'general';

interface TabMeta {
  id: TypeTab;
  labelKey: string;
  emptyKey: string;
  iconName: keyof typeof Ionicons.glyphMap;
  accent: string;
}

const TAB_META: TabMeta[] = [
  {
    id: 'daily',
    labelKey: 'home.typeTabs.daily',
    emptyKey: 'home.typeTabs.emptyDaily',
    iconName: 'sunny-outline',
    accent: tokens.brand.violet2,
  },
  {
    id: 'weekly',
    labelKey: 'home.typeTabs.weekly',
    emptyKey: 'home.typeTabs.emptyWeekly',
    iconName: 'repeat',
    accent: '#4DD0FF',
  },
  {
    id: 'one_shot',
    labelKey: 'home.typeTabs.oneShot',
    emptyKey: 'home.typeTabs.emptyOneShot',
    iconName: 'flag-outline',
    accent: tokens.semantic.coin,
  },
  {
    id: 'general',
    labelKey: 'home.typeTabs.general',
    emptyKey: 'home.typeTabs.emptyGeneral',
    iconName: 'apps',
    accent: tokens.text.mid,
  },
];

/**
 * Tasks home — pending tasks grouped by recurrence type (daily / weekly /
 * one-shot) via a top tab strip. Replaces the V2 time-window buckets
 * (today / this_week / this_month / one_time) which the user found
 * confusing because periodicity intent was mixed with time pressure.
 *
 * The underlying useHomeBuckets fetcher still computes "pending" per
 * task — daily not done today, weekly not enough this week, etc. We
 * just regroup the result here by recurrence.type. "Recorrente"
 * (weekly tab) folds in monthly tasks too — same category in the
 * user's head.
 */
export default function HomeScreen() {
  const router = useRouter();
  const { t } = useT();
  const character = useCharacter();
  const buckets = useHomeBuckets();
  const templates = useTaskTemplates();
  const completeTask = useCompleteTask();
  const completeTemplate = useCompleteTemplate();
  const skipTask = useSkipTaskToday();
  const unskipTask = useUnskipTaskToday();
  const undoCompletion = useUndoCompletion();

  const [activeTab, setActiveTab] = useState<TypeTab>('daily');
  const [floats, setFloats] = useState<FloatItem[]>([]);
  const [actionTask, setActionTask] = useState<TaskWithSubs | null>(null);
  const [sheetTask, setSheetTask] = useState<TaskWithSubs | null>(null);
  const bottomClearance = useBottomNavClearance();

  const fireCompletion = (task: TaskWithSubs, subs: TaskSub[]) => {
    if (completeTask.isPending) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    const reward = rewardForTaskSubs(subs);
    const fid = Date.now();
    setFloats((prev) => [
      ...prev,
      { id: fid, xp: reward.total.xp, coins: reward.total.coins },
    ]);

    completeTask.mutate(
      {
        task,
        subs,
      },
      {
        onError: (err) => {
          const e = err as { message?: string; code?: string; details?: string };
          console.error('[complete_task] failed', e);
          Alert.alert(
            t('home.actionErrors.complete'),
            [e.message, e.code, e.details].filter(Boolean).join('\n') ||
              t('home.actionErrors.unknown'),
          );
        },
      },
    );
  };

  const handleQuickComplete = (task: TaskWithSubs) => {
    fireCompletion(task, task.subs);
  };

  /** Tap on a template card in the General tab → complete via complete_template
   *  (no adoption). Optimistic XP/coin float pulled from the template's own
   *  sub allocations (RPC may grant slightly more once Momentum bonus applies,
   *  but the optimistic value is fine for the float animation). */
  const fireTemplateCompletion = (template: TaskTemplateWithSubs) => {
    if (completeTemplate.isPending) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    const reward = rewardForTaskSubs(
      template.subs.map((s) => ({ sub_id: s.sub_id, stars: s.stars })),
    );
    const fid = Date.now();
    setFloats((prev) => [
      ...prev,
      { id: fid, xp: reward.total.xp, coins: reward.total.coins },
    ]);

    completeTemplate.mutate(
      {
        templateId: template.id,
        subOverrides: template.subs.map((s) => ({
          sub_id: s.sub_id,
          stars: s.stars,
        })),
      },
      {
        onError: (err) => {
          const e = err as { message?: string; code?: string; details?: string };
          console.error('[complete_template] failed', e);
          Alert.alert(
            t('home.actionErrors.complete'),
            [e.message, e.code, e.details].filter(Boolean).join('\n') ||
              t('home.actionErrors.unknown'),
          );
        },
      },
    );
  };

  const handleLongPress = (task: TaskWithSubs) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setActionTask(task);
  };

  const handleSheetConfirm = (subs: TaskSub[]) => {
    if (!sheetTask) return;
    const task = sheetTask;
    setSheetTask(null);
    fireCompletion(task, subs);
  };

  const handleActionAdjust = () => {
    if (!actionTask) return;
    const task = actionTask;
    setActionTask(null);
    setSheetTask(task);
  };

  const handleActionSkip = () => {
    if (!actionTask) return;
    const task = actionTask;
    setActionTask(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    skipTask.mutate(
      { taskId: task.id },
      {
        onError: (err) => {
          const e = err as { message?: string };
          Alert.alert(
            t('home.actionErrors.skip'),
            e.message ?? t('home.actionErrors.unknown'),
          );
        },
      },
    );
  };

  const handleActionEdit = () => {
    if (!actionTask) return;
    const task = actionTask;
    setActionTask(null);
    router.push({ pathname: '/task-form', params: { id: task.id } });
  };

  const handleDrawerExtra = (task: TaskWithSubs) => {
    fireCompletion(task, task.subs);
  };

  const handleDrawerUndo = (completionId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    undoCompletion.mutate(completionId, {
      onError: (err) => {
        const e = err as { message?: string };
        Alert.alert(
          t('home.actionErrors.undo'),
          e.message ?? t('home.actionErrors.unknown'),
        );
      },
    });
  };

  const handleDrawerUnskip = (task: TaskWithSubs) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    unskipTask.mutate(
      { taskId: task.id },
      {
        onError: (err) => {
          const e = err as { message?: string };
          Alert.alert(
            t('home.actionErrors.unskip'),
            e.message ?? t('home.actionErrors.unknown'),
          );
        },
      },
    );
  };

  const isLoading = character.isLoading || buckets.isLoading;
  const hasError = character.error || buckets.error;

  const handleRefresh = async () => {
    await Promise.all([character.refetch(), buckets.refetch()]);
  };
  const isRefreshing = character.isRefetching || buckets.isRefetching;

  const data = buckets.data;

  // Regroup the bucket-flavored result into 3 type-flavored lists.
  // - daily: today bucket items whose recurrence is daily
  // - weekly: today's weekly/monthly + thisWeek + thisMonth, deduped
  // - one_shot: oneTime bucket as-is (already type-filtered upstream)
  // - general: templates, not user tasks — handled separately below
  const tasksByTab = useMemo<Record<Exclude<TypeTab, 'general'>, TaskWithSubs[]>>(() => {
    if (!data) {
      return { daily: [], weekly: [], one_shot: [] };
    }
    const daily = data.today.filter((t) => t.recurrence.type === 'daily');
    const seen = new Set<string>();
    const weekly: TaskWithSubs[] = [];
    const pushWeekly = (t: TaskWithSubs) => {
      if (seen.has(t.id)) return;
      if (t.recurrence.type !== 'weekly' && t.recurrence.type !== 'monthly') return;
      seen.add(t.id);
      weekly.push(t);
    };
    data.today.forEach(pushWeekly);
    data.thisWeek.forEach(pushWeekly);
    data.thisMonth.forEach(pushWeekly);
    return { daily, weekly, one_shot: data.oneTime };
  }, [data]);

  const totalPending =
    tasksByTab.daily.length +
    tasksByTab.weekly.length +
    tasksByTab.one_shot.length;

  // General tab = all system templates, browseable + one-tap completable
  // without adoption. We render it as a parallel surface; counts don't
  // feed totalPending (those are user-routine tasks).
  const generalTemplates = templates.data ?? [];

  const charXp = character.data?.character.total_xp ?? 0;
  const lp = levelProgress(charXp);
  const activeMeta = TAB_META.find((m) => m.id === activeTab) ?? TAB_META[0];
  const activeList =
    activeTab === 'general' ? [] : tasksByTab[activeTab];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenBackground>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomClearance }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={tokens.brand.violet2}
              colors={[tokens.brand.violet2]}
            />
          }
        >
          <CompactHeader
            displayName={character.data?.profile.display_name ?? t('home.defaultName')}
            totalXp={charXp}
            level={lp.level}
            xpInLevel={lp.xpInLevel}
            xpNeededForLevel={lp.xpNeededForLevel}
            coins={character.data?.character.coins ?? 0}
            dateLabel={formatCompactDate()}
            onHistoryPress={() => router.push('/history')}
          />

          {isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={tokens.brand.violet2} />
            </View>
          ) : hasError ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={32} color={tokens.semantic.danger} />
              <Text style={styles.errorText}>{t('home.error')}</Text>
            </View>
          ) : (
            <View style={styles.body}>
              <TaskTypeTabs
                active={activeTab}
                counts={{
                  daily: tasksByTab.daily.length,
                  weekly: tasksByTab.weekly.length,
                  one_shot: tasksByTab.one_shot.length,
                  general: generalTemplates.length,
                }}
                onChange={setActiveTab}
                t={t}
              />

              {activeTab === 'general' ? (
                <View style={styles.tabBody}>
                  <Text style={styles.generalLead}>
                    {t('home.typeTabs.generalLead')}
                  </Text>
                  {generalTemplates.length === 0 ? (
                    <Text style={styles.tabEmpty}>
                      {t(activeMeta.emptyKey)}
                    </Text>
                  ) : (
                    generalTemplates.map((tmpl) => (
                      <TemplateCompletionCard
                        key={tmpl.id}
                        template={tmpl}
                        onComplete={() => fireTemplateCompletion(tmpl)}
                        isCompleting={completeTemplate.isPending}
                      />
                    ))
                  )}
                </View>
              ) : totalPending === 0 ? (
                <View style={styles.emptyBox}>
                  <Ionicons
                    name="checkmark-circle"
                    size={42}
                    color={tokens.semantic.xp}
                  />
                  <Text style={styles.emptyTitle}>{t('home.empty.title')}</Text>
                  <Text style={styles.emptySub}>{t('home.empty.body')}</Text>
                  <Pressable
                    onPress={() => router.push('/tasks')}
                    style={({ pressed }) => [
                      styles.emptyCta,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Ionicons name="add" size={18} color={tokens.text.hi} />
                    <Text style={styles.emptyCtaText}>{t('home.empty.cta')}</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.tabBody}>
                  {activeList.length === 0 ? (
                    <Text style={styles.tabEmpty}>{t(activeMeta.emptyKey)}</Text>
                  ) : (
                    activeList.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onComplete={() => handleQuickComplete(task)}
                        onLongPress={() => handleLongPress(task)}
                        onEdit={() =>
                          router.push({ pathname: '/task-form', params: { id: task.id } })
                        }
                      />
                    ))
                  )}
                </View>
              )}

              {data && activeTab !== 'general' && (
                <TodayActivityDrawer
                  activity={data.todayActivity}
                  onExtraComplete={handleDrawerExtra}
                  onUndoCompletion={handleDrawerUndo}
                  onUnskip={handleDrawerUnskip}
                />
              )}

              {activeTab !== 'general' && (
                <Pressable
                  onPress={() => router.push('/tasks')}
                  style={({ pressed }) => [
                    styles.manageCta,
                    pressed && { opacity: 0.7 },
                  ]}
                  hitSlop={4}
                >
                  <Ionicons name="list" size={16} color={tokens.brand.violet2} />
                  <Text style={styles.manageCtaText}>{t('home.manageCta')}</Text>
                </Pressable>
              )}
            </View>
          )}
        </ScrollView>
      </ScreenBackground>

      {floats.map((f) => (
        <XPCoinFloat
          key={f.id}
          xp={f.xp}
          coins={f.coins}
          onDone={() => setFloats((prev) => prev.filter((x) => x.id !== f.id))}
        />
      ))}

      <CompleteTaskSheet
        visible={sheetTask !== null}
        task={sheetTask}
        onCancel={() => setSheetTask(null)}
        onConfirm={handleSheetConfirm}
      />

      <TaskActionSheet
        visible={actionTask !== null}
        taskTitle={actionTask?.title ?? ''}
        onCancel={() => setActionTask(null)}
        onAdjustStars={handleActionAdjust}
        onSkipToday={handleActionSkip}
        onEdit={handleActionEdit}
      />
    </SafeAreaView>
  );
}

interface TaskTypeTabsProps {
  active: TypeTab;
  counts: Record<TypeTab, number>;
  onChange: (next: TypeTab) => void;
  t: (key: string) => string;
}

function TaskTypeTabs({ active, counts, onChange, t }: TaskTypeTabsProps) {
  return (
    <View style={tabStyles.row}>
      {TAB_META.map((meta) => {
        const isActive = meta.id === active;
        const count = counts[meta.id];
        return (
          <Pressable
            key={meta.id}
            onPress={() => {
              if (!isActive) Haptics.selectionAsync().catch(() => {});
              onChange(meta.id);
            }}
            style={({ pressed }) => [
              tabStyles.tab,
              isActive && {
                backgroundColor: `${meta.accent}1F`,
                borderColor: `${meta.accent}55`,
              },
              pressed && { opacity: 0.85 },
            ]}
            hitSlop={4}
          >
            <Ionicons
              name={meta.iconName}
              size={14}
              color={isActive ? meta.accent : tokens.text.dim}
            />
            <Text
              style={[
                tabStyles.label,
                { color: isActive ? meta.accent : tokens.text.dim },
              ]}
              numberOfLines={1}
            >
              {t(meta.labelKey)}
            </Text>
            <View
              style={[
                tabStyles.countChip,
                isActive && { backgroundColor: `${meta.accent}33` },
              ]}
            >
              <Text
                style={[
                  tabStyles.countText,
                  { color: isActive ? meta.accent : tokens.text.dim },
                ]}
              >
                {count}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.bg.deep },
  scroll: { flex: 1 },
  scrollContent: {},
  loadingBox: {
    paddingVertical: tokens.space[10],
    alignItems: 'center',
  },
  errorBox: {
    paddingVertical: tokens.space[8],
    alignItems: 'center',
    gap: tokens.space[3],
  },
  errorText: {
    ...tokens.type.body,
    color: tokens.text.mid,
    textAlign: 'center',
    paddingHorizontal: tokens.space[5],
  },
  body: {
    paddingHorizontal: tokens.space[3],
    gap: tokens.space[3],
  },
  emptyBox: {
    paddingVertical: tokens.space[10],
    alignItems: 'center',
    gap: tokens.space[2],
    paddingHorizontal: tokens.space[6],
  },
  emptyTitle: {
    ...tokens.type.h2,
    color: tokens.text.hi,
    marginTop: tokens.space[2],
  },
  emptySub: {
    ...tokens.type.body,
    color: tokens.text.mid,
    textAlign: 'center',
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[3],
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.brand.violet,
    marginTop: tokens.space[4],
  },
  emptyCtaText: {
    ...tokens.type.body,
    color: tokens.text.hi,
    fontFamily: 'Manrope_700Bold',
  },
  tabBody: {
    gap: tokens.space[2],
  },
  generalLead: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    color: tokens.text.dim,
    fontStyle: 'italic',
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  tabEmpty: {
    ...tokens.type.caption,
    color: tokens.text.dim,
    fontStyle: 'italic',
    paddingVertical: tokens.space[4],
    textAlign: 'center',
  },
  manageCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: tokens.space[3],
    paddingVertical: tokens.space[3],
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(123,92,255,0.4)',
    backgroundColor: 'rgba(123,92,255,0.08)',
  },
  manageCtaText: {
    ...tokens.type.body,
    color: tokens.brand.violet2,
    fontFamily: 'Manrope_700Bold',
  },
});

const tabStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 6,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: tokens.space[2],
    paddingHorizontal: tokens.space[2],
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.border.base,
    backgroundColor: 'transparent',
    minHeight: 36,
  },
  label: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
    letterSpacing: 0.4,
  },
  countChip: {
    minWidth: 20,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 999,
    backgroundColor: tokens.bg.glass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    letterSpacing: 0.3,
  },
});
