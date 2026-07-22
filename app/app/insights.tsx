import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
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

import { ScreenBackground } from '@/components/ScreenBackground';
import { SegmentedControl } from '@/components/SegmentedControl';
import { HistoryLensTabs } from '@/components/history/HistoryLensTabs';
import { MoodFace } from '@/components/mood/MoodFace';
import { useCorrelation } from '@/lib/api/correlation';
import { useMoodTags } from '@/lib/api/mood';
import {
  computeByFeeling,
  computeBySub,
  MIN_MOOD_DAYS,
  type DayRecord,
} from '@/lib/correlation';
import type { SubId } from '@/lib/db/types';
import { useT } from '@/lib/i18n';
import { useMetaLookup } from '@/lib/i18n/meta';
import { moodLevel, splitMoodTags, type MoodValue } from '@/lib/mood';
import { tokens } from '@/theme';
import { DIMENSION_ORDER, SUBS_BY_DIM } from '@/theme/dimensions';

type Lens = 'feeling' | 'activity';
type Band = 'great' | 'ok' | 'low';
type Feeling = { type: 'band'; band: Band } | { type: 'tag'; slug: string };

/**
 * The three bands are windows over the 5-point mood ladder (great = 4–5,
 * ok = 3, low = 1–2), so they take their swatch and face from `MOOD_LEVELS`
 * rather than restating hexes. They used to hardcode the old red→green ramp,
 * which meant the chips silently kept the pre-CVD colors after `lib/mood.ts`
 * moved to the blue→gold ramp. The representative level per band is the one a
 * user most often lands on: 5, 3 and 2 — rendered as the drawn MoodFace.
 */
const BANDS: { band: Band; level: MoodValue; color: string; labelKey: string }[] = [
  { band: 'great', level: 5, color: moodLevel(5).color, labelKey: 'insights.bandGreat' },
  { band: 'ok', level: 3, color: moodLevel(3).color, labelKey: 'insights.bandOk' },
  { band: 'low', level: 2, color: moodLevel(2).color, labelKey: 'insights.bandLow' },
];

function matchFor(feeling: Feeling): (r: DayRecord) => boolean {
  if (feeling.type === 'tag') return (r) => r.tags.includes(feeling.slug);
  if (feeling.band === 'great') return (r) => r.mood !== null && r.mood >= 4;
  if (feeling.band === 'ok') return (r) => r.mood === 3;
  return (r) => r.mood !== null && r.mood <= 2;
}

export default function InsightsScreen() {
  const router = useRouter();
  const { t, locale } = useT();
  const meta = useMetaLookup();
  const tags = useMoodTags();
  const { records, isLoading } = useCorrelation(90);

  const [lens, setLens] = useState<Lens>('feeling');
  const [feeling, setFeeling] = useState<Feeling>({ type: 'band', band: 'great' });
  const [sub, setSub] = useState<SubId | null>(null);

  const nfLocale = locale === 'en' ? 'en-US' : 'pt-BR';
  const fmt1 = (n: number) =>
    n.toLocaleString(nfLocale, { maximumFractionDigits: 1 });

  const moodDays = useMemo(
    () => (records ? records.filter((r) => r.mood !== null).length : 0),
    [records],
  );
  const notEnoughGlobal = records !== null && moodDays < MIN_MOOD_DAYS;

  const feelingRes = useMemo(
    () => (records ? computeByFeeling(records, matchFor(feeling)) : null),
    [records, feeling],
  );
  const subRes = useMemo(
    () => (records && sub ? computeBySub(records, sub) : null),
    [records, sub],
  );

  const tagLabel = (slug: string): string => {
    const tg = tags.data?.find((x) => x.slug === slug);
    if (!tg) return slug;
    const label = locale === 'en' ? tg.label_en : tg.label_pt;
    return tg.emoji ? `${tg.emoji} ${label}` : label;
  };

  // Emotion words first, context ("what influenced") after — the two groups'
  // sort_orders interleave in the raw catalog, which would shuffle them
  // together in the chip cloud.
  const orderedTagChips = useMemo(() => {
    const { emotions, contexts } = splitMoodTags(tags.data ?? []);
    return [...emotions, ...contexts];
  }, [tags.data]);

  const feelingLabel = (): string => {
    if (feeling.type === 'tag') return tagLabel(feeling.slug);
    const b = BANDS.find((x) => x.band === feeling.band)!;
    return t(b.labelKey);
  };

  const showWhyMislead = () =>
    Alert.alert(t('insights.whyMisleadTitle'), t('insights.whyMisleadBody'));

  const maxLift = useMemo(() => {
    const finite = (feelingRes?.rows ?? [])
      .map((r) => r.lift)
      .filter((l) => Number.isFinite(l));
    return finite.length ? Math.max(...finite, 1) : 1;
  }, [feelingRes]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenBackground>
        <View style={styles.header}>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
            hitSlop={8}
            accessibilityLabel={t('common.back')}
          >
            <Ionicons name="chevron-back" size={22} color={tokens.text.hi} />
          </Pressable>
          <View style={styles.headerCol}>
            <Text style={styles.title}>{t('insights.title')}</Text>
            <Text style={styles.windowLabel}>{t('insights.window90')}</Text>
          </View>
          <View style={styles.backBtn} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <HistoryLensTabs current="insights" />

          <SegmentedControl<Lens>
            options={[
              { value: 'feeling', label: t('insights.lensFeeling') },
              { value: 'activity', label: t('insights.lensActivity') },
            ]}
            value={lens}
            onChange={setLens}
          />

          {isLoading || records === null ? (
            <View style={styles.loading}>
              <ActivityIndicator color={tokens.brand.violet2} />
            </View>
          ) : notEnoughGlobal ? (
            <View style={styles.emptyCard}>
              <Ionicons
                name="sparkles-outline"
                size={22}
                color={tokens.brand.violet2}
              />
              <Text style={styles.emptyText}>
                {t('insights.notEnoughGlobal', { n: MIN_MOOD_DAYS - moodDays })}
              </Text>
            </View>
          ) : lens === 'feeling' ? (
            renderFeeling()
          ) : (
            renderActivity()
          )}
        </ScrollView>
      </ScreenBackground>
    </SafeAreaView>
  );

  // ── Lens: by feeling → ranked activities ────────────────────────────────
  function renderFeeling() {
    return (
      <>
        <Text style={styles.pickPrompt}>{t('insights.feelingPrompt')}</Text>
        <View style={styles.chipsWrap}>
          {BANDS.map((b) => {
            const active = feeling.type === 'band' && feeling.band === b.band;
            return (
              <Pressable
                key={b.band}
                onPress={() => setFeeling({ type: 'band', band: b.band })}
                style={[
                  styles.chip,
                  active && { backgroundColor: b.color, borderColor: b.color },
                ]}
                hitSlop={2}
              >
                {/* Active face on either chip state: on the dark chip the
                    colored disc is the band swatch; on the active (band-
                    colored) chip the disc merges into the bg and the ink
                    features stay ≥4.5:1 by the ramp's own measurements. */}
                <MoodFace value={b.level} size={16} active />
                <Text style={[styles.chipText, active && styles.chipTextActiveDark]}>
                  {t(b.labelKey)}
                </Text>
              </Pressable>
            );
          })}
          {orderedTagChips.map((tag) => {
            const active = feeling.type === 'tag' && feeling.slug === tag.slug;
            return (
              <Pressable
                key={tag.slug}
                onPress={() => setFeeling({ type: 'tag', slug: tag.slug })}
                style={[styles.chip, active && styles.chipActiveViolet]}
                hitSlop={2}
              >
                {tag.emoji ? <Text style={styles.chipEmoji}>{tag.emoji}</Text> : null}
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {locale === 'en' ? tag.label_en : tag.label_pt}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {!feelingRes?.enough ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              {t('insights.notEnoughFeeling', { n: feelingRes?.matchN ?? 0 })}
            </Text>
          </View>
        ) : feelingRes.rows.length === 0 ? (
          <Text style={styles.hint}>{t('insights.noPattern')}</Text>
        ) : (
          <>
            <Text style={styles.headline}>
              {t('insights.headlineFeeling', {
                count: feelingRes.matchN,
                label: feelingLabel().toLowerCase(),
              })}
            </Text>
            <View style={styles.rows}>
              {feelingRes.rows.map((row) => {
                const sm = meta.sub(row.subId);
                const dm = meta.dim(sm.dimensionId);
                const barW = Number.isFinite(row.lift)
                  ? Math.max(8, Math.min(100, (row.lift / maxLift) * 100))
                  : 100;
                return (
                  <View key={row.subId} style={styles.liftRow}>
                    <Text style={styles.liftLabel} numberOfLines={1}>
                      {sm.label}
                    </Text>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          { width: `${barW}%`, backgroundColor: dm.color },
                        ]}
                      />
                    </View>
                    <View style={styles.liftMetaCol}>
                      <Text style={styles.liftValue}>
                        {Number.isFinite(row.lift)
                          ? t('insights.liftMore', { n: fmt1(row.lift) })
                          : t('insights.onlyOnThese')}
                      </Text>
                      <Text style={styles.dots}>
                        {'●'.repeat(row.confidence)}
                        <Text style={styles.dotsOff}>
                          {'○'.repeat(5 - row.confidence)}
                        </Text>
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
            <Pressable onPress={showWhyMislead} style={styles.noteRow} hitSlop={6}>
              <Ionicons name="information-circle-outline" size={13} color={tokens.semantic.warn} />
              <Text style={styles.noteText}>{t('insights.cooccurNote')}</Text>
            </Pressable>
          </>
        )}
      </>
    );
  }

  // ── Lens: by activity → mood delta ──────────────────────────────────────
  function renderActivity() {
    return (
      <>
        <Text style={styles.pickPrompt}>{t('insights.activityPrompt')}</Text>
        <View style={styles.chipsWrap}>
          {DIMENSION_ORDER.flatMap((dim) =>
            SUBS_BY_DIM[dim].map((subId) => {
              const sm = meta.sub(subId);
              const dm = meta.dim(dim);
              const active = sub === subId;
              return (
                <Pressable
                  key={subId}
                  onPress={() => setSub(subId)}
                  style={[
                    styles.chip,
                    active && { backgroundColor: `${dm.color}22`, borderColor: dm.color },
                  ]}
                  hitSlop={2}
                >
                  <Ionicons
                    name={sm.iconName as never}
                    size={13}
                    color={active ? dm.color : tokens.text.dim}
                  />
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {sm.label}
                  </Text>
                </Pressable>
              );
            }),
          )}
        </View>

        {!sub ? (
          <Text style={styles.hint}>{t('insights.activityHint')}</Text>
        ) : !subRes?.enough ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              {t('insights.notEnoughSub', { label: meta.sub(sub).label })}
            </Text>
          </View>
        ) : (
          <View style={styles.deltaCard}>
            <Text style={styles.deltaTitle}>
              {t('insights.subMoodHeadline', { label: meta.sub(sub).label })}
            </Text>
            <View style={styles.deltaRow}>
              <Text style={styles.deltaNum}>{fmt1(subRes.avgWith)}</Text>
              <Text style={styles.deltaWith}>
                {t('insights.avgWith', { n: subRes.withN })}
              </Text>
              <Text
                style={[
                  styles.deltaDelta,
                  { color: subRes.delta >= 0 ? tokens.semantic.xp : tokens.semantic.warn },
                ]}
              >
                {subRes.delta >= 0 ? '+' : ''}
                {fmt1(subRes.delta)}
              </Text>
            </View>
            <Text style={styles.deltaVs}>
              {t('insights.avgWithout', {
                avg: fmt1(subRes.avgWithout),
                days: subRes.moodDays,
              })}
            </Text>
            {subRes.topTags.length > 0 && (
              <View style={styles.topTagsRow}>
                <Text style={styles.topTagsLabel}>{t('insights.topTags')}</Text>
                {subRes.topTags.map((tt) => (
                  <View key={tt.slug} style={styles.tagPill}>
                    <Text style={styles.tagPillText}>{tagLabel(tt.slug)}</Text>
                  </View>
                ))}
              </View>
            )}
            <Pressable onPress={showWhyMislead} style={styles.noteRow} hitSlop={6}>
              <Ionicons name="information-circle-outline" size={13} color={tokens.semantic.warn} />
              <Text style={styles.noteText}>{t('insights.cooccurNote')}</Text>
            </Pressable>
          </View>
        )}
      </>
    );
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.bg.deep },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[3],
    borderBottomWidth: 1,
    borderBottomColor: tokens.border.divider,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: tokens.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCol: { alignItems: 'center', gap: 1 },
  title: { ...tokens.type.h3, color: tokens.text.hi },
  windowLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    color: tokens.text.dim,
  },
  content: {
    padding: tokens.space[4],
    gap: tokens.space[4],
    paddingBottom: tokens.space[8],
  },
  loading: { paddingVertical: tokens.space[7], alignItems: 'center' },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    padding: tokens.space[4],
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.bg.surface,
    borderWidth: 1,
    borderColor: tokens.border.base,
  },
  emptyText: {
    flex: 1,
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    lineHeight: 19,
    color: tokens.text.mid,
  },
  pickPrompt: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: tokens.text.mid,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: -tokens.space[2],
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.border.base,
    backgroundColor: tokens.bg.surface,
  },
  chipActiveViolet: {
    borderColor: tokens.brand.violet2,
    backgroundColor: 'rgba(123, 92, 255, 0.16)',
  },
  chipEmoji: { fontSize: 13 },
  chipText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: tokens.text.mid,
  },
  chipTextActive: {
    fontFamily: 'Manrope_800ExtraBold',
    color: tokens.text.hi,
  },
  chipTextActiveDark: {
    fontFamily: 'Manrope_800ExtraBold',
    color: tokens.bg.deep,
  },
  headline: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
    lineHeight: 20,
    color: tokens.text.base,
  },
  rows: { gap: 10 },
  liftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  liftLabel: {
    width: 88,
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: tokens.text.hi,
  },
  barTrack: {
    flex: 1,
    height: 22,
    borderRadius: 6,
    backgroundColor: tokens.bg.surface,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 6 },
  liftMetaCol: { width: 96, alignItems: 'flex-end', gap: 1 },
  liftValue: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    color: tokens.text.mid,
  },
  dots: { fontSize: 9, color: tokens.semantic.xp, letterSpacing: 1 },
  dotsOff: { color: tokens.text.faint },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: tokens.space[2],
  },
  noteText: {
    flex: 1,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    color: tokens.text.dim,
  },
  hint: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    color: tokens.text.dim,
    fontStyle: 'italic',
  },
  deltaCard: {
    padding: tokens.space[4],
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.bg.surface,
    borderWidth: 1,
    borderColor: tokens.border.base,
    gap: tokens.space[2],
  },
  deltaTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: tokens.text.hi,
  },
  deltaRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    flexWrap: 'wrap',
  },
  deltaNum: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 26,
    color: tokens.semantic.xp,
  },
  deltaWith: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    color: tokens.text.mid,
  },
  deltaDelta: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 14,
  },
  deltaVs: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    color: tokens.text.dim,
  },
  topTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  topTagsLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    color: tokens.text.dim,
  },
  tagPill: {
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: tokens.radius.pill,
    backgroundColor: 'rgba(123, 92, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(123, 92, 255, 0.28)',
  },
  tagPillText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    color: tokens.text.base,
  },
});
