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
import { useSubmitQuestionnaire } from '@/lib/api/questionnaire';
import { pickSubScores, useCharacter } from '@/lib/api/character';
import {
  deriveScoresFromAnswers,
  type AnswerMap,
} from '@/lib/assessment/derive';
import {
  feedbackForAllDims,
  type DimFeedback,
} from '@/lib/assessment/feedback';
import { QUESTIONS, type QuestionId } from '@/lib/assessment/questions';
import { tokens } from '@/theme';
import { DIMENSION_META, SUB_META } from '@/theme/dimensions';

type Phase = 'intro' | 'answering' | 'submitting' | 'result';

/**
 * Questionnaire screen — guides the user through 24 questions (12 subs × 2)
 * one at a time, then submits the batch via the submit_questionnaire RPC
 * and shows per-dim feedback comparing the result to the user's
 * self-assessment.
 *
 * Phases:
 *   intro      → 1 explanatory screen, "Começar" advances to answering
 *   answering  → one Q per step, tap an option auto-advances; back arrow
 *                lets the user revise; progress bar drives motivation
 *   submitting → loading state while the RPC runs
 *   result     → 6-row feedback list (sorted by |Δ| desc), Concluir closes
 */
export default function QuestionnaireScreen() {
  const router = useRouter();
  const character = useCharacter();
  const submit = useSubmitQuestionnaire();

  const [phase, setPhase] = useState<Phase>('intro');
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>(new Map());
  const [feedback, setFeedback] = useState<DimFeedback[] | null>(null);
  const startedAt = useRef<number | null>(null);

  const total = QUESTIONS.length;
  const current = QUESTIONS[idx];

  // Reset start timer when the user enters the answering phase.
  useEffect(() => {
    if (phase === 'answering' && startedAt.current === null) {
      startedAt.current = Date.now();
    }
  }, [phase]);

  const handlePick = (raw: number) => {
    if (!current) return;
    Haptics.selectionAsync().catch(() => {});
    setAnswers((prev) => {
      const next = new Map(prev);
      next.set(current.id as QuestionId, raw);
      return next;
    });

    if (idx + 1 < total) {
      setIdx(idx + 1);
    } else {
      // All answered — submit. We need the latest answer reflected, so
      // build the map locally before the React state catches up.
      const finalAnswers = new Map(answers);
      finalAnswers.set(current.id as QuestionId, raw);
      doSubmit(finalAnswers);
    }
  };

  const doSubmit = (finalAnswers: AnswerMap) => {
    setPhase('submitting');
    const elapsed =
      startedAt.current !== null
        ? Math.max(0, Math.round((Date.now() - startedAt.current) / 1000))
        : 0;

    submit.mutate(
      { answers: finalAnswers, durationSeconds: elapsed },
      {
        onSuccess: () => {
          // Compute feedback locally from the answers + the user's self
          // scores. The DB has already been updated by the RPC; this is
          // just the explanatory layer.
          const qScores = deriveScoresFromAnswers(finalAnswers);
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
    if (phase === 'result' || phase === 'submitting') {
      router.back();
      return;
    }
    if (phase === 'answering' && idx > 0) {
      setIdx(idx - 1);
      return;
    }
    if (phase === 'answering') {
      // First question — bail out via confirm
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
          <IntroBody onStart={() => setPhase('answering')} onCancel={() => router.back()} />
        )}

        {phase === 'answering' && current && (
          <AnsweringBody
            current={current}
            currentAnswer={answers.get(current.id as QuestionId)}
            onPick={handlePick}
          />
        )}

        {phase === 'submitting' && (
          <View style={styles.center}>
            <Text style={styles.submittingText}>Calculando…</Text>
          </View>
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
      <Text style={styles.introTitle}>Questionário</Text>
      <Text style={styles.introSub}>
        24 perguntas, ~10 min. Compara o que você sente com âncoras de
        comportamento — pra ver se sua autoavaliação bate ou se há gap.
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
  current: (typeof QUESTIONS)[number];
  currentAnswer: number | undefined;
  onPick: (raw: number) => void;
}) {
  const subMeta = SUB_META[current.sub_id];
  const dimMeta = DIMENSION_META[subMeta.dimensionId];

  return (
    <ScrollView
      contentContainerStyle={styles.answeringContent}
      showsVerticalScrollIndicator={false}
    >
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
      <Text style={styles.prompt}>{current.prompt}</Text>

      <View style={styles.options}>
        {current.options.map((label, i) => {
          const raw = i + 1;
          const selected = currentAnswer === raw;
          return (
            <Pressable
              key={raw}
              onPress={() => onPick(raw)}
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
                {selected && (
                  <View style={styles.optionRadioDot} />
                )}
              </View>
              <Text style={styles.optionText}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ─── Result ───────────────────────────────────────────────────────────────
function ResultBody({
  feedback,
  onDone,
}: {
  feedback: DimFeedback[];
  onDone: () => void;
}) {
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
          const meta = DIMENSION_META[f.dim];
          const sign = f.delta > 0 ? '+' : '';
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
                <Text style={styles.feedbackDelta}>
                  Δ {sign}
                  {f.delta}
                </Text>
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
