import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  DimensionId,
  Recurrence,
  SubId,
  TaskSub,
  TaskTemplateWithSubs,
  TaskWithSubs,
} from '@/lib/db/types';
import { isDueOn, parseRecurrence } from '@/lib/recurrence';
import { supabase } from '@/lib/supabase';
import { SUB_META } from '@/theme/dimensions';
import { rewardForTaskSubs } from '@/lib/xp';

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
  task_type: 'one_shot' | 'daily' | 'weekly';
  recurrence: Recurrence;
  target_count: number;
  /** N sub allocations, sum of stars 1..5 (DB-enforced via set_task_subs). */
  subs: TaskSub[];
}

// ─── Row shapes coming from PostgREST ────────────────────────────────────

interface TaskSubRow {
  sub_id: string;
  stars: number;
}

interface TaskRow {
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
  task_sub: TaskSubRow[] | null;
}

interface TaskTemplateRow {
  id: string;
  title: string;
  description: string | null;
  task_type: 'one_shot' | 'daily' | 'weekly';
  recurrence: unknown;
  target_count: number;
  sort_order: number;
  task_template_sub: TaskSubRow[] | null;
}

/** Resolve a sub's parent dim. Throws on unknown sub — should be impossible
 *  given the DB FK + NOT NULL constraint, but loud failure beats silent
 *  miscategorization. */
export function dimensionForSub(subId: SubId): DimensionId {
  const meta = SUB_META[subId];
  if (!meta) throw new Error(`Unknown sub_id: ${subId}`);
  return meta.dimensionId;
}

/** Sort sub allocations by stars desc, then by sub label asc — gives
 *  consistent visual order across the app. */
function sortSubs(subs: TaskSub[]): TaskSub[] {
  return [...subs].sort((a, b) => {
    if (a.stars !== b.stars) return b.stars - a.stars;
    const la = SUB_META[a.sub_id]?.label ?? a.sub_id;
    const lb = SUB_META[b.sub_id]?.label ?? b.sub_id;
    return la.localeCompare(lb);
  });
}

function pickPrimary(subs: TaskSub[]): SubId {
  // Caller should ensure at least one sub. Fallback to first SubId in catalog
  // would mask a bug, so throw instead.
  if (subs.length === 0) throw new Error('Task has no subs');
  return subs[0]!.sub_id;
}

function mapTaskRow(t: TaskRow): TaskWithSubs {
  const rawSubs: TaskSub[] = (t.task_sub ?? []).map((r) => ({
    sub_id: r.sub_id as SubId,
    stars: Math.max(1, Math.min(5, r.stars)) as TaskSub['stars'],
  }));
  const subs = sortSubs(rawSubs);
  const primarySub = subs.length > 0 ? pickPrimary(subs) : ('sleep' as SubId);
  const totalStars = subs.reduce((s, x) => s + x.stars, 0);
  return {
    id: t.id,
    character_id: t.character_id,
    title: t.title,
    description: t.description,
    task_type: t.task_type,
    recurrence: parseRecurrence(t.recurrence),
    target_count: t.target_count ?? 1,
    is_archived: t.is_archived,
    created_at: t.created_at,
    updated_at: t.updated_at,
    template_id: t.template_id,
    subs,
    primary_sub_id: primarySub,
    primary_dimension_id: dimensionForSub(primarySub),
    total_stars: totalStars,
  };
}

function mapTaskTemplateRow(t: TaskTemplateRow): TaskTemplateWithSubs {
  const rawSubs: TaskSub[] = (t.task_template_sub ?? []).map((r) => ({
    sub_id: r.sub_id as SubId,
    stars: Math.max(1, Math.min(5, r.stars)) as TaskSub['stars'],
  }));
  const subs = sortSubs(rawSubs);
  const primarySub = subs.length > 0 ? pickPrimary(subs) : ('sleep' as SubId);
  const totalStars = subs.reduce((s, x) => s + x.stars, 0);
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    task_type: t.task_type,
    recurrence: parseRecurrence(t.recurrence),
    target_count: t.target_count ?? 1,
    sort_order: t.sort_order,
    subs,
    primary_sub_id: primarySub,
    primary_dimension_id: dimensionForSub(primarySub),
    total_stars: totalStars,
  };
}

// ─── Home buckets ────────────────────────────────────────────────────────

export interface HomeBuckets {
  today: TaskWithSubs[];
  thisWeek: TaskWithSubs[];
  thisMonth: TaskWithSubs[];
  oneTime: TaskWithSubs[];
}

function startOfThisWeek(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return d;
}

function startOfThisMonth(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(1);
  return d;
}

function endOfThisMonth(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  d.setMonth(d.getMonth() + 1, 0);
  return d;
}


async function fetchHomeBuckets(): Promise<HomeBuckets> {
  const today = new Date();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const weekStart = startOfThisWeek();
  const monthStart = startOfThisMonth();
  const monthEnd = endOfThisMonth();

  const { data: tasks, error: taskErr } = await supabase
    .from('task')
    .select('*, task_sub(sub_id, stars)')
    .eq('is_archived', false)
    .order('created_at', { ascending: true });
  if (taskErr) throw taskErr;

  const allTasks = ((tasks ?? []) as TaskRow[]).map(mapTaskRow);

  const { data: completionsToday, error: compErr } = await supabase
    .from('task_completion')
    .select('task_id')
    .gte('completed_at', startOfToday.toISOString());
  if (compErr) throw compErr;
  const doneToday = new Map<string, number>();
  (completionsToday ?? []).forEach((c) => {
    doneToday.set(c.task_id, (doneToday.get(c.task_id) ?? 0) + 1);
  });

  const { data: completionsWeek, error: weekErr } = await supabase
    .from('task_completion')
    .select('task_id')
    .gte('completed_at', weekStart.toISOString());
  if (weekErr) throw weekErr;
  const doneWeek = new Map<string, number>();
  (completionsWeek ?? []).forEach((c) => {
    doneWeek.set(c.task_id, (doneWeek.get(c.task_id) ?? 0) + 1);
  });

  const { data: completionsMonth, error: monthErr } = await supabase
    .from('task_completion')
    .select('task_id')
    .gte('completed_at', monthStart.toISOString())
    .lte('completed_at', monthEnd.toISOString());
  if (monthErr) throw monthErr;
  const doneMonth = new Map<string, number>();
  (completionsMonth ?? []).forEach((c) => {
    doneMonth.set(c.task_id, (doneMonth.get(c.task_id) ?? 0) + 1);
  });

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

  const buckets: HomeBuckets = {
    today: [],
    thisWeek: [],
    thisMonth: [],
    oneTime: [],
  };

  for (const t of allTasks) {
    const todayCount = doneToday.get(t.id) ?? 0;

    if (t.recurrence.type === 'one_shot') {
      if (!everCompletedOneShots.has(t.id)) buckets.oneTime.push(t);
      continue;
    }

    if (t.recurrence.type === 'daily') {
      // Daily clears once today's target is met. Weekly/monthly only
      // need 1 completion today to clear from Today (the rest of the
      // period target is tracked in This Week/Month).
      if (todayCount < t.target_count) buckets.today.push(t);
      continue;
    }

    // weekly / monthly: optional schedule decides Today promotion;
    // period target decides This Week / This Month presence.
    const scheduledToday = isDueOn(t.recurrence, today);
    if (scheduledToday && todayCount === 0) {
      buckets.today.push(t);
    }

    if (t.recurrence.type === 'weekly') {
      const weekCount = doneWeek.get(t.id) ?? 0;
      if (weekCount < t.target_count) buckets.thisWeek.push(t);
    } else {
      // monthly
      const monthCount = doneMonth.get(t.id) ?? 0;
      if (monthCount < t.target_count) buckets.thisMonth.push(t);
    }
  }

  // Tasks promoted to Today (scheduled day) shouldn't appear ALSO in
  // This Week / This Month — would be double-listing. Filter out any
  // task already in Today from the period buckets.
  const todayIds = new Set(buckets.today.map((t) => t.id));
  buckets.thisWeek = buckets.thisWeek.filter((t) => !todayIds.has(t.id));
  buckets.thisMonth = buckets.thisMonth.filter((t) => !todayIds.has(t.id));

  return buckets;
}

export function useHomeBuckets() {
  return useQuery({
    queryKey: taskKeys.pending(),
    queryFn: fetchHomeBuckets,
  });
}

/** All non-archived tasks for the current user, ordered by creation. */
export function useActiveTasks() {
  return useQuery({
    queryKey: taskKeys.active(),
    queryFn: async (): Promise<TaskWithSubs[]> => {
      const { data, error } = await supabase
        .from('task')
        .select('*, task_sub(sub_id, stars)')
        .eq('is_archived', false)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return ((data ?? []) as TaskRow[]).map(mapTaskRow);
    },
  });
}

// ─── Completion ──────────────────────────────────────────────────────────

export interface CompleteTaskResult {
  completion_id: string;
  xp_granted: number;
  coins_granted: number;
  total_stars: number;
  streak_days: number;
  multiplier: number;
}

/**
 * complete_task RPC — fans out per sub. Optional sub_overrides lets the
 * user adjust per-sub stars at completion time (long-press popup). When
 * omitted, the task's default subs apply.
 *
 * Optimistic update: we drop the task from the buckets cache (single-target
 * only — multi-target tasks need a refetch) and bump character XP by the
 * computed total. Per-dim XP is bumped per sub.
 */
export function useCompleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      task: TaskWithSubs;
      /** Snapshot of the subs used for this completion (defaults to task.subs). */
      subs: TaskSub[];
      streakDays?: number;
      completedAt?: string;
    }): Promise<CompleteTaskResult> => {
      const { data, error } = await supabase.rpc('complete_task', {
        p_task_id: params.task.id,
        ...(params.completedAt ? { p_completed_at: params.completedAt } : {}),
        p_sub_overrides: params.subs.map((s) => ({
          sub_id: s.sub_id,
          stars: s.stars,
        })),
      });
      if (error) throw error;
      return data as CompleteTaskResult;
    },

    onMutate: async (params) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: taskKeys.pending() }),
        queryClient.cancelQueries({ queryKey: characterKeys.me() }),
      ]);

      const prevBuckets = queryClient.getQueryData<HomeBuckets>(taskKeys.pending());
      const prevChar = queryClient.getQueryData<CharacterWithProfile>(characterKeys.me());

      const reward = rewardForTaskSubs(params.subs, params.streakDays ?? 0);

      // Optimistic removal from "pending today" only when:
      //   - it's a live tap (no completedAt), AND
      //   - the task's target is 1 (multi-target tasks need a refetch
      //     to know whether THIS tap closed out the day).
      const isLive = !params.completedAt;
      const t = params.task;
      const singleTarget = (t.target_count ?? 1) === 1;
      if (prevBuckets && isLive && singleTarget) {
        const removeFrom = (arr: TaskWithSubs[]) => arr.filter((x) => x.id !== t.id);
        queryClient.setQueryData<HomeBuckets>(taskKeys.pending(), {
          today: removeFrom(prevBuckets.today),
          thisWeek: removeFrom(prevBuckets.thisWeek),
          thisMonth: removeFrom(prevBuckets.thisMonth),
          oneTime: removeFrom(prevBuckets.oneTime),
        });
      }

      if (prevChar) {
        // Bump per-dim XP by summing the subs that map to each dim.
        const dimDelta = new Map<DimensionId, number>();
        for (const ps of reward.perSub) {
          const dim = dimensionForSub(ps.sub_id);
          dimDelta.set(dim, (dimDelta.get(dim) ?? 0) + ps.xp);
        }
        queryClient.setQueryData<CharacterWithProfile>(characterKeys.me(), {
          ...prevChar,
          character: {
            ...prevChar.character,
            total_xp: prevChar.character.total_xp + reward.total.xp,
            coins: prevChar.character.coins + reward.total.coins,
          },
          dimensions: prevChar.dimensions.map((d) => {
            const delta = dimDelta.get(d.dimension_id) ?? 0;
            return delta === 0 ? d : { ...d, xp: d.xp + delta };
          }),
        });
      }

      return { prevBuckets, prevChar };
    },

    onError: (_err, _params, ctx) => {
      if (ctx?.prevBuckets) queryClient.setQueryData(taskKeys.pending(), ctx.prevBuckets);
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

// ─── CRUD ────────────────────────────────────────────────────────────────

export function useTask(id: string | null | undefined) {
  return useQuery({
    queryKey: id ? taskKeys.detail(id) : ['tasks', 'detail', 'none'],
    enabled: !!id,
    queryFn: async (): Promise<TaskWithSubs | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('task')
        .select('*, task_sub(sub_id, stars)')
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
          task_type: input.task_type,
          recurrence: input.recurrence,
          target_count: input.target_count,
        })
        .select('id')
        .single();
      if (error) throw error;
      const taskId = (data as { id: string }).id;

      const { error: subsErr } = await supabase.rpc('set_task_subs', {
        p_task_id: taskId,
        p_subs: input.subs.map((s) => ({ sub_id: s.sub_id, stars: s.stars })),
      });
      if (subsErr) throw subsErr;

      return taskId;
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
          task_type: input.task_type,
          recurrence: input.recurrence,
          target_count: input.target_count,
        })
        .eq('id', taskId);
      if (error) throw error;

      const { error: subsErr } = await supabase.rpc('set_task_subs', {
        p_task_id: taskId,
        p_subs: input.subs.map((s) => ({ sub_id: s.sub_id, stars: s.stars })),
      });
      if (subsErr) throw subsErr;
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

// ─── Templates ───────────────────────────────────────────────────────────

export function useTaskTemplates() {
  return useQuery({
    queryKey: taskKeys.templates(),
    queryFn: async (): Promise<TaskTemplateWithSubs[]> => {
      const { data, error } = await supabase
        .from('task_template')
        .select('*, task_template_sub(sub_id, stars)')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return ((data ?? []) as TaskTemplateRow[]).map(mapTaskTemplateRow);
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
