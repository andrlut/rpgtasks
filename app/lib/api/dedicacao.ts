import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { DimensionId, SubId } from '@/lib/db/types';
import type { WeekStart } from '@/lib/settings';
import { DIMENSION_ORDER, SUB_META, SUBS_BY_DIM } from '@/theme/dimensions';

interface CompletionSubRow {
  completed_at: string;
  task_completion_sub: { sub_id: string; xp_granted: number | null }[] | null;
}

export interface SubXp {
  subId: SubId;
  totalXp: number;
}

export type Granularity = 'week' | 'month' | 'quarter' | 'all';

export interface WindowSpec {
  granularity: Granularity;
  /** 0 = current period, 1 = previous, 2 = two ago, … (only meaningful when granularity != 'all'). */
  offset: number;
}

export interface SubWindow {
  subId: SubId;
  windowXp: number;
  /** Cumulative XP at the end of each bucket. Same bucket layout as the
   *  parent dim — drives the per-sub sparkline inside the expanded card. */
  cumulative: number[];
}

export interface DimWindow {
  dimId: DimensionId;
  windowXp: number;
  prevWindowXp: number;
  /** Cumulative XP at the end of each bucket (always non-decreasing). */
  cumulative: number[];
  /** Window XP per sub, in SUBS_BY_DIM order. Drives the expand-card breakdown. */
  perSub: SubWindow[];
}

export interface WindowComputation {
  spec: WindowSpec;
  start: Date;
  end: Date;
  prevStart: Date | null;
  prevEnd: Date | null;
  bucketStarts: Date[];
  bucketSize: 'day' | 'week' | 'month';
}

export interface WindowResult {
  spec: WindowSpec;
  start: Date;
  end: Date;
  prevStart: Date | null;
  prevEnd: Date | null;
  bucketSize: 'day' | 'week' | 'month';
  bucketCount: number;
  totalXp: number;
  prevTotalXp: number;
  perDim: DimWindow[];
}

export const dedicacaoKeys = {
  all: ['dedicacao'] as const,
  totalXpBySub: () => [...dedicacaoKeys.all, 'totalXpBySub'] as const,
  window: (spec: WindowSpec, weekStart: WeekStart) =>
    [
      ...dedicacaoKeys.all,
      'window',
      spec.granularity,
      spec.offset,
      weekStart,
    ] as const,
};

/**
 * All-time XP grouped by subattribute. Kept for the Avaliação hex (which
 * still reads an all-time SHAPE). Dedicação proper uses the windowed
 * variant below.
 */
export function useTotalXpBySub() {
  return useQuery({
    queryKey: dedicacaoKeys.totalXpBySub(),
    queryFn: async (): Promise<SubXp[]> => {
      const { data, error } = await supabase
        .from('task_completion')
        .select('task_completion_sub(sub_id, xp_granted)');
      if (error) throw error;

      const totals = new Map<SubId, number>();
      for (const dim of DIMENSION_ORDER) {
        for (const sub of SUBS_BY_DIM[dim]) totals.set(sub, 0);
      }

      for (const row of (data ?? []) as {
        task_completion_sub: CompletionSubRow['task_completion_sub'];
      }[]) {
        for (const tcs of row.task_completion_sub ?? []) {
          const subId = tcs.sub_id as SubId;
          const xp = tcs.xp_granted ?? 0;
          totals.set(subId, (totals.get(subId) ?? 0) + xp);
        }
      }

      return [...totals.entries()].map(([subId, totalXp]) => ({
        subId,
        totalXp,
      }));
    },
  });
}

// ── Date helpers ──────────────────────────────────────────────────────────

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function endOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(23, 59, 59, 999);
  return out;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(d.getDate() + n);
  return out;
}

function startOfWeek(d: Date, weekStart: WeekStart): Date {
  const out = startOfDay(d);
  const dow = out.getDay();
  const offset = weekStart === 'sunday' ? dow : (dow + 6) % 7;
  out.setDate(out.getDate() - offset);
  return out;
}

function startOfMonth(d: Date): Date {
  return startOfDay(new Date(d.getFullYear(), d.getMonth(), 1));
}

function endOfMonth(d: Date): Date {
  return endOfDay(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

/**
 * Compute the date window + bucket layout for a given spec.
 *
 * - week: 7 daily buckets (Mon-Sun or Sun-Sat per weekStart).
 * - month: daily buckets across the calendar month (28-31).
 * - quarter: 12 weekly buckets ending at the current week's start.
 * - all: 12 monthly buckets ending at the current month.
 */
export function computeWindow(
  spec: WindowSpec,
  weekStart: WeekStart,
  now: Date = new Date(),
): WindowComputation {
  const { granularity, offset } = spec;

  if (granularity === 'week') {
    const curStart = startOfWeek(now, weekStart);
    const start = addDays(curStart, -7 * offset);
    const end = endOfDay(addDays(start, 6));
    const prevStart = addDays(start, -7);
    const prevEnd = endOfDay(addDays(prevStart, 6));
    const bucketStarts = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    return { spec, start, end, prevStart, prevEnd, bucketStarts, bucketSize: 'day' };
  }

  if (granularity === 'month') {
    const anchor = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const start = startOfMonth(anchor);
    const end = endOfMonth(anchor);
    const prevAnchor = new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1);
    const prevStart = startOfMonth(prevAnchor);
    const prevEnd = endOfMonth(prevAnchor);
    const daysInMonth =
      Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
    const bucketStarts = Array.from({ length: daysInMonth }, (_, i) =>
      addDays(start, i),
    );
    return { spec, start, end, prevStart, prevEnd, bucketStarts, bucketSize: 'day' };
  }

  if (granularity === 'quarter') {
    // 12 weekly buckets, anchored to the current week's start.
    const curWeek = startOfWeek(now, weekStart);
    const endWeekStart = addDays(curWeek, -7 * 12 * offset);
    const start = addDays(endWeekStart, -7 * 11);
    const end = endOfDay(addDays(endWeekStart, 6));
    const prevStart = addDays(start, -7 * 12);
    const prevEnd = endOfDay(addDays(prevStart, 7 * 12 - 1));
    const bucketStarts = Array.from({ length: 12 }, (_, i) =>
      addDays(start, 7 * i),
    );
    return { spec, start, end, prevStart, prevEnd, bucketStarts, bucketSize: 'week' };
  }

  // granularity === 'all' — 12 monthly buckets ending at the current month.
  // No prev window: "Total" doesn't compare to anything.
  const curMonth = startOfMonth(now);
  const start = addMonths(curMonth, -11);
  const end = endOfMonth(curMonth);
  const bucketStarts = Array.from({ length: 12 }, (_, i) =>
    addMonths(start, i),
  );
  return {
    spec,
    start,
    end,
    prevStart: null,
    prevEnd: null,
    bucketStarts,
    bucketSize: 'month',
  };
}

/**
 * Find which bucket index `date` falls into, given an array of bucket start
 * dates and a bucket size. Returns -1 if outside any bucket.
 */
function bucketIndex(
  date: Date,
  bucketStarts: Date[],
  bucketSize: 'day' | 'week' | 'month',
): number {
  if (bucketStarts.length === 0) return -1;
  const first = bucketStarts[0];
  if (date < first) return -1;
  if (bucketSize === 'day') {
    const idx = Math.floor((date.getTime() - first.getTime()) / 86400000);
    return idx >= 0 && idx < bucketStarts.length ? idx : -1;
  }
  if (bucketSize === 'week') {
    const idx = Math.floor(
      (date.getTime() - first.getTime()) / (7 * 86400000),
    );
    return idx >= 0 && idx < bucketStarts.length ? idx : -1;
  }
  // month — scan; only 12 entries.
  for (let i = 0; i < bucketStarts.length; i++) {
    const next = i === bucketStarts.length - 1 ? null : bucketStarts[i + 1];
    if (next ? date < next : true) return i;
  }
  return -1;
}

/**
 * Per-dimension windowed XP: total in window, total in prior window (for
 * delta), and cumulative XP per bucket (for sparklines).
 *
 * Pulls task_completion rows in [prevStart, end] (one round trip) and
 * bucketizes on the client. Fine at current scale; promote to a SECURITY
 * DEFINER RPC if/when per-user completions cross ~10k rows.
 */
export function useDedicacaoWindow(spec: WindowSpec, weekStart: WeekStart) {
  return useQuery({
    queryKey: dedicacaoKeys.window(spec, weekStart),
    queryFn: async (): Promise<WindowResult> => {
      const comp = computeWindow(spec, weekStart);
      const queryStart = comp.prevStart ?? comp.start;

      const { data, error } = await supabase
        .from('task_completion')
        .select('completed_at, task_completion_sub(sub_id, xp_granted)')
        .gte('completed_at', queryStart.toISOString())
        .lte('completed_at', comp.end.toISOString());
      if (error) throw error;

      const perDimAgg = new Map<
        DimensionId,
        { window: number; prev: number; perBucket: number[] }
      >();
      const perSubAgg = new Map<SubId, { window: number; perBucket: number[] }>();
      for (const dim of DIMENSION_ORDER) {
        perDimAgg.set(dim, {
          window: 0,
          prev: 0,
          perBucket: Array(comp.bucketStarts.length).fill(0),
        });
        for (const sub of SUBS_BY_DIM[dim]) {
          perSubAgg.set(sub, {
            window: 0,
            perBucket: Array(comp.bucketStarts.length).fill(0),
          });
        }
      }

      let totalXp = 0;
      let prevTotalXp = 0;

      for (const row of (data ?? []) as CompletionSubRow[]) {
        const completedAt = new Date(row.completed_at);
        const subRows = row.task_completion_sub ?? [];

        const inPrev =
          comp.prevStart !== null &&
          comp.prevEnd !== null &&
          completedAt >= comp.prevStart &&
          completedAt <= comp.prevEnd;
        const inWindow =
          completedAt >= comp.start && completedAt <= comp.end;

        const bucketIdx = inWindow
          ? bucketIndex(completedAt, comp.bucketStarts, comp.bucketSize)
          : -1;

        for (const tcs of subRows) {
          const subMeta = SUB_META[tcs.sub_id as SubId];
          if (!subMeta) continue;
          const xp = tcs.xp_granted ?? 0;
          if (xp <= 0) continue;
          const agg = perDimAgg.get(subMeta.dimensionId);
          if (!agg) continue;

          if (inWindow) {
            agg.window += xp;
            totalXp += xp;
            if (bucketIdx >= 0) agg.perBucket[bucketIdx] += xp;
            const subId = tcs.sub_id as SubId;
            const subAgg = perSubAgg.get(subId);
            if (subAgg) {
              subAgg.window += xp;
              if (bucketIdx >= 0) subAgg.perBucket[bucketIdx] += xp;
            }
          } else if (inPrev) {
            agg.prev += xp;
            prevTotalXp += xp;
          }
        }
      }

      const perDim: DimWindow[] = DIMENSION_ORDER.map((dimId) => {
        const agg = perDimAgg.get(dimId)!;
        const cumulative: number[] = [];
        let running = 0;
        for (const v of agg.perBucket) {
          running += v;
          cumulative.push(running);
        }
        const perSub: SubWindow[] = SUBS_BY_DIM[dimId].map((subId) => {
          const subAgg = perSubAgg.get(subId);
          const subCumulative: number[] = [];
          let subRunning = 0;
          for (const v of subAgg?.perBucket ?? []) {
            subRunning += v;
            subCumulative.push(subRunning);
          }
          return {
            subId,
            windowXp: subAgg?.window ?? 0,
            cumulative: subCumulative,
          };
        });
        return {
          dimId,
          windowXp: agg.window,
          prevWindowXp: agg.prev,
          cumulative,
          perSub,
        };
      });

      return {
        spec,
        start: comp.start,
        end: comp.end,
        prevStart: comp.prevStart,
        prevEnd: comp.prevEnd,
        bucketSize: comp.bucketSize,
        bucketCount: comp.bucketStarts.length,
        totalXp,
        prevTotalXp,
        perDim,
      };
    },
  });
}
