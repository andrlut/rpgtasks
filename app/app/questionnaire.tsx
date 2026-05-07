import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProgressBar } from '@/components/ProgressBar';
import { ScreenBackground } from '@/components/ScreenBackground';
import { pickSubScores, useCharacter } from '@/lib/api/character';
import {
  pickSubDecimalScores,
  useStartPsychSession,
  useSubmitPsychSession,
} from '@/lib/api/psych';
import {
  feedbackForAllDims,
  type DimFeedback,
} from '@/lib/assessment/feedback';
import type { PsychSessionItem, SubId } from '@/lib/db/types';
import { useMetaLookup } from '@/lib/i18n/meta';
import { tokens } from '@/theme';

type Phase = 'intro' | 'starting' | 'answering' | 'submitting' | 'result';

const INSTRUMENT_ID = 'avaliacao_v2';

/**
 * Questionnaire screen — runs avaliacao_v2 (48 items, sampled 1-of-2 per
 * leaf facet from a 96-item pool). The flow:
 *
 *   intro      → "Começar" → start_psych_session, server returns 48 items
 *   answering  → one item per step, tap auto-advances; back arrow revises;
 *                progress bar drives motivation
 *   submitting → submit_psych_session writes psych_answer + psych_score,
 *                bridges character_sub_score (decimal + integer)
 *   result     → 6-row dim feedback (Δ vs self), Concluir closes
 *
 * Note on legacy v1: submit_questionnaire (the v1 wrapper) still exists in
 * the DB and continues to work for any historical caller, but the screen no
 * longer uses it. New sessions all flow through psych_session/answer/score.
 */
export default function QuestionnaireScreen() {
  const router = useRouter();
  const character = useCharacter();
  const startSession = useStartPsychSession();
  const submitSession = useSubmitPsychSession();

  const [phase, setPhase] = useState<Phase>('intro');
  const [idx, setIdx] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [items, setItems] = useState<PsychSessionItem[]>([]);
  const [answers, setAnswers] = useState<Map<string, number>>(new Map());
  const [feedback, setFeedback] = useState<DimFeedback[] | null>(null);
  const startedAt = useRef<number | null>(null);

  const total = items.length;
  const current = items[idx];

  useEffect(() => {
    if (phase === 'answering' && startedAt.current === null) {
      startedAt.current = Date.now();
    }
  }, [phase]);

  const handleStart = () => {
    setPhase('starting');
    startSession.mutate(INSTRUMENT_ID, {
      onSuccess: (result) => {
        setSessionId(result.session_id);
        setItems(result.items);
        setIdx(0);
        setAnswers(new Map());
        startedAt.current = null;
        setPhase('answering');
      },
      onError: (err) => {
        const e = err as { message?: string };
        Alert.alert(
          'Não foi possível abrir o questionário',
          e?.message ?? 'Tente novamente.',
        );
        setPhase('intro');
      },
    });
  };

  const handlePick = (raw: number) => {
    if (!current) return;
    Haptics.selectionAsync().catch(() => {});
    setAnswers((prev) => {
      const next = new Map(prev);
      next.set(current.item_id, raw);
      return next;
    });

    if (idx + 1 < total) {
      setIdx(idx + 1);
    } else {
      // All answered — submit. Build the latest map locally so the in-flight
      // pick is included before React state catches up.
      const finalAnswers = new Map(answers);
      finalAnswers.set(current.item_id, raw);
      doSubmit(finalAnswers);
    }
  };

  const doSubmit = (finalAnswers: Map<string, number>) => {
    if (!sessionId) return;
    setPhase('submitting');
    const elapsed =
      startedAt.current !== null
        ? Math.max(0, Math.round((Date.now() - startedAt.current) / 1000))
        : 0;

    const payload = Array.from(finalAnswers.entries()).map(
      ([item_id, raw_value]) => ({ item_id, raw_value }),
    );

    submitSession.mutate(
      { sessionId, answers: payload, durationSeconds: elapsed },
      {
        onSuccess: (result) => {
          // Build qScores from server-returned scores (decimal precision).
          const qScores = pickSubDecimalScores(result.scores);
          const selfScores = pickSubScores(
            character.data?.subScores ?? [],
            'self',
          );
          setFeedback(feedbackForAllDims(selfScores, qScores));
          setPhase('result');
          Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success,
          ).catch(() => {});
        },
        onError: (err) => {
          const e = err as { message?: string };
          Alert.alert(
            'Não foi possível salvar',
            e?.message ?? 'Tente novamente.',
          );
          setPhase('answering');
        },
      },
    );
  };

  const handleBack = () => {
    if (phase === 'result' || phase === 'submitting' || phase === 'starting') {
      router.back();
      return;
    }
    if (phase === 'answering' && idx > 0) {
      setIdx(idx - 1);
      return;
    }
    if (phase === 'answering') {
      Alert.alert(
        'Sair do questionário?',
        'Suas respostas até aqui não serão salvas.',
        [
          { text: 'Continuar', style: 'cancel' },
          { text: 'Sair', style: 'destructive', onPress: () => router.back() },
        ],
      );
      return;
    }
    router.back();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenBackground>
        <View style={styles.topBar}>
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [
              styles.backBtn,
              pressed && { opacity: 0.7 },
            ]}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={22} color={tokens.text.hi} />
          </Pressable>
          {phase === 'answering' && (
            <View style={styles.progressWrap}>
              <ProgressBar
                value={idx + 1}
                max={total}
                color={tokens.brand.violet2}
                height={4}
              />
              <Text style={styles.progressText}>
                {idx + 1}/{total}
              </Text>
            </View>
          )}
          <View style={{ width: 44 }} />
        </View>

        {phase === 'intro' && (
          <IntroBody
            onStart={handleStart}
            onCancel={() => router.back()}
          />
        )}

        {(phase === 'starting' || phase === 'submitting') && (
          <View style={styles.center}>
            <Text style={styles.submittingText}>
              {phase === 'starting' ? 'Preparando…' : 'Calculando…'}
            </Text>
          </View>
        )}

        {phase === 'answering' && current && (
          <AnsweringBody
            current={current}
            currentAnswer={answers.get(current.item_id)}
            onPick={handlePick}
          />
        )}

        {phase === 'result' && feedback && (
          <ResultBody feedback={feedback} onDone={() => router.back()} />
        )}
      </ScreenBackground>
    </SafeAreaView>
  );
}

// ─── Intro ────────────────────────────────────────────────────────────────
function IntroBody({
  onStart,
  onCancel,
}: {
  onStart: () => void;
  onCancel: () => void;
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.introContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.introIconHalo}>
        <Ionicons name="pulse" size={36} color={tokens.brand.violet2} />
      </View>
      <Text style={styles.introTitle}>Avaliação</Text>
      <Text style={styles.introSub}>
        48 perguntas, ~12 min. 4 ângulos por dimensão (comportamento,
        qualidade, resultado, atrito) — pra ver onde você tá honestamente,
        sem ficar refém de uma única lente.
      </Text>

      <View style={styles.introBullets}>
        <BulletRow
          icon="time-outline"
          text="Resposta rápida — 5 opções por pergunta. Toque pra avançar."
        />
        <BulletRow
          icon="lock-closed-outline"
          text="Privado. Resultado só fica no seu hero."
        />
        <BulletRow
          icon="refresh-outline"
          text="Pode refazer a cada 30-90 dias pra ver evolução."
        />
      </View>

      <Pressable
        onPress={onStart}
        style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
        hitSlop={4}
      >
        <Text style={styles.primaryBtnText}>Começar</Text>
        <Ionicons name="arrow-forward" size={16} color={tokens.text.hi} />
      </Pressable>
      <Pressable
        onPress={onCancel}
        style={({ pressed }) => [styles.linkBtn, pressed && { opacity: 0.7 }]}
        hitSlop={4}
      >
        <Text style={styles.linkBtnText}>Agora não</Text>
      </Pressable>
    </ScrollView>
  );
}

function BulletRow({
  icon,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}) {
  return (
    <View style={styles.bulletRow}>
      <Ionicons name={icon} size={16} color={tokens.brand.violet2} />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

// ─── Answering ────────────────────────────────────────────────────────────
function AnsweringBody({
  current,
  currentAnswer,
  onPick,
}: {
  current: PsychSessionItem;
  currentAnswer: number | undefined;
  onPick: (raw: number) => void;
}) {
  const meta = useMetaLookup();
  const subId = parseSubFromFacetId(current.facet_id);
  const subMeta = subId ? meta.sub(subId) : null;
  const dimMeta = subMeta ? meta.dim(subMeta.dimensionId) : null;

  return (
    <ScrollView
      contentContainerStyle={styles.answeringContent}
      showsVerticalScrollIndicator={false}
    >
      {subMeta && dimMeta && (
        <View style={[styles.subPill, { borderColor: `${dimMeta.color}55` }]}>
          <Ionicons
            name={subMeta.iconName as never}
            size={12}
            color={dimMeta.color}
          />
          <Text style={[styles.subPillText, { color: dimMeta.color }]}>
            {subMeta.label.toUpperCase()}
          </Text>
        </View>
      )}
      <Text style={styles.prompt}>{current.text_pt}</Text>

      <View style={styles.options}>
        {(current.options ?? []).map((opt) => {
          const selected = currentAnswer === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onPick(opt.value)}
              style={({ pressed }) => [
                styles.option,
                selected && styles.optionSelected,
                pressed && { opacity: 0.85 },
              ]}
              hitSlop={4}
            >
              <View
                style={[
                  styles.optionRadio,
                  selected && styles.optionRadioSelected,
                ]}
              >
                {selected && <View style={styles.optionRadioDot} />}
              </View>
              <Text style={styles.optionText}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

/**
 * Pull the sub_id out of a leaf facet id of the form
 * `<instrument>:sub:<subId>:<facetType>`. Returns null for non-conforming
 * ids (defensive: a future instrument with a different shape won't crash
 * the screen).
 */
function parseSubFromFacetId(facetId: string | null): SubId | null {
  if (!facetId) return null;
  const parts = facetId.split(':');
  if (parts.length < 3 || parts[1] !== 'sub') return null;
  return parts[2] as SubId;
}

// ─── Result ───────────────────────────────────────────────────────────────
function ResultBody({
  feedback,
  onDone,
}: {
  feedback: DimFeedback[];
  onDone: () => void;
}) {
  const metaLookup = useMetaLookup();
  const aligned = feedback.filter((f) => f.bucket === 'aligned').length;
  const attention = feedback.filter((f) => f.needsAttention).length;

  return (
    <ScrollView
      contentContainerStyle={styles.resultContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.resultHeader}>
        <Ionicons name="checkmark-circle" size={32} color={tokens.semantic.xp} />
        <Text style={styles.resultTitle}>Pronto.</Text>
        <Text style={styles.resultSub}>
          {aligned} {aligned === 1 ? 'dimensão calibrada' : 'dimensões calibradas'}
          {attention > 0
            ? ` · ${attention} ${attention === 1 ? 'precisa' : 'precisam'} de atenção`
            : ''}
        </Text>
      </View>

      <View style={styles.feedbackList}>
        {feedback.map((f) => {
          const meta = metaLookup.dim(f.dim);
          const sign = f.delta > 0 ? '+' : '';
          // 1-decimal display for readability; the raw delta can be
          // fractional (decimal qScores - integer self).
          const deltaText = `${sign}${f.delta.toFixed(1)}`;
          return (
            <View
              key={f.dim}
              style={[
                styles.feedbackRow,
                f.needsAttention && {
                  borderColor: meta.color,
                },
              ]}
            >
              <View style={styles.feedbackHeader}>
                <View style={[styles.feedbackIcon, { backgroundColor: meta.bg }]}>
                  <Ionicons
                    name={meta.iconName as never}
                    size={14}
                    color={meta.color}
                  />
                </View>
                <Text style={[styles.feedbackDim, { color: meta.color }]}>
                  {meta.label.toUpperCase()}
                </Text>
                <Text style={styles.feedbackDelta}>Δ {deltaText}</Text>
              </View>
              <Text style={styles.feedbackMessage}>{f.message}</Text>
            </View>
          );
        })}
      </View>

      <Pressable
        onPress={onDone}
        style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
        hitSlop={4}
      >
        <Text style={styles.primaryBtnText}>Concluir</Text>
        <Ionicons name="checkmark" size={16} color={tokens.text.hi} />
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.bg.deep },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.space[4],
    paddingTop: tokens.space[3],
    paddingBottom: tokens.space[3],
    gap: tokens.space[3],
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
  },
  progressText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    color: tokens.text.mid,
    letterSpacing: 0.5,
    minWidth: 38,
    textAlign: 'right',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submittingText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
    color: tokens.text.mid,
  },

  // Intro
  introContent: {
    paddingHorizontal: tokens.space[5],
    paddingTop: tokens.space[6],
    paddingBottom: tokens.space[7],
    alignItems: 'center',
  },
  introIconHalo: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(155, 130, 255, 0.16)',
    borderWidth: 1.5,
    borderColor: 'rgba(155, 130, 255, 0.30)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.space[5],
  },
  introTitle: {
    ...tokens.type.h1,
    color: tokens.text.hi,
    textAlign: 'center',
  },
  introSub: {
    ...tokens.type.body,
    color: tokens.text.mid,
    textAlign: 'center',
    marginTop: tokens.space[3],
    paddingHorizontal: tokens.space[3],
  },
  introBullets: {
    width: '100%',
    marginTop: tokens.space[6],
    gap: tokens.space[3],
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: tokens.space[3],
    paddingHorizontal: tokens.space[3],
  },
  bulletText: {
    flex: 1,
    ...tokens.type.body,
    color: tokens.text.base,
    lineHeight: 20,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.space[2],
    paddingHorizontal: tokens.space[6],
    paddingVertical: tokens.space[3],
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.brand.violet,
    marginTop: tokens.space[6],
    minWidth: 200,
  },
  primaryBtnText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 14,
    color: tokens.text.hi,
    letterSpacing: 0.3,
  },
  linkBtn: {
    paddingVertical: tokens.space[3],
    marginTop: tokens.space[2],
  },
  linkBtnText: {
    ...tokens.type.body,
    color: tokens.text.mid,
    fontFamily: 'Manrope_700Bold',
  },

  // Answering
  answeringContent: {
    paddingHorizontal: tokens.space[5],
    paddingTop: tokens.space[3],
    paddingBottom: tokens.space[8],
  },
  subPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: tokens.space[3],
    paddingVertical: 4,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginBottom: tokens.space[4],
  },
  subPillText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    letterSpacing: 0.8,
  },
  prompt: {
    ...tokens.type.h2,
    color: tokens.text.hi,
    marginBottom: tokens.space[5],
    lineHeight: 28,
  },
  options: {
    gap: tokens.space[2],
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[3],
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.bg.surface,
    borderWidth: 1,
    borderColor: tokens.border.base,
  },
  optionSelected: {
    backgroundColor: 'rgba(123, 92, 255, 0.12)',
    borderColor: tokens.brand.violet2,
  },
  optionRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: tokens.text.dim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionRadioSelected: {
    borderColor: tokens.brand.violet2,
  },
  optionRadioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: tokens.brand.violet2,
  },
  optionText: {
    flex: 1,
    ...tokens.type.body,
    color: tokens.text.hi,
    fontFamily: 'Manrope_500Medium',
  },

  // Result
  resultContent: {
    paddingHorizontal: tokens.space[5],
    paddingTop: tokens.space[5],
    paddingBottom: tokens.space[8],
  },
  resultHeader: {
    alignItems: 'center',
    gap: tokens.space[2],
    marginBottom: tokens.space[5],
  },
  resultTitle: {
    ...tokens.type.h1,
    color: tokens.text.hi,
  },
  resultSub: {
    ...tokens.type.body,
    color: tokens.text.mid,
    textAlign: 'center',
  },
  feedbackList: {
    gap: tokens.space[3],
  },
  feedbackRow: {
    backgroundColor: tokens.bg.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.border.base,
    padding: tokens.space[4],
    gap: tokens.space[2],
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
  },
  feedbackIcon: {
    width: 26,
    height: 26,
    borderRadius: tokens.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackDim: {
    flex: 1,
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
    letterSpacing: 1.2,
  },
  feedbackDelta: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 12,
    color: tokens.text.mid,
    letterSpacing: 0.5,
  },
  feedbackMessage: {
    ...tokens.type.body,
    color: tokens.text.base,
    lineHeight: 19,
  },
});
