import { useQuery } from '@tanstack/react-query';

import type {
  AssessmentLogEntry,
  AssessmentSource,
  SubId,
} from '@/lib/db/types';
import { supabase } from '@/lib/supabase';

/**
 * Legacy "questionnaire" hook surface — kept for the assessment_log readers
 * (sparklines, history-all). The submission + last-session pathways now
 * live in lib/api/psych.ts; the v1 wrapper RPC (submit_questionnaire) and
 * the legacy questionnaire_session/answer tables still exist in the DB
 * for historical data, but no UI surface writes through them anymore.
 */

export const questionnaireKeys = {
  all: ['questionnaire'] as const,
  history: (subId: SubId, source: AssessmentSource) =>
    [...questionnaireKeys.all, 'history', subId, source] as const,
};

/** Days since the most recent questionnaire, or null if never taken. */
export function daysSince(taken_at: string | null | undefined): number | null {
  if (!taken_at) return null;
  const ms = Date.now() - new Date(taken_at).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

/**
 * All assessment_log entries for the user under a given source, grouped by
 * sub. Single round-trip variant of useAssessmentHistory — used by surfaces
 * that need to render sparklines for many subs at once (self-assessment).
 */
export function useAssessmentHistoryAll(source: AssessmentSource) {
  return useQuery({
    queryKey: [...questionnaireKeys.all, 'history-all', source] as const,
    queryFn: async (): Promise<
      Map<SubId, Pick<AssessmentLogEntry, 'score' | 'recorded_at'>[]>
    > => {
      const { data, error } = await supabase
        .from('assessment_log')
        .select('sub_id, score, recorded_at')
        .eq('source', source)
        .order('recorded_at', { ascending: true })
        .limit(2000);
      if (error) throw error;
      const map = new Map<
        SubId,
        Pick<AssessmentLogEntry, 'score' | 'recorded_at'>[]
      >();
      for (const r of data ?? []) {
        const sub = r.sub_id as SubId;
        const arr = map.get(sub) ?? [];
        arr.push({ score: r.score, recorded_at: r.recorded_at });
        map.set(sub, arr);
      }
      return map;
    },
  });
}

/**
 * Time-series of scores for one (sub, source) pair, oldest → newest, capped
 * at 180 entries. Powers the per-sub sparkline.
 */
export function useAssessmentHistory(
  subId: SubId,
  source: AssessmentSource,
) {
  return useQuery({
    queryKey: questionnaireKeys.history(subId, source),
    queryFn: async (): Promise<
      Pick<AssessmentLogEntry, 'score' | 'recorded_at'>[]
    > => {
      const { data, error } = await supabase
        .from('assessment_log')
        .select('score, recorded_at')
        .eq('sub_id', subId)
        .eq('source', source)
        .order('recorded_at', { ascending: true })
        .limit(180);
      if (error) throw error;
      return (data ?? []) as Pick<
        AssessmentLogEntry,
        'score' | 'recorded_at'
      >[];
    },
  });
}
