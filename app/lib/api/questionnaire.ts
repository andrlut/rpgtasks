import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  buildRpcPayload,
  type AnswerMap,
} from '@/lib/assessment/derive';
import type {
  AssessmentLogEntry,
  AssessmentSource,
  QuestionnaireAnswerRow,
  QuestionnaireSession,
  SubId,
} from '@/lib/db/types';
import { supabase } from '@/lib/supabase';

import { characterKeys } from './character';

export const questionnaireKeys = {
  all: ['questionnaire'] as const,
  lastSession: () => [...questionnaireKeys.all, 'last'] as const,
  session: (id: string) =>
    [...questionnaireKeys.all, 'session', id] as const,
  history: (subId: SubId, source: AssessmentSource) =>
    [...questionnaireKeys.all, 'history', subId, source] as const,
};

/**
 * Submit a completed questionnaire. Wraps the submit_questionnaire RPC,
 * returns the new session id. Invalidates character + questionnaire caches
 * so the hex chart and "last anchor" hint refresh.
 */
export function useSubmitQuestionnaire() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      answers: AnswerMap;
      durationSeconds: number;
    }): Promise<string> => {
      const payload = buildRpcPayload(params.answers);
      const { data, error } = await supabase.rpc('submit_questionnaire', {
        p_answers: payload,
        p_duration_seconds: params.durationSeconds,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: characterKeys.me() });
      qc.invalidateQueries({ queryKey: questionnaireKeys.all });
    },
  });
}

/** Most recent questionnaire session, or null if the user never took one. */
export function useLastQuestionnaireSession() {
  return useQuery({
    queryKey: questionnaireKeys.lastSession(),
    queryFn: async (): Promise<QuestionnaireSession | null> => {
      const { data, error } = await supabase
        .from('questionnaire_session')
        .select('*')
        .order('taken_at', { ascending: false })
        .limit(1);
      if (error) throw error;
      return ((data?.[0] as QuestionnaireSession) ?? null);
    },
  });
}

/** Days since the most recent questionnaire, or null if never taken. */
export function daysSince(taken_at: string | null | undefined): number | null {
  if (!taken_at) return null;
  const ms = Date.now() - new Date(taken_at).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

/** All raw answers for a given session, used by the "see past results" view. */
export function useQuestionnaireSessionDetail(sessionId: string | undefined) {
  return useQuery({
    queryKey: sessionId
      ? questionnaireKeys.session(sessionId)
      : [...questionnaireKeys.all, 'session', 'none'],
    enabled: !!sessionId,
    queryFn: async (): Promise<{
      session: QuestionnaireSession;
      answers: QuestionnaireAnswerRow[];
    } | null> => {
      if (!sessionId) return null;
      const { data: session, error: sErr } = await supabase
        .from('questionnaire_session')
        .select('*')
        .eq('id', sessionId)
        .single();
      if (sErr) throw sErr;
      const { data: answers, error: aErr } = await supabase
        .from('questionnaire_answer')
        .select('*')
        .eq('session_id', sessionId);
      if (aErr) throw aErr;
      return {
        session: session as QuestionnaireSession,
        answers: (answers ?? []) as QuestionnaireAnswerRow[],
      };
    },
  });
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
