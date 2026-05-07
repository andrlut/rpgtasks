import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  PsychScore,
  PsychSession,
  PsychStartSessionResult,
  PsychSubmitSessionResult,
  SubId,
} from '@/lib/db/types';
import { supabase } from '@/lib/supabase';

import { characterKeys } from './character';
import { questionnaireKeys } from './questionnaire';

export const psychKeys = {
  all: ['psych'] as const,
  lastSession: (instrumentId: string) =>
    [...psychKeys.all, 'last', instrumentId] as const,
  scores: (sessionId: string) =>
    [...psychKeys.all, 'scores', sessionId] as const,
};

/**
 * Start a psych session — server creates the row, samples items per the
 * instrument's seeding policy (avaliacao_v2 picks 1 of 2 per leaf facet),
 * and returns the items in display order.
 *
 * The mutation form (instead of a query) reflects the side effect: every
 * call creates a new row. The screen calls it once when the user taps
 * "Começar".
 */
export function useStartPsychSession() {
  return useMutation({
    mutationFn: async (
      instrumentId: string,
    ): Promise<PsychStartSessionResult> => {
      const { data, error } = await supabase.rpc('start_psych_session', {
        p_instrument_id: instrumentId,
      });
      if (error) throw error;
      return data as PsychStartSessionResult;
    },
  });
}

/** Submit answers and finalize a psych session. Returns server-computed
 * scores. Invalidates character + last-session caches. */
export function useSubmitPsychSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      sessionId: string;
      answers: { item_id: string; raw_value: number }[];
      durationSeconds: number;
    }): Promise<PsychSubmitSessionResult> => {
      const { data, error } = await supabase.rpc('submit_psych_session', {
        p_session_id: params.sessionId,
        p_answers: params.answers,
        p_duration_seconds: params.durationSeconds,
      });
      if (error) throw error;
      return data as PsychSubmitSessionResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: characterKeys.me() });
      qc.invalidateQueries({ queryKey: psychKeys.all });
      // The legacy questionnaire hooks watch ['questionnaire']; keep them
      // in sync so the AvaliacaoPanel "last anchor" hint refreshes.
      qc.invalidateQueries({ queryKey: questionnaireKeys.all });
    },
  });
}

/**
 * Most recent completed psych session for a given instrument, or null.
 * Used by AvaliacaoPanel to compute the "{n}d atrás" hint without caring
 * which version (v1 vs v2) actually wrote the row.
 */
export function useLastPsychSession(instrumentId: string) {
  return useQuery({
    queryKey: psychKeys.lastSession(instrumentId),
    queryFn: async (): Promise<PsychSession | null> => {
      const { data, error } = await supabase
        .from('psych_session')
        .select('*')
        .eq('instrument_id', instrumentId)
        .eq('is_complete', true)
        .order('taken_at', { ascending: false })
        .limit(1);
      if (error) throw error;
      return ((data?.[0] as PsychSession) ?? null);
    },
  });
}

/**
 * Most recent completed wellbeing psych session across v1 OR v2. Picks the
 * newest of the two so any UI computing "days since" works regardless of
 * which version the user took.
 */
export function useLastWellbeingSession() {
  return useQuery({
    queryKey: [...psychKeys.all, 'last-wellbeing'] as const,
    queryFn: async (): Promise<PsychSession | null> => {
      const { data, error } = await supabase
        .from('psych_session')
        .select('*')
        .in('instrument_id', ['avaliacao_v1', 'avaliacao_v2'])
        .eq('is_complete', true)
        .order('taken_at', { ascending: false })
        .limit(1);
      if (error) throw error;
      return ((data?.[0] as PsychSession) ?? null);
    },
  });
}

/** Score rows for one session, keyed by facet_id. */
export function useSessionScores(sessionId: string | undefined) {
  return useQuery({
    queryKey: sessionId
      ? psychKeys.scores(sessionId)
      : [...psychKeys.all, 'scores', 'none'],
    enabled: !!sessionId,
    queryFn: async (): Promise<PsychScore[]> => {
      if (!sessionId) return [];
      const { data, error } = await supabase
        .from('psych_score')
        .select('*')
        .eq('session_id', sessionId);
      if (error) throw error;
      return (data ?? []) as PsychScore[];
    },
  });
}

/**
 * Pull just the per-sub decimal scores out of a list of psych_score rows.
 * Filters by facet_id pattern: the parent (sub-level) facets are named
 * `<instrument>:sub:<subId>` — exactly one colon-segment after `sub`.
 * Leaf facets like `<instrument>:sub:<subId>:<facetType>` are skipped.
 */
export function pickSubDecimalScores(
  scores: PsychScore[],
): Map<SubId, number> {
  const map = new Map<SubId, number>();
  for (const s of scores) {
    // Examples:
    //   avaliacao_v2:sub:sleep            → parent (keep)
    //   avaliacao_v2:sub:sleep:behavior   → leaf (skip)
    //   avaliacao_v1:sub:sleep            → v1 parent-equivalent (keep)
    const parts = s.facet_id.split(':');
    if (parts.length !== 3 || parts[1] !== 'sub') continue;
    const subId = parts[2] as SubId;
    map.set(subId, Number(s.score_decimal));
  }
  return map;
}
