import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  DimensionId,
  MetricType,
  Recurrence,
  SubId,
  TaskTemplate,
  TaskWithDimensions,
} from '@/lib/db/types';
import { isDueOn, parseRecurrence } from '@/lib/recurrence';
import { supabase } from '@/lib/supabase';

import { characterKeys, type CharacterWithProfile } from './character';
import { historyKeys } from './history';
import { questKeys } from './quests';
import { streakKeys } from './streak';

export const taskKeys = {
  all: ['tasks'] as const,
  pending: () => [...taskKeys.all, 'pending'] as const,
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
  dimensions: DimensionId[];
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
  sub_id: string | null;
  task_dimension: { dimension_id: DimensionId }[];
}

// Postgres numeric columns can come back as strings via PostgREST.
function numericOrNull(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : null;
}

function mapTaskRow(t: TaskRow): TaskWithDimensions {
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
    sub_id: (t.sub_id ?? null) as TaskWithDimensions['sub_id'],
    dimensions: (t.task_dimension ?? []).map((td) => td.dimension_id),
  };
}

/**
 * Tasks pending right now: every active task whose recurrence says it's
 * due *today* AND that hasn't already met its `target_count` for today.
 * Plus one_shot tasks that have never been completed.
 */
async function fetchPendingTasks(): Promise<TaskWithDimensions[]> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const today = new Date();

  const { data: tasks, error: taskErr } = await supabase
    .from('task')
    .select('*, task_dimension(dimension_id)')
    .eq('is_archived', false)
    .order('created_at', { ascending: true });
  if (taskErr) throw taskErr;

  const allTasks = ((tasks ?? []) as TaskRow[]).map(mapTaskRow);

  // Today's completion counts (per task) — used to decide "still pending today".
  const { data: completionsToday, error: compErr } = await supabase
    .from('task_completion')
    .select('task_id')
    .gte('completed_at', startOfToday.toISOString());
  if (compErr) throw compErr;

  const completionCountToday = new Map<string, number>();
  (completionsToday ?? []).forEach((c) => {
    completionCountToday.set(c.task_id, (completionCountToday.get(c.task_id) ?? 0) + 1);
  });

  // For one_shot tasks we additionally need to know "ever completed?". Only
  // query if there's at least one one_shot among the active tasks.
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

  return allTasks.filter((t) => {
    if (t.recurrence.type === 'one_shot') {
      return !everCompletedOneShots.has(t.id);
    }
    if (!isDueOn(t.recurrence, today)) return false;
    const doneToday = completionCountToday.get(t.id) ?? 0;
    return doneToday < t.target_count;
  });
}

export function useTasks() {
  return useQuery({
    queryKey: taskKeys.pending(),
    queryFn: fetchPendingTasks,
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
      dimensions: DimensionId[];
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

      const prevTasks = queryClient.getQueryData<TaskWithDimensions[]>(taskKeys.pending());
      const prevChar = queryClient.getQueryData<CharacterWithProfile>(characterKeys.me());

      // Optimistic removal from "pending today" only when:
      //   - it's a live tap (no completedAt), AND
      //   - the task's target is 1 (multi-target tasks need a refetch to know
      //     whether THIS tap was the one that closed out the day).
      const isLive = !params.completedAt;
      const t = prevTasks?.find((x) => x.id === params.taskId);
      const singleTarget = !t || (t.target_count ?? 1) === 1;
      if (prevTasks && isLive && singleTarget) {
        queryClient.setQueryData<TaskWithDimensions[]>(
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
            params.dimensions.includes(d.dimension_id)
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
    queryFn: async (): Promise<TaskWithDimensions | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('task')
        .select('*, task_dimension(dimension_id)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return mapTaskRow(data as TaskRow);
    },
  });
}

async function setTaskDimensions(taskId: string, dimensions: DimensionId[]) {
  // simple approach for V0: wipe and re-insert
  const { error: delErr } = await supabase
    .from('task_dimension')
    .delete()
    .eq('task_id', taskId);
  if (delErr) throw delErr;

  if (dimensions.length === 0) return;

  const rows = dimensions.map((d) => ({ task_id: taskId, dimension_id: d }));
  const { error: insErr } = await supabase.from('task_dimension').insert(rows);
  if (insErr) throw insErr;
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
          metric_type: input.metric_type,
          metric_label: input.metric_label,
          base_value: input.base_value,
          increment_per_star: input.increment_per_star,
        })
        .select('id')
        .single();
      if (error) throw error;
      const taskId = (data as { id: string }).id;

      await setTaskDimensions(taskId, input.dimensions);
      return taskId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.pending() });
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
          metric_type: input.metric_type,
          metric_label: input.metric_label,
          base_value: input.base_value,
          increment_per_star: input.increment_per_star,
        })
        .eq('id', taskId);
      if (error) throw error;

      await setTaskDimensions(taskId, input.dimensions);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.pending() });
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
