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
  /** Current self-assessment score for this sub (0-5). */
  selfScore: number;
  /** History entries for this sub, oldest → newest, for the sparkline. */
  history: Pick<AssessmentLogEntry, 'score' | 'recorded_at'>[];
  /** Templates filtered to this sub. */
  templates: TaskTemplate[];
}

/** Generic 1-line insight per score band. Same tone for everyone — no
 *  personalization for now (user asked: "keep it simple"). */
const SCORE_INSIGHT: Record<number, string> = {
  0: 'Não rastreado ainda. Começa com 1 task pequena.',
  1: 'Atenção. Uma task diária aqui muda o jogo.',
  2: 'Abaixo da linha de base. Vale aumentar foco.',
  3: 'Sólido. Mantém a consistência.',
  4: 'Forte. Próximo passo: uma skill avançada.',
  5: 'Mastery. Expanda os limites com quests longas.',
};

/**
 * Self-contained block describing one sub-attribute of a dimension.
 *
 * Layout (top to bottom):
 *   - Header: icon + label + dim eyebrow
 *   - Description (the main reading content)
 *   - Examples — task_template rows tappable to adopt
 *   - Score chip + sparkline + 1-line insight at the end
 *
 * The user's actual tasks/skills are intentionally NOT listed here; this
 * is a descriptive surface, not a productivity dashboard. Adoption from
 * the catalog is the only write action.
 */
export function SubBlock({ subId, selfScore, history, templates }: Props) {
  const startFromTemplate = useStartTaskFromTemplate();
  const [adopted, setAdopted] = useState<Set<string>>(new Set());

  const subMeta = SUB_META[subId];
  const dimMeta = DIMENSION_META[subMeta.dimensionId];

  const trendValues = history.slice(-20).map((h) => h.score);
  const insight = SCORE_INSIGHT[Math.max(0, Math.min(5, selfScore))];

  const handleAdopt = (templateId: string) => {
    if (adopted.has(templateId) || startFromTemplate.isPending) return;
    startFromTemplate.mutate(templateId, {
      onSuccess: () => {
        setAdopted((prev) => new Set(prev).add(templateId));
      },
    });
  };

  return (
    <View style={[styles.card, { borderColor: `${dimMeta.color}33` }]}>
      <View style={styles.header}>
        <View style={[styles.iconHalo, { backgroundColor: dimMeta.bg }]}>
          <Ionicons
            name={subMeta.iconName as never}
            size={18}
            color={dimMeta.color}
          />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.eyebrow, { color: dimMeta.color }]}>
            {subMeta.label.toUpperCase()}
          </Text>
        </View>
      </View>

      <Text style={styles.description}>{subMeta.description}</Text>

      {templates.length > 0 && (
        <View style={styles.templatesBlock}>
          <Text style={styles.templatesEyebrow}>Tasks recomendadas</Text>
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
                  <View style={styles.templateMeta}>
                    <Text style={styles.templateMetaText}>
                      {recurrenceLabel(t.task_type)} ·{' '}
                      {'★'.repeat(t.difficulty)}
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.adoptBadge,
                    isAdopted && {
                      backgroundColor: 'rgba(61,214,140,0.15)',
                      borderColor: 'rgba(61,214,140,0.35)',
                    },
                  ]}
                >
                  <Ionicons
                    name={isAdopted ? 'checkmark' : 'add'}
                    size={14}
                    color={
                      isAdopted ? tokens.semantic.xp2 : dimMeta.color
                    }
                  />
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      <View style={styles.insightBlock}>
        <View style={styles.insightTop}>
          <View
            style={[styles.scorePill, { backgroundColor: dimMeta.color }]}
          >
            <Text style={styles.scoreValue}>{selfScore}</Text>
            <Text style={styles.scoreScale}>/5</Text>
          </View>
          <Text style={[styles.scoreLabel, { color: dimMeta.color }]}>
            {SUB_SCORE_LABELS[selfScore]}
          </Text>
          {trendValues.length >= 2 && (
            <Sparkline
              values={trendValues}
              max={5}
              width={56}
              height={16}
              color={dimMeta.color}
            />
          )}
        </View>
        <Text style={styles.insightText}>{insight}</Text>
      </View>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
  },
  iconHalo: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 13,
    letterSpacing: 1.4,
  },
  description: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
    lineHeight: 21,
    color: tokens.text.base,
  },
  templatesBlock: {
    gap: tokens.space[2],
    paddingTop: tokens.space[2],
    borderTopWidth: 1,
    borderTopColor: tokens.border.divider,
  },
  templatesEyebrow: {
    ...tokens.type.eyebrow,
    color: tokens.text.mid,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
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
    marginTop: 2,
  },
  templateMetaText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    color: tokens.text.dim,
    letterSpacing: 0.4,
  },
  adoptBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: tokens.border.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightBlock: {
    paddingTop: tokens.space[2],
    borderTopWidth: 1,
    borderTopColor: tokens.border.divider,
    gap: tokens.space[2],
  },
  insightTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
  },
  scorePill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: tokens.space[2],
    paddingVertical: 4,
    borderRadius: tokens.radius.pill,
    gap: 1,
  },
  scoreValue: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 14,
    color: tokens.text.hi,
  },
  scoreScale: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
    color: 'rgba(255,255,255,0.7)',
  },
  scoreLabel: {
    flex: 1,
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  insightText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    lineHeight: 17,
    color: tokens.text.mid,
    fontStyle: 'italic',
  },
});
