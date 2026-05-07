import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import {
  psychKeys,
  useLastPsychSession,
  useStartPsychSession,
  useSubmitPsychSession,
} from '@/lib/api/psych';
import type {
  PsychItemOption,
  PsychScaleLabels,
  PsychScore,
  PsychSessionItem,
} from '@/lib/db/types';
import { useT } from '@/lib/i18n';
import {
  BIG_FIVE_TRAIT_ORDER,
  bucketForTraitScore,
  getTraitContent,
  getTraitNarrative,
  traitFromFacetId,
  type BigFiveBucket,
  type BigFiveLocale,
  type BigFiveTrait,
} from '@/lib/psych/big-five-content';
import { supabase } from '@/lib/supabase';
import { tokens } from '@/theme';
import { useQuery, useQueryClient } from '@tanstack/react-query';

type Phase = 'loading' | 'intro' | 'starting' | 'answering' | 'submitting' | 'result';

const INSTRUMENT_ID = 'big_five_120';

/**
 * Big Five (120 itens, autoral). Single route that handles both first-time
 * test-taking and revisiting past results:
 *
 *   - Mounts in `loading`. Looks up the user's most recent completed
 *     big_five_120 session via useLastPsychSession.
 *   - If a completed session exists → fetch its scores, hop to `result`.
 *   - If none → show `intro`. Tapping "Começar" starts a fresh session,
 *     auto-advances through 120 items, submits, and lands in `result`.
 *   - Result phase has a "Refazer" button that bounces back to `intro`,
 *     starting a brand-new session that supersedes the old one.
 *
 * Items inherit their Likert from the instrument's `scale_labels` (set in
 * migration 20260507000005). The take screen prefers `item.options` if
 * present (avaliacao convention), and falls back to `scale_labels[locale]`
 * otherwise (Big Five / Schwartz / ECR-R convention).
 */
export default function BigFiveScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { locale } = useT();
  const bfLocale: BigFiveLocale = locale === 'en' ? 'en' : 'pt';

  const lastSession = useLastPsychSession(INSTRUMENT_ID);
  const startSession = useStartPsychSession();
  const submitSession = useSubmitPsychSession();

  const [phase, setPhase] = useState<Phase>('loading');
  const [idx, setIdx] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [items, setItems] = useState<PsychSessionItem[]>([]);
  const [scaleLabels, setScaleLabels] = useState<PsychScaleLabels | null>(null);
  const [answers, setAnswers] = useState<Map<string, number>>(new Map());
  const [resultSessionId, setResultSessionId] = useState<string | null>(null);
  const startedAt = useRef<number | null>(null);

  // Resume on mount: if we have a completed session, jump straight to result.
  useEffect(() => {
    if (phase !== 'loading') return;
    if (lastSession.isLoading) return;
    const session = lastSession.data;
    if (session?.id) {
      setResultSessionId(session.id);
      setPhase('result');
    } else {
      setPhase('intro');
    }
  }, [phase, lastSession.isLoading, lastSession.data]);

  const total = items.length;
  const current = items[idx];

  const handleStart = () => {
    setPhase('starting');
    startSession.mutate(INSTRUMENT_ID, {
      onSuccess: (result) => {
        setSessionId(result.session_id);
        setItems(result.items);
        setScaleLabels(result.scale_labels);
        setIdx(0);
        setAnswers(new Map());
        startedAt.current = Date.now();
        setPhase('answering');
      },
      onError: (err) => {
        const e = err as { message?: string };
        Alert.alert(
          bfLocale === 'pt'
            ? 'Não foi possível abrir o teste'
            : 'Could not open the test',
          e?.message ?? (bfLocale === 'pt' ? 'Tente novamente.' : 'Try again.'),
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
        onSuccess: () => {
          setResultSessionId(sessionId);
          setPhase('result');
          Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success,
          ).catch(() => {});
        },
        onError: (err) => {
          const e = err as { message?: string };
          Alert.alert(
            bfLocale === 'pt' ? 'Não foi possível salvar' : 'Could not save',
            e?.message ?? (bfLocale === 'pt' ? 'Tente novamente.' : 'Try again.'),
          );
          setPhase('answering');
        },
      },
    );
  };

  const handleRetake = () => {
    setResultSessionId(null);
    setPhase('intro');
    qc.invalidateQueries({ queryKey: psychKeys.lastSession(INSTRUMENT_ID) });
  };

  const handleBack = () => {
    if (phase === 'answering' && idx > 0) {
      setIdx(idx - 1);
      return;
    }
    if (phase === 'answering') {
      Alert.alert(
        bfLocale === 'pt' ? 'Sair do teste?' : 'Leave the test?',
        bfLocale === 'pt'
          ? 'Suas respostas até aqui não serão salvas.'
          : "Your answers so far won't be saved.",
        [
          {
            text: bfLocale === 'pt' ? 'Continuar' : 'Continue',
            style: 'cancel',
          },
          {
            text: bfLocale === 'pt' ? 'Sair' : 'Leave',
            style: 'destructive',
            onPress: () => router.back(),
          },
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
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
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

        {phase === 'loading' && (
          <View style={styles.center}>
            <ActivityIndicator color={tokens.brand.violet2} />
          </View>
        )}

        {phase === 'intro' && (
          <IntroBody locale={bfLocale} onStart={handleStart} onCancel={() => router.back()} />
        )}

        {(phase === 'starting' || phase === 'submitting') && (
          <View style={styles.center}>
            <Text style={styles.submittingText}>
              {phase === 'starting'
                ? bfLocale === 'pt'
                  ? 'Preparando…'
                  : 'Preparing…'
                : bfLocale === 'pt'
                  ? 'Calculando…'
                  : 'Computing…'}
            </Text>
          </View>
        )}

        {phase === 'answering' && current && (
          <AnsweringBody
            current={current}
            scaleLabels={scaleLabels}
            locale={bfLocale}
            currentAnswer={answers.get(current.item_id)}
            onPick={handlePick}
          />
        )}

        {phase === 'result' && resultSessionId && (
          <ResultBody
            sessionId={resultSessionId}
            locale={bfLocale}
            onRetake={handleRetake}
          />
        )}
      </ScreenBackground>
    </SafeAreaView>
  );
}

// ─── Intro ────────────────────────────────────────────────────────────────

function IntroBody({
  locale,
  onStart,
  onCancel,
}: {
  locale: BigFiveLocale;
  onStart: () => void;
  onCancel: () => void;
}) {
  const isPt = locale === 'pt';
  return (
    <ScrollView
      contentContainerStyle={styles.introContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.introIconHalo}>
        <Ionicons name="cube" size={36} color={tokens.brand.violet2} />
      </View>
      <Text style={styles.introTitle}>
        {isPt ? 'Big Five' : 'Big Five'}
      </Text>
      <Text style={styles.introSub}>
        {isPt
          ? '120 perguntas, 10-20 min. 5 traços de personalidade × 6 facetas cada. Não é teste de tipo (tipo "ENTP") — é um perfil multidimensional.'
          : '120 questions, 10-20 min. 5 personality traits × 6 facets each. Not a "type" test — a multidimensional profile.'}
      </Text>

      <View style={styles.introBullets}>
        <BulletRow
          icon="time-outline"
          text={
            isPt
              ? 'Resposta rápida — 5 opções por pergunta. Toque pra avançar.'
              : 'Quick answers — 5 options per question. Tap to advance.'
          }
        />
        <BulletRow
          icon="lock-closed-outline"
          text={
            isPt
              ? 'Privado. Resultado fica só com você.'
              : 'Private. The result stays with you.'
          }
        />
        <BulletRow
          icon="information-circle-outline"
          text={
            isPt
              ? 'Inspirado no modelo Big Five (não é instrumento clínico).'
              : 'Inspired by the Big Five model (not a clinical instrument).'
          }
        />
      </View>

      <Pressable
        onPress={onStart}
        style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
        hitSlop={4}
      >
        <Text style={styles.primaryBtnText}>
          {isPt ? 'Começar' : 'Start'}
        </Text>
        <Ionicons name="arrow-forward" size={16} color={tokens.text.hi} />
      </Pressable>
      <Pressable
        onPress={onCancel}
        style={({ pressed }) => [styles.linkBtn, pressed && { opacity: 0.7 }]}
        hitSlop={4}
      >
        <Text style={styles.linkBtnText}>
          {isPt ? 'Agora não' : 'Not now'}
        </Text>
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
  scaleLabels,
  locale,
  currentAnswer,
  onPick,
}: {
  current: PsychSessionItem;
  scaleLabels: PsychScaleLabels | null;
  locale: BigFiveLocale;
  currentAnswer: number | undefined;
  onPick: (raw: number) => void;
}) {
  const options: PsychItemOption[] =
    current.options ?? scaleLabels?.[locale] ?? scaleLabels?.pt ?? [];
  const text = locale === 'en' && current.text_en ? current.text_en : current.text_pt;

  return (
    <ScrollView
      contentContainerStyle={styles.answeringContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.prompt}>{text}</Text>

      <View style={styles.options}>
        {options.map((opt) => {
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
              />
              <Text
                style={[styles.optionLabel, selected && styles.optionLabelSelected]}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ─── Result ───────────────────────────────────────────────────────────────

function useBigFiveScores(sessionId: string) {
  return useQuery({
    queryKey: psychKeys.scores(sessionId),
    queryFn: async (): Promise<PsychScore[]> => {
      const { data, error } = await supabase
        .from('psych_score')
        .select('*')
        .eq('session_id', sessionId);
      if (error) throw error;
      return (data ?? []) as PsychScore[];
    },
  });
}

function ResultBody({
  sessionId,
  locale,
  onRetake,
}: {
  sessionId: string;
  locale: BigFiveLocale;
  onRetake: () => void;
}) {
  const isPt = locale === 'pt';
  const scoresQ = useBigFiveScores(sessionId);

  if (scoresQ.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={tokens.brand.violet2} />
      </View>
    );
  }

  if (scoresQ.error || !scoresQ.data) {
    return (
      <View style={styles.center}>
        <Text style={styles.submittingText}>
          {isPt ? 'Não foi possível ler o resultado.' : 'Could not load the result.'}
        </Text>
      </View>
    );
  }

  // Build a map { trait → raw score in [24, 120] } from parent (trait) rows.
  const traitScores = new Map<BigFiveTrait, number>();
  for (const s of scoresQ.data) {
    const trait = traitFromFacetId(s.facet_id);
    if (trait) traitScores.set(trait, Number(s.score_decimal));
  }

  return (
    <ScrollView
      contentContainerStyle={styles.resultContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.resultTitle}>
        {isPt ? 'Seu perfil Big Five' : 'Your Big Five profile'}
      </Text>
      <Text style={styles.resultLede}>
        {isPt
          ? 'Cada traço é um espectro, não uma nota. Os dois extremos têm força e custo — alto em Conscienciosidade ajuda na execução, alto em Neuroticismo dói. O ponto é entender seu padrão, não maximizar todos.'
          : "Each trait is a spectrum, not a grade. Both ends carry strengths and costs — high Conscientiousness helps execution, high Neuroticism hurts. The point is to understand your pattern, not to max out everything."}
      </Text>
      <Text style={styles.resultLedeNote}>
        {isPt
          ? 'Toque "Ver outros níveis" em qualquer traço pra ver como seria o outro lado do espectro.'
          : 'Tap "See other levels" on any trait to see what the other side of the spectrum looks like.'}
      </Text>

      <View style={styles.traitList}>
        {BIG_FIVE_TRAIT_ORDER.map((trait) => {
          const raw = traitScores.get(trait);
          if (raw === undefined) return null;
          return (
            <TraitCard
              key={trait}
              trait={trait}
              rawScore={raw}
              locale={locale}
            />
          );
        })}
      </View>

      <Pressable
        onPress={onRetake}
        style={({ pressed }) => [styles.retakeBtn, pressed && { opacity: 0.85 }]}
        hitSlop={4}
      >
        <Ionicons name="refresh" size={14} color={tokens.brand.violet2} />
        <Text style={styles.retakeText}>
          {isPt ? 'Refazer o teste' : 'Retake the test'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function TraitCard({
  trait,
  rawScore,
  locale,
}: {
  trait: BigFiveTrait;
  rawScore: number;
  locale: BigFiveLocale;
}) {
  const [expanded, setExpanded] = useState(false);
  const content = getTraitContent(trait, locale);
  const bucket = bucketForTraitScore(rawScore);
  const narrative = getTraitNarrative(trait, bucket, locale);
  const normalized = Math.max(0, Math.min(1, (rawScore - 24) / 96));
  const isPt = locale === 'pt';

  // The other two buckets, in spectrum order (low → high), excluding the
  // user's current one — so the panel reads as "what the rest of the
  // spectrum looks like".
  const otherBuckets: BigFiveBucket[] = (['low', 'mid', 'high'] as const).filter(
    (b) => b !== bucket,
  );

  return (
    <View style={styles.traitCard}>
      <View style={styles.traitHeader}>
        <Text style={styles.traitLabel}>{content.label.toUpperCase()}</Text>
      </View>
      <Text style={styles.traitOneLiner}>{content.oneLiner}</Text>

      <View style={styles.spectrumWrap}>
        <View style={styles.spectrumBar}>
          <View
            style={[
              styles.spectrumFill,
              { width: `${normalized * 100}%` },
            ]}
          />
          <View
            style={[
              styles.spectrumMarker,
              // Anchor the marker to the right edge of the fill, then
              // pull it back by half its own width so it centers on the
              // tip — looks like a position dot riding the bar.
              { left: `${normalized * 100}%` },
            ]}
          />
        </View>
        <View style={styles.spectrumLabels}>
          <Text style={styles.spectrumEnd}>{isPt ? 'baixo' : 'low'}</Text>
          <Text style={styles.spectrumEnd}>{isPt ? 'alto' : 'high'}</Text>
        </View>
      </View>

      <Text style={styles.traitHeadline}>{narrative.headline}</Text>
      <Text style={styles.traitBody}>{narrative.body}</Text>
      <View style={styles.dayToDayRow}>
        <Ionicons
          name="ellipse"
          size={4}
          color={tokens.brand.violet2}
          style={{ marginTop: 8 }}
        />
        <Text style={styles.traitDayToDay}>{narrative.dayToDay}</Text>
      </View>

      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={({ pressed }) => [
          styles.expandToggle,
          pressed && { opacity: 0.7 },
        ]}
        hitSlop={6}
      >
        <Text style={styles.expandToggleText}>
          {expanded
            ? isPt
              ? 'Esconder outros níveis'
              : 'Hide other levels'
            : isPt
              ? 'Ver outros níveis'
              : 'See other levels'}
        </Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={tokens.brand.violet2}
        />
      </Pressable>

      {expanded && (
        <View style={styles.otherLevels}>
          {otherBuckets.map((b) => {
            const other = getTraitNarrative(trait, b, locale);
            return (
              <View key={b} style={styles.otherLevelBlock}>
                <Text style={styles.otherLevelHeadline}>{other.headline}</Text>
                <Text style={styles.otherLevelBody}>{other.body}</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────

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
  progressWrap: { flex: 1, gap: 4 },
  progressText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    color: tokens.text.dim,
    textAlign: 'right',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  submittingText: { ...tokens.type.body, color: tokens.text.mid },

  // Intro
  introContent: {
    flexGrow: 1,
    paddingHorizontal: tokens.space[5],
    paddingTop: tokens.space[6],
    paddingBottom: tokens.space[7],
    alignItems: 'center',
    gap: tokens.space[4],
  },
  introIconHalo: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(155, 130, 255, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(155, 130, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  introTitle: { ...tokens.type.h1, color: tokens.text.hi },
  introSub: {
    ...tokens.type.body,
    color: tokens.text.mid,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: tokens.space[2],
  },
  introBullets: {
    width: '100%',
    gap: tokens.space[3],
    marginTop: tokens.space[3],
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
  },
  bulletText: { flex: 1, ...tokens.type.body, color: tokens.text.mid },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: tokens.space[3],
    paddingHorizontal: tokens.space[6],
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.brand.violet2,
    marginTop: tokens.space[5],
  },
  primaryBtnText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 14,
    letterSpacing: 0.4,
    color: tokens.text.hi,
  },
  linkBtn: { paddingVertical: tokens.space[2] },
  linkBtnText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    color: tokens.text.dim,
  },

  // Answering
  answeringContent: {
    flexGrow: 1,
    paddingHorizontal: tokens.space[5],
    paddingTop: tokens.space[5],
    paddingBottom: tokens.space[6],
    gap: tokens.space[5],
  },
  prompt: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 19,
    lineHeight: 27,
    color: tokens.text.hi,
  },
  options: { gap: tokens.space[2] },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    paddingVertical: tokens.space[3],
    paddingHorizontal: tokens.space[4],
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.border.base,
    backgroundColor: tokens.bg.surface,
  },
  optionSelected: {
    borderColor: tokens.brand.violet2,
    backgroundColor: 'rgba(155, 130, 255, 0.08)',
  },
  optionRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: tokens.border.base,
  },
  optionRadioSelected: {
    borderColor: tokens.brand.violet2,
    backgroundColor: tokens.brand.violet2,
  },
  optionLabel: {
    flex: 1,
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
    color: tokens.text.mid,
  },
  optionLabelSelected: {
    color: tokens.text.hi,
    fontFamily: 'Manrope_700Bold',
  },

  // Result
  resultContent: {
    paddingHorizontal: tokens.space[5],
    paddingTop: tokens.space[2],
    paddingBottom: tokens.space[7],
    gap: tokens.space[3],
  },
  resultTitle: { ...tokens.type.h2, color: tokens.text.hi },
  resultLede: {
    ...tokens.type.body,
    color: tokens.text.mid,
    lineHeight: 21,
  },
  resultLedeNote: {
    ...tokens.type.body,
    color: tokens.text.dim,
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 17,
    marginBottom: tokens.space[2],
  },
  traitList: { gap: tokens.space[3] },
  traitCard: {
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(155, 130, 255, 0.20)',
    backgroundColor: 'rgba(155, 130, 255, 0.04)',
    padding: tokens.space[4],
    gap: tokens.space[2],
  },
  traitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
  },
  traitLabel: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 12,
    letterSpacing: 1.2,
    color: tokens.text.hi,
  },
  traitOneLiner: {
    ...tokens.type.body,
    color: tokens.text.dim,
    fontSize: 12,
    lineHeight: 17,
    fontStyle: 'italic',
  },
  spectrumWrap: { paddingVertical: tokens.space[2], gap: 4 },
  spectrumBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.06)',
    position: 'relative',
  },
  spectrumFill: {
    height: '100%',
    backgroundColor: tokens.brand.violet2,
    borderRadius: 3,
  },
  spectrumMarker: {
    position: 'absolute',
    top: -3,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: tokens.brand.violet2,
    marginLeft: -6,
    borderWidth: 2,
    borderColor: tokens.bg.surface,
  },
  spectrumLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  spectrumEnd: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 10,
    letterSpacing: 0.5,
    color: tokens.text.dim,
    textTransform: 'uppercase',
  },
  traitHeadline: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 15,
    color: tokens.brand.violet2,
    marginTop: tokens.space[1],
  },
  traitBody: {
    ...tokens.type.body,
    color: tokens.text.base,
    lineHeight: 21,
  },
  dayToDayRow: {
    flexDirection: 'row',
    gap: tokens.space[2],
    marginTop: tokens.space[1],
  },
  traitDayToDay: {
    flex: 1,
    ...tokens.type.body,
    color: tokens.text.mid,
    fontSize: 13,
    lineHeight: 19,
  },
  expandToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: tokens.space[2],
    paddingVertical: tokens.space[2],
    borderTopWidth: 1,
    borderTopColor: 'rgba(155, 130, 255, 0.15)',
  },
  expandToggleText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    letterSpacing: 0.4,
    color: tokens.brand.violet2,
    textTransform: 'uppercase',
  },
  otherLevels: {
    gap: tokens.space[3],
    paddingTop: tokens.space[2],
  },
  otherLevelBlock: {
    gap: 4,
    paddingLeft: tokens.space[3],
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(155, 130, 255, 0.20)',
  },
  otherLevelHeadline: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 13,
    color: tokens.text.mid,
  },
  otherLevelBody: {
    ...tokens.type.body,
    color: tokens.text.dim,
    fontSize: 12,
    lineHeight: 18,
  },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: tokens.space[3],
    paddingVertical: tokens.space[3],
    paddingHorizontal: tokens.space[5],
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(155, 130, 255, 0.30)',
    borderStyle: 'dashed',
    alignSelf: 'center',
  },
  retakeText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: tokens.brand.violet2,
    letterSpacing: 0.3,
  },
});
