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
import {
  useCharacter,
  useUpdateCharacterSub,
} from '@/lib/api/character';
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
  const updateSub = useUpdateCharacterSub();

  const subScores = useMemo(() => {
    const map = new Map<SubId, number>();
    (character.data?.subs ?? []).forEach((s) =>
      map.set(s.sub_id as SubId, s.subjective_score),
    );
    return map;
  }, [character.data?.subs]);

  const handleSetScore = (subId: SubId, score: number) => {
    if (subScores.get(subId) === score) return;
    Haptics.selectionAsync().catch(() => {});
    updateSub.mutate({ subId, score });
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

          <View style={styles.scaleHint}>
            <Text style={styles.scaleHintText}>0 missing · 5 mastery</Text>
          </View>

          {DIMENSION_ORDER.map((dim) => {
            const meta = DIMENSION_META[dim];
            const subIds = SUBS_BY_DIM[dim];
            const sa = subScores.get(subIds[0]) ?? 0;
            const sb = subScores.get(subIds[1]) ?? 0;
            const avg = (sa + sb) / 2;

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
                  <View style={[styles.dimAvgPill, { backgroundColor: meta.color }]}>
                    <Text style={styles.dimAvgText}>{avg.toFixed(1)}</Text>
                  </View>
                </View>

                <Text style={styles.dimDescription}>{meta.description}</Text>

                {subIds.map((subId) => {
                  const subMeta = SUB_META[subId];
                  const score = subScores.get(subId) ?? 0;
                  return (
                    <View key={subId} style={styles.subBlock}>
                      <View style={styles.subHeader}>
                        <Ionicons
                          name={subMeta.iconName as never}
                          size={14}
                          color={meta.color}
                        />
                        <Text style={styles.subLabel}>{subMeta.label}</Text>
                        <Text
                          style={[styles.subScoreLabel, { color: meta.color }]}
                        >
                          {SUB_SCORE_LABELS[score]}
                        </Text>
                      </View>
                      <Text style={styles.subDescription}>
                        {subMeta.description}
                      </Text>
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
  dimAvgPill: {
    minWidth: 44,
    height: 32,
    paddingHorizontal: tokens.space[3],
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dimAvgText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 14,
    color: tokens.text.hi,
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
