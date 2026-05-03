import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Sparkline } from '@/components/Sparkline';
import type {
  AssessmentLogEntry,
  SubId,
  TaskTemplate,
} from '@/lib/db/types';
import { useStartTaskFromTemplate } from '@/lib/api/tasks';
import { tokens } from '@/theme';
import { DIMENSION_META, SUB_META, SUB_SCORE_LABELS } from '@/theme/dimensions';

interface Props {
  subId: SubId;
  selfScore: number;
  history: Pick<AssessmentLogEntry, 'score' | 'recorded_at'>[];
  templates: TaskTemplate[];
  /** Which side of the crest this panel sits on. Drives the tonal accent
   *  (subtle gradient direction + corner ornament position). */
  side?: 'left' | 'right';
}

const SCORE_INSIGHT: Record<number, string> = {
  0: 'Não rastreado ainda. Começa com 1 task pequena.',
  1: 'Atenção. Uma task diária aqui muda o jogo.',
  2: 'Abaixo da linha de base. Vale aumentar foco.',
  3: 'Sólido. Mantém a consistência.',
  4: 'Forte. Próximo passo: uma skill avançada.',
  5: 'Mastery. Expanda os limites com quests longas.',
};

/**
 * Detailed panel for ONE sub-attribute.
 *
 * Visual hierarchy (top → bottom):
 *   - Header strip: sub icon halo + label + side ornament
 *   - Big score (score / 5) + tier label + sparkline
 *   - 5-segment progress bar (tier markers)
 *   - Description (italic, secondary)
 *   - Tasks list (recommended templates, adoptable)
 *
 * Used inside the new dimension detail screen, where two of these sit
 * side-by-side on either side of the crest divider, forming the visual
 * "split" between the two subs of the dimension.
 */
export function SubPanel({
  subId,
  selfScore,
  history,
  templates,
  side = 'left',
}: Props) {
  const startFromTemplate = useStartTaskFromTemplate();
  const [adopted, setAdopted] = useState<Set<string>>(new Set());

  const subMeta = SUB_META[subId];
  const dimMeta = DIMENSION_META[subMeta.dimensionId];
  const trendValues = history.slice(-20).map((h) => h.score);
  const insight = SCORE_INSIGHT[Math.max(0, Math.min(5, selfScore))];
  const tierLabel = SUB_SCORE_LABELS[Math.max(0, Math.min(5, selfScore))];

  const handleAdopt = (templateId: string) => {
    if (adopted.has(templateId) || startFromTemplate.isPending) return;
    startFromTemplate.mutate(templateId, {
      onSuccess: () => setAdopted((prev) => new Set(prev).add(templateId)),
    });
  };

  return (
    <View style={[styles.card, { borderColor: `${dimMeta.color}33` }]}>
      {/* corner ornament — heraldic flourish on the outer edge */}
      <View
        style={[
          styles.cornerOrnament,
          side === 'left' ? styles.cornerLeft : styles.cornerRight,
        ]}
      >
        <View
          style={[
            styles.ornamentDot,
            { backgroundColor: dimMeta.color },
          ]}
        />
        <View
          style={[
            styles.ornamentLine,
            { backgroundColor: `${dimMeta.color}55` },
          ]}
        />
      </View>

      {/* header */}
      <View style={styles.header}>
        <View
          style={[
            styles.iconHalo,
            { backgroundColor: dimMeta.bg, borderColor: `${dimMeta.color}55` },
          ]}
        >
          <Ionicons
            name={subMeta.iconName as never}
            size={22}
            color={dimMeta.color}
          />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.eyebrow, { color: dimMeta.color }]}>
            SUB-ATRIBUTO
          </Text>
          <Text style={styles.subTitle}>{subMeta.label}</Text>
        </View>
      </View>

      {/* score block */}
      <View style={styles.scoreRow}>
        <View style={styles.scoreLeft}>
          <View style={styles.scoreNumberRow}>
            <Text style={[styles.scoreNumber, { color: dimMeta.color }]}>
              {selfScore}
            </Text>
            <Text style={styles.scoreScale}>/5</Text>
          </View>
          <Text style={[styles.tierLabel, { color: dimMeta.color }]}>
            {tierLabel.toUpperCase()}
          </Text>
        </View>
        {trendValues.length >= 2 && (
          <View style={styles.sparklineWrap}>
            <Text style={styles.trendEyebrow}>TREND</Text>
            <Sparkline
              values={trendValues}
              max={5}
              width={88}
              height={28}
              color={dimMeta.color}
            />
          </View>
        )}
      </View>

      {/* 5-segment tier bar */}
      <View style={styles.segments}>
        {[1, 2, 3, 4, 5].map((i) => {
          const filled = i <= selfScore;
          return (
            <View
              key={i}
              style={[
                styles.segment,
                filled
                  ? { backgroundColor: dimMeta.color }
                  : { backgroundColor: `${dimMeta.color}1A` },
              ]}
            />
          );
        })}
      </View>

      <Text style={styles.description}>{subMeta.description}</Text>
      <Text style={styles.insight}>{insight}</Text>

      {/* tasks */}
      {templates.length > 0 && (
        <View style={styles.templatesBlock}>
          <View style={styles.templatesHeader}>
            <Ionicons
              name="flame"
              size={12}
              color={dimMeta.color}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.templatesEyebrow, { color: dimMeta.color }]}>
              TASKS RECOMENDADAS
            </Text>
          </View>
          {templates.map((t) => {
            const isAdopted = adopted.has(t.id);
            return (
              <Pressable
                key={t.id}
                onPress={() => handleAdopt(t.id)}
                disabled={isAdopted || startFromTemplate.isPending}
                style={({ pressed }) => [
                  styles.templateRow,
                  isAdopted && styles.templateRowAdopted,
                  pressed && !isAdopted && { opacity: 0.7 },
                ]}
                hitSlop={4}
              >
                <View style={styles.templateBody}>
                  <Text
                    style={[
                      styles.templateTitle,
                      isAdopted && { color: tokens.text.dim },
                    ]}
                    numberOfLines={1}
                  >
                    {t.title}
                  </Text>
                  {t.description && !isAdopted && (
                    <Text style={styles.templateDesc} numberOfLines={2}>
                      {t.description}
                    </Text>
                  )}
                  <Text style={styles.templateMeta}>
                    {recurrenceLabel(t.task_type)} · {'★'.repeat(t.difficulty)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.adoptBadge,
                    {
                      borderColor: isAdopted
                        ? 'rgba(61,214,140,0.35)'
                        : `${dimMeta.color}55`,
                      backgroundColor: isAdopted
                        ? 'rgba(61,214,140,0.15)'
                        : `${dimMeta.color}15`,
                    },
                  ]}
                >
                  <Ionicons
                    name={isAdopted ? 'checkmark' : 'add'}
                    size={16}
                    color={isAdopted ? tokens.semantic.xp2 : dimMeta.color}
                  />
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

function recurrenceLabel(taskType: 'one_shot' | 'daily' | 'weekly'): string {
  switch (taskType) {
    case 'one_shot':
      return 'Uma vez';
    case 'daily':
      return 'Diária';
    case 'weekly':
      return 'Semanal';
  }
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: tokens.bg.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1.5,
    padding: tokens.space[4],
    gap: tokens.space[3],
    position: 'relative',
    overflow: 'hidden',
  },
  cornerOrnament: {
    position: 'absolute',
    top: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: tokens.space[2],
  },
  cornerLeft: {
    left: 0,
    flexDirection: 'row',
  },
  cornerRight: {
    right: 0,
    flexDirection: 'row-reverse',
  },
  ornamentDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  ornamentLine: {
    width: 24,
    height: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    marginTop: tokens.space[2],
  },
  iconHalo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  eyebrow: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    letterSpacing: 1.2,
  },
  subTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 22,
    color: tokens.text.hi,
    letterSpacing: -0.3,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.space[3],
    paddingVertical: tokens.space[2],
  },
  scoreLeft: {
    gap: 2,
  },
  scoreNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  scoreNumber: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 56,
    lineHeight: 56,
    letterSpacing: -2,
  },
  scoreScale: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 18,
    color: tokens.text.dim,
  },
  tierLabel: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 12,
    letterSpacing: 1.4,
  },
  sparklineWrap: {
    alignItems: 'flex-end',
    gap: 4,
  },
  trendEyebrow: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
    color: tokens.text.dim,
    letterSpacing: 1,
  },
  segments: {
    flexDirection: 'row',
    gap: 6,
  },
  segment: {
    flex: 1,
    height: 8,
    borderRadius: 4,
  },
  description: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
    lineHeight: 21,
    color: tokens.text.base,
    marginTop: tokens.space[1],
  },
  insight: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    lineHeight: 17,
    color: tokens.text.mid,
    fontStyle: 'italic',
  },
  templatesBlock: {
    gap: tokens.space[2],
    paddingTop: tokens.space[3],
    borderTopWidth: 1,
    borderTopColor: tokens.border.divider,
  },
  templatesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  templatesEyebrow: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    letterSpacing: 1.3,
  },
  templateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space[3],
    paddingVertical: tokens.space[3],
    borderWidth: 1,
    borderColor: tokens.border.base,
  },
  templateRowAdopted: {
    opacity: 0.6,
  },
  templateBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  templateTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: tokens.text.hi,
  },
  templateDesc: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    lineHeight: 17,
    color: tokens.text.mid,
  },
  templateMeta: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    color: tokens.text.dim,
    letterSpacing: 0.4,
    marginTop: 2,
  },
  adoptBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
