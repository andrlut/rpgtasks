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
import type { WeekStart } from '@/lib/settings';
import { supabase } from '@/lib/supabase';
import { SUB_META } from '@/theme/dimensions';
import { rewardForTaskSubs } from '@/lib/xp';

import { characterKeys, type CharacterWithProfile } from './character';
import { historyKeys } from './history';
import { questKeys } from './quests';
import { momentumKeys } from './momentum';

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

/** Sort sub allocations by stars desc, then by sub_id asc as a stable
 *  tiebreaker. (Alphabetic label sort would have to bind to a locale; we
 *  don't need locale-correct ordering for what is a UI-level disambiguation.) */
function sortSubs(subs: TaskSub[]): TaskSub[] {
  return [...subs].sort((a, b) => {
    if (a.stars !== b.stars) return b.stars - a.stars;
    return a.sub_id.localeCompare(b.sub_id);
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

export interface TodayCompletedEntry {
  task: TaskWithSubs;
  /** Total completions logged today (≥ 1). */
  count: number;
  /** Most recent completion id — used by undo. */
  latestCompletionId: string;
  /** Sum of XP/coins across today's completions of this task. */
  totalXp: number;
  totalCoins: number;
}

export interface TodayActivity {
  /** Tasks the user logged at least one completion for today. */
  completed: TodayCompletedEntry[];
  /** Tasks explicitly skipped today. */
  skipped: TaskWithSubs[];
}

export interface PeriodActivity {
  /** Tasks completed at least once in the period, with latest completion id. */
  completed: { task: TaskWithSubs; latestCompletionId: string; count: number }[];
}

export interface HomeBuckets {
  today: TaskWithSubs[];
  thisWeek: TaskWithSubs[];
  thisMonth: TaskWithSubs[];
  oneTime: TaskWithSubs[];
  /** Roll-up of "what happened today" — feeds the drawer at the bottom. */
  todayActivity: TodayActivity;
  /** Weekly/monthly tasks completed at least once this week. Feeds the
   *  "Done this week" drawer on the Weekly tab. */
  weekActivity: PeriodActivity;
  /** One-shot tasks ever completed. Feeds the "Completed" drawer on the
   *  One-shot tab. */
  oneShotActivity: PeriodActivity;
}

function startOfThisWeek(weekStart: WeekStart): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay(); // 0=Sun..6=Sat
  const offset = weekStart === 'sunday' ? dow : (dow + 6) % 7;
  d.setDate(d.getDate() - offset);
  return d;
}

/** Last day of the user's configured week: Saturday if week starts Sunday,
 *  Sunday if week starts Monday. */
function isLastDayOfWeek(date: Date, weekStart: WeekStart): boolean {
  const dow = date.getDay();
  return weekStart === 'sunday' ? dow === 6 : dow === 0;
}

/** True when `date` is the final calendar day of its month. */
function isLastDayOfMonth(date: Date): boolean {
  const next = new Date(date);
  next.setDate(date.getDate() + 1);
  return next.getMonth() !== date.getMonth();
}

/** True when the week containing `date` (under the configured week start)
 *  is the last calendar week of `date`'s month — i.e. the end-of-month
 *  falls within [startOfWeek, startOfWeek + 6 days]. */
function isLastWeekOfMonth(date: Date, weekStart: WeekStart): boolean {
  const dow = date.getDay();
  const offset = weekStart === 'sunday' ? dow : (dow + 6) % 7;
  const startWeek = new Date(date);
  startWeek.setHours(0, 0, 0, 0);
  startWeek.setDate(date.getDate() - offset);
  const endWeek = new Date(startWeek);
  endWeek.setDate(startWeek.getDate() + 6);
  endWeek.setHours(23, 59, 59, 999);
  const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  lastDayOfMonth.setHours(12, 0, 0, 0);
  return lastDayOfMonth >= startWeek && lastDayOfMonth <= endWeek;
}

/** True when a monthly task's scheduled day-of-month falls within the
 *  current calendar week (under the user's configured week start). Used
 *  to escalate monthly tasks scheduled on a day in this week into the
 *  This Week bucket — even if the scheduled day already passed. Honors
 *  the day>28 fallback: for short months we treat the last day as the
 *  effective scheduled day. */
function scheduledMonthlyInThisWeek(
  day: number,
  today: Date,
  weekStart: WeekStart,
): boolean {
  const dow = today.getDay();
  const offset = weekStart === 'sunday' ? dow : (dow + 6) % 7;
  const startWeek = new Date(today);
  startWeek.setHours(0, 0, 0, 0);
  startWeek.setDate(today.getDate() - offset);
  for (let i = 0; i < 7; i++) {
    const d = new Date(startWeek);
    d.setDate(startWeek.getDate() + i);
    const lastDayThatMonth = new Date(
      d.getFullYear(),
      d.getMonth() + 1,
      0,
    ).getDate();
    const effectiveDay = Math.min(day, lastDayThatMonth);
    if (d.getDate() === effectiveDay) return true;
  }
  return false;
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


/** Local YYYY-MM-DD for the device's "today". Skip rows store dates,
 *  not timestamps. */
function todayLocalDateKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function fetchHomeBuckets(weekStartPref: WeekStart): Promise<HomeBuckets> {
  const today = new Date();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const weekStart = startOfThisWeek(weekStartPref);
  const monthStart = startOfThisMonth();
  const monthEnd = endOfThisMonth();
  const todayKey = todayLocalDateKey();

  const { data: tasks, error: taskErr } = await supabase
    .from('task')
    .select('*, task_sub(sub_id, stars)')
    .eq('is_archived', false)
    .order('created_at', { ascending: true });
  if (taskErr) throw taskErr;

  const allTasks = ((tasks ?? []) as TaskRow[]).map(mapTaskRow);

  const { data: completionsToday, error: compErr } = await supabase
    .from('task_completion')
    .select('id, task_id, xp_granted, coins_granted')
    .gte('completed_at', startOfToday.toISOString())
    .order('completed_at', { ascending: false });
  if (compErr) throw compErr;
  const doneToday = new Map<string, number>();
  // Drawer-data: latest completion id (first row, since desc order),
  // count, and per-task XP/coin sums for the day.
  const todayCompletionData = new Map<
    string,
    { latestId: string; xp: number; coins: number }
  >();
  (completionsToday ?? []).forEach((c) => {
    doneToday.set(c.task_id, (doneToday.get(c.task_id) ?? 0) + 1);
    const cur = todayCompletionData.get(c.task_id);
    if (cur) {
      cur.xp += c.xp_granted;
      cur.coins += c.coins_granted;
    } else {
      todayCompletionData.set(c.task_id, {
        latestId: c.id,
        xp: c.xp_granted,
        coins: c.coins_granted,
      });
    }
  });

  const { data: completionsWeek, error: weekErr } = await supabase
    .from('task_completion')
    .select('id, task_id, completed_at')
    .gte('completed_at', weekStart.toISOString())
    .order('completed_at', { ascending: false });
  if (weekErr) throw weekErr;
  const doneWeek = new Map<string, number>();
  /** Per-task: latest completion id this week + count. Drives the
   *  "Done this week" drawer on the Weekly tab. */
  const weekCompletionData = new Map<
    string,
    { latestId: string; count: number }
  >();
  (completionsWeek ?? []).forEach((c) => {
    doneWeek.set(c.task_id, (doneWeek.get(c.task_id) ?? 0) + 1);
    const cur = weekCompletionData.get(c.task_id);
    if (cur) {
      cur.count += 1;
    } else {
      // First row = most recent (desc order)
      weekCompletionData.set(c.task_id, { latestId: c.id, count: 1 });
    }
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
  /** Latest completion id per one-shot task — feeds the "Completed"
   *  drawer on the One-shot tab so the user can undo a one-off. */
  const oneShotCompletionData = new Map<string, { latestId: string }>();
  if (oneShotIds.length > 0) {
    const { data: anyComp, error: anyErr } = await supabase
      .from('task_completion')
      .select('id, task_id, completed_at')
      .in('task_id', oneShotIds)
      .order('completed_at', { ascending: false });
    if (anyErr) throw anyErr;
    (anyComp ?? []).forEach((c) => {
      everCompletedOneShots.add(c.task_id);
      if (!oneShotCompletionData.has(c.task_id)) {
        oneShotCompletionData.set(c.task_id, { latestId: c.id });
      }
    });
  }

  // Today's explicit skips — used to hide tasks the user opted out of.
  // Also fetch this-week/month skips so we can reduce period targets.
  const { data: skipsToday, error: skipTodayErr } = await supabase
    .from('task_skip')
    .select('task_id')
    .eq('skipped_for', todayKey);
  if (skipTodayErr) throw skipTodayErr;
  const skippedToday = new Set((skipsToday ?? []).map((s) => s.task_id));

  const weekStartKey = weekStart.toISOString().slice(0, 10);
  const monthStartKey = monthStart.toISOString().slice(0, 10);
  const monthEndKey = monthEnd.toISOString().slice(0, 10);

  const { data: skipsWeek, error: skipWeekErr } = await supabase
    .from('task_skip')
    .select('task_id')
    .gte('skipped_for', weekStartKey);
  if (skipWeekErr) throw skipWeekErr;
  const skippedWeek = new Map<string, number>();
  (skipsWeek ?? []).forEach((s) => {
    skippedWeek.set(s.task_id, (skippedWeek.get(s.task_id) ?? 0) + 1);
  });

  const { data: skipsMonth, error: skipMonthErr } = await supabase
    .from('task_skip')
    .select('task_id')
    .gte('skipped_for', monthStartKey)
    .lte('skipped_for', monthEndKey);
  if (skipMonthErr) throw skipMonthErr;
  const skippedMonth = new Map<string, number>();
  (skipsMonth ?? []).forEach((s) => {
    skippedMonth.set(s.task_id, (skippedMonth.get(s.task_id) ?? 0) + 1);
  });

  const buckets: HomeBuckets = {
    today: [],
    thisWeek: [],
    thisMonth: [],
    oneTime: [],
    todayActivity: { completed: [], skipped: [] },
    weekActivity: { completed: [] },
    oneShotActivity: { completed: [] },
  };

  // Build today activity drawer data first — relies on allTasks for hydration.
  const tasksById = new Map(allTasks.map((t) => [t.id, t]));
  for (const [taskId, data] of todayCompletionData.entries()) {
    const task = tasksById.get(taskId);
    if (!task) continue;
    buckets.todayActivity.completed.push({
      task,
      count: doneToday.get(taskId) ?? 1,
      latestCompletionId: data.latestId,
      totalXp: data.xp,
      totalCoins: data.coins,
    });
  }
  for (const skippedId of skippedToday) {
    const task = tasksById.get(skippedId);
    if (task) buckets.todayActivity.skipped.push(task);
  }

  // weekActivity: every weekly/monthly task with at least one completion
  // this week. Same shape as todayActivity.completed so the existing
  // CompletedBucket UI just works on the Weekly tab.
  for (const [taskId, info] of weekCompletionData.entries()) {
    const task = tasksById.get(taskId);
    if (!task) continue;
    if (task.recurrence.type !== 'weekly' && task.recurrence.type !== 'monthly') {
      continue;
    }
    buckets.weekActivity.completed.push({
      task,
      latestCompletionId: info.latestId,
      count: info.count,
    });
  }

  // oneShotActivity: every one-shot ever completed — feeds the
  // "Completed" drawer on the One-shot tab. Order matches the desc
  // sort from the fetch.
  for (const [taskId, info] of oneShotCompletionData.entries()) {
    const task = tasksById.get(taskId);
    if (!task) continue;
    buckets.oneShotActivity.completed.push({
      task,
      latestCompletionId: info.latestId,
      count: 1,
    });
  }

  for (const t of allTasks) {
    const todayCount = doneToday.get(t.id) ?? 0;
    const skippedTodayHere = skippedToday.has(t.id);

    if (t.recurrence.type === 'one_shot') {
      if (!everCompletedOneShots.has(t.id) && !skippedTodayHere) {
        buckets.oneTime.push(t);
      }
      continue;
    }

    if (t.recurrence.type === 'daily') {
      // Daily clears once today's target is met OR if explicitly skipped today.
      if (!skippedTodayHere && todayCount < t.target_count) {
        buckets.today.push(t);
      }
      continue;
    }

    // weekly / monthly: optional schedule decides Today promotion;
    // period target decides This Week / This Month presence.
    // Effective need = target - skips this period.
    const scheduledToday = isDueOn(t.recurrence, today);
    const scheduledPromote =
      scheduledToday && todayCount === 0 && !skippedTodayHere;

    if (t.recurrence.type === 'weekly') {
      const weekCount = doneWeek.get(t.id) ?? 0;
      const weekSkips = skippedWeek.get(t.id) ?? 0;
      // Effective target shrinks by skips: a 3×/week task with 1 skip
      // needs 2 more this week.
      const effectiveTarget = Math.max(0, t.target_count - weekSkips);
      const stillNeeded = weekCount < effectiveTarget;

      // Last-day promotion: when today is the final day of the user's
      // configured week and the task still owes completions, surface it
      // on Today instead of letting it sit in This Week until rollover.
      const lastDayPromote =
        stillNeeded &&
        isLastDayOfWeek(today, weekStartPref) &&
        todayCount === 0 &&
        !skippedTodayHere;

      if (scheduledPromote || lastDayPromote) {
        buckets.today.push(t);
      } else if (stillNeeded) {
        buckets.thisWeek.push(t);
      }
    } else {
      // monthly
      const monthCount = doneMonth.get(t.id) ?? 0;
      const monthSkips = skippedMonth.get(t.id) ?? 0;
      const effectiveTarget = Math.max(0, t.target_count - monthSkips);
      const stillNeeded = monthCount < effectiveTarget;

      // Escalation: tasks surface earlier as the deadline approaches.
      //   - last day of month (or scheduled day match) → Today
      //   - specific day scheduled within this week     → This Week
      //   - last calendar week of month                 → This Week
      //   - otherwise → falls to Recurring (no push here)
      const lastDayPromote =
        stillNeeded &&
        isLastDayOfMonth(today) &&
        todayCount === 0 &&
        !skippedTodayHere;
      const scheduledDayInWeek =
        stillNeeded &&
        t.recurrence.type === 'monthly' &&
        typeof t.recurrence.day === 'number' &&
        scheduledMonthlyInThisWeek(t.recurrence.day, today, weekStartPref);
      const lastWeekPromote =
        stillNeeded && isLastWeekOfMonth(today, weekStartPref);

      if (scheduledPromote || lastDayPromote) {
        buckets.today.push(t);
      } else if (scheduledDayInWeek || lastWeekPromote) {
        buckets.thisWeek.push(t);
      }
      // else: monthly task stays off the today/week buckets — the Home
      // screen will surface it under Recurring.
    }
  }

  // Tasks promoted to Today (scheduled day) shouldn't appear ALSO in
  // This Week — would be double-listing. Filter out any task already in
  // Today from the period bucket.
  const todayIds = new Set(buckets.today.map((t) => t.id));
  buckets.thisWeek = buckets.thisWeek.filter((t) => !todayIds.has(t.id));

  return buckets;
}

export function useHomeBuckets(weekStart: WeekStart = 'monday') {
  return useQuery({
    queryKey: [...taskKeys.pending(), weekStart],
    queryFn: () => fetchHomeBuckets(weekStart),
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
      completedAt?: string;
      completedLocalDate?: string;
    }): Promise<CompleteTaskResult> => {
      const { data, error } = await supabase.rpc('complete_task', {
        p_task_id: params.task.id,
        ...(params.completedAt ? { p_completed_at: params.completedAt } : {}),
        p_local_date: params.completedLocalDate ?? todayLocalDateKey(),
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

      const reward = rewardForTaskSubs(params.subs);

      // Optimistic removal from "pending today" only when:
      //   - it's a live tap (no completedAt), AND
      //   - the task's target is 1 (multi-target tasks need a refetch
      //     to know whether THIS tap closed out the day).
      const isLive = !params.completedAt;
      const t = params.task;
      const singleTarget = (t.target_count ?? 1) === 1;
      if (prevBuckets && isLive && singleTarget) {
        const removeFrom = (arr: TaskWithSubs[]) => arr.filter((x) => x.id !== t.id);
        // Preserve todayActivity as-is — onSettled refetch will rebuild
        // it with the new completion. Optimistic only handles "card
        // disappeared" feedback, drawer doesn't need to react instantly.
        queryClient.setQueryData<HomeBuckets>(taskKeys.pending(), {
          today: removeFrom(prevBuckets.today),
          thisWeek: removeFrom(prevBuckets.thisWeek),
          thisMonth: removeFrom(prevBuckets.thisMonth),
          oneTime: removeFrom(prevBuckets.oneTime),
          todayActivity: prevBuckets.todayActivity,
          weekActivity: prevBuckets.weekActivity,
          oneShotActivity: prevBuckets.oneShotActivity,
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
      queryClient.invalidateQueries({ queryKey: momentumKeys.me() });
      queryClient.invalidateQueries({ queryKey: historyKeys.all });
      queryClient.invalidateQueries({ queryKey: questKeys.active() });
    },
  });
}

// ─── Skip ────────────────────────────────────────────────────────────────

/** Skip a task for today (or a given local date). Hides it from Today /
 *  This Week / This Month bucket logic without logging a completion. No
 *  XP, no Momentum penalty. */
export function useSkipTaskToday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { taskId: string; date?: string }) => {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const userId = userData.user?.id;
      if (!userId) throw new Error('Not authenticated');
      const { error } = await supabase.from('task_skip').upsert(
        {
          task_id: params.taskId,
          character_id: userId,
          skipped_for: params.date ?? todayLocalDateKey(),
        },
        { onConflict: 'task_id,skipped_for' },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.pending() });
    },
  });
}

/** Undo a skip — reverses useSkipTaskToday. */
export function useUnskipTaskToday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { taskId: string; date?: string }) => {
      const { error } = await supabase
        .from('task_skip')
        .delete()
        .eq('task_id', params.taskId)
        .eq('skipped_for', params.date ?? todayLocalDateKey());
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.pending() });
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

/** Extended update input. When `dropTemplateLink` is true, the underlying
 *  UPDATE also nulls out `task.template_id` — used when the user has edited
 *  title/description/subs of a template-adopted task, which by product
 *  convention converts the task into a truly custom one (and, when free-tier
 *  limits land, counts the custom slot toward the limit). */
export interface TaskUpdateInput extends TaskFormInput {
  dropTemplateLink?: boolean;
}

export function useUpdateTask(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: TaskUpdateInput) => {
      const patch: Record<string, unknown> = {
        title: input.title,
        description: input.description,
        task_type: input.task_type,
        recurrence: input.recurrence,
        target_count: input.target_count,
      };
      if (input.dropTemplateLink) {
        patch.template_id = null;
      }
      const { error } = await supabase
        .from('task')
        .update(patch)
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
      queryClient.invalidateQueries({ queryKey: momentumKeys.me() });
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
 * Complete a system task_template **directly**, without first adopting it
 * into the user's personal task list. XP/coins/Momentum still accrue;
 * the resulting task_completion row has task_id=null and template_id set.
 *
 * Used by the "Geral" tab so users can mark a one-off thing they did
 * (e.g. "read 20 min today, but I don't read every day") without
 * cluttering their daily list with an adoption.
 */
export function useCompleteTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      templateId: string;
      subOverrides?: { sub_id: string; stars: number }[];
    }): Promise<{
      completion_id: string;
      xp_granted: number;
      coins_granted: number;
      total_stars: number;
    }> => {
      const { data, error } = await supabase.rpc('complete_template', {
        p_template_id: params.templateId,
        p_sub_overrides: params.subOverrides ?? null,
      });
      if (error) throw error;
      return data as {
        completion_id: string;
        xp_granted: number;
        coins_granted: number;
        total_stars: number;
      };
    },
    onSuccess: () => {
      // Same invalidations as complete_task — XP/coins/momentum surfaces
      // depend on these refreshing.
      queryClient.invalidateQueries({ queryKey: taskKeys.pending() });
      queryClient.invalidateQueries({ queryKey: characterKeys.me() });
      queryClient.invalidateQueries({ queryKey: ['momentum'] });
      queryClient.invalidateQueries({ queryKey: ['dedicacao'] });
    },
  });
}

/**
 * Atomically clone a task_template into the user's task list. Returns the
 * new task id. Invalidates task lists + character (so any quest progress
 * counters that depend on task list refresh).
 */
export interface StartTaskFromTemplateInput {
  templateId: string;
  /** Optional: override the template's default task_type. */
  taskTypeOverride?: 'daily' | 'weekly' | 'monthly' | 'one_shot';
  /** Optional: explicit recurrence object override (e.g. {type:'weekly', days:[1,3,5]}). */
  recurrenceOverride?: Record<string, unknown> | null;
  /** Optional: override per-period target count (e.g. 3 for "3x/week"). */
  targetCountOverride?: number;
}

export function useStartTaskFromTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: string | StartTaskFromTemplateInput,
    ): Promise<string> => {
      // Back-compat: callers that still pass a bare templateId string keep
      // working. New callers pass the object form with optional overrides.
      const payload: StartTaskFromTemplateInput =
        typeof input === 'string' ? { templateId: input } : input;

      const { data, error } = await supabase.rpc('start_task_from_template', {
        p_template_id: payload.templateId,
        p_task_type_override: payload.taskTypeOverride ?? null,
        p_recurrence_override: payload.recurrenceOverride ?? null,
        p_target_count_override: payload.targetCountOverride ?? null,
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
