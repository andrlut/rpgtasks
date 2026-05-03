import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { HexChart } from '@/components/HexChart';
import type { CharacterSubScore, SubId } from '@/lib/db/types';
import { pickSubScores } from '@/lib/api/character';
import {
  daysSince,
  useLastQuestionnaireSession,
} from '@/lib/api/questionnaire';
import { tokens } from '@/theme';
import { SUB_META } from '@/theme/dimensions';

interface Props {
  subScores: CharacterSubScore[];
}

/**
 * Pillar 1 — Avaliação. Contemplative tone.
 *
 * No outer card frame: the hex chart is the visual splash and any extra
 * border around it competes with its own geometry. Tone signal lives in
 * the active PillarTab halo above. Layout is simply:
 *   - Hex (full bleed, sized to the screen)
 *   - Optional violet-bordered nudge surfacing the weakest sub
 *   - CTA to update self-assessment
 *
 * Quiet by design: no XP, no streak, no confetti.
 */
export function AvaliacaoPanel({ subScores }: Props) {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const lastSession = useLastQuestionnaireSession();
  // Match the old (pre-pillars) sizing: bleed slightly beyond page padding
  // for visual presence, capped so it doesn't blow up on tablets.
  const chartSize = Math.max(240, Math.min((screenWidth || 360) - 16, 360));

  const scores = useMemo(() => pickSubScores(subScores, 'self'), [subScores]);

  const lastTaken = lastSession.data?.taken_at ?? null;
  const sinceDays = daysSince(lastTaken);
  const questionnaireLabel =
    sinceDays === null
      ? 'Fazer questionário (~10 min)'
      : sinceDays === 0
        ? 'Refazer questionário · feito hoje'
        : `Refazer questionário · ${sinceDays}d atrás`;

  const weakest = useMemo<{ subId: SubId; score: number } | null>(() => {
    if (scores.size === 0) return null;
    let pick: { subId: SubId; score: number } | null = null;
    for (const [subId, score] of scores.entries()) {
      if (!pick || score < pick.score) pick = { subId, score };
    }
    return pick;
  }, [scores]);

  return (
    <View style={styles.wrap}>
      <View style={styles.hexWrap}>
        <HexChart scores={scores} size={chartSize} />
      </View>

      {weakest && weakest.score < 5 && (
        <View style={styles.nudge}>
          <Text style={styles.nudgeText}>
            <Text style={styles.nudgeStrong}>
              {SUB_META[weakest.subId].label}
            </Text>{' '}
            está em {weakest.score}/5 — vale criar uma quest pra mexer aí?
          </Text>
        </View>
      )}

      <Pressable
        onPress={() => router.push('/self-assessment')}
        style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}
        hitSlop={4}
      >
        <Text style={styles.ctaText}>Atualizar self-assessment</Text>
        <Ionicons name="arrow-forward" size={14} color={tokens.brand.violet2} />
      </Pressable>

      <Pressable
        onPress={() => router.push('/questionnaire')}
        style={({ pressed }) => [
          styles.ctaSecondary,
          pressed && { opacity: 0.85 },
        ]}
        hitSlop={4}
      >
        <Ionicons name="clipboard" size={14} color={tokens.brand.violet2} />
        <Text style={styles.ctaSecondaryText}>{questionnaireLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: tokens.space[3],
  },
  hexWrap: {
    alignItems: 'center',
  },
  nudge: {
    backgroundColor: 'rgba(155, 130, 255, 0.08)',
    borderLeftWidth: 2,
    borderLeftColor: tokens.brand.violet2,
    paddingHorizontal: tokens.space[3],
    paddingVertical: tokens.space[2],
    borderRadius: tokens.radius.sm,
  },
  nudgeText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    lineHeight: 17,
    color: tokens.text.base,
    fontStyle: 'italic',
  },
  nudgeStrong: {
    fontFamily: 'Manrope_800ExtraBold',
    color: tokens.text.hi,
    fontStyle: 'normal',
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: tokens.space[3],
    borderRadius: tokens.radius.md,
    backgroundColor: 'rgba(123, 92, 255, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(123, 92, 255, 0.30)',
  },
  ctaText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 13,
    letterSpacing: 0.3,
    color: tokens.brand.violet2,
  },
  ctaSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: tokens.space[3],
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(155, 130, 255, 0.22)',
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  ctaSecondaryText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    color: tokens.brand.violet2,
    letterSpacing: 0.3,
  },
});
