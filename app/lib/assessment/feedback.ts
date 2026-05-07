import type { DimensionId, SubId } from '@/lib/db/types';
import { translate } from '@/lib/i18n';
import { getDimMeta } from '@/lib/i18n/meta';
import { SUBS_BY_DIM } from '@/theme/dimensions';

/**
 * 5-bucket comparison between the user's self-assessment and the questionnaire
 * snapshot. Computed at the dim level (sa + sb, range 0..10) so the user gets
 * 6 verdicts to react to instead of 12 — matches the chosen feedback granularity.
 *
 * Δ = q_dim_score - s_dim_score  (integer in [-10, 10])
 *
 *   Δ ≤ -3  attention_overestimating  — sees self much better than the anchor
 *   Δ ∈ {-1, -2}  slight_overestimate
 *   Δ = 0   aligned
 *   Δ ∈ {1, 2}  slight_underestimate
 *   Δ ≥ 3   attention_underestimating  — sees self much worse than the anchor
 */
export type FeedbackBucket =
  | 'attention_overestimating'
  | 'slight_overestimate'
  | 'aligned'
  | 'slight_underestimate'
  | 'attention_underestimating';

export interface DimFeedback {
  dim: DimensionId;
  /** q - s, integer in [-10, 10]. */
  delta: number;
  bucket: FeedbackBucket;
  message: string;
  /** True when |Δ| ≥ 3 — used to highlight rows in the result screen. */
  needsAttention: boolean;
}

/**
 * Δ = questionnaire dim score - self dim score (decimal in [-10, 10]).
 *
 *   |Δ| <= 0.5         aligned             — within sub-rating noise
 *   0.5 < |Δ| <= 1.5   slight over/under   — worth a small adjustment
 *   |Δ| > 1.5          attention over/under — worth a real second look
 *
 * The tolerance band (0.5) is intentionally loose: subjective self-rating
 * has rounding noise, and reacting to every 0.1 difference would feel
 * nagging rather than honest. The deep-dive band starts at 1.5 — a real
 * signal on a 0-10 scale.
 */
export function bucketForDelta(delta: number): FeedbackBucket {
  const abs = Math.abs(delta);
  if (abs <= 0.5) return 'aligned';
  if (abs <= 1.5)
    return delta < 0 ? 'slight_overestimate' : 'slight_underestimate';
  return delta < 0
    ? 'attention_overestimating'
    : 'attention_underestimating';
}

/**
 * Render the per-bucket feedback line. Reads the message template from the
 * i18n catalog and the dim label from the same source so the whole sentence
 * agrees on the locale at render time.
 */
function renderFeedbackLine(bucket: FeedbackBucket, dim: DimensionId): string {
  return translate(`questionnaire.result.feedback.${bucket}`, {
    label: getDimMeta(dim).label,
  });
}

/**
 * Sum a sub-score map up to a single dim score (sa + sb). Missing subs count
 * as 0 — same as the hex chart's rendering rule.
 */
export function dimScoreFromSubs(
  scores: Map<SubId, number>,
  dim: DimensionId,
): number {
  const [a, b] = SUBS_BY_DIM[dim];
  return (scores.get(a) ?? 0) + (scores.get(b) ?? 0);
}

export function feedbackForDim(
  dim: DimensionId,
  selfDimScore: number,
  questionnaireDimScore: number,
): DimFeedback {
  const delta = questionnaireDimScore - selfDimScore;
  const bucket = bucketForDelta(delta);
  return {
    dim,
    delta,
    bucket,
    message: renderFeedbackLine(bucket, dim),
    needsAttention:
      bucket === 'attention_overestimating' ||
      bucket === 'attention_underestimating',
  };
}

/**
 * Compute feedback for all 6 dims given two sub-score maps. The result is
 * sorted by |Δ| descending so the most surprising deltas surface first. Ties
 * keep the canonical dim order from DIMENSION_ORDER.
 */
export function feedbackForAllDims(
  selfScores: Map<SubId, number>,
  questionnaireScores: Map<SubId, number>,
): DimFeedback[] {
  const out: DimFeedback[] = [];
  for (const dim of Object.keys(SUBS_BY_DIM) as DimensionId[]) {
    out.push(
      feedbackForDim(
        dim,
        dimScoreFromSubs(selfScores, dim),
        dimScoreFromSubs(questionnaireScores, dim),
      ),
    );
  }
  return out.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}
