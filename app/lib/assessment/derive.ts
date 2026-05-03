import type { SubId } from '@/lib/db/types';

import { QUESTIONS, type QuestionId } from './questions';

/** Map of QuestionId → raw answer (1..5). */
export type AnswerMap = Map<QuestionId, number>;

/**
 * Derive 0..5 sub scores from raw 1..5 answers.
 *
 * Math (mirrors the SQL submit_questionnaire RPC):
 *   per question: normalized = (raw - 1) / 4   [reverse: raw = 6 - raw first]
 *   per sub:      score      = floor(mean(normalized) * 5)   clamped [0,5]
 *
 * Subs with no answers in the map are simply absent from the result.
 *
 * Sanity checks (verified by reading; no test runner in this project):
 *   (1,1) → mean 0.0  → 0
 *   (3,3) → mean 0.5  → 2   (floor(2.5) per round-down spec)
 *   (4,4) → mean 0.75 → 3   (floor(3.75))
 *   (5,5) → mean 1.0  → 5
 *   (5,4) → mean 0.875 → 4
 *   (5,3) → mean 0.75  → 3
 *   reverse with raw=2 → adjusted=4 → normalized=0.75
 */
export function deriveScoresFromAnswers(
  answers: AnswerMap,
): Map<SubId, number> {
  const buckets = new Map<SubId, number[]>();

  for (const q of QUESTIONS) {
    const raw = answers.get(q.id as QuestionId);
    if (raw === undefined) continue;
    const adjusted = q.reverse ? 6 - raw : raw;
    const normalized = (adjusted - 1) / 4;
    const arr = buckets.get(q.sub_id) ?? [];
    arr.push(normalized);
    buckets.set(q.sub_id, arr);
  }

  const scores = new Map<SubId, number>();
  for (const [sub, arr] of buckets) {
    if (arr.length === 0) continue;
    const mean = arr.reduce((s, n) => s + n, 0) / arr.length;
    const score = Math.max(0, Math.min(5, Math.floor(mean * 5)));
    scores.set(sub, score);
  }
  return scores;
}

/**
 * Build the JSONB payload the submit_questionnaire RPC expects.
 * Entries are skipped for questions the user did not answer (the UI should
 * force completion, but this keeps the function defensive).
 */
export interface QuestionnaireRpcPayloadEntry {
  question_id: string;
  sub_id: SubId;
  raw_value: number;
  reverse: boolean;
}

export function buildRpcPayload(
  answers: AnswerMap,
): QuestionnaireRpcPayloadEntry[] {
  const out: QuestionnaireRpcPayloadEntry[] = [];
  for (const q of QUESTIONS) {
    const raw = answers.get(q.id as QuestionId);
    if (raw === undefined) continue;
    out.push({
      question_id: q.id,
      sub_id: q.sub_id,
      raw_value: raw,
      reverse: q.reverse ?? false,
    });
  }
  return out;
}
