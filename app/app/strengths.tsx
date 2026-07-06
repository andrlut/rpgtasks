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
  useSessionScores,
  useStartPsychSession,
  useSubmitPsychSession,
} from '@/lib/api/psych';
import type {
  PsychItemOption,
  PsychScaleLabels,
  PsychSessionItem,
} from '@/lib/db/types';
import { useT } from '@/lib/i18n';
import { useInstrumentStartGate } from '@/lib/premium';
import {
  getStrengthContent,
  getVirtueContent,
  normalizeCenteredScore,
  strengthFromFacetId,
  VIRTUE_COLOR,
  VIRTUE_OF_STRENGTH,
  VIRTUE_ORDER,
  virtueColorOfStrength,
  virtueFromFacetId,
  type StrengthsLocale,
  type StrengthSlug,
  type VirtueSlug,
} from '@/lib/psych/strengths-content';
import { tokens } from '@/theme';
import { useQueryClient } from '@tanstack/react-query';

type Phase = 'loading' | 'intro' | 'starting' | 'answering' | 'submitting' | 'result';

const INSTRUMENT_ID = 'strengths';

export default function StrengthsScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { locale } = useT();
  const stLocale: StrengthsLocale = locale === 'en' ? 'en' : 'pt';

  const lastSession = useLastPsychSession(INSTRUMENT_ID);
  const startSession = useStartPsychSession();
  const submitSession = useSubmitPsychSession();
  const { assertCanStart } = useInstrumentStartGate(INSTRUMENT_ID, {
    ready: !lastSession.isLoading,
    hasResult: !!lastSession.data?.id,
  });

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
    if (!assertCanStart()) return;
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
          stLocale === 'pt' ? 'Não foi possível abrir o teste' : 'Could not open the test',
          e?.message ?? (stLocale === 'pt' ? 'Tente novamente.' : 'Try again.'),
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
            stLocale === 'pt' ? 'Não foi possível salvar' : 'Could not save',
            e?.message ?? (stLocale === 'pt' ? 'Tente novamente.' : 'Try again.'),
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
        stLocale === 'pt' ? 'Sair do teste?' : 'Leave the test?',
        stLocale === 'pt'
          ? 'Suas respostas até aqui não serão salvas.'
          : "Your answers so far won't be saved.",
        [
          { text: stLocale === 'pt' ? 'Continuar' : 'Continue', style: 'cancel' },
          {
            text: stLocale === 'pt' ? 'Sair' : 'Leave',
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
          <IntroBody locale={stLocale} onStart={handleStart} onCancel={() => router.back()} />
        )}

        {(phase === 'starting' || phase === 'submitting') && (
          <View style={styles.center}>
            <Text style={styles.submittingText}>
              {phase === 'starting'
                ? stLocale === 'pt' ? 'Preparando…' : 'Preparing…'
                : stLocale === 'pt' ? 'Calculando…' : 'Computing…'}
            </Text>
          </View>
        )}

        {phase === 'answering' && current && (
          <AnsweringBody
            current={current}
            scaleLabels={scaleLabels}
            locale={stLocale}
            currentAnswer={answers.get(current.item_id)}
            onPick={handlePick}
          />
        )}

        {phase === 'result' && resultSessionId && (
          <ResultBody
            sessionId={resultSessionId}
            locale={stLocale}
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
  locale: StrengthsLocale;
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
        <Ionicons name="sparkles" size={34} color={tokens.brand.violet2} />
      </View>
      <Text style={styles.introTitle}>
        {isPt ? 'Forças de Caráter' : 'Character Strengths'}
      </Text>
      <Text style={styles.introSub}>
        {isPt
          ? '72 perguntas, 10-15 min. Marco o quanto cada frase tem a ver com você. No fim, um ranking das 24 forças — as que mais te representam são suas forças-assinatura.'
          : "72 questions, 10-15 min. You rate how much each statement is like you. At the end, a ranking of 24 strengths — the ones most like you are your signature strengths."}
      </Text>

      <View style={styles.introBullets}>
        <BulletRow
          icon="layers-outline"
          text={
            isPt
              ? 'Não é nota — é ranking. Todas as forças estão em você em algum grau.'
              : 'Not a grade — a ranking. Every strength is in you to some degree.'
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
              ? 'Inspirado na psicologia positiva (reflexão, não diagnóstico).'
              : 'Inspired by positive psychology (for reflection, not diagnosis).'
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
  locale: StrengthsLocale;
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

function ResultBody({
  sessionId,
  locale,
  onRetake,
}: {
  sessionId: string;
  locale: StrengthsLocale;
  onRetake: () => void;
}) {
  const isPt = locale === 'pt';
  const scoresQ = useSessionScores(sessionId);
  const [restExpanded, setRestExpanded] = useState(false);

  const { ranked, virtueScores } = useMemo(() => {
    const rows: { slug: StrengthSlug; score: number }[] = [];
    const vMap = new Map<VirtueSlug, number>();
    for (const s of scoresQ.data ?? []) {
      const st = strengthFromFacetId(s.facet_id);
      if (st) {
        rows.push({ slug: st, score: Number(s.score_decimal) });
        continue;
      }
      const v = virtueFromFacetId(s.facet_id);
      if (v) vMap.set(v, Number(s.score_decimal));
    }
    rows.sort((a, b) => b.score - a.score);
    return { ranked: rows, virtueScores: vMap };
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
  const rest = ranked.slice(5);

  return (
    <ScrollView
      contentContainerStyle={styles.resultContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.resultTitle}>
        {isPt ? 'Suas forças' : 'Your strengths'}
      </Text>
      <Text style={styles.resultLede}>
        {isPt
          ? 'Todas as 24 forças estão em você em algum grau. Estas são as que mais te representam — suas forças-assinatura. Use-as de propósito.'
          : "All 24 strengths live in you to some degree. These are the ones most like you — your signature strengths. Use them on purpose."}
      </Text>

      <SectionHeader
        text={isPt ? 'Suas 5 forças-assinatura' : 'Your 5 signature strengths'}
      />
      <View style={styles.signatureList}>
        {top5.map((row, i) => (
          <SignatureCard
            key={row.slug}
            rank={i + 1}
            slug={row.slug}
            locale={locale}
          />
        ))}
      </View>

      <SectionHeader text={isPt ? 'As 6 virtudes' : 'The 6 virtues'} />
      <View style={styles.virtueList}>
        {VIRTUE_ORDER.map((v) => (
          <VirtueRow
            key={v}
            virtue={v}
            score={virtueScores.get(v) ?? 0}
            locale={locale}
          />
        ))}
      </View>

      <Pressable
        onPress={() => setRestExpanded((v) => !v)}
        style={({ pressed }) => [styles.restToggle, pressed && { opacity: 0.7 }]}
        hitSlop={6}
      >
        <Text style={styles.restToggleText}>
          {restExpanded
            ? isPt ? 'Esconder o ranking completo' : 'Hide the full ranking'
            : isPt ? 'Ver o ranking completo (6–24)' : 'See the full ranking (6–24)'}
        </Text>
        <Ionicons
          name={restExpanded ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={tokens.text.dim}
        />
      </Pressable>

      {restExpanded && (
        <View style={styles.restList}>
          {rest.map((row, i) => (
            <RankRow
              key={row.slug}
              rank={i + 6}
              slug={row.slug}
              score={row.score}
              locale={locale}
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

function SignatureCard({
  rank,
  slug,
  locale,
}: {
  rank: number;
  slug: StrengthSlug;
  locale: StrengthsLocale;
}) {
  const content = getStrengthContent(slug, locale);
  const virtue = VIRTUE_OF_STRENGTH[slug];
  const virtueLabel = getVirtueContent(virtue, locale).label;
  const color = virtueColorOfStrength(slug);
  return (
    <View style={[styles.sigCard, { borderColor: `${color}55`, backgroundColor: `${color}12` }]}>
      <View style={styles.sigHeader}>
        <View style={[styles.sigRank, { backgroundColor: `${color}33` }]}>
          <Text style={[styles.sigRankText, { color }]}>{rank}</Text>
        </View>
        <View style={styles.sigTitleWrap}>
          <Text style={styles.sigLabel}>{content.label}</Text>
          <Text style={[styles.sigVirtue, { color }]}>{virtueLabel}</Text>
        </View>
      </View>
      <Text style={styles.sigSignature}>{content.signature}</Text>
    </View>
  );
}

function VirtueRow({
  virtue,
  score,
  locale,
}: {
  virtue: VirtueSlug;
  score: number;
  locale: StrengthsLocale;
}) {
  const content = getVirtueContent(virtue, locale);
  const color = VIRTUE_COLOR[virtue];
  const normalized = normalizeCenteredScore(score);
  return (
    <View style={styles.virtueRow}>
      <View style={styles.virtueHeader}>
        <View style={styles.virtueLabelWrap}>
          <View style={[styles.virtueDot, { backgroundColor: color }]} />
          <Text style={styles.virtueLabel}>{content.label}</Text>
        </View>
        <Text style={styles.virtueScore}>
          {score >= 0 ? `+${score.toFixed(2)}` : score.toFixed(2)}
        </Text>
      </View>
      <View style={styles.virtueBar}>
        <View style={[styles.virtueBarCenter, { left: '50%' }]} />
        <View
          style={[
            styles.virtueBarFill,
            { backgroundColor: color },
            score >= 0
              ? { left: '50%', width: `${normalized * 100 - 50}%` }
              : { right: '50%', width: `${50 - normalized * 100}%` },
          ]}
        />
      </View>
    </View>
  );
}

function RankRow({
  rank,
  slug,
  score,
  locale,
}: {
  rank: number;
  slug: StrengthSlug;
  score: number;
  locale: StrengthsLocale;
}) {
  const content = getStrengthContent(slug, locale);
  const color = virtueColorOfStrength(slug);
  return (
    <View style={styles.rankRow}>
      <Text style={styles.rankNum}>{rank}</Text>
      <View style={[styles.rankDot, { backgroundColor: color }]} />
      <View style={styles.rankBody}>
        <Text style={styles.rankLabel}>{content.label}</Text>
        <Text style={styles.rankOneLiner} numberOfLines={1}>
          {content.oneLiner}
        </Text>
      </View>
      <Text style={styles.rankScore}>
        {score >= 0 ? `+${score.toFixed(2)}` : score.toFixed(2)}
      </Text>
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
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
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
  introTitle: { ...tokens.type.h1, color: tokens.text.hi, textAlign: 'center' },
  introSub: {
    ...tokens.type.body,
    color: tokens.text.mid,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: tokens.space[2],
  },
  introBullets: { width: '100%', gap: tokens.space[3], marginTop: tokens.space[3] },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] },
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
  linkBtnText: { fontFamily: 'Manrope_500Medium', fontSize: 13, color: tokens.text.dim },

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
  optionLabelSelected: { color: tokens.text.hi, fontFamily: 'Manrope_700Bold' },

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

  signatureList: { gap: tokens.space[2] },
  sigCard: {
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    padding: tokens.space[4],
    gap: tokens.space[2],
  },
  sigHeader: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] },
  sigRank: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sigRankText: { fontFamily: 'Manrope_800ExtraBold', fontSize: 14 },
  sigTitleWrap: { flex: 1, gap: 1 },
  sigLabel: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 17,
    color: tokens.text.hi,
    letterSpacing: 0.2,
  },
  sigVirtue: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  sigSignature: {
    ...tokens.type.body,
    color: tokens.text.base,
    fontSize: 13,
    lineHeight: 19,
  },

  virtueList: { gap: tokens.space[3] },
  virtueRow: { gap: 4, paddingVertical: tokens.space[1] },
  virtueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  virtueLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
  virtueDot: { width: 9, height: 9, borderRadius: 4.5 },
  virtueLabel: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 12,
    letterSpacing: 0.3,
    color: tokens.text.hi,
  },
  virtueScore: { fontFamily: 'Manrope_700Bold', fontSize: 11, color: tokens.text.mid },
  virtueBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.06)',
    position: 'relative',
    marginTop: 2,
  },
  virtueBarCenter: {
    position: 'absolute',
    top: -2,
    width: 1,
    height: 10,
    backgroundColor: tokens.text.dim,
    opacity: 0.4,
  },
  virtueBarFill: { position: 'absolute', top: 0, height: '100%', borderRadius: 3 },

  restToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: tokens.space[3],
    paddingVertical: tokens.space[2],
  },
  restToggleText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    letterSpacing: 0.4,
    color: tokens.text.dim,
    textTransform: 'uppercase',
  },
  restList: { gap: tokens.space[2], paddingTop: tokens.space[1] },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    paddingVertical: tokens.space[2],
    paddingHorizontal: tokens.space[3],
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.border.base,
    backgroundColor: tokens.bg.surface,
  },
  rankNum: {
    width: 22,
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 12,
    color: tokens.text.dim,
    textAlign: 'center',
  },
  rankDot: { width: 8, height: 8, borderRadius: 4 },
  rankBody: { flex: 1, gap: 1 },
  rankLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: tokens.text.hi,
  },
  rankOneLiner: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    color: tokens.text.dim,
  },
  rankScore: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    color: tokens.text.dim,
    minWidth: 40,
    textAlign: 'right',
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
