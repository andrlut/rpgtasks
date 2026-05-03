import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenBackground } from '@/components/ScreenBackground';
import { Sparkline } from '@/components/Sparkline';
import {
  pickSubScores,
  useCharacter,
  useSetSubScore,
} from '@/lib/api/character';
import { useAssessmentHistoryAll } from '@/lib/api/questionnaire';
import type { SubId } from '@/lib/db/types';
import { tokens } from '@/theme';
import {
  DIMENSION_META,
  DIMENSION_ORDER,
  SUB_META,
  SUBS_BY_DIM,
  SUB_SCORE_LABELS,
} from '@/theme/dimensions';

const SCORE_VALUES = [0, 1, 2, 3, 4, 5];

export default function SelfAssessmentScreen() {
  const router = useRouter();
  const character = useCharacter();
  const setSubScore = useSetSubScore();

  const selfScores = useMemo(
    () => pickSubScores(character.data?.subScores ?? [], 'self'),
    [character.data?.subScores],
  );
  const questionnaireScores = useMemo(
    () => pickSubScores(character.data?.subScores ?? [], 'questionnaire'),
    [character.data?.subScores],
  );
  const hasQuestionnaire = questionnaireScores.size > 0;
  const history = useAssessmentHistoryAll('self');

  const handleSetScore = (subId: SubId, score: number) => {
    if (selfScores.get(subId) === score) return;
    Haptics.selectionAsync().catch(() => {});
    setSubScore.mutate({ source: 'self', subId, score });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenBackground>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.closeBtn,
              pressed && { opacity: 0.6 },
            ]}
            hitSlop={10}
          >
            <Ionicons name="close" size={22} color={tokens.text.hi} />
          </Pressable>
          <Text style={styles.headerTitle}>Self-assessment</Text>
          <View style={styles.closeBtn} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.intro}>
            Where you stand in each area today. Tap a number to update — it
            saves automatically. Come back any time and re-rate yourself.
          </Text>

          <View style={styles.metaRow}>
            <View style={styles.scaleHint}>
              <Text style={styles.scaleHintText}>0 missing · 5 mastery</Text>
            </View>
            <View style={styles.sourceChip}>
              <Ionicons name="person" size={11} color={tokens.brand.violet2} />
              <Text style={styles.sourceChipText}>Self</Text>
            </View>
            {hasQuestionnaire && (
              <View
                style={[
                  styles.sourceChip,
                  { backgroundColor: 'rgba(77,208,255,0.12)' },
                ]}
              >
                <Ionicons name="clipboard" size={11} color={tokens.dimension.bonds} />
                <Text
                  style={[styles.sourceChipText, { color: tokens.dimension.bonds }]}
                >
                  Questionnaire saved
                </Text>
              </View>
            )}
          </View>

          {!hasQuestionnaire && (
            <View style={styles.qHintCard}>
              <Ionicons name="clipboard-outline" size={14} color={tokens.text.mid} />
              <Text style={styles.qHintText}>
                Questionnaire coming soon — it&apos;ll set a parallel score so you
                can compare your self-rating against an objective baseline.
              </Text>
            </View>
          )}

          {DIMENSION_ORDER.map((dim) => {
            const meta = DIMENSION_META[dim];
            const subIds = SUBS_BY_DIM[dim];
            const sa = selfScores.get(subIds[0]) ?? 0;
            const sb = selfScores.get(subIds[1]) ?? 0;
            const sum = sa + sb;

            return (
              <View key={dim} style={styles.dimSection}>
                <View
                  style={[
                    styles.dimHeader,
                    {
                      backgroundColor: meta.bg,
                      borderColor: `${meta.color}55`,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.dimIconWrap,
                      { backgroundColor: `${meta.color}33` },
                    ]}
                  >
                    <Ionicons
                      name={meta.iconName as never}
                      size={18}
                      color={meta.color}
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.dimLabel, { color: meta.color }]}>
                      {meta.label.toUpperCase()}
                    </Text>
                    <Text style={styles.dimTagline}>{meta.tagline}</Text>
                  </View>
                  <View style={[styles.dimSumPill, { backgroundColor: meta.color }]}>
                    <Text style={styles.dimSumText}>{sum}</Text>
                    <Text style={styles.dimSumScale}>/10</Text>
                  </View>
                </View>

                <Text style={styles.dimDescription}>{meta.description}</Text>

                {subIds.map((subId) => {
                  const subMeta = SUB_META[subId];
                  const score = selfScores.get(subId) ?? 0;
                  const qScore = questionnaireScores.get(subId);
                  const subHistory = history.data?.get(subId) ?? [];
                  // Last ~20 entries — enough to spot trend, narrow enough
                  // to plot at a tiny size without losing fidelity.
                  const trendValues = subHistory
                    .slice(-20)
                    .map((h) => h.score);
                  return (
                    <View key={subId} style={styles.subBlock}>
                      <View style={styles.subHeader}>
                        <Ionicons
                          name={subMeta.iconName as never}
                          size={14}
                          color={meta.color}
                        />
                        <Text style={styles.subLabel}>{subMeta.label}</Text>
                        {trendValues.length >= 2 && (
                          <Sparkline
                            values={trendValues}
                            max={5}
                            width={56}
                            height={16}
                            color={meta.color}
                          />
                        )}
                        <Text
                          style={[styles.subScoreLabel, { color: meta.color }]}
                        >
                          {SUB_SCORE_LABELS[score]}
                        </Text>
                      </View>
                      <Text style={styles.subDescription}>
                        {subMeta.description}
                      </Text>
                      {qScore !== undefined && (
                        <View style={styles.qScoreRow}>
                          <Ionicons
                            name="clipboard"
                            size={10}
                            color={tokens.dimension.bonds}
                          />
                          <Text style={styles.qScoreText}>
                            Questionnaire: {qScore}
                          </Text>
                        </View>
                      )}
                      <View style={styles.scaleRow}>
                        {SCORE_VALUES.map((v) => {
                          const active = v === score;
                          return (
                            <Pressable
                              key={v}
                              onPress={() => handleSetScore(subId, v)}
                              style={({ pressed }) => [
                                styles.scaleBtn,
                                active && {
                                  backgroundColor: meta.color,
                                  borderColor: meta.color,
                                },
                                pressed && { opacity: 0.75 },
                              ]}
                              hitSlop={6}
                            >
                              <Text
                                style={[
                                  styles.scaleBtnText,
                                  active && { color: tokens.text.hi },
                                ]}
                              >
                                {v}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}
              </View>
            );
          })}

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Saved automatically. Pull up the Hero tab any time to see the hex
              update.
            </Text>
          </View>
        </ScrollView>
      </ScreenBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.bg.deep },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[3],
    borderBottomWidth: 1,
    borderBottomColor: tokens.border.divider,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.bg.surface,
  },
  headerTitle: {
    ...tokens.type.h3,
    color: tokens.text.hi,
  },
  content: {
    padding: tokens.space[4],
    paddingBottom: tokens.space[8],
    gap: tokens.space[5],
  },
  intro: {
    ...tokens.type.body,
    color: tokens.text.mid,
  },
  scaleHint: {
    alignSelf: 'flex-start',
    paddingHorizontal: tokens.space[3],
    paddingVertical: 6,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.bg.surface,
    borderWidth: 1,
    borderColor: tokens.border.base,
  },
  scaleHintText: {
    ...tokens.type.caption,
    color: tokens.text.dim,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    fontSize: 10,
  },
  dimSection: {
    backgroundColor: tokens.bg.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.border.base,
    padding: tokens.space[4],
    gap: tokens.space[3],
  },
  dimHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    paddingHorizontal: tokens.space[3],
    paddingVertical: tokens.space[3],
    borderRadius: tokens.radius.md,
    borderWidth: 1,
  },
  dimIconWrap: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dimLabel: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 13,
    letterSpacing: 1,
  },
  dimTagline: {
    ...tokens.type.caption,
    color: tokens.text.mid,
    fontStyle: 'italic',
    marginTop: 2,
  },
  dimSumPill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    minWidth: 50,
    height: 32,
    paddingHorizontal: tokens.space[3],
    borderRadius: 16,
    justifyContent: 'center',
    gap: 1,
  },
  dimSumText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 16,
    color: tokens.text.hi,
  },
  dimSumScale: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
    color: 'rgba(255,255,255,0.7)',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    flexWrap: 'wrap',
  },
  sourceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: tokens.space[2],
    paddingVertical: 5,
    borderRadius: tokens.radius.pill,
    backgroundColor: 'rgba(123,92,255,0.14)',
  },
  sourceChipText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    color: tokens.brand.violet2,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  qHintCard: {
    flexDirection: 'row',
    gap: tokens.space[2],
    paddingHorizontal: tokens.space[3],
    paddingVertical: tokens.space[3],
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.bg.surface,
    borderWidth: 1,
    borderColor: tokens.border.base,
    borderStyle: 'dashed',
  },
  qHintText: {
    flex: 1,
    ...tokens.type.caption,
    color: tokens.text.mid,
  },
  qScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  qScoreText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    color: tokens.dimension.bonds,
    letterSpacing: 0.3,
  },
  dimDescription: {
    ...tokens.type.body,
    color: tokens.text.base,
    paddingHorizontal: tokens.space[1],
  },
  subBlock: {
    paddingTop: tokens.space[3],
    borderTopWidth: 1,
    borderTopColor: tokens.border.divider,
    gap: tokens.space[2],
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subLabel: {
    flex: 1,
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: tokens.text.hi,
  },
  subScoreLabel: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  subDescription: {
    ...tokens.type.caption,
    color: tokens.text.mid,
  },
  scaleRow: {
    flexDirection: 'row',
    gap: tokens.space[2],
    marginTop: tokens.space[2],
  },
  scaleBtn: {
    flex: 1,
    aspectRatio: 1,
    maxHeight: 44,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.border.strong,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleBtnText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 16,
    color: tokens.text.mid,
  },
  footer: {
    paddingTop: tokens.space[3],
    alignItems: 'center',
  },
  footerText: {
    ...tokens.type.caption,
    color: tokens.text.dim,
    textAlign: 'center',
    paddingHorizontal: tokens.space[5],
  },
});
