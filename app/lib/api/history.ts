import { useQuery } from '@tanstack/react-query';

import { dimensionForSub } from '@/lib/api/tasks';
import type { DimensionId, SubId, TaskWithDimension } from '@/lib/db/types';
import { isDueOn, parseRecurrence } from '@/lib/recurrence';
import { supabase } from '@/lib/supabase';

export const historyKeys = {
  all: ['history'] as const,
  daily: (fromIso: string, toIso: string) =>
    [...historyKeys.all, 'daily', fromIso, toIso] as const,
  day: (dateKey: string) => [...historyKeys.all, 'day', dateKey] as const,
};

export interface DailySummaryEntry {
  /** Local-date key in `YYYY-MM-DD` form (using device's local timezone). */
  dateKey: string;
  totalXp: number;
  totalCoins: number;
  completionCount: number;
  byDimension: Partial<Record<DimensionId, number>>;
}

interface CompletionRow {
  id: string;
  task_id: string;
  completed_at: string;
  xp_granted: number;
  coins_granted: number;
  task: { id: string; title: string; difficulty: 1 | 2 | 3 | 4 | 5 } | null;
}

/**
 * Convert a Date to a "YYYY-MM-DD" key in the device's *local* timezone.
 * Local-day keys are how the user thinks about days, not UTC.
 */
export function dateKeyFromLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Local start-of-day for the given date. */
export function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Local end-of-day for the given date (next day's 00:00 minus 1 ms). */
export function endOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

/**
 * Aggregate completions per local day across [from, to]. Used to render
 * the History calendar heatmap. Pulled raw from the client; for V1 the
 * data volume is tiny (≤ a few hundred rows for a 90-day window).
 */
export function useDailySummary(from: Date, to: Date) {
  const fromIso = startOfLocalDay(from).toISOString();
  const toIso = endOfLocalDay(to).toISOString();

  return useQuery({
    queryKey: historyKeys.daily(fromIso, toIso),
    queryFn: async (): Promise<Map<string, DailySummaryEntry>> => {
      // We need per-completion XP plus the parent dim of each task. Each
      // task has one sub_id (NOT NULL), and each sub maps to one dim — so
      // a single fetch of (task_id, sub_id) is enough.
      const { data: completions, error: compErr } = await supabase
        .from('task_completion')
        .select('id, task_id, completed_at, xp_granted, coins_granted')
        .gte('completed_at', fromIso)
        .lte('completed_at', toIso);
      if (compErr) throw compErr;

      const taskIds = Array.from(new Set((completions ?? []).map((c) => c.task_id)));
      const dimByTask = new Map<string, DimensionId>();
      if (taskIds.length > 0) {
        const { data: taskRows, error: taskErr } = await supabase
          .from('task')
          .select('id, sub_id')
          .in('id', taskIds);
        if (taskErr) throw taskErr;
        (taskRows ?? []).forEach((t) => {
          dimByTask.set(t.id, dimensionForSub(t.sub_id as SubId));
        });
      }

      const map = new Map<string, DailySummaryEntry>();
      (completions ?? []).forEach((c) => {
        const key = dateKeyFromLocal(new Date(c.completed_at));
        const entry = map.get(key) ?? {
          dateKey: key,
          totalXp: 0,
          totalCoins: 0,
          completionCount: 0,
          byDimension: {},
        };
        entry.totalXp += c.xp_granted;
        entry.totalCoins += c.coins_granted;
        entry.completionCount += 1;
        const dim = dimByTask.get(c.task_id);
        if (dim) {
          entry.byDimension[dim] = (entry.byDimension[dim] ?? 0) + c.xp_granted;
        }
        map.set(key, entry);
      });

      return map;
    },
  });
}

export interface DayCompletion {
  id: string;
  taskId: string;
  taskTitle: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  /** Parent dim derived from the task's sub. null if the task was deleted. */
  dimensionId: DimensionId | null;
  xpGranted: number;
  coinsGranted: number;
  completedAt: string;
}

/**
 * An open task for a given day, paired with how many of its target
 * completions are already logged for that day. Used by the "Forgot
 * something?" / "Still open today" list.
 */
export interface OpenTaskOnDay {
  task: TaskWithDimension;
  completedThisDay: number;
}

export interface DayDetail {
  dateKey: string;
  completions: DayCompletion[];
  /** Active tasks not yet completed on this day — candidates for retro logging. */
  openTasks: OpenTaskOnDay[];
  totalXp: number;
  totalCoins: number;
}

interface TaskRowFull {
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
  metric_type: 'reps' | 'minutes' | 'pages' | 'km' | 'ml' | 'custom' | null;
  metric_label: string | null;
  base_value: number | string | null;
  increment_per_star: number | string | null;
  sub_id: SubId;
}

/**
 * For a single local day: the completions logged that day plus the
 * currently-active tasks that haven't been completed for that day yet
 * (retro-logging candidates).
 */
export function useDayDetail(date: Date) {
  const dayStart = startOfLocalDay(date);
  const dayEnd = endOfLocalDay(date);
  const dateKey = dateKeyFromLocal(date);

  return useQuery({
    queryKey: historyKeys.day(dateKey),
    queryFn: async (): Promise<DayDetail> => {
      const fromIso = dayStart.toISOString();
      const toIso = dayEnd.toISOString();

      const { data: comps, error: compErr } = await supabase
        .from('task_completion')
        .select(
          'id, task_id, completed_at, xp_granted, coins_granted, task:task_id(id, title, difficulty)',
        )
        .gte('completed_at', fromIso)
        .lte('completed_at', toIso)
        .order('completed_at', { ascending: true });
      if (compErr) throw compErr;

      const compRows = (comps ?? []) as unknown as CompletionRow[];
      const taskIds = Array.from(new Set(compRows.map((c) => c.task_id)));
      const dimByTask = new Map<string, DimensionId>();
      if (taskIds.length > 0) {
        const { data: taskRows, error: taskErr } = await supabase
          .from('task')
          .select('id, sub_id')
          .in('id', taskIds);
        if (taskErr) throw taskErr;
        (taskRows ?? []).forEach((t) => {
          dimByTask.set(t.id, dimensionForSub(t.sub_id as SubId));
        });
      }

      const completions: DayCompletion[] = compRows.map((c) => ({
        id: c.id,
        taskId: c.task_id,
        taskTitle: c.task?.title ?? '(deleted task)',
        difficulty: (c.task?.difficulty ?? 1) as 1 | 2 | 3 | 4 | 5,
        dimensionId: dimByTask.get(c.task_id) ?? null,
        xpGranted: c.xp_granted,
        coinsGranted: c.coins_granted,
        completedAt: c.completed_at,
      }));

      // Per-task completion count for THIS day (multi-target aware).
      const completionCountThisDay = new Map<string, number>();
      compRows.forEach((c) => {
        completionCountThisDay.set(
          c.task_id,
          (completionCountThisDay.get(c.task_id) ?? 0) + 1,
        );
      });

      // Active tasks created on or before this day.
      const { data: tasks, error: taskErr } = await supabase
        .from('task')
        .select('*')
        .eq('is_archived', false)
        .lte('created_at', dayEnd.toISOString())
        .order('created_at', { ascending: true });
      if (taskErr) throw taskErr;

      const taskRows = (tasks ?? []) as TaskRowFull[];
      const oneShotIds = taskRows
        .filter((t) => parseRecurrence(t.recurrence).type === 'one_shot')
        .map((t) => t.id);
      let oneShotCompletedAnytime = new Set<string>();
      if (oneShotIds.length > 0) {
        const { data: anyComp, error: anyErr } = await supabase
          .from('task_completion')
          .select('task_id')
          .in('task_id', oneShotIds);
        if (anyErr) throw anyErr;
        oneShotCompletedAnytime = new Set((anyComp ?? []).map((r) => r.task_id));
      }

      const openTasks: OpenTaskOnDay[] = taskRows
        .map((t) => ({ raw: t, recurrence: parseRecurrence(t.recurrence) }))
        .filter(({ raw, recurrence }) => {
          if (recurrence.type === 'one_shot') {
            // For a past day: still candidate if ever-completed is false.
            // (If completed on this day, the completion is already shown
            // in the Completed list above; hide here so list isn't empty.)
            return !oneShotCompletedAnytime.has(raw.id);
          }
          if (!isDueOn(recurrence, date)) return false;
          const doneCount = completionCountThisDay.get(raw.id) ?? 0;
          return doneCount < (raw.target_count ?? 1);
        })
        .map(({ raw, recurrence }) => {
          const numOrNull = (v: number | string | null): number | null => {
            if (v === null) return null;
            const n = typeof v === 'string' ? parseFloat(v) : v;
            return Number.isFinite(n) ? n : null;
          };
          return {
            task: {
              id: raw.id,
              character_id: raw.character_id,
              title: raw.title,
              description: raw.description,
              difficulty: raw.difficulty,
              task_type: raw.task_type,
              recurrence,
              target_count: raw.target_count ?? 1,
              is_archived: raw.is_archived,
              created_at: raw.created_at,
              updated_at: raw.updated_at,
              metric_type: raw.metric_type,
              metric_label: raw.metric_label,
              base_value: numOrNull(raw.base_value),
              increment_per_star: numOrNull(raw.increment_per_star),
              sub_id: raw.sub_id,
              dimension_id: dimensionForSub(raw.sub_id),
            },
            completedThisDay: completionCountThisDay.get(raw.id) ?? 0,
          };
        });

      const totalXp = completions.reduce((s, c) => s + c.xpGranted, 0);
      const totalCoins = completions.reduce((s, c) => s + c.coinsGranted, 0);

      return { dateKey, completions, openTasks, totalXp, totalCoins };
    },
  });
}
