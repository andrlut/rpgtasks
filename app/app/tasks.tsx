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
  label: string;
  sublabel: string;
  iconName: keyof typeof Ionicons.glyphMap;
}

const BUCKETS: BucketMeta[] = [
  { id: 'daily', label: 'Daily', sublabel: 'Routines you do every day', iconName: 'sunny' },
  { id: 'weekly', label: 'Weekly', sublabel: 'Specific days or monthly cadence', iconName: 'calendar' },
  { id: 'one_time', label: 'One-time', sublabel: 'Done once', iconName: 'flag' },
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
  const tasks = useActiveTasks();
  const templates = useTaskTemplates();
  const startFromTemplate = useStartTaskFromTemplate();

  const [tab, setTab] = useState<Tab>('allocated');
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Record<Bucket, boolean>>({
    daily: false,
    weekly: false,
    one_time: false,
  });
  const [collapsedSubs, setCollapsedSubs] = useState<Record<SubId, boolean>>(
    {} as Record<SubId, boolean>,
  );
  const [adoptingId, setAdoptingId] = useState<string | null>(null);
  /** Template currently sitting in the periodicity picker sheet. Tap on a
   *  template row opens the sheet; sheet confirm fires the actual adopt. */
  const [pickerTemplate, setPickerTemplate] = useState<TaskTemplateWithSubs | null>(null);

  // ── Filter tasks by tab semantic, then bucket ─────────────────────────
  // - allocated: all active user tasks (adoption or custom — what's "alive"
  //              in the user's routine right now)
  // - mine:      only custom tasks (template_id IS NULL), regardless of
  //              adoption count. Helps the user find "what I made from
  //              scratch" without the catalog clutter.
  const filteredTasks = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = (tasks.data ?? []).filter((t) =>
      q.length === 0 ? true : t.title.toLowerCase().includes(q),
    );
    if (tab === 'mine') return base.filter((t) => !t.template_id);
    return base; // allocated tab shows everything active
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

  const totalTasks = tasks.data?.length ?? 0;
  const customCount = (tasks.data ?? []).filter((t) => !t.template_id).length;
  const adoptedCount = totalTasks - customCount;

  // ── Suggested: filter + group by sub ───────────────────────────────────
  const adoptedTemplateIds = useMemo(() => {
    const set = new Set<string>();
    (tasks.data ?? []).forEach((t) => {
      if (t.template_id) set.add(t.template_id);
    });
    return set;
  }, [tasks.data]);

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

  /** Open the periodicity picker sheet for a template (looked up by id from
   *  the loaded templates list). The sheet's confirm fires the actual adoption
   *  with the chosen overrides. */
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

    // "Customize" is not an adoption — it routes the user to task-form
    // with the template pre-filled, and on save the new task is created
    // as truly custom (template_id IS NULL).
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
          Alert.alert('Could not adopt', e.message ?? 'Unknown error.');
        },
      },
    );
  };

  const handleRefresh = async () => {
    await Promise.all([tasks.refetch(), templates.refetch()]);
  };
  const isRefreshing = tasks.isRefetching || templates.isRefetching;

  // ── Render ─────────────────────────────────────────────────────────────
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
          <Text style={styles.title}>My Tasks</Text>
          <Pressable
            onPress={() => router.push('/task-form')}
            style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.6 }]}
            hitSlop={8}
            accessibilityLabel="New task"
          >
            <Ionicons name="add" size={22} color={tokens.brand.violet2} />
          </Pressable>
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
          {/* Stats strip */}
          <View style={styles.statsStrip}>
            <View style={styles.statBlock}>
              <Text style={styles.statValue}>{totalTasks}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBlock}>
              <Text style={[styles.statValue, { color: tokens.brand.violet2 }]}>
                {customCount}
              </Text>
              <Text style={styles.statLabel}>Custom</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBlock}>
              <Text style={[styles.statValue, { color: tokens.semantic.coin }]}>
                {adoptedCount}
              </Text>
              <Text style={styles.statLabel}>From catalog</Text>
            </View>
          </View>

          {/* Tab toggle — 3 filters */}
          <View style={styles.tabsWrap}>
            <SegmentedControl<Tab>
              options={[
                { value: 'allocated', label: 'Alocadas' },
                { value: 'mine', label: 'Minhas' },
                { value: 'suggested', label: 'Sugeridas' },
              ]}
              value={tab}
              onChange={setTab}
            />
          </View>

          {/* Search */}
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={16} color={tokens.text.dim} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={tab === 'mine' ? 'Search your tasks…' : 'Search catalog…'}
              placeholderTextColor={tokens.text.faint}
              style={styles.searchInput}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={tokens.text.dim} />
              </Pressable>
            )}
          </View>

          {/* Body */}
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
            />
          )}
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
}

function MineBody({
  tasks,
  loading,
  query,
  collapsed,
  onToggle,
  onTaskPress,
  onCreate,
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
          {query ? 'No matches' : 'No tasks yet'}
        </Text>
        <Text style={styles.emptySub}>
          {query
            ? `Nothing matches "${query}"`
            : 'Add your first task or browse the Suggested tab.'}
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
            <Text style={styles.emptyCtaText}>New task</Text>
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
}

function BucketSection({
  meta,
  tasks,
  collapsed,
  onToggle,
  onTaskPress,
}: BucketSectionProps) {
  return (
    <View style={styles.groupCard}>
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [
          styles.groupHeader,
          pressed && { opacity: 0.7 },
        ]}
      >
        <View style={styles.groupIcon}>
          <Ionicons name={meta.iconName} size={14} color={tokens.brand.violet2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.groupTitle}>{meta.label}</Text>
          {!collapsed && (
            <Text style={styles.groupSub}>{meta.sublabel}</Text>
          )}
        </View>
        <Text style={styles.groupCount}>{tasks.length}</Text>
        <Ionicons
          name={collapsed ? 'chevron-down' : 'chevron-up'}
          size={16}
          color={tokens.text.dim}
        />
      </Pressable>

      {!collapsed && (
        <View style={styles.groupBody}>
          {tasks.length === 0 ? (
            <Text style={styles.bucketEmpty}>No tasks in this bucket.</Text>
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
          {isCustom && (
            <View style={styles.customChip}>
              <Text style={styles.customChipText}>CUSTOM</Text>
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
          <Text style={styles.rewardValue}>+{reward.total.xp}</Text>
          <Text style={styles.taskRecurrence} numberOfLines={1}>
            {describeRecurrence(task.recurrence, task.target_count)}
          </Text>
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
        <Text style={styles.emptyTitle}>No matches</Text>
        <Text style={styles.emptySub}>
          Nothing in the catalog matches &quot;{query}&quot;.
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
                  size={14}
                  color={dimMeta.color}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.groupTitle}>{subMeta.label}</Text>
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
                {templates.map((t, i) => (
                  <TemplateRow
                    key={t.id}
                    template={t}
                    divider={i > 0}
                    dimColor={dimMeta.color}
                    dimId={subMeta.dimensionId}
                    isAdopted={adoptedTemplateIds.has(t.id)}
                    isAdopting={adoptingId === t.id}
                    onAdopt={() => onAdopt(t.id)}
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
}

function TemplateRow({
  template,
  divider,
  dimColor,
  dimId,
  isAdopted,
  isAdopting,
  onAdopt,
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
          <Text style={styles.rewardValue}>+{reward.total.xp}</Text>
          <Text style={styles.taskRecurrence} numberOfLines={1}>
            {describeRecurrence(template.recurrence, template.target_count)}
          </Text>
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
            <Text style={styles.adoptBtnTextDone}>Added</Text>
          </>
        ) : (
          <>
            <Ionicons name="add" size={14} color={dimColor} />
            <Text style={[styles.adoptBtnText, { color: dimColor }]}>Adopt</Text>
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
  content: {
    paddingHorizontal: tokens.space[4],
    paddingBottom: tokens.space[10],
  },
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.bg.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.border.base,
    paddingVertical: tokens.space[3],
    paddingHorizontal: tokens.space[3],
    marginTop: tokens.space[2],
  },
  statBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 22,
    lineHeight: 24,
    color: tokens.text.hi,
  },
  statLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
    color: tokens.text.mid,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: tokens.border.divider,
  },
  tabsWrap: {
    marginTop: tokens.space[3],
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
    height: 44,
    marginTop: tokens.space[3],
    marginBottom: tokens.space[4],
  },
  searchInput: {
    flex: 1,
    color: tokens.text.hi,
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
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
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[3],
  },
  groupIcon: {
    width: 26,
    height: 26,
    borderRadius: tokens.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(123,92,255,0.18)',
  },
  groupTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 13,
    color: tokens.text.hi,
    letterSpacing: 0.4,
  },
  groupSub: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 10,
    color: tokens.text.dim,
    marginTop: 2,
    letterSpacing: 0.4,
  },
  groupCount: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
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
    gap: 6,
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
    fontSize: 11,
    color: tokens.semantic.xp,
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
