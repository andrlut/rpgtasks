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
  AXIS_LETTERS,
  AXIS_ORDER,
  axisFromFacetId,
  clarityBand,
  codeFromAxisMeans,
  facetFromFacetId,
  FACETS_BY_AXIS,
  getAxisContent,
  getClarityLabel,
  getFacetContent,
  getTypeContent,
  letterForAxis,
  normalizeBipolar,
  type AxisSlug,
  type TypeCode,
  type TypeFacetSlug,
  type TypesLocale,
} from '@/lib/psych/types-content';
import { tokens } from '@/theme';
import { useQueryClient } from '@tanstack/react-query';

type Phase = 'loading' | 'intro' | 'starting' | 'answering' | 'submitting' | 'result';

const INSTRUMENT_ID = 'tipos';

const AXIS_COLOR: Record<AxisSlug, string> = {
  energy: '#E6B450',
  perception: '#5B8DEF',
  decision: '#E5646E',
  organization: '#4FB477',
};

export default function TypesScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { locale } = useT();
  const tyLocale: TypesLocale = locale === 'en' ? 'en' : 'pt';

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
          tyLocale === 'pt' ? 'Não foi possível abrir o teste' : 'Could not open the test',
          e?.message ?? (tyLocale === 'pt' ? 'Tente novamente.' : 'Try again.'),
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
            tyLocale === 'pt' ? 'Não foi possível salvar' : 'Could not save',
            e?.message ?? (tyLocale === 'pt' ? 'Tente novamente.' : 'Try again.'),
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
        tyLocale === 'pt' ? 'Sair do teste?' : 'Leave the test?',
        tyLocale === 'pt'
          ? 'Suas respostas até aqui não serão salvas.'
          : "Your answers so far won't be saved.",
        [
          { text: tyLocale === 'pt' ? 'Continuar' : 'Continue', style: 'cancel' },
          {
            text: tyLocale === 'pt' ? 'Sair' : 'Leave',
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
              <ProgressBar value={idx + 1} max={total} color={tokens.brand.violet2} height={4} />
              <Text style={styles.progressText}>{idx + 1}/{total}</Text>
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
          <IntroBody locale={tyLocale} onStart={handleStart} onCancel={() => router.back()} />
        )}

        {(phase === 'starting' || phase === 'submitting') && (
          <View style={styles.center}>
            <Text style={styles.submittingText}>
              {phase === 'starting'
                ? tyLocale === 'pt' ? 'Preparando…' : 'Preparing…'
                : tyLocale === 'pt' ? 'Calculando…' : 'Computing…'}
            </Text>
          </View>
        )}

        {phase === 'answering' && current && (
          <AnsweringBody
            current={current}
            scaleLabels={scaleLabels}
            locale={tyLocale}
            currentAnswer={answers.get(current.item_id)}
            onPick={handlePick}
          />
        )}

        {phase === 'result' && resultSessionId && (
          <ResultBody sessionId={resultSessionId} locale={tyLocale} onRetake={handleRetake} />
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
  locale: TypesLocale;
  onStart: () => void;
  onCancel: () => void;
}) {
  const isPt = locale === 'pt';
  return (
    <ScrollView contentContainerStyle={styles.introContent} showsVerticalScrollIndicator={false}>
      <View style={styles.introIconHalo}>
        <Ionicons name="compass-outline" size={34} color={tokens.brand.violet2} />
      </View>
      <Text style={styles.introTitle}>{isPt ? 'Tipos' : 'Types'}</Text>
      <Text style={styles.introSub}>
        {isPt
          ? '64 perguntas, 10-15 min. Mede 4 preferências que combinam num código de 4 letras. No fim: a clareza de cada preferência e um detalhamento por facetas.'
          : '64 questions, 10-15 min. Measures 4 preferences that combine into a 4-letter code. At the end: how clear each preference is, plus a facet-level breakdown.'}
      </Text>

      <View style={styles.introBullets}>
        <BulletRow
          icon="layers-outline"
          text={
            isPt
              ? 'Clareza é consistência das respostas — não força nem habilidade.'
              : 'Clarity means answer consistency — not strength or skill.'
          }
        />
        <BulletRow
          icon="lock-closed-outline"
          text={isPt ? 'Privado. Resultado fica só com você.' : 'Private. The result stays with you.'}
        />
        <BulletRow
          icon="information-circle-outline"
          text={
            isPt
              ? 'Inspirado nos tipos de Jung. Não é o MBTI e não tem afiliação com a The Myers-Briggs Company.'
              : 'Inspired by Jungian types. Not the MBTI, and not affiliated with The Myers-Briggs Company.'
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

function BulletRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
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
  locale: TypesLocale;
  currentAnswer: number | undefined;
  onPick: (raw: number) => void;
}) {
  const options: PsychItemOption[] =
    current.options ?? scaleLabels?.[locale] ?? scaleLabels?.pt ?? [];
  const text = locale === 'en' && current.text_en ? current.text_en : current.text_pt;

  return (
    <ScrollView contentContainerStyle={styles.answeringContent} showsVerticalScrollIndicator={false}>
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
              <View style={[styles.optionRadio, selected && styles.optionRadioSelected]} />
              <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
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
  locale: TypesLocale;
  onRetake: () => void;
}) {
  const isPt = locale === 'pt';
  const scoresQ = useSessionScores(sessionId);
  const [expanded, setExpanded] = useState<AxisSlug | null>(null);

  const { axisMeans, facetMeans } = useMemo(() => {
    const ax = {} as Record<AxisSlug, number>;
    const fa = {} as Record<TypeFacetSlug, number>;
    for (const s of scoresQ.data ?? []) {
      const a = axisFromFacetId(s.facet_id);
      if (a) {
        ax[a] = Number(s.score_decimal);
        continue;
      }
      const f = facetFromFacetId(s.facet_id);
      if (f) fa[f] = Number(s.score_decimal);
    }
    return { axisMeans: ax, facetMeans: fa };
  }, [scoresQ.data]);

  if (scoresQ.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={tokens.brand.violet2} />
      </View>
    );
  }

  const complete = AXIS_ORDER.every((a) => axisMeans[a] !== undefined);
  if (scoresQ.error || !complete) {
    return (
      <View style={styles.center}>
        <Text style={styles.submittingText}>
          {isPt ? 'Não foi possível ler o resultado.' : 'Could not load the result.'}
        </Text>
      </View>
    );
  }

  const code: TypeCode = codeFromAxisMeans(axisMeans);
  const typeContent = getTypeContent(code, locale);

  return (
    <ScrollView contentContainerStyle={styles.resultContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.resultTitle}>{isPt ? 'Seu tipo' : 'Your type'}</Text>
      <Text style={styles.resultLede}>
        {isPt
          ? 'Um retrato de tendências, não um rótulo fixo. A clareza mede o quanto suas respostas apontaram para um lado — não o quanto você é bom nisso.'
          : "A snapshot of tendencies, not a fixed label. Clarity measures how consistently you leaned one way — not how good you are at it."}
      </Text>

      <View style={styles.typeCard}>
        <Text style={styles.typeCode}>{code}</Text>
        <Text style={styles.typeName}>{typeContent.name}</Text>
        <Text style={styles.typeHeadline}>{typeContent.headline}</Text>
        <Text style={styles.typeNarrative}>{typeContent.narrative}</Text>
      </View>

      <Text style={styles.sectionHeader}>
        {isPt ? 'Suas 4 preferências' : 'Your 4 preferences'}
      </Text>
      {AXIS_ORDER.map((axis) => (
        <AxisRow key={axis} axis={axis} mean={axisMeans[axis]} locale={locale} />
      ))}

      <Text style={styles.sectionHeader}>
        {isPt ? 'Por dentro de cada preferência' : 'Inside each preference'}
      </Text>
      {AXIS_ORDER.map((axis) => (
        <AxisFacets
          key={axis}
          axis={axis}
          axisMean={axisMeans[axis]}
          facetMeans={facetMeans}
          locale={locale}
          open={expanded === axis}
          onToggle={() => setExpanded((cur) => (cur === axis ? null : axis))}
        />
      ))}

      <Pressable
        onPress={onRetake}
        style={({ pressed }) => [styles.retakeBtn, pressed && { opacity: 0.85 }]}
        hitSlop={4}
      >
        <Ionicons name="refresh" size={14} color={tokens.brand.violet2} />
        <Text style={styles.retakeText}>{isPt ? 'Refazer o teste' : 'Retake the test'}</Text>
      </Pressable>
    </ScrollView>
  );
}

/** A centered bipolar bar. Pole A (high mean) sits on the LEFT. */
function BipolarBar({
  mean,
  color,
  height = 7,
}: {
  mean: number;
  color: string;
  height?: number;
}) {
  // pos in [0,1], 0 = full pole A (left), 1 = full pole B (right).
  const pos = 1 - normalizeBipolar(mean);
  const leftPct = pos * 100;
  return (
    <View style={[styles.bar, { height, borderRadius: height / 2 }]}>
      <View style={styles.barCenter} />
      {mean >= 3 ? (
        <View
          style={[styles.barFill, { backgroundColor: color, right: '50%', width: `${50 - leftPct}%` }]}
        />
      ) : (
        <View
          style={[styles.barFill, { backgroundColor: color, left: '50%', width: `${leftPct - 50}%` }]}
        />
      )}
      <View style={[styles.barMarker, { left: `${leftPct}%`, borderColor: color }]} />
    </View>
  );
}

function AxisRow({ axis, mean, locale }: { axis: AxisSlug; mean: number; locale: TypesLocale }) {
  const isPt = locale === 'pt';
  const content = getAxisContent(axis, locale);
  const color = AXIS_COLOR[axis];
  const letter = letterForAxis(axis, mean);
  const band = clarityBand(mean);
  const bandLabel = getClarityLabel(band, locale);
  const noPref = Math.abs(mean - 3) < 0.25;

  return (
    <View style={styles.axisCard}>
      <View style={styles.axisHeader}>
        <Text style={styles.axisLabel}>{content.label}</Text>
        <View style={styles.axisPref}>
          <Text style={[styles.axisLetter, { color }]}>{letter}</Text>
          <Text style={styles.axisBand}>
            {noPref ? (isPt ? 'sem lado claro' : 'no clear side') : bandLabel}
          </Text>
        </View>
      </View>
      <BipolarBar mean={mean} color={color} />
      <View style={styles.poleRow}>
        <Text style={[styles.poleEnd, mean >= 3 && { color: tokens.text.hi }]}>
          {content.poleA_label} ({AXIS_LETTERS[axis].a})
        </Text>
        <Text style={[styles.poleEnd, styles.poleEndRight, mean < 3 && { color: tokens.text.hi }]}>
          ({AXIS_LETTERS[axis].b}) {content.poleB_label}
        </Text>
      </View>
    </View>
  );
}

function AxisFacets({
  axis,
  axisMean,
  facetMeans,
  locale,
  open,
  onToggle,
}: {
  axis: AxisSlug;
  axisMean: number;
  facetMeans: Record<TypeFacetSlug, number>;
  locale: TypesLocale;
  open: boolean;
  onToggle: () => void;
}) {
  const isPt = locale === 'pt';
  const content = getAxisContent(axis, locale);
  const color = AXIS_COLOR[axis];
  const axisLetter = letterForAxis(axis, axisMean);

  return (
    <View style={styles.facetGroup}>
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [styles.facetGroupHead, pressed && { opacity: 0.8 }]}
        hitSlop={4}
      >
        <View style={[styles.axisDot, { backgroundColor: color }]} />
        <Text style={styles.facetGroupTitle}>{content.label}</Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={tokens.text.dim}
        />
      </Pressable>

      {open && (
        <View style={styles.facetList}>
          {FACETS_BY_AXIS[axis].map((facet) => {
            const mean = facetMeans[facet];
            if (mean === undefined) return null;
            const fc = getFacetContent(facet, locale);
            const facetLetter = letterForAxis(axis, mean);
            const opposite = facetLetter !== axisLetter;
            const words = mean >= 3 ? fc.poleA_words : fc.poleB_words;
            return (
              <View key={facet} style={styles.facetRow}>
                <View style={styles.facetLabels}>
                  <Text style={[styles.facetPole, mean >= 3 && { color: tokens.text.hi }]}>
                    {fc.poleA_label}
                  </Text>
                  <Text style={[styles.facetPole, styles.facetPoleRight, mean < 3 && { color: tokens.text.hi }]}>
                    {fc.poleB_label}
                  </Text>
                </View>
                <BipolarBar mean={mean} color={color} height={6} />
                <View style={styles.facetFooter}>
                  <Text style={styles.facetWords}>{words.join(' · ')}</Text>
                  {opposite && (
                    <Text style={[styles.facetOpp, { color }]}>
                      {isPt ? 'puxa pro outro lado' : 'leans the other way'}
                    </Text>
                  )}
                </View>
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
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  progressWrap: { flex: 1, gap: 4 },
  progressText: { fontFamily: 'Manrope_500Medium', fontSize: 11, color: tokens.text.dim, textAlign: 'right' },
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
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: 'rgba(155, 130, 255, 0.10)',
    borderWidth: 1, borderColor: 'rgba(155, 130, 255, 0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  introTitle: { ...tokens.type.h1, color: tokens.text.hi, letterSpacing: 1 },
  introSub: {
    ...tokens.type.body, color: tokens.text.mid, textAlign: 'center',
    lineHeight: 22, paddingHorizontal: tokens.space[2],
  },
  introBullets: { width: '100%', gap: tokens.space[3], marginTop: tokens.space[3] },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] },
  bulletText: { flex: 1, ...tokens.type.body, color: tokens.text.mid },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: tokens.space[3], paddingHorizontal: tokens.space[6],
    borderRadius: tokens.radius.md, backgroundColor: tokens.brand.violet2, marginTop: tokens.space[5],
  },
  primaryBtnText: { fontFamily: 'Manrope_800ExtraBold', fontSize: 14, letterSpacing: 0.4, color: tokens.text.hi },
  linkBtn: { paddingVertical: tokens.space[2] },
  linkBtnText: { fontFamily: 'Manrope_500Medium', fontSize: 13, color: tokens.text.dim },

  answeringContent: {
    flexGrow: 1, paddingHorizontal: tokens.space[5], paddingTop: tokens.space[5],
    paddingBottom: tokens.space[6], gap: tokens.space[5],
  },
  prompt: { fontFamily: 'Manrope_700Bold', fontSize: 19, lineHeight: 27, color: tokens.text.hi },
  options: { gap: tokens.space[2] },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: tokens.space[3],
    paddingVertical: tokens.space[3], paddingHorizontal: tokens.space[4],
    borderRadius: tokens.radius.md, borderWidth: 1, borderColor: tokens.border.base,
    backgroundColor: tokens.bg.surface,
  },
  optionSelected: { borderColor: tokens.brand.violet2, backgroundColor: 'rgba(155, 130, 255, 0.08)' },
  optionRadio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: tokens.border.base },
  optionRadioSelected: { borderColor: tokens.brand.violet2, backgroundColor: tokens.brand.violet2 },
  optionLabel: { flex: 1, fontFamily: 'Manrope_500Medium', fontSize: 14, color: tokens.text.mid },
  optionLabelSelected: { color: tokens.text.hi, fontFamily: 'Manrope_700Bold' },

  resultContent: {
    paddingHorizontal: tokens.space[5], paddingTop: tokens.space[2],
    paddingBottom: tokens.space[7], gap: tokens.space[3],
  },
  resultTitle: { ...tokens.type.h2, color: tokens.text.hi },
  resultLede: { ...tokens.type.body, color: tokens.text.mid, lineHeight: 21, marginBottom: tokens.space[2] },
  sectionHeader: {
    fontFamily: 'Manrope_800ExtraBold', fontSize: 11, letterSpacing: 1.2,
    color: tokens.text.dim, textTransform: 'uppercase', marginTop: tokens.space[3], marginBottom: tokens.space[1],
  },

  typeCard: {
    borderRadius: tokens.radius.md, borderWidth: 1,
    borderColor: 'rgba(155, 130, 255, 0.30)', backgroundColor: 'rgba(155, 130, 255, 0.06)',
    padding: tokens.space[4], gap: tokens.space[2], alignItems: 'flex-start',
  },
  typeCode: {
    fontFamily: 'Manrope_800ExtraBold', fontSize: 34, letterSpacing: 4, color: tokens.brand.violet2,
  },
  typeName: { fontFamily: 'Manrope_800ExtraBold', fontSize: 20, color: tokens.text.hi, letterSpacing: 0.2 },
  typeHeadline: { fontFamily: 'Manrope_700Bold', fontSize: 14, lineHeight: 20, color: tokens.brand.violet2 },
  typeNarrative: { ...tokens.type.body, color: tokens.text.base, lineHeight: 21, marginTop: tokens.space[1] },

  axisCard: {
    borderRadius: tokens.radius.md, borderWidth: 1, borderColor: tokens.border.base,
    backgroundColor: tokens.bg.surface, padding: tokens.space[3], gap: tokens.space[2],
  },
  axisHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  axisLabel: { fontFamily: 'Manrope_800ExtraBold', fontSize: 13, color: tokens.text.hi, letterSpacing: 0.3 },
  axisPref: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
  axisLetter: { fontFamily: 'Manrope_800ExtraBold', fontSize: 18 },
  axisBand: {
    fontFamily: 'Manrope_700Bold', fontSize: 10, letterSpacing: 0.4,
    color: tokens.text.dim, textTransform: 'uppercase',
  },
  poleRow: { flexDirection: 'row', justifyContent: 'space-between', gap: tokens.space[2] },
  poleEnd: { flex: 1, fontFamily: 'Manrope_500Medium', fontSize: 11, color: tokens.text.dim },
  poleEndRight: { textAlign: 'right' },

  bar: {
    backgroundColor: 'rgba(255,255,255,0.06)', position: 'relative', marginVertical: 2,
  },
  barCenter: {
    position: 'absolute', top: -2, bottom: -2, left: '50%', width: 1,
    backgroundColor: tokens.text.dim, opacity: 0.4,
  },
  barFill: { position: 'absolute', top: 0, height: '100%', opacity: 0.55 },
  barMarker: {
    position: 'absolute', top: -3, width: 12, height: 12, borderRadius: 6,
    backgroundColor: tokens.bg.surface, marginLeft: -6, borderWidth: 2,
  },

  facetGroup: {
    borderRadius: tokens.radius.md, borderWidth: 1, borderColor: tokens.border.base,
    backgroundColor: tokens.bg.surface, overflow: 'hidden',
  },
  facetGroupHead: {
    flexDirection: 'row', alignItems: 'center', gap: tokens.space[2],
    paddingVertical: tokens.space[3], paddingHorizontal: tokens.space[3],
  },
  axisDot: { width: 9, height: 9, borderRadius: 4.5 },
  facetGroupTitle: { flex: 1, fontFamily: 'Manrope_800ExtraBold', fontSize: 13, color: tokens.text.hi, letterSpacing: 0.3 },
  facetList: { paddingHorizontal: tokens.space[3], paddingBottom: tokens.space[3], gap: tokens.space[4] },
  facetRow: { gap: 4 },
  facetLabels: { flexDirection: 'row', justifyContent: 'space-between', gap: tokens.space[2] },
  facetPole: { flex: 1, fontFamily: 'Manrope_700Bold', fontSize: 12, color: tokens.text.mid },
  facetPoleRight: { textAlign: 'right' },
  facetFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: tokens.space[2] },
  facetWords: { flex: 1, fontFamily: 'Manrope_500Medium', fontSize: 10, color: tokens.text.dim },
  facetOpp: { fontFamily: 'Manrope_700Bold', fontSize: 9, letterSpacing: 0.4, textTransform: 'uppercase' },

  retakeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: tokens.space[4], paddingVertical: tokens.space[3], paddingHorizontal: tokens.space[5],
    borderRadius: tokens.radius.md, borderWidth: 1, borderColor: 'rgba(155, 130, 255, 0.30)',
    borderStyle: 'dashed', alignSelf: 'center',
  },
  retakeText: { fontFamily: 'Manrope_700Bold', fontSize: 13, color: tokens.brand.violet2, letterSpacing: 0.3 },
});
