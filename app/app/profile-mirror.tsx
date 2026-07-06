import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenBackground } from '@/components/ScreenBackground';
import { pickSubScoresDecimal, useCharacter } from '@/lib/api/character';
import {
  useLastPsychSession,
  useLastWellbeingSession,
  useSessionScores,
} from '@/lib/api/psych';
import { daysSince } from '@/lib/api/questionnaire';
import { bucketForDelta, dimScoreFromSubs } from '@/lib/assessment/feedback';
import type { DimensionId, SubId } from '@/lib/db/types';
import { useT } from '@/lib/i18n';
import { useMetaLookup } from '@/lib/i18n/meta';
import {
  BIG_FIVE_TRAIT_ORDER,
  getTraitContent,
  traitFromFacetId,
  type BigFiveLocale,
  type BigFiveTrait,
} from '@/lib/psych/big-five-content';
import {
  getValueContent,
  valueFromFacetId,
  type SchwartzLocale,
  type SchwartzValue,
} from '@/lib/psych/schwartz-content';
import {
  getStyleContent,
  scaleFromFacetId,
  styleFromScales,
  type EcrLocale,
  type EcrScale,
} from '@/lib/psych/ecr-r-content';
import {
  blendFromScores,
  DISC_FACTOR_ORDER,
  factorFromFacetId,
  getBlendContent,
  type DiscFactor,
  type DiscLocale,
} from '@/lib/psych/disc-content';
import {
  getStrengthContent,
  strengthFromFacetId,
  type StrengthSlug,
  type StrengthsLocale,
} from '@/lib/psych/strengths-content';
import {
  AXIS_ORDER,
  axisFromFacetId,
  codeFromAxisMeans,
  getTypeContent,
  type AxisSlug,
  type TypesLocale,
} from '@/lib/psych/types-content';
import { useInstrumentAccess, useInstrumentTeaserStore } from '@/lib/premium';
import { formatScore } from '@/lib/util/formatScore';
import { tokens } from '@/theme';
import {
  DIMENSION_META,
  DIMENSION_ORDER,
  SUBS_BY_DIM,
  SUB_META,
} from '@/theme/dimensions';

/**
 * Profile/Mirror screen — the user's reflection across all psychometric
 * instruments. Phase 3 ships only the Avaliação card with real data;
 * Big Five / Valores / Apego land in their own phases (each gated on a
 * licensed PT-BR translation of the source instrument).
 *
 * Modal route, presented from AvaliacaoPanel ("Ver perfil" CTA).
 */
export default function ProfileMirrorScreen() {
  const router = useRouter();
  const { locale } = useT();
  const isPt = locale !== 'en';
  const character = useCharacter();
  const lastSession = useLastWellbeingSession();
  const meta = useMetaLookup();

  const qScores = useMemo(
    () => pickSubScoresDecimal(character.data?.subScores ?? [], 'questionnaire'),
    [character.data?.subScores],
  );
  // Self scores power the Δ pip next to each dim's total. When the user
  // hasn't completed a self-assessment yet, the map is empty and DimRow
  // skips the pip entirely (rather than rendering "+X" against an
  // implicit zero).
  const selfScores = useMemo(
    () => pickSubScoresDecimal(character.data?.subScores ?? [], 'self'),
    [character.data?.subScores],
  );
  const hasData = qScores.size > 0;
  const hasSelf = selfScores.size > 0;
  const sinceDays = daysSince(lastSession.data?.taken_at);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenBackground>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backBtn,
              pressed && { opacity: 0.7 },
            ]}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={22} color={tokens.text.hi} />
          </Pressable>
          <Text style={styles.title}>{isPt ? 'Perfil' : 'Profile'}</Text>
          <View style={{ width: 44 }} />
        </View>

        {character.isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={tokens.brand.violet2} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.lede}>
              {isPt
                ? 'O espelho — quem você é, em diferentes lentes. Cada teste responde uma pergunta diferente. Eles não competem.'
                : "The mirror — who you are, through different lenses. Each test answers a different question. They don't compete."}
            </Text>

            {/* ─── Avaliação card ──────────────────────────────────────── */}
            <View style={[styles.card, styles.cardActive]}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Ionicons
                    name="pulse"
                    size={18}
                    color={tokens.brand.violet2}
                  />
                  <Text style={styles.cardTitle}>
                    {isPt ? 'Avaliação' : 'Assessment'}
                  </Text>
                </View>
                <Text style={styles.cardSub}>
                  {isPt
                    ? 'Como eu tô agora · estado · nos últimos 30-90 dias'
                    : "How I'm doing · state · over the past 30-90 days"}
                </Text>
              </View>

              {hasData ? (
                <>
                  <View style={styles.dimGrid}>
                    {DIMENSION_ORDER.map((dim) => (
                      <DimRow
                        key={dim}
                        dim={dim}
                        scores={qScores}
                        label={meta.dim(dim).label}
                        selfDimScore={
                          hasSelf ? dimScoreFromSubs(selfScores, dim) : undefined
                        }
                      />
                    ))}
                  </View>
                  <Pressable
                    onPress={() => router.replace('/questionnaire')}
                    style={({ pressed }) => [
                      styles.refazerBtn,
                      pressed && { opacity: 0.85 },
                    ]}
                    hitSlop={4}
                  >
                    <Ionicons
                      name="refresh"
                      size={14}
                      color={tokens.brand.violet2}
                    />
                    <Text style={styles.refazerText}>
                      {sinceDays === null
                        ? isPt
                          ? 'Refazer agora'
                          : 'Retake now'
                        : sinceDays === 0
                          ? isPt
                            ? 'Refeito hoje'
                            : 'Done today'
                          : isPt
                            ? `Refazer · ${sinceDays}d atrás`
                            : `Retake · ${sinceDays}d ago`}
                    </Text>
                  </Pressable>
                </>
              ) : (
                <Pressable
                  onPress={() => router.replace('/questionnaire')}
                  style={({ pressed }) => [
                    styles.cta,
                    pressed && { opacity: 0.85 },
                  ]}
                  hitSlop={4}
                >
                  <Text style={styles.ctaText}>
                    {isPt
                      ? 'Fazer Avaliação (5-10 min)'
                      : 'Take Assessment (5-10 min)'}
                  </Text>
                  <Ionicons
                    name="arrow-forward"
                    size={14}
                    color={tokens.brand.violet2}
                  />
                </Pressable>
              )}
            </View>

            {/* ─── Big Five ────────────────────────────────────────────── */}
            <BigFiveCard onOpen={() => router.replace('/big-five')} />

            {/* ─── Schwartz ────────────────────────────────────────────── */}
            <SchwartzCard onOpen={() => router.replace('/schwartz')} />

            {/* ─── Apego (ECR-R) ───────────────────────────────────────── */}
            <EcrRCard onOpen={() => router.replace('/ecr-r')} />

            {/* ─── DISC ────────────────────────────────────────────────── */}
            <DiscCard onOpen={() => router.replace('/disc')} />

            {/* ─── Forças de Caráter ───────────────────────────────────── */}
            <StrengthsCard onOpen={() => router.replace('/strengths')} />

            {/* ─── Tipos ───────────────────────────────────────────────── */}
            <TypesCard onOpen={() => router.replace('/types')} />

            <View style={{ height: tokens.space[6] }} />
          </ScrollView>
        )}
      </ScreenBackground>
    </SafeAreaView>
  );
}

function DimRow({
  dim,
  scores,
  label,
  selfDimScore,
}: {
  dim: DimensionId;
  scores: Map<SubId, number>;
  label: string;
  /**
   * The user's self-assessed total for this dim. When provided, the row
   * shows a `Δ +1.3` / `Δ -0.8` pip next to the questionnaire total. When
   * undefined (user hasn't done self yet), the pip is suppressed — we don't
   * render "+5.9" against an implicit 0.
   */
  selfDimScore?: number;
}) {
  const meta = DIMENSION_META[dim];
  const subs = SUBS_BY_DIM[dim];
  const dimScore = (scores.get(subs[0]) ?? 0) + (scores.get(subs[1]) ?? 0);

  // Δ = questionnaire - self. Color follows the same 5-bucket system as
  // the questionnaire result feedback: aligned = dim, slight = mid,
  // attention = the dim's own accent color so it pops.
  let deltaText: string | null = null;
  let deltaColor: string = tokens.text.dim;
  if (selfDimScore !== undefined) {
    const delta = dimScore - selfDimScore;
    const sign = delta >= 0 ? '+' : '-';
    deltaText = `Δ ${sign}${Math.abs(delta).toFixed(1)}`;
    const bucket = bucketForDelta(delta);
    if (bucket === 'aligned') deltaColor = tokens.text.dim;
    else if (
      bucket === 'slight_overestimate' ||
      bucket === 'slight_underestimate'
    )
      deltaColor = tokens.text.mid;
    else deltaColor = meta.color;
  }

  return (
    <View style={dimRowStyles.row}>
      <View style={[dimRowStyles.iconWrap, { backgroundColor: meta.bg }]}>
        <Ionicons
          name={meta.iconName as never}
          size={14}
          color={meta.color}
        />
      </View>
      <Text style={[dimRowStyles.label, { color: meta.color }]}>
        {label.toUpperCase()}
      </Text>
      <View style={dimRowStyles.subs}>
        {subs.map((subId) => (
          <View key={subId} style={dimRowStyles.subPill}>
            <Ionicons
              name={SUB_META[subId].iconName as never}
              size={10}
              color={tokens.text.dim}
            />
            <Text style={dimRowStyles.subScore}>
              {formatScore(scores.get(subId) ?? 0)}
            </Text>
          </View>
        ))}
      </View>
      <View style={dimRowStyles.totals}>
        <Text style={[dimRowStyles.dimScore, { color: meta.color }]}>
          {formatScore(dimScore)}
        </Text>
        {deltaText !== null && (
          <Text style={[dimRowStyles.deltaPip, { color: deltaColor }]}>
            {deltaText}
          </Text>
        )}
      </View>
    </View>
  );
}

export function BigFiveCard({ onOpen }: { onOpen: () => void }) {
  const { locale } = useT();
  const bfLocale: BigFiveLocale = locale === 'en' ? 'en' : 'pt';
  const isPt = bfLocale === 'pt';

  const lastSession = useLastPsychSession('big_five_120');
  const scoresQ = useSessionScores(lastSession.data?.id);
  const { locked } = useInstrumentAccess('big_five_120');
  const openTeaser = useInstrumentTeaserStore((s) => s.open);

  const traitScores = useMemo(() => {
    const map = new Map<BigFiveTrait, number>();
    for (const s of scoresQ.data ?? []) {
      const trait = traitFromFacetId(s.facet_id);
      if (trait) map.set(trait, Number(s.score_decimal));
    }
    return map;
  }, [scoresQ.data]);

  const hasScores = traitScores.size > 0;
  const sinceDays = daysSince(lastSession.data?.taken_at);

  return (
    <Pressable
      onPress={locked && !hasScores ? () => openTeaser('big_five_120') : onOpen}
      style={({ pressed }) => [
        styles.card,
        styles.cardActive,
        pressed && { opacity: 0.92 },
      ]}
      hitSlop={4}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Ionicons name="cube" size={18} color={tokens.brand.violet2} />
          <Text style={styles.cardTitle}>Big Five</Text>
          {locked && !hasScores && <LockChip />}
        </View>
        <Text style={styles.cardSub}>
          {isPt
            ? 'Quem eu sou · traço · ao longo dos anos'
            : 'Who I am · trait · over the years'}
        </Text>
      </View>

      {hasScores ? (
        <>
          <View style={styles.bfTraitGrid}>
            {BIG_FIVE_TRAIT_ORDER.map((trait) => {
              const raw = traitScores.get(trait);
              if (raw === undefined) return null;
              return (
                <BigFiveTraitRow
                  key={trait}
                  trait={trait}
                  rawScore={raw}
                  locale={bfLocale}
                />
              );
            })}
          </View>
          <View style={styles.refazerBtn}>
            <Ionicons
              name="refresh"
              size={14}
              color={tokens.brand.violet2}
            />
            <Text style={styles.refazerText}>
              {sinceDays === null
                ? isPt
                  ? 'Ver detalhes'
                  : 'See details'
                : sinceDays === 0
                  ? isPt
                    ? 'Refeito hoje · ver detalhes'
                    : 'Done today · see details'
                  : isPt
                    ? `Ver detalhes · ${sinceDays}d atrás`
                    : `See details · ${sinceDays}d ago`}
            </Text>
          </View>
        </>
      ) : locked ? (
        <LockedCta />
      ) : (
        <View style={styles.cta}>
          <Text style={styles.ctaText}>
            {isPt ? 'Fazer Big Five (10-20 min)' : 'Take Big Five (10-20 min)'}
          </Text>
          <Ionicons
            name="arrow-forward"
            size={14}
            color={tokens.brand.violet2}
          />
        </View>
      )}
    </Pressable>
  );
}

function BigFiveTraitRow({
  trait,
  rawScore,
  locale,
}: {
  trait: BigFiveTrait;
  rawScore: number;
  locale: BigFiveLocale;
}) {
  const content = getTraitContent(trait, locale);
  const normalized = Math.max(0, Math.min(1, (rawScore - 24) / 96));

  return (
    <View style={bfRowStyles.row}>
      <Text style={bfRowStyles.label}>{content.label.toUpperCase()}</Text>
      <View style={bfRowStyles.bar}>
        <View
          style={[bfRowStyles.barFill, { width: `${normalized * 100}%` }]}
        />
        <View
          style={[bfRowStyles.marker, { left: `${normalized * 100}%` }]}
        />
      </View>
    </View>
  );
}

export function SchwartzCard({ onOpen }: { onOpen: () => void }) {
  const { locale } = useT();
  const swLocale: SchwartzLocale = locale === 'en' ? 'en' : 'pt';
  const isPt = swLocale === 'pt';

  const lastSession = useLastPsychSession('schwartz_pvq');
  const scoresQ = useSessionScores(lastSession.data?.id);
  const { locked } = useInstrumentAccess('schwartz_pvq');
  const openTeaser = useInstrumentTeaserStore((s) => s.open);

  const top3 = useMemo(() => {
    const rows: { value: SchwartzValue; score: number }[] = [];
    for (const s of scoresQ.data ?? []) {
      const v = valueFromFacetId(s.facet_id);
      if (v) rows.push({ value: v, score: Number(s.score_decimal) });
    }
    rows.sort((a, b) => b.score - a.score);
    return rows.slice(0, 3);
  }, [scoresQ.data]);

  const hasScores = top3.length > 0;
  const sinceDays = daysSince(lastSession.data?.taken_at);

  return (
    <Pressable
      onPress={locked && !hasScores ? () => openTeaser('schwartz_pvq') : onOpen}
      style={({ pressed }) => [
        styles.card,
        styles.cardActive,
        pressed && { opacity: 0.92 },
      ]}
      hitSlop={4}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Ionicons name="compass" size={18} color={tokens.brand.violet2} />
          <Text style={styles.cardTitle}>
            {isPt ? 'Valores' : 'Values'}
          </Text>
          {locked && !hasScores && <LockChip />}
        </View>
        <Text style={styles.cardSub}>
          {isPt
            ? 'O que importa · prioridade · ao longo dos anos'
            : 'What matters · priority · over the years'}
        </Text>
      </View>

      {hasScores ? (
        <>
          <Text style={styles.cardLede}>
            {isPt ? 'Top 3 valores:' : 'Top 3 values:'}
          </Text>
          <View style={styles.bfTraitGrid}>
            {top3.map((row, i) => {
              const content = getValueContent(row.value, swLocale);
              return (
                <View key={row.value} style={swCardStyles.row}>
                  <Text style={swCardStyles.rank}>{i + 1}</Text>
                  <Text style={swCardStyles.label}>{content.label}</Text>
                </View>
              );
            })}
          </View>
          <View style={styles.refazerBtn}>
            <Ionicons name="refresh" size={14} color={tokens.brand.violet2} />
            <Text style={styles.refazerText}>
              {sinceDays === null
                ? isPt ? 'Ver detalhes' : 'See details'
                : sinceDays === 0
                  ? isPt ? 'Refeito hoje · ver detalhes' : 'Done today · see details'
                  : isPt ? `Ver detalhes · ${sinceDays}d atrás` : `See details · ${sinceDays}d ago`}
            </Text>
          </View>
        </>
      ) : locked ? (
        <LockedCta />
      ) : (
        <View style={styles.cta}>
          <Text style={styles.ctaText}>
            {isPt ? 'Fazer Valores (8-16 min)' : 'Take Values (8-16 min)'}
          </Text>
          <Ionicons name="arrow-forward" size={14} color={tokens.brand.violet2} />
        </View>
      )}
    </Pressable>
  );
}

const swCardStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
  },
  rank: {
    width: 18,
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
    color: tokens.brand.violet2,
  },
  label: {
    flex: 1,
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    color: tokens.text.hi,
  },
});

export function EcrRCard({ onOpen }: { onOpen: () => void }) {
  const { locale } = useT();
  const ecrLocale: EcrLocale = locale === 'en' ? 'en' : 'pt';
  const isPt = ecrLocale === 'pt';

  const lastSession = useLastPsychSession('ecr_r');
  const scoresQ = useSessionScores(lastSession.data?.id);
  const { locked } = useInstrumentAccess('ecr_r');
  const openTeaser = useInstrumentTeaserStore((s) => s.open);

  const { anxiety, avoidance } = useMemo(() => {
    const map = new Map<EcrScale, number>();
    for (const s of scoresQ.data ?? []) {
      const sc = scaleFromFacetId(s.facet_id);
      if (sc) map.set(sc, Number(s.score_decimal));
    }
    return {
      anxiety: map.get('anxiety'),
      avoidance: map.get('avoidance'),
    };
  }, [scoresQ.data]);

  const hasScores = anxiety !== undefined && avoidance !== undefined;
  const sinceDays = daysSince(lastSession.data?.taken_at);
  const style = hasScores ? styleFromScales(anxiety, avoidance) : null;
  const styleContent = style ? getStyleContent(style, ecrLocale) : null;

  return (
    <Pressable
      onPress={locked && !hasScores ? () => openTeaser('ecr_r') : onOpen}
      style={({ pressed }) => [
        styles.card,
        styles.cardActive,
        pressed && { opacity: 0.92 },
      ]}
      hitSlop={4}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Ionicons name="link" size={18} color={tokens.brand.violet2} />
          <Text style={styles.cardTitle}>
            {isPt ? 'Apego' : 'Attachment'}
          </Text>
          {locked && !hasScores && <LockChip />}
        </View>
        <Text style={styles.cardSub}>
          {isPt
            ? 'Como eu me ligo · padrão · ao longo dos anos'
            : 'How I bond · pattern · over the years'}
        </Text>
      </View>

      {hasScores && styleContent ? (
        <>
          <Text style={styles.cardLede}>
            {isPt ? 'Padrão:' : 'Pattern:'}
          </Text>
          <Text style={ecrCardStyles.styleName}>{styleContent.label}</Text>
          <Text style={ecrCardStyles.styleHeadline}>
            {styleContent.headline}
          </Text>
          <View style={styles.refazerBtn}>
            <Ionicons name="refresh" size={14} color={tokens.brand.violet2} />
            <Text style={styles.refazerText}>
              {sinceDays === null
                ? isPt ? 'Ver detalhes' : 'See details'
                : sinceDays === 0
                  ? isPt ? 'Refeito hoje · ver detalhes' : 'Done today · see details'
                  : isPt ? `Ver detalhes · ${sinceDays}d atrás` : `See details · ${sinceDays}d ago`}
            </Text>
          </View>
        </>
      ) : locked ? (
        <LockedCta />
      ) : (
        <View style={styles.cta}>
          <Text style={styles.ctaText}>
            {isPt ? 'Fazer Apego (6-12 min)' : 'Take Attachment (6-12 min)'}
          </Text>
          <Ionicons name="arrow-forward" size={14} color={tokens.brand.violet2} />
        </View>
      )}
    </Pressable>
  );
}

const ecrCardStyles = StyleSheet.create({
  styleName: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 18,
    color: tokens.brand.violet2,
    letterSpacing: 0.3,
  },
  styleHeadline: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    color: tokens.text.mid,
    lineHeight: 18,
    fontStyle: 'italic',
  },
});

export function DiscCard({ onOpen }: { onOpen: () => void }) {
  const { locale } = useT();
  const discLocale: DiscLocale = locale === 'en' ? 'en' : 'pt';
  const isPt = discLocale === 'pt';

  const lastSession = useLastPsychSession('disc');
  const scoresQ = useSessionScores(lastSession.data?.id);
  const { locked } = useInstrumentAccess('disc');
  const openTeaser = useInstrumentTeaserStore((s) => s.open);

  const blend = useMemo(() => {
    const map = new Map<DiscFactor, number>();
    for (const s of scoresQ.data ?? []) {
      const f = factorFromFacetId(s.facet_id);
      if (f) map.set(f, Number(s.score_decimal));
    }
    if (!DISC_FACTOR_ORDER.every((f) => map.has(f))) return null;
    const scores = {
      d: map.get('d')!,
      i: map.get('i')!,
      s: map.get('s')!,
      c: map.get('c')!,
    };
    const code = blendFromScores(scores);
    return { code, content: getBlendContent(code, discLocale) };
  }, [scoresQ.data, discLocale]);

  const hasScores = blend !== null;
  const sinceDays = daysSince(lastSession.data?.taken_at);

  return (
    <Pressable
      onPress={locked && !hasScores ? () => openTeaser('disc') : onOpen}
      style={({ pressed }) => [
        styles.card,
        styles.cardActive,
        pressed && { opacity: 0.92 },
      ]}
      hitSlop={4}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Ionicons name="shapes" size={18} color={tokens.brand.violet2} />
          <Text style={styles.cardTitle}>DISC</Text>
          {locked && !hasScores && <LockChip />}
        </View>
        <Text style={styles.cardSub}>
          {isPt
            ? 'Como eu ajo · estilo · ao longo dos anos'
            : 'How I act · style · over the years'}
        </Text>
      </View>

      {hasScores && blend ? (
        <>
          <Text style={styles.cardLede}>
            {isPt ? 'Perfil:' : 'Profile:'}
          </Text>
          <Text style={ecrCardStyles.styleName}>
            {blend.content.name} · {blend.code}
          </Text>
          <Text style={ecrCardStyles.styleHeadline}>{blend.content.headline}</Text>
          <View style={styles.refazerBtn}>
            <Ionicons name="refresh" size={14} color={tokens.brand.violet2} />
            <Text style={styles.refazerText}>
              {sinceDays === null
                ? isPt ? 'Ver detalhes' : 'See details'
                : sinceDays === 0
                  ? isPt ? 'Refeito hoje · ver detalhes' : 'Done today · see details'
                  : isPt ? `Ver detalhes · ${sinceDays}d atrás` : `See details · ${sinceDays}d ago`}
            </Text>
          </View>
        </>
      ) : locked ? (
        <LockedCta />
      ) : (
        <View style={styles.cta}>
          <Text style={styles.ctaText}>
            {isPt ? 'Fazer DISC (7-14 min)' : 'Take DISC (7-14 min)'}
          </Text>
          <Ionicons name="arrow-forward" size={14} color={tokens.brand.violet2} />
        </View>
      )}
    </Pressable>
  );
}

export function StrengthsCard({ onOpen }: { onOpen: () => void }) {
  const { locale } = useT();
  const stLocale: StrengthsLocale = locale === 'en' ? 'en' : 'pt';
  const isPt = stLocale === 'pt';

  const lastSession = useLastPsychSession('strengths');
  const scoresQ = useSessionScores(lastSession.data?.id);
  const { locked } = useInstrumentAccess('strengths');
  const openTeaser = useInstrumentTeaserStore((s) => s.open);

  const top3 = useMemo(() => {
    const rows: { slug: StrengthSlug; score: number }[] = [];
    for (const s of scoresQ.data ?? []) {
      const st = strengthFromFacetId(s.facet_id);
      if (st) rows.push({ slug: st, score: Number(s.score_decimal) });
    }
    rows.sort((a, b) => b.score - a.score);
    return rows.slice(0, 3);
  }, [scoresQ.data]);

  const hasScores = top3.length > 0;
  const sinceDays = daysSince(lastSession.data?.taken_at);

  return (
    <Pressable
      onPress={locked && !hasScores ? () => openTeaser('strengths') : onOpen}
      style={({ pressed }) => [
        styles.card,
        styles.cardActive,
        pressed && { opacity: 0.92 },
      ]}
      hitSlop={4}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Ionicons name="sparkles" size={18} color={tokens.brand.violet2} />
          <Text style={styles.cardTitle}>
            {isPt ? 'Forças' : 'Strengths'}
          </Text>
          {locked && !hasScores && <LockChip />}
        </View>
        <Text style={styles.cardSub}>
          {isPt
            ? 'No que eu brilho · força · ao longo dos anos'
            : 'Where I shine · strength · over the years'}
        </Text>
      </View>

      {hasScores ? (
        <>
          <Text style={styles.cardLede}>
            {isPt ? 'Forças-assinatura:' : 'Signature strengths:'}
          </Text>
          <View style={styles.bfTraitGrid}>
            {top3.map((row, i) => {
              const content = getStrengthContent(row.slug, stLocale);
              return (
                <View key={row.slug} style={swCardStyles.row}>
                  <Text style={swCardStyles.rank}>{i + 1}</Text>
                  <Text style={swCardStyles.label}>{content.label}</Text>
                </View>
              );
            })}
          </View>
          <View style={styles.refazerBtn}>
            <Ionicons name="refresh" size={14} color={tokens.brand.violet2} />
            <Text style={styles.refazerText}>
              {sinceDays === null
                ? isPt ? 'Ver detalhes' : 'See details'
                : sinceDays === 0
                  ? isPt ? 'Refeito hoje · ver detalhes' : 'Done today · see details'
                  : isPt ? `Ver detalhes · ${sinceDays}d atrás` : `See details · ${sinceDays}d ago`}
            </Text>
          </View>
        </>
      ) : locked ? (
        <LockedCta />
      ) : (
        <View style={styles.cta}>
          <Text style={styles.ctaText}>
            {isPt ? 'Fazer Forças (10-15 min)' : 'Take Strengths (10-15 min)'}
          </Text>
          <Ionicons name="arrow-forward" size={14} color={tokens.brand.violet2} />
        </View>
      )}
    </Pressable>
  );
}

export function TypesCard({ onOpen }: { onOpen: () => void }) {
  const { locale } = useT();
  const tyLocale: TypesLocale = locale === 'en' ? 'en' : 'pt';
  const isPt = tyLocale === 'pt';

  const lastSession = useLastPsychSession('tipos');
  const scoresQ = useSessionScores(lastSession.data?.id);
  const { locked } = useInstrumentAccess('tipos');
  const openTeaser = useInstrumentTeaserStore((s) => s.open);

  const result = useMemo(() => {
    const means = {} as Record<AxisSlug, number>;
    for (const s of scoresQ.data ?? []) {
      const a = axisFromFacetId(s.facet_id);
      if (a) means[a] = Number(s.score_decimal);
    }
    if (!AXIS_ORDER.every((a) => means[a] !== undefined)) return null;
    const code = codeFromAxisMeans(means);
    return { code, content: getTypeContent(code, tyLocale) };
  }, [scoresQ.data, tyLocale]);

  const hasScores = result !== null;
  const sinceDays = daysSince(lastSession.data?.taken_at);

  return (
    <Pressable
      onPress={locked && !hasScores ? () => openTeaser('tipos') : onOpen}
      style={({ pressed }) => [styles.card, styles.cardActive, pressed && { opacity: 0.92 }]}
      hitSlop={4}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Ionicons name="compass-outline" size={18} color={tokens.brand.violet2} />
          <Text style={styles.cardTitle}>{isPt ? 'Tipos' : 'Types'}</Text>
          {locked && !hasScores && <LockChip />}
        </View>
        <Text style={styles.cardSub}>
          {isPt
            ? 'Meu tipo · preferências · ao longo dos anos'
            : 'My type · preferences · over the years'}
        </Text>
      </View>

      {hasScores && result ? (
        <>
          <Text style={styles.cardLede}>{isPt ? 'Tipo:' : 'Type:'}</Text>
          <Text style={ecrCardStyles.styleName}>
            {result.code} · {result.content.name}
          </Text>
          <Text style={ecrCardStyles.styleHeadline}>{result.content.headline}</Text>
          <View style={styles.refazerBtn}>
            <Ionicons name="refresh" size={14} color={tokens.brand.violet2} />
            <Text style={styles.refazerText}>
              {sinceDays === null
                ? isPt ? 'Ver detalhes' : 'See details'
                : sinceDays === 0
                  ? isPt ? 'Refeito hoje · ver detalhes' : 'Done today · see details'
                  : isPt ? `Ver detalhes · ${sinceDays}d atrás` : `See details · ${sinceDays}d ago`}
            </Text>
          </View>
        </>
      ) : locked ? (
        <LockedCta />
      ) : (
        <View style={styles.cta}>
          <Text style={styles.ctaText}>
            {isPt ? 'Fazer Tipos (10-15 min)' : 'Take Types (10-15 min)'}
          </Text>
          <Ionicons name="arrow-forward" size={14} color={tokens.brand.violet2} />
        </View>
      )}
    </Pressable>
  );
}

/**
 * Small "Premium" pill shown in a locked instrument card's header, and the
 * locked CTA that replaces the "Fazer X" button. Both are rendered only when
 * the instrument is gated (premium instrument + free user + no prior result);
 * a locked instrument the user already completed behaves normally so the
 * historical result stays viewable.
 */
function LockChip() {
  const { t } = useT();
  return (
    <View style={styles.lockChip}>
      <Ionicons name="lock-closed" size={10} color={tokens.brand.violet2} />
      <Text style={styles.lockChipText}>{t('premium.teaser.lockedChip')}</Text>
    </View>
  );
}

function LockedCta() {
  const { t } = useT();
  return (
    <View style={[styles.cta, styles.ctaLocked]}>
      <Ionicons name="lock-closed" size={14} color={tokens.brand.violet2} />
      <Text style={styles.ctaText}>{t('premium.teaser.cta')}</Text>
    </View>
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
  title: {
    flex: 1,
    ...tokens.type.h2,
    color: tokens.text.hi,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: tokens.space[5],
    paddingTop: tokens.space[3],
    paddingBottom: tokens.space[7],
    gap: tokens.space[4],
  },
  lede: {
    ...tokens.type.body,
    color: tokens.text.mid,
    fontStyle: 'italic',
    lineHeight: 20,
    marginBottom: tokens.space[2],
  },
  card: {
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    backgroundColor: tokens.bg.surface,
    padding: tokens.space[4],
    gap: tokens.space[3],
  },
  cardActive: {
    borderColor: 'rgba(155, 130, 255, 0.30)',
    backgroundColor: 'rgba(155, 130, 255, 0.04)',
  },
  cardPending: {
    borderColor: tokens.border.base,
    borderStyle: 'dashed',
    opacity: 0.85,
  },
  cardHeader: {
    gap: 4,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
  },
  cardTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 16,
    color: tokens.text.hi,
    letterSpacing: 0.2,
  },
  cardSub: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    color: tokens.text.dim,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  dimGrid: {
    gap: tokens.space[2],
  },
  bfTraitGrid: {
    gap: tokens.space[2],
  },
  cardLede: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    color: tokens.text.dim,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  refazerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: tokens.space[2],
    paddingHorizontal: tokens.space[3],
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(155, 130, 255, 0.22)',
    borderStyle: 'dashed',
    alignSelf: 'flex-start',
  },
  refazerText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    color: tokens.brand.violet2,
    letterSpacing: 0.3,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: tokens.space[3],
    borderRadius: tokens.radius.md,
    backgroundColor: 'rgba(123, 92, 255, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(123, 92, 255, 0.30)',
  },
  ctaText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 13,
    letterSpacing: 0.3,
    color: tokens.brand.violet2,
  },
  ctaLocked: {
    backgroundColor: 'rgba(155, 130, 255, 0.06)',
    borderColor: 'rgba(155, 130, 255, 0.22)',
  },
  lockChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: tokens.radius.pill,
    backgroundColor: 'rgba(155, 130, 255, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(155, 130, 255, 0.28)',
  },
  lockChipText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 9,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: tokens.brand.violet2,
  },
  pendingNote: {
    ...tokens.type.body,
    color: tokens.text.mid,
    fontSize: 12,
    lineHeight: 17,
    fontStyle: 'italic',
  },
});

const bfRowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
  },
  label: {
    width: 110,
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    letterSpacing: 0.8,
    color: tokens.text.hi,
  },
  bar: {
    flex: 1,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.06)',
    position: 'relative',
  },
  barFill: {
    height: '100%',
    backgroundColor: tokens.brand.violet2,
    borderRadius: 2.5,
  },
  marker: {
    position: 'absolute',
    top: -3,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: tokens.brand.violet2,
    marginLeft: -5.5,
    borderWidth: 2,
    borderColor: tokens.bg.surface,
  },
});

const dimRowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
  },
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: tokens.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    width: 70,
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    letterSpacing: 1,
  },
  subs: {
    flex: 1,
    flexDirection: 'row',
    gap: tokens.space[2],
  },
  subPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: tokens.space[2],
    paddingVertical: 3,
    borderRadius: tokens.radius.pill,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: tokens.border.base,
  },
  subScore: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    color: tokens.text.base,
    minWidth: 22,
  },
  dimScore: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 14,
    minWidth: 36,
    textAlign: 'right',
  },
  // Wrap the dim total + Δ pip so they stack vertically without disturbing
  // the existing per-row alignment.
  totals: {
    alignItems: 'flex-end',
    minWidth: 36,
  },
  deltaPip: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    letterSpacing: 0.2,
    marginTop: 1,
  },
});
