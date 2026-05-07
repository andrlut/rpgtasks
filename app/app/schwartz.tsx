import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
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
  getMetaContent,
  getValueContent,
  metaFromFacetId,
  SCHWARTZ_META_ORDER,
  valueFromFacetId,
  type SchwartzLocale,
  type SchwartzMeta,
  type SchwartzValue,
} from '@/lib/psych/schwartz-content';
import { supabase } from '@/lib/supabase';
import { tokens } from '@/theme';
import { useQuery, useQueryClient } from '@tanstack/react-query';

type Phase = 'loading' | 'intro' | 'starting' | 'answering' | 'submitting' | 'result';

const INSTRUMENT_ID = 'schwartz_pvq';

/**
 * Schwartz values inventory (57 items, autoral). Single-route screen that
 * resumes to the result if the user already has a completed session, else
 * shows the intro. Mirrors big-five.tsx with two key differences:
 *
 *   - Items use third-person framing ("Esta pessoa…"). The intro flags
 *     this so users know to read the description and rate match.
 *   - The result is a *ranking*, not a per-trait spectrum. The screen
 *     shows top-5 (most central) and bottom-5 (you give up) values plus
 *     a 4-bar comparison of the meta-value groups.
 */
export default function SchwartzScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { locale } = useT();
  const swLocale: SchwartzLocale = locale === 'en' ? 'en' : 'pt';

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
          swLocale === 'pt' ? 'Não foi possível abrir o teste' : 'Could not open the test',
          e?.message ?? (swLocale === 'pt' ? 'Tente novamente.' : 'Try again.'),
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
            swLocale === 'pt' ? 'Não foi possível salvar' : 'Could not save',
            e?.message ?? (swLocale === 'pt' ? 'Tente novamente.' : 'Try again.'),
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
        swLocale === 'pt' ? 'Sair do teste?' : 'Leave the test?',
        swLocale === 'pt'
          ? 'Suas respostas até aqui não serão salvas.'
          : "Your answers so far won't be saved.",
        [
          { text: swLocale === 'pt' ? 'Continuar' : 'Continue', style: 'cancel' },
          {
            text: swLocale === 'pt' ? 'Sair' : 'Leave',
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
          <IntroBody locale={swLocale} onStart={handleStart} onCancel={() => router.back()} />
        )}

        {(phase === 'starting' || phase === 'submitting') && (
          <View style={styles.center}>
            <Text style={styles.submittingText}>
              {phase === 'starting'
                ? swLocale === 'pt' ? 'Preparando…' : 'Preparing…'
                : swLocale === 'pt' ? 'Calculando…' : 'Computing…'}
            </Text>
          </View>
        )}

        {phase === 'answering' && current && (
          <AnsweringBody
            current={current}
            scaleLabels={scaleLabels}
            locale={swLocale}
            currentAnswer={answers.get(current.item_id)}
            onPick={handlePick}
          />
        )}

        {phase === 'result' && resultSessionId && (
          <ResultBody
            sessionId={resultSessionId}
            locale={swLocale}
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
  locale: SchwartzLocale;
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
        <Ionicons name="compass" size={36} color={tokens.brand.violet2} />
      </View>
      <Text style={styles.introTitle}>
        {isPt ? 'Valores' : 'Values'}
      </Text>
      <Text style={styles.introSub}>
        {isPt
          ? '57 perguntas, 8-16 min. Vou descrever uma pessoa por vez — você marca o quanto cada descrição se parece com você. No fim, um ranking dos 19 valores que pesam mais (e menos) na sua vida.'
          : '57 questions, 8-16 min. I describe one person at a time — you rate how much each description sounds like you. At the end, a ranking of the 19 values that weigh most (and least) in your life.'}
      </Text>

      <View style={styles.introBullets}>
        <BulletRow
          icon="layers-outline"
          text={
            isPt
              ? 'Não é nota — é ranking. Tudo importa em algum grau.'
              : "Not a grade — a ranking. Everything matters to some degree."
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
              ? 'Inspirado na teoria de valores de Schwartz (não é instrumento clínico).'
              : "Inspired by Schwartz's values theory (not a clinical instrument)."
          }
        />
      </View>

      <Pressable
        onPress={onStart}
        style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
        hitSlop={4}
      >
        <Text style={styles.primaryBtnText}>{isPt ? 'Começar' : 'Start'}</Text>
        <Ionicons name="arrow-forward" size={16} color={tokens.text.hi} />
      </Pressable>
      <Pressable
        onPress={onCancel}
        style={({ pressed }) => [styles.linkBtn, pressed && { opacity: 0.7 }]}
        hitSlop={4}
      >
        <Text style={styles.linkBtnText}>{isPt ? 'Agora não' : 'Not now'}</Text>
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
  locale: SchwartzLocale;
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
                style={[styles.optionRadio, selected && styles.optionRadioSelected]}
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

function useSchwartzScores(sessionId: string) {
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
  locale: SchwartzLocale;
  onRetake: () => void;
}) {
  const isPt = locale === 'pt';
  const scoresQ = useSchwartzScores(sessionId);
  const [bottomExpanded, setBottomExpanded] = useState(false);

  const { ranked, metaScores } = useMemo(() => {
    const valueRows: { value: SchwartzValue; score: number }[] = [];
    const metaMap = new Map<SchwartzMeta, number>();
    for (const s of scoresQ.data ?? []) {
      const v = valueFromFacetId(s.facet_id);
      if (v) {
        valueRows.push({ value: v, score: Number(s.score_decimal) });
        continue;
      }
      const m = metaFromFacetId(s.facet_id);
      if (m) metaMap.set(m, Number(s.score_decimal));
    }
    valueRows.sort((a, b) => b.score - a.score);
    return { ranked: valueRows, metaScores: metaMap };
  }, [scoresQ.data]);

  if (scoresQ.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={tokens.brand.violet2} />
      </View>
    );
  }

  if (scoresQ.error || ranked.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.submittingText}>
          {isPt ? 'Não foi possível ler o resultado.' : 'Could not load the result.'}
        </Text>
      </View>
    );
  }

  const top5 = ranked.slice(0, 5);
  const bottom5 = ranked.slice(-5).reverse(); // weakest first

  return (
    <ScrollView
      contentContainerStyle={styles.resultContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.resultTitle}>
        {isPt ? 'Seus valores' : 'Your values'}
      </Text>
      <Text style={styles.resultLede}>
        {isPt
          ? 'Não é nota — é ranking. Tudo importa pra você em algum grau, mas isso é o que pesa mais e o que pesa menos.'
          : "Not a grade — a ranking. Everything matters to you to some degree, but this is what weighs most and what weighs least."}
      </Text>

      <SectionHeader
        text={isPt ? 'Top 5 — o que mais pesa pra você' : 'Top 5 — what weighs most for you'}
      />
      <View style={styles.valueList}>
        {top5.map((row, i) => (
          <ValueCard
            key={row.value}
            rank={i + 1}
            value={row.value}
            score={row.score}
            locale={locale}
            tone="top"
          />
        ))}
      </View>

      <SectionHeader
        text={isPt ? 'Os 4 grupos' : 'The 4 groups'}
      />
      <View style={styles.metaList}>
        {SCHWARTZ_META_ORDER.map((meta) => (
          <MetaRow
            key={meta}
            meta={meta}
            score={metaScores.get(meta) ?? 0}
            locale={locale}
          />
        ))}
      </View>

      <Pressable
        onPress={() => setBottomExpanded((v) => !v)}
        style={({ pressed }) => [
          styles.bottomToggle,
          pressed && { opacity: 0.7 },
        ]}
        hitSlop={6}
      >
        <Text style={styles.bottomToggleText}>
          {bottomExpanded
            ? isPt ? 'Esconder o que você abre mão' : 'Hide what you give up'
            : isPt ? 'Ver o que você abre mão' : 'See what you give up'}
        </Text>
        <Ionicons
          name={bottomExpanded ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={tokens.text.dim}
        />
      </Pressable>

      {bottomExpanded && (
        <View style={styles.valueList}>
          {bottom5.map((row, i) => (
            <ValueCard
              key={row.value}
              rank={ranked.length - bottom5.length + i + 1}
              value={row.value}
              score={row.score}
              locale={locale}
              tone="bottom"
            />
          ))}
        </View>
      )}

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

function SectionHeader({ text }: { text: string }) {
  return <Text style={styles.sectionHeader}>{text}</Text>;
}

function ValueCard({
  rank,
  value,
  score,
  locale,
  tone,
}: {
  rank: number;
  value: SchwartzValue;
  score: number;
  locale: SchwartzLocale;
  tone: 'top' | 'bottom';
}) {
  const content = getValueContent(value, locale);
  const isTop = tone === 'top';
  return (
    <View style={[styles.valueCard, isTop ? styles.valueCardTop : styles.valueCardBottom]}>
      <View style={styles.valueRank}>
        <Text style={[styles.valueRankText, !isTop && { color: tokens.text.dim }]}>
          {rank}
        </Text>
      </View>
      <View style={styles.valueBody}>
        <Text style={[styles.valueLabel, !isTop && { color: tokens.text.mid }]}>
          {content.label}
        </Text>
        <Text style={styles.valueOneLiner}>{content.oneLiner}</Text>
      </View>
      <Text style={styles.valueScore}>{score >= 0 ? `+${score.toFixed(2)}` : score.toFixed(2)}</Text>
    </View>
  );
}

function MetaRow({
  meta,
  score,
  locale,
}: {
  meta: SchwartzMeta;
  score: number;
  locale: SchwartzLocale;
}) {
  const content = getMetaContent(meta, locale);
  // Center is 0; range roughly [-2, +2]. Map to [0, 1] for bar fill.
  const normalized = Math.max(0, Math.min(1, (score + 2) / 4));
  return (
    <View style={styles.metaRow}>
      <View style={styles.metaHeader}>
        <Text style={styles.metaLabel}>{content.label}</Text>
        <Text style={styles.metaScore}>
          {score >= 0 ? `+${score.toFixed(2)}` : score.toFixed(2)}
        </Text>
      </View>
      <Text style={styles.metaOneLiner}>{content.oneLiner}</Text>
      <View style={styles.metaBar}>
        <View
          style={[styles.metaBarCenter, { left: '50%' }]}
        />
        <View
          style={[
            styles.metaBarFill,
            score >= 0
              ? { left: '50%', width: `${normalized * 100 - 50}%` }
              : { right: '50%', width: `${50 - normalized * 100}%` },
          ]}
        />
      </View>
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
    marginBottom: tokens.space[2],
  },
  sectionHeader: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
    letterSpacing: 1.2,
    color: tokens.text.dim,
    textTransform: 'uppercase',
    marginTop: tokens.space[3],
    marginBottom: tokens.space[1],
  },
  valueList: { gap: tokens.space[2] },
  valueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    padding: tokens.space[3],
    borderRadius: tokens.radius.md,
    borderWidth: 1,
  },
  valueCardTop: {
    borderColor: 'rgba(155, 130, 255, 0.30)',
    backgroundColor: 'rgba(155, 130, 255, 0.06)',
  },
  valueCardBottom: {
    borderColor: tokens.border.base,
    backgroundColor: tokens.bg.surface,
    opacity: 0.85,
  },
  valueRank: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(155, 130, 255, 0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueRankText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 12,
    color: tokens.brand.violet2,
  },
  valueBody: { flex: 1, gap: 2 },
  valueLabel: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 13,
    color: tokens.text.hi,
    letterSpacing: 0.2,
  },
  valueOneLiner: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    lineHeight: 17,
    color: tokens.text.mid,
  },
  valueScore: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    color: tokens.text.dim,
    minWidth: 44,
    textAlign: 'right',
  },

  metaList: { gap: tokens.space[3] },
  metaRow: {
    gap: 4,
    paddingVertical: tokens.space[2],
  },
  metaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaLabel: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 12,
    letterSpacing: 0.4,
    color: tokens.text.hi,
  },
  metaScore: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    color: tokens.text.mid,
  },
  metaOneLiner: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    color: tokens.text.dim,
    lineHeight: 16,
  },
  metaBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.06)',
    position: 'relative',
    marginTop: 4,
  },
  metaBarCenter: {
    position: 'absolute',
    top: -2,
    width: 1,
    height: 10,
    backgroundColor: tokens.text.dim,
    opacity: 0.4,
  },
  metaBarFill: {
    position: 'absolute',
    top: 0,
    height: '100%',
    backgroundColor: tokens.brand.violet2,
    borderRadius: 3,
  },

  bottomToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: tokens.space[3],
    paddingVertical: tokens.space[2],
  },
  bottomToggleText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    letterSpacing: 0.4,
    color: tokens.text.dim,
    textTransform: 'uppercase',
  },

  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: tokens.space[4],
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
