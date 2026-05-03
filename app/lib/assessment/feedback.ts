import type { DimensionId, SubId } from '@/lib/db/types';
import { DIMENSION_META, SUBS_BY_DIM } from '@/theme/dimensions';

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

export function bucketForDelta(delta: number): FeedbackBucket {
  if (delta <= -3) return 'attention_overestimating';
  if (delta < 0) return 'slight_overestimate';
  if (delta === 0) return 'aligned';
  if (delta < 3) return 'slight_underestimate';
  return 'attention_underestimating';
}

const TEMPLATES: Record<FeedbackBucket, (label: string) => string> = {
  attention_overestimating: (l) =>
    `Você se vê melhor em ${l} do que a âncora sugere. Vale uma olhada honesta.`,
  slight_overestimate: (l) =>
    `Razoável em ${l}, mas talvez um leve ajuste pra baixo na sua percepção.`,
  aligned: (l) => `Calibrado em ${l} — sua percepção bate com a âncora.`,
  slight_underestimate: (l) =>
    `Bom em ${l} — talvez você esteja sendo um pouco duro consigo mesmo.`,
  attention_underestimating: (l) =>
    `Você se subestima em ${l}. Reconhece o que tá funcionando.`,
};

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
    message: TEMPLATES[bucket](DIMENSION_META[dim].label),
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
