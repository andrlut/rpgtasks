import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { HexChart } from '@/components/HexChart';
import { SegmentedControl } from '@/components/SegmentedControl';
import type { CharacterSubScore, SubId } from '@/lib/db/types';
import { pickSubScores } from '@/lib/api/character';
import {
  daysSince,
  useLastQuestionnaireSession,
} from '@/lib/api/questionnaire';
import { tokens } from '@/theme';
import { SUB_META } from '@/theme/dimensions';

type HexSource = 'self' | 'both' | 'questionnaire';

const QUESTIONNAIRE_COLOR = '#4DD0FF';

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
  const [hexSource, setHexSource] = useState<HexSource>('self');
  // Match the old (pre-pillars) sizing: bleed slightly beyond page padding
  // for visual presence, capped so it doesn't blow up on tablets.
  const chartSize = Math.max(240, Math.min((screenWidth || 360) - 16, 360));

  const selfScores = useMemo(
    () => pickSubScores(subScores, 'self'),
    [subScores],
  );
  const questionnaireScores = useMemo(
    () => pickSubScores(subScores, 'questionnaire'),
    [subScores],
  );
  const hasQuestionnaire = questionnaireScores.size > 0;

  // Map the segment selection to (primary, secondary) score maps.
  const { primary, secondary } = useMemo(() => {
    if (!hasQuestionnaire || hexSource === 'self') {
      return { primary: selfScores, secondary: undefined };
    }
    if (hexSource === 'questionnaire') {
      return { primary: questionnaireScores, secondary: undefined };
    }
    // both
    return { primary: selfScores, secondary: questionnaireScores };
  }, [hasQuestionnaire, hexSource, selfScores, questionnaireScores]);

  const lastTaken = lastSession.data?.taken_at ?? null;
  const sinceDays = daysSince(lastTaken);
  const questionnaireLabel =
    sinceDays === null
      ? 'Fazer questionário (~10 min)'
      : sinceDays === 0
        ? 'Refazer questionário · feito hoje'
        : `Refazer questionário · ${sinceDays}d atrás`;

  const weakest = useMemo<{ subId: SubId; score: number } | null>(() => {
    if (selfScores.size === 0) return null;
    let pick: { subId: SubId; score: number } | null = null;
    for (const [subId, score] of selfScores.entries()) {
      if (!pick || score < pick.score) pick = { subId, score };
    }
    return pick;
  }, [selfScores]);

  return (
    <View style={styles.wrap}>
      {hasQuestionnaire && (
        <View style={styles.toggleWrap}>
          <SegmentedControl<HexSource>
            value={hexSource}
            onChange={setHexSource}
            options={[
              { value: 'self', label: 'Self' },
              { value: 'both', label: 'Both' },
              { value: 'questionnaire', label: 'Quiz' },
            ]}
          />
          {hexSource === 'both' && (
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: tokens.brand.violet2 },
                  ]}
                />
                <Text style={styles.legendText}>Self</Text>
              </View>
              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: QUESTIONNAIRE_COLOR },
                  ]}
                />
                <Text style={styles.legendText}>Questionário</Text>
              </View>
            </View>
          )}
        </View>
      )}

      <View style={styles.hexWrap}>
        <HexChart
          scores={primary}
          secondaryScores={secondary}
          secondaryColor={QUESTIONNAIRE_COLOR}
          size={chartSize}
        />
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
  toggleWrap: {
    gap: tokens.space[2],
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: tokens.space[4],
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    color: tokens.text.mid,
    letterSpacing: 0.3,
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
