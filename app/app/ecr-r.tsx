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
import { useInstrumentStartGate } from '@/lib/premium';
import {
  ECR_STYLE_ORDER,
  getScaleContent,
  getStyleContent,
  scaleFromFacetId,
  styleFromScales,
  type EcrLocale,
  type EcrScale,
  type EcrStyle,
} from '@/lib/psych/ecr-r-content';
import { supabase } from '@/lib/supabase';
import { tokens } from '@/theme';
import { useQuery, useQueryClient } from '@tanstack/react-query';

type Phase = 'loading' | 'intro' | 'starting' | 'answering' | 'submitting' | 'result';

const INSTRUMENT_ID = 'ecr_r';

export default function EcrRScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { locale } = useT();
  const ecrLocale: EcrLocale = locale === 'en' ? 'en' : 'pt';

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
          ecrLocale === 'pt' ? 'Não foi possível abrir o teste' : 'Could not open the test',
          e?.message ?? (ecrLocale === 'pt' ? 'Tente novamente.' : 'Try again.'),
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
            ecrLocale === 'pt' ? 'Não foi possível salvar' : 'Could not save',
            e?.message ?? (ecrLocale === 'pt' ? 'Tente novamente.' : 'Try again.'),
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
        ecrLocale === 'pt' ? 'Sair do teste?' : 'Leave the test?',
        ecrLocale === 'pt'
          ? 'Suas respostas até aqui não serão salvas.'
          : "Your answers so far won't be saved.",
        [
          { text: ecrLocale === 'pt' ? 'Continuar' : 'Continue', style: 'cancel' },
          {
            text: ecrLocale === 'pt' ? 'Sair' : 'Leave',
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
          <IntroBody locale={ecrLocale} onStart={handleStart} onCancel={() => router.back()} />
        )}

        {(phase === 'starting' || phase === 'submitting') && (
          <View style={styles.center}>
            <Text style={styles.submittingText}>
              {phase === 'starting'
                ? ecrLocale === 'pt' ? 'Preparando…' : 'Preparing…'
                : ecrLocale === 'pt' ? 'Calculando…' : 'Computing…'}
            </Text>
          </View>
        )}

        {phase === 'answering' && current && (
          <AnsweringBody
            current={current}
            scaleLabels={scaleLabels}
            locale={ecrLocale}
            currentAnswer={answers.get(current.item_id)}
            onPick={handlePick}
          />
        )}

        {phase === 'result' && resultSessionId && (
          <ResultBody
            sessionId={resultSessionId}
            locale={ecrLocale}
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
  locale: EcrLocale;
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
        <Ionicons name="link" size={36} color={tokens.brand.violet2} />
      </View>
      <Text style={styles.introTitle}>
        {isPt ? 'Apego' : 'Attachment'}
      </Text>
      <Text style={styles.introSub}>
        {isPt
          ? '36 perguntas, 6-12 min. Sobre como você funciona em relacionamentos próximos — parceria, intimidade, vínculos. Mede 2 dimensões (Ansiedade + Evitação) que combinadas dão 4 estilos.'
          : '36 questions, 6-12 min. About how you function in close relationships — partnership, intimacy, bonds. Measures 2 dimensions (Anxiety + Avoidance) which combine into 4 styles.'}
      </Text>

      <View style={styles.introBullets}>
        <BulletRow
          icon="heart-outline"
          text={
            isPt
              ? 'Sobre relacionamentos íntimos adultos.'
              : 'About adult intimate relationships.'
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
              ? 'Reflexão, não diagnóstico. Não substitui terapia.'
              : 'For reflection, not diagnosis. Not a substitute for therapy.'
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
  locale: EcrLocale;
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

function useEcrScores(sessionId: string) {
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
  locale: EcrLocale;
  onRetake: () => void;
}) {
  const isPt = locale === 'pt';
  const scoresQ = useEcrScores(sessionId);
  const [otherStylesExpanded, setOtherStylesExpanded] = useState(false);

  const scaleScores = useMemo(() => {
    const map = new Map<EcrScale, number>();
    for (const s of scoresQ.data ?? []) {
      const scale = scaleFromFacetId(s.facet_id);
      if (scale) map.set(scale, Number(s.score_decimal));
    }
    return map;
  }, [scoresQ.data]);

  if (scoresQ.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={tokens.brand.violet2} />
      </View>
    );
  }

  const anxiety = scaleScores.get('anxiety');
  const avoidance = scaleScores.get('avoidance');

  if (scoresQ.error || anxiety === undefined || avoidance === undefined) {
    return (
      <View style={styles.center}>
        <Text style={styles.submittingText}>
          {isPt ? 'Não foi possível ler o resultado.' : 'Could not load the result.'}
        </Text>
      </View>
    );
  }

  const style = styleFromScales(anxiety, avoidance);
  const styleContent = getStyleContent(style, locale);
  const anxContent = getScaleContent('anxiety', locale);
  const avoContent = getScaleContent('avoidance', locale);

  // Bordering on midline (anxiety or avoidance within 0.5 of 4) → softer copy.
  const isBorderline =
    Math.abs(anxiety - 4) < 0.5 || Math.abs(avoidance - 4) < 0.5;

  // Map [1,7] → [0,1] for visualization (clamp).
  const anxNorm = Math.max(0, Math.min(1, (anxiety - 1) / 6));
  const avoNorm = Math.max(0, Math.min(1, (avoidance - 1) / 6));

  const otherStyles = ECR_STYLE_ORDER.filter((s) => s !== style);

  return (
    <ScrollView
      contentContainerStyle={styles.resultContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.resultTitle}>
        {isPt ? 'Seu padrão de apego' : 'Your attachment pattern'}
      </Text>
      <Text style={styles.resultLede}>
        {isPt
          ? 'Apego não é diagnóstico nem destino. É um padrão aprendido — pode mudar com tempo, terapia, e relações estáveis.'
          : "Attachment isn't a diagnosis or destiny. It's a learned pattern — it can shift with time, therapy, and stable relationships."}
      </Text>

      <View style={styles.styleCard}>
        <Text style={styles.styleLabel}>{styleContent.label.toUpperCase()}</Text>
        <Text style={styles.styleHeadline}>{styleContent.headline}</Text>
        {isBorderline && (
          <Text style={styles.borderlineNote}>
            {isPt
              ? 'Você ficou perto do meio em uma das dimensões — este estilo descreve uma tendência, mas você pode oscilar.'
              : "You came close to the midline on one dimension — this style describes a tendency, but you may oscillate."}
          </Text>
        )}
        <Text style={styles.styleBody}>{styleContent.body}</Text>
        <View style={styles.dayToDayRow}>
          <Ionicons
            name="ellipse"
            size={4}
            color={tokens.brand.violet2}
            style={{ marginTop: 8 }}
          />
          <Text style={styles.styleDayToDay}>{styleContent.dayToDay}</Text>
        </View>
        <Text style={styles.growthLabel}>
          {isPt ? 'Caminho' : 'Path'}
        </Text>
        <Text style={styles.styleGrowth}>{styleContent.growth}</Text>
      </View>

      <Text style={styles.sectionHeader}>
        {isPt ? 'As 2 dimensões' : 'The 2 dimensions'}
      </Text>
      <ScaleRow
        scale="anxiety"
        score={anxiety}
        normalized={anxNorm}
        content={anxContent}
        locale={locale}
      />
      <ScaleRow
        scale="avoidance"
        score={avoidance}
        normalized={avoNorm}
        content={avoContent}
        locale={locale}
      />

      <Text style={styles.sectionHeader}>
        {isPt ? 'O mapa' : 'The map'}
      </Text>
      <QuadrantMap
        anxiety={anxNorm}
        avoidance={avoNorm}
        currentStyle={style}
        locale={locale}
      />

      <Pressable
        onPress={() => setOtherStylesExpanded((v) => !v)}
        style={({ pressed }) => [
          styles.expandToggle,
          pressed && { opacity: 0.7 },
        ]}
        hitSlop={6}
      >
        <Text style={styles.expandToggleText}>
          {otherStylesExpanded
            ? isPt ? 'Esconder os outros padrões' : 'Hide other patterns'
            : isPt ? 'Ver os outros padrões' : 'See other patterns'}
        </Text>
        <Ionicons
          name={otherStylesExpanded ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={tokens.brand.violet2}
        />
      </Pressable>

      {otherStylesExpanded && (
        <View style={styles.otherStyles}>
          {otherStyles.map((s) => {
            const c = getStyleContent(s, locale);
            return (
              <View key={s} style={styles.otherStyleBlock}>
                <Text style={styles.otherStyleLabel}>{c.label}</Text>
                <Text style={styles.otherStyleHeadline}>{c.headline}</Text>
                <Text style={styles.otherStyleBody}>{c.body}</Text>
              </View>
            );
          })}
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

function ScaleRow({
  score,
  normalized,
  content,
  locale,
}: {
  scale: EcrScale;
  score: number;
  normalized: number;
  content: { label: string; oneLiner: string };
  locale: EcrLocale;
}) {
  const isPt = locale === 'pt';
  const isHigh = score >= 4;
  const levelLabel = isPt
    ? isHigh ? 'alto' : 'baixo'
    : isHigh ? 'high' : 'low';
  return (
    <View style={styles.scaleCard}>
      <View style={styles.scaleHeader}>
        <Text style={styles.scaleLabel}>{content.label}</Text>
        <Text style={styles.scaleScore}>
          {score.toFixed(2)} · {levelLabel}
        </Text>
      </View>
      <Text style={styles.scaleOneLiner}>{content.oneLiner}</Text>
      <View style={styles.spectrumBar}>
        <View
          style={[styles.spectrumFill, { width: `${normalized * 100}%` }]}
        />
        <View
          style={[styles.spectrumMidline, { left: '50%' }]}
        />
        <View
          style={[styles.spectrumMarker, { left: `${normalized * 100}%` }]}
        />
      </View>
    </View>
  );
}

function QuadrantMap({
  anxiety,
  avoidance,
  currentStyle,
  locale,
}: {
  anxiety: number;  // [0, 1]
  avoidance: number;  // [0, 1]
  currentStyle: EcrStyle;
  locale: EcrLocale;
}) {
  const isPt = locale === 'pt';
  // 4 quadrants:
  //   top-left: secure (low anxiety, low avoidance) — but visualised with
  //   anxiety on Y-axis (low at top? or bottom?). Convention: low at bottom.
  //
  // Layout:
  //   Y-axis = Anxiety (bottom = low, top = high)
  //   X-axis = Avoidance (left = low, right = high)
  //
  //   So: bottom-left = SECURE, top-left = ANXIOUS,
  //       bottom-right = AVOIDANT, top-right = FEARFUL.
  //
  // Marker position: x = avoidance, y = (1 - anxiety) so high anxiety
  // appears at top.
  const markerX = (`${avoidance * 100}%`) as `${number}%`;
  const markerY = (`${(1 - anxiety) * 100}%`) as `${number}%`;

  return (
    <View style={styles.quadrantWrap}>
      <View style={styles.quadrantBox}>
        {/* Quadrant labels */}
        <Text style={[styles.quadLabel, styles.quadTL, currentStyle === 'preoccupied' && styles.quadActive]}>
          {isPt ? 'Ansioso' : 'Anxious'}
        </Text>
        <Text style={[styles.quadLabel, styles.quadTR, currentStyle === 'fearful' && styles.quadActive]}>
          {isPt ? 'Temeroso' : 'Fearful'}
        </Text>
        <Text style={[styles.quadLabel, styles.quadBL, currentStyle === 'secure' && styles.quadActive]}>
          {isPt ? 'Seguro' : 'Secure'}
        </Text>
        <Text style={[styles.quadLabel, styles.quadBR, currentStyle === 'dismissive' && styles.quadActive]}>
          {isPt ? 'Evitante' : 'Avoidant'}
        </Text>

        {/* Crosshairs */}
        <View style={styles.quadHLine} />
        <View style={styles.quadVLine} />

        {/* Marker */}
        <View
          style={[
            styles.quadMarker,
            { left: markerX, top: markerY },
          ]}
        />
      </View>

      <View style={styles.quadAxisLabels}>
        <Text style={styles.quadAxisText}>
          {isPt ? '← evitação baixa · evitação alta →' : '← low avoidance · high avoidance →'}
        </Text>
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

  styleCard: {
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(155, 130, 255, 0.30)',
    backgroundColor: 'rgba(155, 130, 255, 0.06)',
    padding: tokens.space[4],
    gap: tokens.space[2],
  },
  styleLabel: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 12,
    letterSpacing: 1.2,
    color: tokens.text.hi,
  },
  styleHeadline: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 16,
    color: tokens.brand.violet2,
    lineHeight: 22,
  },
  borderlineNote: {
    ...tokens.type.body,
    color: tokens.text.dim,
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 17,
  },
  styleBody: {
    ...tokens.type.body,
    color: tokens.text.base,
    lineHeight: 21,
  },
  dayToDayRow: {
    flexDirection: 'row',
    gap: tokens.space[2],
  },
  styleDayToDay: {
    flex: 1,
    ...tokens.type.body,
    color: tokens.text.mid,
    fontSize: 13,
    lineHeight: 19,
  },
  growthLabel: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    letterSpacing: 1,
    color: tokens.brand.violet2,
    marginTop: tokens.space[2],
  },
  styleGrowth: {
    ...tokens.type.body,
    color: tokens.text.base,
    fontSize: 13,
    lineHeight: 19,
  },

  scaleCard: {
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.border.base,
    backgroundColor: tokens.bg.surface,
    padding: tokens.space[3],
    gap: tokens.space[2],
  },
  scaleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scaleLabel: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 13,
    color: tokens.text.hi,
    letterSpacing: 0.4,
  },
  scaleScore: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    color: tokens.text.mid,
  },
  scaleOneLiner: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    color: tokens.text.dim,
    lineHeight: 17,
  },
  spectrumBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.06)',
    position: 'relative',
    marginTop: 4,
  },
  spectrumFill: {
    height: '100%',
    backgroundColor: tokens.brand.violet2,
    borderRadius: 3,
    opacity: 0.5,
  },
  spectrumMidline: {
    position: 'absolute',
    top: -2,
    width: 1,
    height: 10,
    backgroundColor: tokens.text.dim,
    opacity: 0.5,
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

  quadrantWrap: { gap: tokens.space[2] },
  quadrantBox: {
    aspectRatio: 1,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.border.base,
    backgroundColor: tokens.bg.surface,
    position: 'relative',
    overflow: 'hidden',
  },
  quadLabel: {
    position: 'absolute',
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    color: tokens.text.dim,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  quadActive: {
    color: tokens.brand.violet2,
    fontFamily: 'Manrope_800ExtraBold',
  },
  quadTL: { top: 8, left: 10 },
  quadTR: { top: 8, right: 10 },
  quadBL: { bottom: 8, left: 10 },
  quadBR: { bottom: 8, right: 10 },
  quadHLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: 1,
    backgroundColor: tokens.text.dim,
    opacity: 0.3,
  },
  quadVLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: 1,
    backgroundColor: tokens.text.dim,
    opacity: 0.3,
  },
  quadMarker: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: tokens.brand.violet2,
    marginLeft: -7,
    marginTop: -7,
    borderWidth: 2,
    borderColor: tokens.bg.surface,
  },
  quadAxisLabels: {
    alignItems: 'center',
  },
  quadAxisText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 10,
    letterSpacing: 0.5,
    color: tokens.text.dim,
  },

  expandToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: tokens.space[2],
    paddingVertical: tokens.space[2],
  },
  expandToggleText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    letterSpacing: 0.4,
    color: tokens.brand.violet2,
    textTransform: 'uppercase',
  },
  otherStyles: {
    gap: tokens.space[3],
    paddingTop: tokens.space[2],
  },
  otherStyleBlock: {
    paddingLeft: tokens.space[3],
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(155, 130, 255, 0.20)',
    gap: 4,
  },
  otherStyleLabel: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
    letterSpacing: 0.6,
    color: tokens.text.dim,
    textTransform: 'uppercase',
  },
  otherStyleHeadline: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 13,
    color: tokens.text.mid,
  },
  otherStyleBody: {
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
