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
  blendFromScores,
  DISC_FACTOR_ORDER,
  factorFromFacetId,
  getBlendContent,
  getFactorContent,
  getGrowthEdge,
  getSituations,
  levelFromScore,
  normalizeFactorScore,
  primaryFactorOfBlend,
  type DiscFactor,
  type DiscLocale,
} from '@/lib/psych/disc-content';
import { tokens } from '@/theme';
import { useQueryClient } from '@tanstack/react-query';

type Phase = 'loading' | 'intro' | 'starting' | 'answering' | 'submitting' | 'result';

const INSTRUMENT_ID = 'disc';

/** Classic DISC accent colors, tuned for the dark theme. Contained here
 * because DISC's four-color identity is part of the instrument; everything
 * else uses design tokens. */
const DISC_FACTOR_COLOR: Record<DiscFactor, string> = {
  d: '#E5646E',
  i: '#E6B450',
  s: '#4FB477',
  c: '#5B8DEF',
};

export default function DiscScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { locale } = useT();
  const discLocale: DiscLocale = locale === 'en' ? 'en' : 'pt';

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
          discLocale === 'pt' ? 'Não foi possível abrir o teste' : 'Could not open the test',
          e?.message ?? (discLocale === 'pt' ? 'Tente novamente.' : 'Try again.'),
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
            discLocale === 'pt' ? 'Não foi possível salvar' : 'Could not save',
            e?.message ?? (discLocale === 'pt' ? 'Tente novamente.' : 'Try again.'),
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
        discLocale === 'pt' ? 'Sair do teste?' : 'Leave the test?',
        discLocale === 'pt'
          ? 'Suas respostas até aqui não serão salvas.'
          : "Your answers so far won't be saved.",
        [
          { text: discLocale === 'pt' ? 'Continuar' : 'Continue', style: 'cancel' },
          {
            text: discLocale === 'pt' ? 'Sair' : 'Leave',
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
          <IntroBody locale={discLocale} onStart={handleStart} onCancel={() => router.back()} />
        )}

        {(phase === 'starting' || phase === 'submitting') && (
          <View style={styles.center}>
            <Text style={styles.submittingText}>
              {phase === 'starting'
                ? discLocale === 'pt' ? 'Preparando…' : 'Preparing…'
                : discLocale === 'pt' ? 'Calculando…' : 'Computing…'}
            </Text>
          </View>
        )}

        {phase === 'answering' && current && (
          <AnsweringBody
            current={current}
            scaleLabels={scaleLabels}
            locale={discLocale}
            currentAnswer={answers.get(current.item_id)}
            onPick={handlePick}
          />
        )}

        {phase === 'result' && resultSessionId && (
          <ResultBody
            sessionId={resultSessionId}
            locale={discLocale}
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
  locale: DiscLocale;
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
        <Ionicons name="shapes" size={36} color={tokens.brand.violet2} />
      </View>
      <Text style={styles.introTitle}>DISC</Text>
      <Text style={styles.introSub}>
        {isPt
          ? '44 perguntas, 7-14 min. Mede seu estilo comportamental em 4 fatores — Dominância, Influência, Estabilidade e Conformidade — e devolve seu perfil predominante.'
          : '44 questions, 7-14 min. Measures your behavioral style across 4 factors — Dominance, Influence, Steadiness and Conscientiousness — and gives back your dominant profile.'}
      </Text>

      <View style={styles.introBullets}>
        <BulletRow
          icon="people-outline"
          text={
            isPt
              ? 'Sobre como você age e se relaciona no dia a dia.'
              : 'About how you act and relate day to day.'
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
              ? 'Reflexão, não diagnóstico. Nenhum estilo é melhor que o outro.'
              : 'For reflection, not diagnosis. No style is better than another.'
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
  locale: DiscLocale;
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
  locale: DiscLocale;
  onRetake: () => void;
}) {
  const isPt = locale === 'pt';
  const scoresQ = useSessionScores(sessionId);
  const [detailExpanded, setDetailExpanded] = useState(false);

  const factorScores = useMemo(() => {
    const map = new Map<DiscFactor, number>();
    for (const s of scoresQ.data ?? []) {
      const f = factorFromFacetId(s.facet_id);
      if (f) map.set(f, Number(s.score_decimal));
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

  const complete = DISC_FACTOR_ORDER.every((f) => factorScores.has(f));

  if (scoresQ.error || !complete) {
    return (
      <View style={styles.center}>
        <Text style={styles.submittingText}>
          {isPt ? 'Não foi possível ler o resultado.' : 'Could not load the result.'}
        </Text>
      </View>
    );
  }

  const scores = {
    d: factorScores.get('d')!,
    i: factorScores.get('i')!,
    s: factorScores.get('s')!,
    c: factorScores.get('c')!,
  };

  const blendCode = blendFromScores(scores);
  const blend = getBlendContent(blendCode, locale);
  const primary = primaryFactorOfBlend(blendCode);
  const accent = DISC_FACTOR_COLOR[primary];

  // Ranked factors (highest first) for the bars.
  const ranked = [...DISC_FACTOR_ORDER].sort((a, b) => scores[b] - scores[a]);

  // "Balanced" when the top two factors sit within 0.3 of each other — the
  // blend still shows, but we soften the framing.
  const isBalanced = Math.abs(scores[ranked[0]] - scores[ranked[1]]) < 0.3;

  return (
    <ScrollView
      contentContainerStyle={styles.resultContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.resultTitle}>
        {isPt ? 'Seu perfil DISC' : 'Your DISC profile'}
      </Text>
      <Text style={styles.resultLede}>
        {isPt
          ? 'DISC descreve tendências de comportamento, não define quem você é. Todo estilo tem força e sombra — e ninguém é uma letra só.'
          : "DISC describes behavioral tendencies, not who you are. Every style has its strength and its shadow — and no one is a single letter."}
      </Text>

      <View style={[styles.blendCard, { borderColor: `${accent}55`, backgroundColor: `${accent}12` }]}>
        <Text style={[styles.blendCode, { color: accent }]}>{blendCode}</Text>
        <Text style={styles.blendName}>{blend.name}</Text>
        <Text style={[styles.blendHeadline, { color: accent }]}>{blend.headline}</Text>
        {isBalanced && (
          <Text style={styles.balancedNote}>
            {isPt
              ? 'Seu perfil é bem equilibrado — nenhum fator domina com folga, então você transita entre estilos conforme a situação.'
              : 'Your profile is quite balanced — no factor clearly dominates, so you move between styles depending on the situation.'}
          </Text>
        )}
        <Text style={styles.blendBody}>{blend.body}</Text>
      </View>

      <Text style={styles.sectionHeader}>
        {isPt ? 'Os 4 fatores' : 'The 4 factors'}
      </Text>
      {ranked.map((f) => (
        <FactorRow
          key={f}
          factor={f}
          score={scores[f]}
          locale={locale}
        />
      ))}

      <Pressable
        onPress={() => setDetailExpanded((v) => !v)}
        style={({ pressed }) => [styles.expandToggle, pressed && { opacity: 0.7 }]}
        hitSlop={6}
      >
        <Text style={styles.expandToggleText}>
          {detailExpanded
            ? isPt ? 'Esconder o detalhe' : 'Hide the detail'
            : isPt ? 'Ver o que cada fator diz de você' : 'See what each factor says about you'}
        </Text>
        <Ionicons
          name={detailExpanded ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={tokens.brand.violet2}
        />
      </Pressable>

      {detailExpanded && (
        <View style={styles.detailBlocks}>
          {ranked.map((f) => {
            const content = getFactorContent(f, locale);
            const level = levelFromScore(scores[f]);
            return (
              <View
                key={f}
                style={[styles.detailBlock, { borderLeftColor: `${DISC_FACTOR_COLOR[f]}88` }]}
              >
                <View style={styles.detailHeader}>
                  <Text style={[styles.detailLabel, { color: DISC_FACTOR_COLOR[f] }]}>
                    {content.label}
                  </Text>
                  <Text style={styles.detailLevel}>
                    {isPt
                      ? level === 'high' ? 'alto' : level === 'low' ? 'baixo' : 'médio'
                      : level}
                  </Text>
                </View>
                <Text style={styles.detailText}>{content[level]}</Text>
              </View>
            );
          })}
        </View>
      )}

      <SituationList primary={primary} accent={accent} locale={locale} />

      <ActionBridge growth={getGrowthEdge(primary, locale)} accent={accent} locale={locale} />

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

function FactorRow({
  factor,
  score,
  locale,
}: {
  factor: DiscFactor;
  score: number;
  locale: DiscLocale;
}) {
  const content = getFactorContent(factor, locale);
  const color = DISC_FACTOR_COLOR[factor];
  const normalized = normalizeFactorScore(score);
  return (
    <View style={styles.factorCard}>
      <View style={styles.factorHeader}>
        <View style={styles.factorLabelWrap}>
          <View style={[styles.factorDot, { backgroundColor: color }]} />
          <Text style={styles.factorLabel}>{content.label}</Text>
        </View>
        <Text style={styles.factorScore}>{score.toFixed(2)}</Text>
      </View>
      <Text style={styles.factorOneLiner}>{content.oneLiner}</Text>
      <View style={styles.spectrumBar}>
        <View
          style={[
            styles.spectrumFill,
            { width: `${normalized * 100}%`, backgroundColor: color },
          ]}
        />
        <View style={[styles.spectrumMarker, { left: `${normalized * 100}%`, borderColor: color }]} />
      </View>
    </View>
  );
}

// ─── Situational portrait ─────────────────────────────────────────────────

function SituationList({
  primary,
  accent,
  locale,
}: {
  primary: DiscFactor;
  accent: string;
  locale: DiscLocale;
}) {
  const isPt = locale === 'pt';
  const situations = getSituations(locale);
  return (
    <>
      <Text style={styles.sectionHeader}>
        {isPt ? 'Você no dia a dia' : 'You, day to day'}
      </Text>
      <View style={styles.situationCard}>
        {situations.map((s, i) => (
          <View
            key={s.prompt}
            style={[styles.situationRow, i > 0 && styles.situationRowBorder]}
          >
            <Text style={styles.situationPrompt}>{s.prompt}</Text>
            <View style={styles.situationReactionRow}>
              <View style={[styles.situationDot, { backgroundColor: accent }]} />
              <Text style={styles.situationReaction}>{s.byFactor[primary]}</Text>
            </View>
          </View>
        ))}
      </View>
    </>
  );
}

// ─── Action bridge ("como treinar isso") ──────────────────────────────────

function ActionBridge({
  growth,
  accent,
  locale,
}: {
  growth: string;
  accent: string;
  locale: DiscLocale;
}) {
  const router = useRouter();
  const isPt = locale === 'pt';
  return (
    <>
      <Text style={styles.sectionHeader}>
        {isPt ? 'Como treinar isso' : 'How to train it'}
      </Text>
      <View style={[styles.bridgeCard, { borderColor: `${accent}44` }]}>
        <Text style={styles.bridgeGrowth}>{growth}</Text>
        <Text style={styles.bridgeHint}>
          {isPt
            ? 'Seu resultado não precisa parar na tela. Vira treino:'
            : "Your result doesn't have to stop at the screen. Turn it into training:"}
        </Text>
        <View style={styles.bridgeBtns}>
          <Pressable
            onPress={() => router.push('/quest-create')}
            style={({ pressed }) => [styles.bridgeBtn, pressed && { opacity: 0.75 }]}
            hitSlop={4}
          >
            <Ionicons name="flag-outline" size={15} color={tokens.brand.violet2} />
            <Text style={styles.bridgeBtnText}>
              {isPt ? 'Virar missão' : 'Make a mission'}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/skill-form')}
            style={({ pressed }) => [styles.bridgeBtn, pressed && { opacity: 0.75 }]}
            hitSlop={4}
          >
            <Ionicons name="barbell-outline" size={15} color={tokens.brand.violet2} />
            <Text style={styles.bridgeBtnText}>
              {isPt ? 'Criar habilidade' : 'Create a skill'}
            </Text>
          </Pressable>
        </View>
      </View>
    </>
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
  introTitle: { ...tokens.type.h1, color: tokens.text.hi, letterSpacing: 2 },
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

  blendCard: {
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    padding: tokens.space[4],
    gap: tokens.space[2],
  },
  blendCode: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 13,
    letterSpacing: 3,
  },
  blendName: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 22,
    color: tokens.text.hi,
    letterSpacing: 0.2,
  },
  blendHeadline: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 15,
    lineHeight: 21,
  },
  balancedNote: {
    ...tokens.type.body,
    color: tokens.text.dim,
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 17,
  },
  blendBody: {
    ...tokens.type.body,
    color: tokens.text.base,
    lineHeight: 21,
    marginTop: tokens.space[1],
  },

  factorCard: {
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.border.base,
    backgroundColor: tokens.bg.surface,
    padding: tokens.space[3],
    gap: tokens.space[2],
  },
  factorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  factorLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
  },
  factorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  factorLabel: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 13,
    color: tokens.text.hi,
    letterSpacing: 0.4,
  },
  factorScore: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    color: tokens.text.mid,
  },
  factorOneLiner: {
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
    borderRadius: 3,
    opacity: 0.6,
  },
  spectrumMarker: {
    position: 'absolute',
    top: -3,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: tokens.bg.surface,
    marginLeft: -6,
    borderWidth: 2,
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
  detailBlocks: {
    gap: tokens.space[3],
    paddingTop: tokens.space[1],
  },
  detailBlock: {
    paddingLeft: tokens.space[3],
    borderLeftWidth: 2,
    gap: 4,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 13,
    letterSpacing: 0.4,
  },
  detailLevel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    letterSpacing: 0.6,
    color: tokens.text.dim,
    textTransform: 'uppercase',
  },
  detailText: {
    ...tokens.type.body,
    color: tokens.text.base,
    fontSize: 13,
    lineHeight: 19,
  },

  situationCard: {
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.border.base,
    backgroundColor: tokens.bg.surface,
    paddingHorizontal: tokens.space[3],
  },
  situationRow: {
    paddingVertical: tokens.space[3],
    gap: 5,
  },
  situationRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: tokens.border.base,
  },
  situationPrompt: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    letterSpacing: 0.3,
    color: tokens.text.dim,
    textTransform: 'uppercase',
  },
  situationReactionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: tokens.space[2],
  },
  situationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
  },
  situationReaction: {
    flex: 1,
    ...tokens.type.body,
    color: tokens.text.base,
    fontSize: 13,
    lineHeight: 19,
  },

  bridgeCard: {
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    backgroundColor: tokens.bg.surface,
    padding: tokens.space[4],
    gap: tokens.space[3],
  },
  bridgeGrowth: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    lineHeight: 21,
    color: tokens.text.hi,
  },
  bridgeHint: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    lineHeight: 17,
    color: tokens.text.dim,
  },
  bridgeBtns: {
    flexDirection: 'row',
    gap: tokens.space[2],
  },
  bridgeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: tokens.space[3],
    paddingHorizontal: tokens.space[2],
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(155, 130, 255, 0.30)',
  },
  bridgeBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    color: tokens.brand.violet2,
    letterSpacing: 0.2,
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
