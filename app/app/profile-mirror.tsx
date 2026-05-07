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
import type { DimensionId, SubId } from '@/lib/db/types';
import { useT } from '@/lib/i18n';
import { useMetaLookup } from '@/lib/i18n/meta';
import {
  BIG_FIVE_TRAIT_ORDER,
  bucketForTraitScore,
  getTraitContent,
  traitFromFacetId,
  type BigFiveBucket,
  type BigFiveLocale,
  type BigFiveTrait,
} from '@/lib/psych/big-five-content';
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
  const character = useCharacter();
  const lastSession = useLastWellbeingSession();
  const meta = useMetaLookup();

  const qScores = useMemo(
    () => pickSubScoresDecimal(character.data?.subScores ?? [], 'questionnaire'),
    [character.data?.subScores],
  );
  const hasData = qScores.size > 0;
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
          <Text style={styles.title}>Perfil</Text>
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
              O espelho — quem você é, em diferentes lentes. Cada teste responde
              uma pergunta diferente. Eles não competem.
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
                  <Text style={styles.cardTitle}>Avaliação</Text>
                </View>
                <Text style={styles.cardSub}>
                  Como eu tô agora · estado · 30-90 dias
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
                        ? 'Refazer agora'
                        : sinceDays === 0
                          ? 'Refeito hoje'
                          : `Refazer · ${sinceDays}d atrás`}
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
                  <Text style={styles.ctaText}>Fazer Avaliação (~12 min)</Text>
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

            {/* ─── Schwartz (placeholder) ──────────────────────────────── */}
            <PendingCard
              icon="compass"
              title="Valores (Schwartz)"
              subtitle="O que importa · prioridade · anos"
              note="Em construção — PVQ-RR, 19 valores em 4 grupos de ordem superior."
            />

            {/* ─── Apego (placeholder) ─────────────────────────────────── */}
            <PendingCard
              icon="link"
              title="Apego (ECR-R)"
              subtitle="Como eu me ligo · padrão · anos"
              note="Em construção — escalas de Ansiedade e Evitação, 36 itens."
            />

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
}: {
  dim: DimensionId;
  scores: Map<SubId, number>;
  label: string;
}) {
  const meta = DIMENSION_META[dim];
  const subs = SUBS_BY_DIM[dim];
  const dimScore = (scores.get(subs[0]) ?? 0) + (scores.get(subs[1]) ?? 0);

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
      <Text style={[dimRowStyles.dimScore, { color: meta.color }]}>
        {formatScore(dimScore)}
      </Text>
    </View>
  );
}

function BigFiveCard({ onOpen }: { onOpen: () => void }) {
  const { locale } = useT();
  const bfLocale: BigFiveLocale = locale === 'en' ? 'en' : 'pt';
  const isPt = bfLocale === 'pt';

  const lastSession = useLastPsychSession('big_five_120');
  const scoresQ = useSessionScores(lastSession.data?.id);

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
      onPress={onOpen}
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
        </View>
        <Text style={styles.cardSub}>
          {isPt
            ? 'Quem eu sou · traço · anos'
            : 'Who I am · trait · years'}
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
      ) : (
        <View style={styles.cta}>
          <Text style={styles.ctaText}>
            {isPt ? 'Fazer Big Five (~25 min)' : 'Take Big Five (~25 min)'}
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
  const bucket = bucketForTraitScore(rawScore);
  const normalized = Math.max(0, Math.min(1, (rawScore - 24) / 96));
  const isPt = locale === 'pt';
  const bucketLabel = (
    isPt
      ? { low: 'baixo', mid: 'médio', high: 'alto' }
      : { low: 'low', mid: 'mid', high: 'high' }
  )[bucket as BigFiveBucket];

  return (
    <View style={bfRowStyles.row}>
      <Text style={bfRowStyles.label}>{content.label.toUpperCase()}</Text>
      <View style={bfRowStyles.bar}>
        <View
          style={[bfRowStyles.barFill, { width: `${normalized * 100}%` }]}
        />
      </View>
      <Text style={bfRowStyles.bucket}>{bucketLabel}</Text>
    </View>
  );
}

function PendingCard({
  icon,
  title,
  subtitle,
  note,
}: {
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
  title: string;
  subtitle: string;
  note: string;
}) {
  return (
    <View style={[styles.card, styles.cardPending]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Ionicons name={icon} size={18} color={tokens.text.mid} />
          <Text style={[styles.cardTitle, { color: tokens.text.mid }]}>
            {title}
          </Text>
        </View>
        <Text style={styles.cardSub}>{subtitle}</Text>
      </View>
      <Text style={styles.pendingNote}>{note}</Text>
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
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: tokens.brand.violet2,
    borderRadius: 2.5,
  },
  bucket: {
    width: 48,
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    letterSpacing: 0.4,
    color: tokens.text.mid,
    textAlign: 'right',
    textTransform: 'uppercase',
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
});
