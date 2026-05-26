import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import type { DimensionId, SubId } from '@/lib/db/types';
import { supabase } from '@/lib/supabase';
import { DIMENSION_ORDER, SUB_META, SUBS_BY_DIM } from '@/theme/dimensions';

/**
 * Filter state for the Dedicação history screen. Lives in URL params so
 * deep links (e.g. from the dim-card "Ver Body" link) preserve state.
 *
 * Empty sets mean "no filter on this axis" — i.e. include all. minXp = 0
 * means "no minimum" so the row threshold filter is also opt-in.
 */
export interface HistoryFilters {
  /** Inclusive start of range. */
  from: Date;
  /** Inclusive end of range. */
  to: Date;
  /** Dim ids to include — empty = all. */
  dims: Set<DimensionId>;
  /** Sub ids to include — empty = all. */
  subs: Set<SubId>;
  /** Minimum total XP per completion (inclusive). 0 = no minimum. */
  minXp: number;
}

export interface SubBreakdown {
  subId: SubId;
  xp: number;
}

export interface CompletionEntry {
  /** task_completion.id — stable key + future linking. */
  id: string;
  completedAt: Date;
  taskTitle: string;
  totalXp: number;
  subs: SubBreakdown[];
  /** Dim carrying the largest share of this completion's XP — used for
   *  color accents in the log row. Null when a completion has no sub
   *  breakdown (shouldn't happen with current write paths, but defensive). */
  dominantDimId: DimensionId | null;
}

export interface HistoryResult {
  entries: CompletionEntry[];
  /** Pre-bucketed XP per day for the heatmap. Key: 'YYYY-MM-DD' (local). */
  dailyTotals: Map<string, number>;
  /** Peak day's XP — used to scale the heatmap color ramp. */
  dailyMax: number;
  /** Sum of XP across all entries that survived filtering. */
  totalXp: number;
}

interface CompletionRow {
  id: string;
  completed_at: string;
  task: { title: string } | null;
  task_completion_sub: { sub_id: string; xp_granted: number | null }[] | null;
}

/** Round to local-tz YYYY-MM-DD — heatmap keys must align with user days. */
function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const historyKeys = {
  all: ['dedicacaoHistory'] as const,
  /** The range and the user are the only fetch dimensions; everything else
   *  (dims, subs, minXp) is computed client-side so the query stays cached
   *  across rapid filter toggles. */
  range: (from: string, to: string) =>
    [...historyKeys.all, 'range', from, to] as const,
};

/**
 * Pull every completion in [from, to] with task title + per-sub XP, then
 * apply the dim/sub/minXp filters in memory. Returns chronologically
 * sorted entries (newest first), a daily totals map for the heatmap, and
 * summary scalars.
 *
 * The DB roundtrip is keyed only on the date range — filter chips toggle
 * via memoization, no network. Fine while users have ~hundreds of
 * completions per month; promote to an RPC if/when we cross ~10k.
 */
export function useDedicacaoHistory(filters: HistoryFilters): {
  data: HistoryResult | undefined;
  isLoading: boolean;
  isRefetching: boolean;
  refetch: () => void;
} {
  const fromIso = filters.from.toISOString();
  const toIso = filters.to.toISOString();

  const query = useQuery({
    queryKey: historyKeys.range(fromIso, toIso),
    queryFn: async (): Promise<CompletionRow[]> => {
      const { data, error } = await supabase
        .from('task_completion')
        .select(
          'id, completed_at, task:task_id(title), task_completion_sub(sub_id, xp_granted)',
        )
        .gte('completed_at', fromIso)
        .lte('completed_at', toIso)
        .order('completed_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CompletionRow[];
    },
  });

  const data = useMemo<HistoryResult | undefined>(() => {
    if (!query.data) return undefined;
    const entries: CompletionEntry[] = [];
    const dailyTotals = new Map<string, number>();
    let totalXp = 0;
    let dailyMax = 0;

    const includeAllDims = filters.dims.size === 0;
    const includeAllSubs = filters.subs.size === 0;

    for (const row of query.data) {
      const subRows = row.task_completion_sub ?? [];

      // Aggregate per-sub for this completion, applying the sub/dim filters.
      const perDim = new Map<DimensionId, number>();
      const subs: SubBreakdown[] = [];
      let entryXp = 0;
      for (const tcs of subRows) {
        const subId = tcs.sub_id as SubId;
        const subMeta = SUB_META[subId];
        if (!subMeta) continue;
        const xp = tcs.xp_granted ?? 0;
        if (xp <= 0) continue;

        // Filters: dim must match if dim filter is on; sub must match if
        // sub filter is on.
        if (!includeAllDims && !filters.dims.has(subMeta.dimensionId)) {
          continue;
        }
        if (!includeAllSubs && !filters.subs.has(subId)) continue;

        subs.push({ subId, xp });
        entryXp += xp;
        perDim.set(
          subMeta.dimensionId,
          (perDim.get(subMeta.dimensionId) ?? 0) + xp,
        );
      }

      // Nothing in this completion passed the filters — drop it entirely.
      if (entryXp === 0) continue;
      if (entryXp < filters.minXp) continue;

      let dominantDimId: DimensionId | null = null;
      let dominantXp = 0;
      for (const [dim, xp] of perDim) {
        if (xp > dominantXp) {
          dominantXp = xp;
          dominantDimId = dim;
        }
      }

      const completedAt = new Date(row.completed_at);
      entries.push({
        id: row.id,
        completedAt,
        taskTitle: row.task?.title ?? '—',
        totalXp: entryXp,
        subs,
        dominantDimId,
      });

      totalXp += entryXp;
      const k = dayKey(completedAt);
      const next = (dailyTotals.get(k) ?? 0) + entryXp;
      dailyTotals.set(k, next);
      if (next > dailyMax) dailyMax = next;
    }

    return { entries, dailyTotals, dailyMax, totalXp };
  }, [query.data, filters.dims, filters.subs, filters.minXp]);

  return {
    data,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    refetch: () => query.refetch(),
  };
}

/** Re-export — caller-side enumerations of dims/subs. */
export const FILTER_DIM_ORDER = DIMENSION_ORDER;
export const FILTER_SUBS_BY_DIM = SUBS_BY_DIM;
export { dayKey };
