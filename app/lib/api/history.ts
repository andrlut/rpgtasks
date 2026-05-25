import { useQuery } from '@tanstack/react-query';

import { dimensionForSub } from '@/lib/api/tasks';
import type {
  DimensionId,
  SubId,
  TaskSub,
  TaskWithSubs,
} from '@/lib/db/types';
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

interface CompletionTaskJoin {
  id: string;
  title: string;
}

interface CompletionSubJoin {
  sub_id: string;
  stars: number;
  xp_granted: number;
  coins_granted: number;
}

interface DailyCompletionRow {
  id: string;
  task_id: string;
  completed_at: string;
  xp_granted: number;
  coins_granted: number;
  total_stars: number;
  task_completion_sub: CompletionSubJoin[] | null;
  task: CompletionTaskJoin | null;
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
 * the History calendar heatmap. Per-dim XP comes from the per-sub
 * completion snapshots so multi-sub tasks split honestly across pillars.
 */
export function useDailySummary(from: Date, to: Date) {
  const fromIso = startOfLocalDay(from).toISOString();
  const toIso = endOfLocalDay(to).toISOString();

  return useQuery({
    queryKey: historyKeys.daily(fromIso, toIso),
    queryFn: async (): Promise<Map<string, DailySummaryEntry>> => {
      const { data: completions, error: compErr } = await supabase
        .from('task_completion')
        .select(
          'id, completed_at, xp_granted, coins_granted, task_completion_sub(sub_id, xp_granted)',
        )
        .gte('completed_at', fromIso)
        .lte('completed_at', toIso);
      if (compErr) throw compErr;

      const map = new Map<string, DailySummaryEntry>();
      ((completions ?? []) as unknown as Array<{
        id: string;
        completed_at: string;
        xp_granted: number;
        coins_granted: number;
        task_completion_sub: { sub_id: string; xp_granted: number }[] | null;
      }>).forEach((c) => {
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
        for (const subRow of c.task_completion_sub ?? []) {
          const dim = dimensionForSub(subRow.sub_id as SubId);
          entry.byDimension[dim] = (entry.byDimension[dim] ?? 0) + subRow.xp_granted;
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
  /** Per-sub stars actually used, pulled from the snapshot. */
  subs: TaskSub[];
  /** Sum of stars across subs (cached on the row). */
  totalStars: number;
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
  task: TaskWithSubs;
  completedThisDay: number;
}

export interface DayDetail {
  dateKey: string;
  completions: DayCompletion[];
  /** Active tasks not yet completed on this day — candidates for retro logging. */
  openTasks: OpenTaskOnDay[];
  /** Tasks skipped on this specific day (task_skip rows). Each entry is
   *  hydrated to the live task; rows whose task no longer exists are
   *  filtered out. Used by the History "Skipped" drawer and the day
   *  stats row. */
  skipped: TaskWithSubs[];
  totalXp: number;
  totalCoins: number;
}

interface TaskRowFull {
  id: string;
  character_id: string;
  title: string;
  description: string | null;
  task_type: 'one_shot' | 'daily' | 'weekly';
  recurrence: unknown;
  target_count: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  template_id: string | null;
  task_sub: { sub_id: string; stars: number }[] | null;
}

function hydrateTask(raw: TaskRowFull, recurrence: TaskWithSubs['recurrence']): TaskWithSubs {
  const subs: TaskSub[] = (raw.task_sub ?? [])
    .map((r) => ({
      sub_id: r.sub_id as SubId,
      stars: Math.max(1, Math.min(5, r.stars)) as TaskSub['stars'],
    }))
    .sort((a, b) => b.stars - a.stars);
  const primary = subs[0]?.sub_id ?? ('sleep' as SubId);
  const totalStars = subs.reduce((s, x) => s + x.stars, 0);
  return {
    id: raw.id,
    character_id: raw.character_id,
    title: raw.title,
    description: raw.description,
    task_type: raw.task_type,
    recurrence,
    target_count: raw.target_count ?? 1,
    is_archived: raw.is_archived,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
    template_id: raw.template_id,
    subs,
    primary_sub_id: primary,
    primary_dimension_id: dimensionForSub(primary),
    total_stars: totalStars,
  };
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
          'id, task_id, completed_at, xp_granted, coins_granted, total_stars, task_completion_sub(sub_id, stars, xp_granted, coins_granted), task:task_id(id, title)',
        )
        .gte('completed_at', fromIso)
        .lte('completed_at', toIso)
        .order('completed_at', { ascending: true });
      if (compErr) throw compErr;

      const compRows = (comps ?? []) as unknown as DailyCompletionRow[];

      const completions: DayCompletion[] = compRows.map((c) => {
        const subs: TaskSub[] = (c.task_completion_sub ?? [])
          .map((s) => ({
            sub_id: s.sub_id as SubId,
            stars: Math.max(1, Math.min(5, s.stars)) as TaskSub['stars'],
          }))
          .sort((a, b) => b.stars - a.stars);
        return {
          id: c.id,
          taskId: c.task_id,
          taskTitle: c.task?.title ?? '(deleted task)',
          subs,
          totalStars: c.total_stars ?? subs.reduce((s, x) => s + x.stars, 0),
          xpGranted: c.xp_granted,
          coinsGranted: c.coins_granted,
          completedAt: c.completed_at,
        };
      });

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
        .select('*, task_sub(sub_id, stars)')
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
            return !oneShotCompletedAnytime.has(raw.id);
          }
          if (!isDueOn(recurrence, date)) return false;
          const doneCount = completionCountThisDay.get(raw.id) ?? 0;
          return doneCount < (raw.target_count ?? 1);
        })
        .map(({ raw, recurrence }) => ({
          task: hydrateTask(raw, recurrence),
          completedThisDay: completionCountThisDay.get(raw.id) ?? 0,
        }));

      // Tasks the user explicitly skipped on this day. `skipped_for` is
      // a YYYY-MM-DD date column (not a timestamp), so we match on the
      // local-day key.
      const { data: skips, error: skipErr } = await supabase
        .from('task_skip')
        .select('task_id')
        .eq('skipped_for', dateKey);
      if (skipErr) throw skipErr;
      const skippedIds = new Set((skips ?? []).map((s) => s.task_id));
      const tasksById = new Map(
        taskRows.map((t) => [t.id, hydrateTask(t, parseRecurrence(t.recurrence))]),
      );
      const skipped: TaskWithSubs[] = [];
      for (const id of skippedIds) {
        const t = tasksById.get(id);
        if (t) skipped.push(t);
      }

      const totalXp = completions.reduce((s, c) => s + c.xpGranted, 0);
      const totalCoins = completions.reduce((s, c) => s + c.coinsGranted, 0);

      return { dateKey, completions, openTasks, skipped, totalXp, totalCoins };
    },
  });
}
