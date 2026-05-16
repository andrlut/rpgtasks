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
import type { CharacterSubScore, SubId } from '@/lib/db/types';
import { pickSubScores, pickSubScoresDecimal } from '@/lib/api/character';
import { useLastWellbeingSession } from '@/lib/api/psych';
import { daysSince } from '@/lib/api/questionnaire';
import { useT } from '@/lib/i18n';
import { useMetaLookup } from '@/lib/i18n/meta';
import { tokens } from '@/theme';
import { SUB_META } from '@/theme/dimensions';

type HexSource = 'self' | 'both' | 'questionnaire';

const QUESTIONNAIRE_COLOR = '#4DD0FF';

interface SourceToggleProps {
  value: HexSource;
  onChange: (v: HexSource) => void;
}

/**
 * Compact 3-icon source toggle — Self · Both · Quiz. Inline (~110px wide)
 * so it doesn't crowd the hex with a full-width SegmentedControl row.
 */
function SourceToggle({ value, onChange }: SourceToggleProps) {
  const items: {
    key: HexSource;
    icon: 'person' | 'git-compare' | 'clipboard';
    color: string;
    label: string;
  }[] = [
    { key: 'self', icon: 'person', color: tokens.brand.violet2, label: 'Self' },
    { key: 'both', icon: 'git-compare', color: tokens.text.hi, label: 'Both' },
    { key: 'questionnaire', icon: 'clipboard', color: QUESTIONNAIRE_COLOR, label: 'Quiz' },
  ];
  return (
    <View style={toggleStyles.row}>
      {items.map((it) => {
        const active = it.key === value;
        return (
          <Pressable
            key={it.key}
            onPress={() => onChange(it.key)}
            style={({ pressed }) => [
              toggleStyles.btn,
              active && { backgroundColor: `${it.color}25`, borderColor: it.color },
              pressed && { opacity: 0.75 },
            ]}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={it.label}
          >
            <Ionicons
              name={it.icon}
              size={14}
              color={active ? it.color : tokens.text.dim}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const toggleStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 4,
  },
  btn: {
    width: 36,
    height: 28,
    borderRadius: tokens.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: tokens.border.base,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
});

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
 * Quiet by design: no XP, no Momentum, no confetti.
 */
export function AvaliacaoPanel({ subScores }: Props) {
  const router = useRouter();
  const { t } = useT();
  const metaLookup = useMetaLookup();
  const { width: screenWidth } = useWindowDimensions();
  const lastSession = useLastWellbeingSession();
  const [hexSource, setHexSource] = useState<HexSource>('self');
  // Match the old (pre-pillars) sizing: bleed slightly beyond page padding
  // for visual presence, capped so it doesn't blow up on tablets.
  const chartSize = Math.max(240, Math.min((screenWidth || 360) - 16, 360));

  const selfScores = useMemo(
    () => pickSubScores(subScores, 'self'),
    [subScores],
  );
  // Decimal precision when available (rows written by avaliacao_v2+) so
  // the hex's vertex labels render `Sleep 3.8` instead of `Sleep 3`.
  const questionnaireScores = useMemo(
    () => pickSubScoresDecimal(subScores, 'questionnaire'),
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
      ? t('avaliacao.questionnaireFirst')
      : sinceDays === 0
        ? t('avaliacao.questionnaireToday')
        : t('avaliacao.questionnaireDaysAgo', { count: sinceDays });

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
      <View style={styles.hexWrap}>
        <HexChart
          scores={primary}
          secondaryScores={secondary}
          secondaryColor={QUESTIONNAIRE_COLOR}
          size={chartSize}
          onDimPress={(dim) =>
            router.push({ pathname: '/dimension/[id]', params: { id: dim } })
          }
        />
        {hasQuestionnaire && (
          <View style={styles.toggleOverlay} pointerEvents="box-none">
            <SourceToggle value={hexSource} onChange={setHexSource} />
          </View>
        )}
      </View>

      {weakest && weakest.score < 5 && (
        <Pressable
          onPress={() =>
            router.push({
              pathname: '/dimension/[id]',
              params: { id: SUB_META[weakest.subId].dimensionId },
            })
          }
          style={({ pressed }) => [styles.nudge, pressed && { opacity: 0.7 }]}
          hitSlop={4}
        >
          <View style={styles.nudgeInner}>
            <Text style={styles.nudgeText}>
              <Text style={styles.nudgeStrong}>
                {metaLookup.sub(weakest.subId).label}
              </Text>{' '}
              {t('avaliacao.nudgeSuffix', { score: weakest.score })}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={14}
              color={tokens.brand.violet2}
            />
          </View>
        </Pressable>
      )}

      <Pressable
        onPress={() => router.push('/self-assessment')}
        style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}
        hitSlop={4}
      >
        <Text style={styles.ctaText}>{t('avaliacao.selfAssessmentCta')}</Text>
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

      {hasQuestionnaire && (
        <Pressable
          onPress={() => router.push('/profile-mirror')}
          style={({ pressed }) => [
            styles.ctaSecondary,
            pressed && { opacity: 0.85 },
          ]}
          hitSlop={4}
        >
          <Ionicons name="person-circle" size={14} color={tokens.brand.violet2} />
          <Text style={styles.ctaSecondaryText}>{t('avaliacao.mirrorCta')}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: tokens.space[3],
  },
  hexWrap: {
    alignItems: 'center',
    position: 'relative',
  },
  toggleOverlay: {
    position: 'absolute',
    top: 0,
    right: 4,
  },
  nudge: {
    backgroundColor: 'rgba(155, 130, 255, 0.08)',
    borderLeftWidth: 2,
    borderLeftColor: tokens.brand.violet2,
    paddingHorizontal: tokens.space[3],
    paddingVertical: tokens.space[2],
    borderRadius: tokens.radius.sm,
  },
  nudgeInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
  },
  nudgeText: {
    flex: 1,
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
