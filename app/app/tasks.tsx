import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Stack, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AdoptPeriodicitySheet,
  adoptChoiceToOverrides,
  type AdoptPeriodicityChoice,
} from '@/components/AdoptPeriodicitySheet';
import { DimensionChip } from '@/components/DimensionChip';
import { ScreenBackground } from '@/components/ScreenBackground';
import { SegmentedControl } from '@/components/SegmentedControl';
import { useT } from '@/lib/i18n';
import {
  useActiveTasks,
  useStartTaskFromTemplate,
  useTaskTemplates,
} from '@/lib/api/tasks';
import type {
  DimensionId,
  Recurrence,
  SubId,
  TaskTemplateWithSubs,
  TaskWithSubs,
} from '@/lib/db/types';
import { useMetaLookup } from '@/lib/i18n/meta';
import { describeRecurrence } from '@/lib/recurrence';
import { rewardForTaskSubs } from '@/lib/xp';
import { tokens } from '@/theme';
import {
  DIMENSION_META,
  DIMENSION_ORDER,
  SUBS_BY_DIM,
  SUB_META,
} from '@/theme/dimensions';

type Tab = 'allocated' | 'mine' | 'suggested';
type Bucket = 'daily' | 'weekly' | 'one_time';

interface BucketMeta {
  id: Bucket;
  labelKey: string;
  descKey: string;
  iconName: keyof typeof Ionicons.glyphMap;
  /** Accent color used for the left bar, icon tile, title text and count. */
  accent: string;
  /** Translucent fill behind the icon tile and accent bar (RGBA). */
  accentBg: string;
}

const BUCKETS: BucketMeta[] = [
  {
    id: 'daily',
    labelKey: 'tasksHub.buckets.daily',
    descKey: 'tasksHub.buckets.dailyDesc',
    iconName: 'sunny',
    accent: tokens.brand.violet2,
    accentBg: 'rgba(157,127,255,0.18)',
  },
  {
    id: 'weekly',
    labelKey: 'tasksHub.buckets.weekly',
    descKey: 'tasksHub.buckets.weeklyDesc',
    iconName: 'calendar',
    accent: '#4DD0FF',
    accentBg: 'rgba(77,208,255,0.18)',
  },
  {
    id: 'one_time',
    labelKey: 'tasksHub.buckets.oneTime',
    descKey: 'tasksHub.buckets.oneTimeDesc',
    iconName: 'flag',
    accent: tokens.semantic.coin,
    accentBg: 'rgba(255,200,61,0.18)',
  },
];

/**
 * Decide which bucket a task lives in based on its recurrence shape.
 * Daily-with-all-7-days collapses into Daily so the user isn't surprised.
 */
function bucketFor(rec: Recurrence): Bucket {
  if (rec.type === 'one_shot') return 'one_time';
  if (rec.type === 'daily') return 'daily';
  if (rec.type === 'weekly' && (rec.days?.length ?? 0) === 7) return 'daily';
  return 'weekly'; // weekly (any subset or flex) OR monthly
}

export default function TasksHubScreen() {
  const router = useRouter();
  const { t } = useT();
  const tasks = useActiveTasks();
  const templates = useTaskTemplates();
  const startFromTemplate = useStartTaskFromTemplate();

  const [tab, setTab] = useState<Tab>('allocated');
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<Bucket, boolean>>({
    daily: false,
    weekly: false,
    one_time: false,
  });
  const [collapsedSubs, setCollapsedSubs] = useState<Record<SubId, boolean>>(
    {} as Record<SubId, boolean>,
  );
  const [adoptingId, setAdoptingId] = useState<string | null>(null);
  /** Template currently sitting in the periodicity picker sheet. */
  const [pickerTemplate, setPickerTemplate] = useState<TaskTemplateWithSubs | null>(null);

  // ── Counts (drive both filter pills and group counts) ─────────────────
  const totalTasks = tasks.data?.length ?? 0;
  const customCount = (tasks.data ?? []).filter((t) => !t.template_id).length;

  const adoptedTemplateIds = useMemo(() => {
    const set = new Set<string>();
    (tasks.data ?? []).forEach((t) => {
      if (t.template_id) set.add(t.template_id);
    });
    return set;
  }, [tasks.data]);

  const suggestedCount = useMemo(
    () =>
      (templates.data ?? []).filter((t) => !adoptedTemplateIds.has(t.id)).length,
    [templates.data, adoptedTemplateIds],
  );

  // ── Filter tasks by tab semantic, then bucket ─────────────────────────
  const filteredTasks = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = (tasks.data ?? []).filter((t) =>
      q.length === 0 ? true : t.title.toLowerCase().includes(q),
    );
    if (tab === 'mine') return base.filter((t) => !t.template_id);
    return base;
  }, [tasks.data, query, tab]);

  const tasksByBucket = useMemo(() => {
    const map: Record<Bucket, TaskWithSubs[]> = {
      daily: [],
      weekly: [],
      one_time: [],
    };
    for (const t of filteredTasks) {
      map[bucketFor(t.recurrence)].push(t);
    }
    return map;
  }, [filteredTasks]);

  // ── Suggested: filter + group by sub ───────────────────────────────────
  const filteredTemplates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (templates.data ?? []).filter((t) =>
      q.length === 0
        ? true
        : t.title.toLowerCase().includes(q) ||
          (t.description?.toLowerCase().includes(q) ?? false),
    );
  }, [templates.data, query]);

  const templatesBySub = useMemo(() => {
    const map = new Map<SubId, TaskTemplateWithSubs[]>();
    for (const t of filteredTemplates) {
      const arr = map.get(t.primary_sub_id) ?? [];
      arr.push(t);
      map.set(t.primary_sub_id, arr);
    }
    return map;
  }, [filteredTemplates]);

  // ── Handlers ───────────────────────────────────────────────────────────
  const toggleBucket = (b: Bucket) =>
    setCollapsed((prev) => ({ ...prev, [b]: !prev[b] }));

  const toggleSub = (s: SubId) =>
    setCollapsedSubs((prev) => ({ ...prev, [s]: !prev[s] }));

  const toggleSearch = () => {
    setSearchOpen((open) => {
      if (open) setQuery('');
      return !open;
    });
  };

  const handleAdopt = (templateId: string) => {
    if (adoptingId || startFromTemplate.isPending) return;
    if (adoptedTemplateIds.has(templateId)) return;
    const template = (templates.data ?? []).find((t) => t.id === templateId);
    if (!template) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setPickerTemplate(template);
  };

  const handleAdoptConfirm = (choice: AdoptPeriodicityChoice) => {
    const template = pickerTemplate;
    setPickerTemplate(null);
    if (!template) return;

    if (choice.kind === 'customize') {
      router.push({
        pathname: '/task-form',
        params: { from_template: template.id },
      });
      return;
    }

    const overrides = adoptChoiceToOverrides(choice);
    setAdoptingId(template.id);
    startFromTemplate.mutate(
      { templateId: template.id, ...overrides },
      {
        onSettled: () => setAdoptingId(null),
        onError: (err) => {
          const e = err as { message?: string };
          Alert.alert(
            t('tasksHub.errors.couldNotAdoptTitle'),
            e.message ?? t('tasksHub.errors.unknown'),
          );
        },
      },
    );
  };

  const handleRefresh = async () => {
    await Promise.all([tasks.refetch(), templates.refetch()]);
  };
  const isRefreshing = tasks.isRefetching || templates.isRefetching;

  // Counts shown inside the SegmentedControl pills
  const filterCounts: Record<Tab, number> = {
    allocated: totalTasks,
    mine: customCount,
    suggested: suggestedCount,
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenBackground>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.6 }]}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={22} color={tokens.text.hi} />
          </Pressable>
          <Text style={styles.title}>{t('tasksHub.title')}</Text>
          <View style={styles.topActions}>
            <Pressable
              onPress={toggleSearch}
              style={({ pressed }) => [
                styles.iconButton,
                searchOpen && styles.iconButtonActive,
                pressed && { opacity: 0.6 },
              ]}
              hitSlop={8}
              accessibilityLabel={
                searchOpen ? t('tasksHub.search.close') : t('tasksHub.search.open')
              }
            >
              <Ionicons
                name={searchOpen ? 'close' : 'search'}
                size={20}
                color={searchOpen ? tokens.brand.violet2 : tokens.text.hi}
              />
            </Pressable>
            <Pressable
              onPress={() => router.push('/task-form')}
              style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.6 }]}
              hitSlop={8}
              accessibilityLabel={t('tasksHub.newTask')}
            >
              <Ionicons name="add" size={22} color={tokens.brand.violet2} />
            </Pressable>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={tokens.brand.violet2}
              colors={[tokens.brand.violet2]}
            />
          }
        >
          {/* Tab toggle with counts — replaces the stats strip + tab redundancy */}
          <View style={styles.tabsWrap}>
            <SegmentedControl<Tab>
              options={[
                {
                  value: 'allocated',
                  label: t('tasksHub.filters.allocated'),
                  count: filterCounts.allocated,
                },
                {
                  value: 'mine',
                  label: t('tasksHub.filters.mine'),
                  count: filterCounts.mine,
                },
                {
                  value: 'suggested',
                  label: t('tasksHub.filters.suggested'),
                  count: filterCounts.suggested,
                },
              ]}
              value={tab}
              onChange={setTab}
            />
          </View>

          {/* Collapsible inline search (only when the magnifier is active) */}
          {searchOpen && (
            <View style={styles.searchWrap}>
              <Ionicons name="search" size={16} color={tokens.text.dim} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={
                  tab === 'mine'
                    ? t('tasksHub.search.placeholderMine')
                    : t('tasksHub.search.placeholderCatalog')
                }
                placeholderTextColor={tokens.text.faint}
                style={styles.searchInput}
                autoCorrect={false}
                autoCapitalize="none"
                autoFocus
              />
              {query.length > 0 && (
                <Pressable onPress={() => setQuery('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color={tokens.text.dim} />
                </Pressable>
              )}
            </View>
          )}

          {/* Body */}
          <View style={styles.bodyWrap}>
            {tab === 'suggested' ? (
              <SuggestedBody
                templatesBySub={templatesBySub}
                loading={templates.isLoading}
                query={query}
                adoptedTemplateIds={adoptedTemplateIds}
                collapsedSubs={collapsedSubs}
                onToggleSub={toggleSub}
                onAdopt={handleAdopt}
                adoptingId={adoptingId}
                t={t}
              />
            ) : (
              <MineBody
                tasks={tasksByBucket}
                loading={tasks.isLoading}
                query={query}
                collapsed={collapsed}
                onToggle={toggleBucket}
                onTaskPress={(id) =>
                  router.push({ pathname: '/task-form', params: { id } })
                }
                onCreate={() => router.push('/task-form')}
                t={t}
              />
            )}
          </View>
        </ScrollView>
      </ScreenBackground>

      <AdoptPeriodicitySheet
        visible={pickerTemplate !== null}
        templateTitle={pickerTemplate?.title ?? ''}
        templateDefaultType={pickerTemplate?.task_type}
        onCancel={() => setPickerTemplate(null)}
        onConfirm={handleAdoptConfirm}
      />
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mine: 3 collapsible buckets of the user's active tasks
// ─────────────────────────────────────────────────────────────────────────────

interface MineBodyProps {
  tasks: Record<Bucket, TaskWithSubs[]>;
  loading: boolean;
  query: string;
  collapsed: Record<Bucket, boolean>;
  onToggle: (b: Bucket) => void;
  onTaskPress: (id: string) => void;
  onCreate: () => void;
  t: (key: string, opts?: Record<string, string | number | undefined>) => string;
}

function MineBody({
  tasks,
  loading,
  query,
  collapsed,
  onToggle,
  onTaskPress,
  onCreate,
  t,
}: MineBodyProps) {
  if (loading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator color={tokens.brand.violet2} />
      </View>
    );
  }

  const totalShown = tasks.daily.length + tasks.weekly.length + tasks.one_time.length;
  if (totalShown === 0) {
    return (
      <View style={styles.emptyBox}>
        <Ionicons
          name={query ? 'search' : 'list'}
          size={32}
          color={tokens.text.dim}
        />
        <Text style={styles.emptyTitle}>
          {query ? t('tasksHub.empty.noMatchesTitle') : t('tasksHub.empty.noTasksTitle')}
        </Text>
        <Text style={styles.emptySub}>
          {query
            ? t('tasksHub.empty.noMatchesBody', { query })
            : t('tasksHub.empty.noTasksBody')}
        </Text>
        {!query && (
          <Pressable
            onPress={onCreate}
            style={({ pressed }) => [
              styles.emptyCta,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Ionicons name="add" size={18} color={tokens.text.hi} />
            <Text style={styles.emptyCtaText}>{t('tasksHub.empty.cta')}</Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <View style={{ gap: tokens.space[3] }}>
      {BUCKETS.map((b) => (
        <BucketSection
          key={b.id}
          meta={b}
          tasks={tasks[b.id]}
          collapsed={collapsed[b.id]}
          onToggle={() => onToggle(b.id)}
          onTaskPress={onTaskPress}
          t={t}
        />
      ))}
    </View>
  );
}

interface BucketSectionProps {
  meta: BucketMeta;
  tasks: TaskWithSubs[];
  collapsed: boolean;
  onToggle: () => void;
  onTaskPress: (id: string) => void;
  t: (key: string, opts?: Record<string, string | number | undefined>) => string;
}

function BucketSection({
  meta,
  tasks,
  collapsed,
  onToggle,
  onTaskPress,
  t,
}: BucketSectionProps) {
  // Per-bucket accent: a left accent bar (full-height), a tinted tile
  // behind the icon, the title in accent color, and a count chip that
  // picks up the same tint. The bucket card itself keeps the standard
  // surface — only the header carries the accent so groups read as
  // distinct without screaming.
  return (
    <View
      style={[
        styles.groupCard,
        { borderColor: `${meta.accent}33` },
      ]}
    >
      <View style={[styles.bucketAccentBar, { backgroundColor: meta.accent }]} />
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [
          styles.groupHeader,
          styles.bucketHeader,
          pressed && { opacity: 0.7 },
        ]}
      >
        <View
          style={[
            styles.bucketIcon,
            { backgroundColor: meta.accentBg, borderColor: `${meta.accent}55` },
          ]}
        >
          <Ionicons name={meta.iconName} size={20} color={meta.accent} />
        </View>
        <View style={styles.bucketTitleCol}>
          <Text style={[styles.bucketEyebrow, { color: meta.accent }]}>
            {t(meta.labelKey).toUpperCase()}
          </Text>
          <Text style={styles.bucketDesc} numberOfLines={1}>
            {t(meta.descKey)}
          </Text>
        </View>
        <View
          style={[
            styles.bucketCountChip,
            { backgroundColor: meta.accentBg, borderColor: `${meta.accent}55` },
          ]}
        >
          <Text style={[styles.bucketCountText, { color: meta.accent }]}>
            {tasks.length}
          </Text>
        </View>
        <Ionicons
          name={collapsed ? 'chevron-down' : 'chevron-up'}
          size={16}
          color={tokens.text.dim}
        />
      </Pressable>

      {!collapsed && (
        <View style={styles.groupBody}>
          {tasks.length === 0 ? (
            <Text style={styles.bucketEmpty}>{t('tasksHub.bucketEmpty')}</Text>
          ) : (
            tasks.map((t, i) => (
              <TaskRow
                key={t.id}
                task={t}
                divider={i > 0}
                onPress={() => onTaskPress(t.id)}
              />
            ))
          )}
        </View>
      )}
    </View>
  );
}

interface TaskRowProps {
  task: TaskWithSubs;
  divider: boolean;
  onPress: () => void;
}

function TaskRow({ task, divider, onPress }: TaskRowProps) {
  const { t } = useT();
  const meta = useMetaLookup();
  const isCustom = !task.template_id;
  const primarySubMeta = meta.sub(task.primary_sub_id);
  const dimMeta = meta.dim(task.primary_dimension_id);
  const reward = rewardForTaskSubs(task.subs);
  const pips: string[] = [];
  for (const s of task.subs) {
    const sm = SUB_META[s.sub_id];
    const color = sm ? DIMENSION_META[sm.dimensionId].color : tokens.brand.violet2;
    for (let i = 0; i < s.stars; i++) pips.push(color);
  }
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.taskRow,
        divider && styles.taskRowDivider,
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={[styles.subDot, { backgroundColor: dimMeta.bg }]}>
        {primarySubMeta && (
          <Ionicons
            name={primarySubMeta.iconName as never}
            size={14}
            color={dimMeta.color}
          />
        )}
      </View>
      <View style={styles.taskBody}>
        <View style={styles.taskTitleRow}>
          <Text style={styles.taskTitle} numberOfLines={1}>
            {task.title}
          </Text>
          <Text style={styles.rewardValue}>+{reward.total.xp}</Text>
          {isCustom && (
            <View style={styles.customChip}>
              <Text style={styles.customChipText}>
                {t('tasksHub.customChip')}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.taskMetaRow}>
          {pips.length > 0 && (
            <View style={styles.pipsRow}>
              {pips.map((color, i) => (
                <View
                  key={i}
                  style={[styles.pip, { backgroundColor: color }]}
                />
              ))}
            </View>
          )}
          <Text style={styles.taskRecurrence} numberOfLines={1}>
            {describeRecurrence(task.recurrence, task.target_count)}
          </Text>
          <View style={styles.coinChip}>
            <Ionicons name="ellipse" size={8} color={tokens.semantic.coin} />
            <Text style={styles.coinChipText}>+{reward.total.coins}</Text>
          </View>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={tokens.text.dim} />
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Suggested: catalog browse, grouped by sub
// ─────────────────────────────────────────────────────────────────────────────

interface SuggestedBodyProps {
  templatesBySub: Map<SubId, TaskTemplateWithSubs[]>;
  loading: boolean;
  query: string;
  adoptedTemplateIds: Set<string>;
  collapsedSubs: Record<SubId, boolean>;
  onToggleSub: (s: SubId) => void;
  onAdopt: (templateId: string) => void;
  adoptingId: string | null;
  t: (key: string, opts?: Record<string, string | number | undefined>) => string;
}

/** Subs in display order, grouped under their dim. */
const ALL_SUBS_IN_ORDER: SubId[] = DIMENSION_ORDER.flatMap(
  (d) => SUBS_BY_DIM[d],
);

function SuggestedBody({
  templatesBySub,
  loading,
  query,
  adoptedTemplateIds,
  collapsedSubs,
  onToggleSub,
  onAdopt,
  adoptingId,
  t,
}: SuggestedBodyProps) {
  const meta = useMetaLookup();
  if (loading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator color={tokens.brand.violet2} />
      </View>
    );
  }
  const subsWithTemplates = ALL_SUBS_IN_ORDER.filter(
    (s) => (templatesBySub.get(s)?.length ?? 0) > 0,
  );
  if (subsWithTemplates.length === 0) {
    return (
      <View style={styles.emptyBox}>
        <Ionicons name="search" size={32} color={tokens.text.dim} />
        <Text style={styles.emptyTitle}>{t('tasksHub.empty.noMatchesTitle')}</Text>
        <Text style={styles.emptySub}>
          {t('tasksHub.empty.noMatchesCatalog', { query })}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ gap: tokens.space[3] }}>
      {subsWithTemplates.map((subId) => {
        const subMeta = meta.sub(subId);
        const dimMeta = meta.dim(subMeta.dimensionId);
        const templates = templatesBySub.get(subId) ?? [];
        const isCollapsed = !!collapsedSubs[subId];
        return (
          <View
            key={subId}
            style={[styles.groupCard, { borderColor: `${dimMeta.color}33` }]}
          >
            <Pressable
              onPress={() => onToggleSub(subId)}
              style={({ pressed }) => [
                styles.groupHeader,
                pressed && { opacity: 0.7 },
              ]}
            >
              <View style={[styles.groupIcon, { backgroundColor: dimMeta.bg }]}>
                <Ionicons
                  name={subMeta.iconName as never}
                  size={18}
                  color={dimMeta.color}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.groupTitle, { color: dimMeta.color }]}>
                  {subMeta.label}
                </Text>
                <Text style={styles.groupSub}>
                  {dimMeta.label.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.groupCount}>{templates.length}</Text>
              <Ionicons
                name={isCollapsed ? 'chevron-down' : 'chevron-up'}
                size={16}
                color={tokens.text.dim}
              />
            </Pressable>

            {!isCollapsed && (
              <View style={styles.groupBody}>
                {templates.map((tmpl, i) => (
                  <TemplateRow
                    key={tmpl.id}
                    template={tmpl}
                    divider={i > 0}
                    dimColor={dimMeta.color}
                    dimId={subMeta.dimensionId}
                    isAdopted={adoptedTemplateIds.has(tmpl.id)}
                    isAdopting={adoptingId === tmpl.id}
                    onAdopt={() => onAdopt(tmpl.id)}
                    t={t}
                  />
                ))}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

interface TemplateRowProps {
  template: TaskTemplateWithSubs;
  divider: boolean;
  dimColor: string;
  dimId: DimensionId;
  isAdopted: boolean;
  isAdopting: boolean;
  onAdopt: () => void;
  t: (key: string, opts?: Record<string, string | number | undefined>) => string;
}

function TemplateRow({
  template,
  divider,
  dimColor,
  dimId,
  isAdopted,
  isAdopting,
  onAdopt,
  t,
}: TemplateRowProps) {
  const reward = rewardForTaskSubs(template.subs);
  const pips: string[] = [];
  for (const s of template.subs) {
    const sm = SUB_META[s.sub_id];
    const color = sm ? DIMENSION_META[sm.dimensionId].color : tokens.brand.violet2;
    for (let i = 0; i < s.stars; i++) pips.push(color);
  }
  return (
    <View style={[styles.templateRow, divider && styles.taskRowDivider]}>
      <View style={styles.templateBody}>
        <View style={styles.taskTitleRow}>
          <Text style={styles.taskTitle} numberOfLines={2}>
            {template.title}
          </Text>
          <Text style={styles.rewardValue}>+{reward.total.xp}</Text>
        </View>
        {template.description && (
          <Text style={styles.templateDesc} numberOfLines={2}>
            {template.description}
          </Text>
        )}
        <View style={styles.taskMetaRow}>
          {pips.length > 0 && (
            <View style={styles.pipsRow}>
              {pips.map((color, i) => (
                <View
                  key={i}
                  style={[styles.pip, { backgroundColor: color }]}
                />
              ))}
            </View>
          )}
          <Text style={styles.taskRecurrence} numberOfLines={1}>
            {describeRecurrence(template.recurrence, template.target_count)}
          </Text>
          <View style={styles.coinChip}>
            <Ionicons name="ellipse" size={8} color={tokens.semantic.coin} />
            <Text style={styles.coinChipText}>+{reward.total.coins}</Text>
          </View>
          <DimensionChip id={dimId} size="sm" pressable={false} />
        </View>
      </View>
      <Pressable
        onPress={isAdopted || isAdopting ? undefined : onAdopt}
        disabled={isAdopted || isAdopting}
        style={({ pressed }) => [
          styles.adoptBtn,
          isAdopted && styles.adoptBtnDone,
          !isAdopted && { borderColor: dimColor },
          pressed && !isAdopted && { opacity: 0.7 },
        ]}
        hitSlop={6}
      >
        {isAdopting ? (
          <ActivityIndicator size="small" color={dimColor} />
        ) : isAdopted ? (
          <>
            <Ionicons name="checkmark" size={14} color={tokens.text.dim} />
            <Text style={styles.adoptBtnTextDone}>
              {t('tasksHub.adopt.added')}
            </Text>
          </>
        ) : (
          <>
            <Ionicons name="add" size={14} color={dimColor} />
            <Text style={[styles.adoptBtnText, { color: dimColor }]}>
              {t('tasksHub.adopt.adopt')}
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.bg.deep },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[2],
  },
  topActions: {
    flexDirection: 'row',
    gap: tokens.space[2],
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.bg.surface,
  },
  iconButtonActive: {
    backgroundColor: 'rgba(123,92,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(123,92,255,0.4)',
  },
  title: {
    ...tokens.type.h3,
    color: tokens.text.hi,
  },
  content: {
    paddingHorizontal: tokens.space[4],
    paddingBottom: tokens.space[10],
  },
  tabsWrap: {
    marginTop: tokens.space[2],
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    backgroundColor: tokens.bg.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.border.base,
    paddingHorizontal: tokens.space[3],
    height: 40,
    marginTop: tokens.space[3],
  },
  searchInput: {
    flex: 1,
    color: tokens.text.hi,
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
  },
  bodyWrap: {
    marginTop: tokens.space[4],
  },
  loadingBox: {
    paddingVertical: tokens.space[8],
    alignItems: 'center',
  },
  emptyBox: {
    paddingVertical: tokens.space[8],
    alignItems: 'center',
    gap: tokens.space[2],
  },
  emptyTitle: {
    ...tokens.type.h3,
    color: tokens.text.hi,
    marginTop: tokens.space[2],
  },
  emptySub: {
    ...tokens.type.body,
    color: tokens.text.mid,
    textAlign: 'center',
    paddingHorizontal: tokens.space[6],
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[3],
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.brand.violet,
    marginTop: tokens.space[3],
  },
  emptyCtaText: {
    ...tokens.type.body,
    color: tokens.text.hi,
    fontFamily: 'Manrope_700Bold',
  },
  groupCard: {
    backgroundColor: tokens.bg.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.border.base,
    overflow: 'hidden',
    position: 'relative',
  },
  bucketAccentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: tokens.radius.lg,
    borderBottomLeftRadius: tokens.radius.lg,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[3],
  },
  bucketHeader: {
    paddingLeft: tokens.space[4] + 8,
    paddingVertical: tokens.space[4],
  },
  groupIcon: {
    width: 34,
    height: 34,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(123,92,255,0.18)',
  },
  bucketIcon: {
    width: 42,
    height: 42,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  bucketTitleCol: {
    flex: 1,
    gap: 2,
  },
  bucketEyebrow: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 18,
    letterSpacing: 0.6,
  },
  bucketDesc: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    color: tokens.text.dim,
    letterSpacing: 0.2,
  },
  bucketCountChip: {
    minWidth: 30,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bucketCountText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 13,
    letterSpacing: 0.3,
  },
  groupTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 17,
    color: tokens.text.hi,
    letterSpacing: 0.2,
  },
  groupSub: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    color: tokens.text.dim,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  groupCount: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 13,
    color: tokens.text.dim,
  },
  groupBody: {
    paddingHorizontal: tokens.space[4],
    paddingBottom: tokens.space[2],
    borderTopWidth: 1,
    borderTopColor: tokens.border.divider,
  },
  bucketEmpty: {
    ...tokens.type.caption,
    color: tokens.text.dim,
    fontStyle: 'italic',
    paddingVertical: tokens.space[3],
    textAlign: 'center',
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    paddingVertical: tokens.space[3],
  },
  taskRowDivider: {
    borderTopWidth: 1,
    borderTopColor: tokens.border.divider,
  },
  subDot: {
    width: 32,
    height: 32,
    borderRadius: tokens.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskBody: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  taskTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: tokens.text.hi,
    flexShrink: 1,
  },
  customChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: tokens.radius.pill,
    backgroundColor: 'rgba(123,92,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(123,92,255,0.4)',
  },
  customChipText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 8,
    color: tokens.brand.violet2,
    letterSpacing: 0.6,
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    flexWrap: 'wrap',
  },
  taskRecurrence: {
    ...tokens.type.caption,
    color: tokens.text.dim,
    fontStyle: 'italic',
    flexShrink: 1,
  },
  pipsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  pip: {
    width: 5,
    height: 5,
    borderRadius: 1,
  },
  rewardValue: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 13,
    color: tokens.semantic.xp,
    letterSpacing: 0.2,
  },
  coinChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  coinChipText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
    color: tokens.semantic.coin,
    letterSpacing: 0.2,
  },
  templateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    paddingVertical: tokens.space[3],
  },
  templateBody: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  templateDesc: {
    ...tokens.type.caption,
    color: tokens.text.mid,
  },
  adoptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: tokens.space[3],
    paddingVertical: tokens.space[2],
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    minWidth: 78,
    justifyContent: 'center',
  },
  adoptBtnDone: {
    borderColor: tokens.border.base,
    backgroundColor: tokens.bg.base,
  },
  adoptBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    letterSpacing: 0.4,
  },
  adoptBtnTextDone: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    color: tokens.text.dim,
    letterSpacing: 0.4,
  },
});
