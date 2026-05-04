import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  DimensionId,
  MetricType,
  Recurrence,
  SubId,
  TaskTemplate,
  TaskWithDimension,
} from '@/lib/db/types';
import { isDueOn, parseRecurrence } from '@/lib/recurrence';
import { supabase } from '@/lib/supabase';
import { SUB_META } from '@/theme/dimensions';

import { characterKeys, type CharacterWithProfile } from './character';
import { historyKeys } from './history';
import { questKeys } from './quests';
import { streakKeys } from './streak';

export const taskKeys = {
  all: ['tasks'] as const,
  pending: () => [...taskKeys.all, 'pending'] as const,
  /** All non-archived tasks the user owns — full list for the Manage hub. */
  active: () => [...taskKeys.all, 'active'] as const,
  detail: (id: string) => [...taskKeys.all, 'detail', id] as const,
  templates: () => [...taskKeys.all, 'templates'] as const,
  templatesBySub: (subId: SubId) =>
    [...taskKeys.all, 'templates', 'sub', subId] as const,
};

export interface TaskFormInput {
  title: string;
  description: string | null;
  difficulty: 1 | 2 | 3 | 4 | 5;
  task_type: 'one_shot' | 'daily' | 'weekly';
  recurrence: Recurrence;
  target_count: number;
  /** Required: every task lives under exactly one sub. Parent dim is derived. */
  sub_id: SubId;
  /**
   * Optional metric scaling. When metric_type is set, base_value and
   * increment_per_star must also be set. When null, the task has no
   * scaling — completed at the default difficulty, no swipe affordance.
   */
  metric_type: MetricType | null;
  metric_label: string | null;
  base_value: number | null;
  increment_per_star: number | null;
}

interface TaskRow {
  id: string;
  character_id: string;
  title: string;
  description: string | null;
  difficulty: 1 | 2 | 3 | 4 | 5;
  task_type: 'one_shot' | 'daily' | 'weekly';
  recurrence: unknown;
  target_count: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  metric_type: MetricType | null;
  metric_label: string | null;
  base_value: number | string | null;
  increment_per_star: number | string | null;
  sub_id: SubId;
  template_id: string | null;
}

// Postgres numeric columns can come back as strings via PostgREST.
function numericOrNull(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : null;
}

/** Resolve a sub's parent dim. Throws on unknown sub — should be impossible
 *  given the DB FK + NOT NULL constraint, but we want a loud failure mode
 *  rather than a silent miscategorization. */
export function dimensionForSub(subId: SubId): DimensionId {
  const meta = SUB_META[subId];
  if (!meta) throw new Error(`Unknown sub_id: ${subId}`);
  return meta.dimensionId;
}

function mapTaskRow(t: TaskRow): TaskWithDimension {
  return {
    id: t.id,
    character_id: t.character_id,
    title: t.title,
    description: t.description,
    difficulty: t.difficulty,
    task_type: t.task_type,
    recurrence: parseRecurrence(t.recurrence),
    target_count: t.target_count ?? 1,
    is_archived: t.is_archived,
    created_at: t.created_at,
    updated_at: t.updated_at,
    metric_type: t.metric_type,
    metric_label: t.metric_label,
    base_value: numericOrNull(t.base_value),
    increment_per_star: numericOrNull(t.increment_per_star),
    sub_id: t.sub_id,
    template_id: t.template_id,
    dimension_id: dimensionForSub(t.sub_id),
  };
}

export interface HomeBuckets {
  /** Daily-cadence work pending today: dailies + weeklies-due-today +
   *  monthlies-due-today, where today's target_count isn't yet met. */
  today: TaskWithDimension[];
  /** Weeklies/monthlies pending elsewhere this week (not today). Lets the
   *  user see what's coming without leaving Home. */
  thisWeek: TaskWithDimension[];
  /** One-shot tasks that have never been completed. */
  oneTime: TaskWithDimension[];
}

/** Monday-anchored start of the current week, in local time. */
function startOfThisWeek(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  // JS getDay: 0=Sun..6=Sat. Convert to Monday=0..Sunday=6.
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return d;
}

/** Number of times this task is scheduled across the 7 days starting at
 *  weekStart. Reuses isDueOn so weekly/monthly semantics stay consistent. */
function countScheduledThisWeek(rec: TaskWithDimension['recurrence'], weekStart: Date): number {
  let count = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    if (isDueOn(rec, d)) count++;
  }
  return count;
}

/**
 * The three Home sections in one shot. Single batch of fetches keeps the
 * payload small and the loading state simple — Home renders all three or
 * none. The bucketing logic:
 *
 *   - One-time: any one_shot task that has never been completed.
 *   - Today: non-one_shot tasks that are due today AND haven't met their
 *            target_count for today yet.
 *   - This Week: weekly/monthly tasks that are NOT in Today, but still
 *                have at least one pending scheduled occurrence this week
 *                (scheduled occurrences × target_count > completions this
 *                week). Daily tasks that are met for today don't show
 *                here — they'll come back tomorrow.
 */
async function fetchHomeBuckets(): Promise<HomeBuckets> {
  const today = new Date();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const weekStart = startOfThisWeek();

  const { data: tasks, error: taskErr } = await supabase
    .from('task')
    .select('*')
    .eq('is_archived', false)
    .order('created_at', { ascending: true });
  if (taskErr) throw taskErr;

  const allTasks = ((tasks ?? []) as TaskRow[]).map(mapTaskRow);

  // Today completions (per task)
  const { data: completionsToday, error: compErr } = await supabase
    .from('task_completion')
    .select('task_id')
    .gte('completed_at', startOfToday.toISOString());
  if (compErr) throw compErr;
  const doneToday = new Map<string, number>();
  (completionsToday ?? []).forEach((c) => {
    doneToday.set(c.task_id, (doneToday.get(c.task_id) ?? 0) + 1);
  });

  // Week completions (per task) — used by the This Week bucket.
  const { data: completionsWeek, error: weekErr } = await supabase
    .from('task_completion')
    .select('task_id')
    .gte('completed_at', weekStart.toISOString());
  if (weekErr) throw weekErr;
  const doneWeek = new Map<string, number>();
  (completionsWeek ?? []).forEach((c) => {
    doneWeek.set(c.task_id, (doneWeek.get(c.task_id) ?? 0) + 1);
  });

  // One-shots: ever completed?
  const oneShotIds = allTasks
    .filter((t) => t.recurrence.type === 'one_shot')
    .map((t) => t.id);
  let everCompletedOneShots = new Set<string>();
  if (oneShotIds.length > 0) {
    const { data: anyComp, error: anyErr } = await supabase
      .from('task_completion')
      .select('task_id')
      .in('task_id', oneShotIds);
    if (anyErr) throw anyErr;
    everCompletedOneShots = new Set((anyComp ?? []).map((r) => r.task_id));
  }

  const buckets: HomeBuckets = { today: [], thisWeek: [], oneTime: [] };

  for (const t of allTasks) {
    if (t.recurrence.type === 'one_shot') {
      if (!everCompletedOneShots.has(t.id)) buckets.oneTime.push(t);
      continue;
    }

    const dueToday = isDueOn(t.recurrence, today);
    const todayCount = doneToday.get(t.id) ?? 0;
    if (dueToday && todayCount < t.target_count) {
      buckets.today.push(t);
      continue;
    }

    // Not in Today. For weekly/monthly, check if any other day this week
    // still has a pending occurrence (or the user is short on the week's
    // expected reps). Daily tasks completed today simply roll to tomorrow.
    if (t.recurrence.type === 'weekly' || t.recurrence.type === 'monthly') {
      const scheduled = countScheduledThisWeek(t.recurrence, weekStart);
      const expected = scheduled * t.target_count;
      const weekCount = doneWeek.get(t.id) ?? 0;
      if (expected > weekCount) buckets.thisWeek.push(t);
    }
  }

  return buckets;
}

export function useHomeBuckets() {
  return useQuery({
    queryKey: taskKeys.pending(),
    queryFn: fetchHomeBuckets,
  });
}

/**
 * All non-archived tasks for the current user, ordered by creation. Powers
 * the Manage hub — separate from useTasks (which is "due today only") so
 * the two never share cache state and can refetch independently.
 */
export function useActiveTasks() {
  return useQuery({
    queryKey: taskKeys.active(),
    queryFn: async (): Promise<TaskWithDimension[]> => {
      const { data, error } = await supabase
        .from('task')
        .select('*')
        .eq('is_archived', false)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return ((data ?? []) as TaskRow[]).map(mapTaskRow);
    },
  });
}

export interface CompleteTaskResult {
  xp_granted: number;
  coins_granted: number;
}

/**
 * Calls the complete_task() RPC on Supabase. Optimistically:
 *   - removes the task from the pending list (live tap, single-target only)
 *   - bumps total_xp + coins on the character
 * On error, rolls back. On success, invalidates so the truth wins.
 */
export function useCompleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      taskId: string;
      expectedXp: number;
      expectedCoins: number;
      /** Parent dim of the task (derived from sub_id) — used to bump the
       *  matching character_dimension row optimistically. */
      dimensionId: DimensionId;
      // Optional ISO timestamp for retroactive logging. Omit for "now".
      completedAt?: string;
      // Optional star difficulty override. When omitted, server uses
      // the task's default difficulty.
      selectedDifficulty?: 1 | 2 | 3 | 4 | 5;
    }): Promise<CompleteTaskResult> => {
      const { data, error } = await supabase.rpc('complete_task', {
        p_task_id: params.taskId,
        ...(params.completedAt ? { p_completed_at: params.completedAt } : {}),
        ...(params.selectedDifficulty
          ? { p_selected_difficulty: params.selectedDifficulty }
          : {}),
      });
      if (error) throw error;
      return data as CompleteTaskResult;
    },

    onMutate: async (params) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: taskKeys.pending() }),
        queryClient.cancelQueries({ queryKey: characterKeys.me() }),
      ]);

      const prevTasks = queryClient.getQueryData<TaskWithDimension[]>(taskKeys.pending());
      const prevChar = queryClient.getQueryData<CharacterWithProfile>(characterKeys.me());

      // Optimistic removal from "pending today" only when:
      //   - it's a live tap (no completedAt), AND
      //   - the task's target is 1 (multi-target tasks need a refetch to know
      //     whether THIS tap was the one that closed out the day).
      const isLive = !params.completedAt;
      const t = prevTasks?.find((x) => x.id === params.taskId);
      const singleTarget = !t || (t.target_count ?? 1) === 1;
      if (prevTasks && isLive && singleTarget) {
        queryClient.setQueryData<TaskWithDimension[]>(
          taskKeys.pending(),
          prevTasks.filter((x) => x.id !== params.taskId),
        );
      }

      if (prevChar) {
        queryClient.setQueryData<CharacterWithProfile>(characterKeys.me(), {
          ...prevChar,
          character: {
            ...prevChar.character,
            total_xp: prevChar.character.total_xp + params.expectedXp,
            coins: prevChar.character.coins + params.expectedCoins,
          },
          dimensions: prevChar.dimensions.map((d) =>
            d.dimension_id === params.dimensionId
              ? { ...d, xp: d.xp + params.expectedXp }
              : d,
          ),
        });
      }

      return { prevTasks, prevChar };
    },

    onError: (_err, _params, ctx) => {
      if (ctx?.prevTasks) queryClient.setQueryData(taskKeys.pending(), ctx.prevTasks);
      if (ctx?.prevChar) queryClient.setQueryData(characterKeys.me(), ctx.prevChar);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.pending() });
      queryClient.invalidateQueries({ queryKey: characterKeys.me() });
      queryClient.invalidateQueries({ queryKey: streakKeys.me() });
      queryClient.invalidateQueries({ queryKey: historyKeys.all });
      queryClient.invalidateQueries({ queryKey: questKeys.active() });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// CRUD: useTask, useCreateTask, useUpdateTask, useArchiveTask
// ─────────────────────────────────────────────────────────────────────────────

export function useTask(id: string | null | undefined) {
  return useQuery({
    queryKey: id ? taskKeys.detail(id) : ['tasks', 'detail', 'none'],
    enabled: !!id,
    queryFn: async (): Promise<TaskWithDimension | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('task')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return mapTaskRow(data as TaskRow);
    },
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: TaskFormInput): Promise<string> => {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const userId = userData.user?.id;
      if (!userId) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('task')
        .insert({
          character_id: userId,
          title: input.title,
          description: input.description,
          difficulty: input.difficulty,
          task_type: input.task_type,
          recurrence: input.recurrence,
          target_count: input.target_count,
          sub_id: input.sub_id,
          metric_type: input.metric_type,
          metric_label: input.metric_label,
          base_value: input.base_value,
          increment_per_star: input.increment_per_star,
        })
        .select('id')
        .single();
      if (error) throw error;
      return (data as { id: string }).id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.pending() });
      queryClient.invalidateQueries({ queryKey: taskKeys.active() });
    },
  });
}

export function useUpdateTask(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: TaskFormInput) => {
      const { error } = await supabase
        .from('task')
        .update({
          title: input.title,
          description: input.description,
          difficulty: input.difficulty,
          task_type: input.task_type,
          recurrence: input.recurrence,
          target_count: input.target_count,
          sub_id: input.sub_id,
          metric_type: input.metric_type,
          metric_label: input.metric_label,
          base_value: input.base_value,
          increment_per_star: input.increment_per_star,
        })
        .eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.pending() });
      queryClient.invalidateQueries({ queryKey: taskKeys.active() });
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
    },
  });
}

export interface UndoCompletionResult {
  xp_returned: number;
  coins_returned: number;
}

/**
 * Reverses a task_completion row: subtracts its XP/coins from the
 * character + dimensions, then deletes the row. Use sparingly — only
 * for fixing mis-taps on the History tab. Active completions on
 * "today" can also be undone (the UI exposes it on long-press).
 */
export function useUndoCompletion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (completionId: string): Promise<UndoCompletionResult> => {
      const { data, error } = await supabase.rpc('delete_task_completion', {
        p_completion_id: completionId,
      });
      if (error) throw error;
      return data as UndoCompletionResult;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.pending() });
      queryClient.invalidateQueries({ queryKey: characterKeys.me() });
      queryClient.invalidateQueries({ queryKey: streakKeys.me() });
      queryClient.invalidateQueries({ queryKey: historyKeys.all });
      queryClient.invalidateQueries({ queryKey: questKeys.active() });
    },
  });
}

export function useArchiveTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('task')
        .update({ is_archived: true })
        .eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: (_data, taskId) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.pending() });
      queryClient.invalidateQueries({ queryKey: taskKeys.active() });
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
    },
  });
}

/**
 * Public catalog of system-curated task suggestions, anchored by sub_id.
 * Public-read; user adopts via start_task_from_template.
 */
export function useTaskTemplates() {
  return useQuery({
    queryKey: taskKeys.templates(),
    queryFn: async (): Promise<TaskTemplate[]> => {
      const { data, error } = await supabase
        .from('task_template')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as TaskTemplate[];
    },
  });
}

/**
 * Atomically clone a task_template into the user's task list. Returns the
 * new task id. Invalidates task lists + character (so any quest progress
 * counters that depend on task list refresh).
 */
export function useStartTaskFromTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (templateId: string): Promise<string> => {
      const { data, error } = await supabase.rpc('start_task_from_template', {
        p_template_id: templateId,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.pending() });
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      queryClient.invalidateQueries({ queryKey: characterKeys.me() });
    },
  });
}
