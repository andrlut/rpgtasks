import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  findNodeHandle,
  Platform,
  Pressable,
  type ScrollView as ScrollViewType,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type View as ViewType,
} from 'react-native';

import { InsightCard } from '@/components/InsightCard';
import { PeriodSelector } from '@/components/dedicacao/PeriodSelector';
import { Sparkline } from '@/components/dedicacao/Sparkline';
import { XpHexChart } from '@/components/dedicacao/XpHexChart';
import { ProgressBar } from '@/components/ProgressBar';
import {
  computeWindow,
  useDedicacaoWindow,
  type SubWindow,
  type WindowSpec,
} from '@/lib/api/dedicacao';
import type { CharacterDimension, DimensionId } from '@/lib/db/types';
import { useT } from '@/lib/i18n';
import { useMetaLookup } from '@/lib/i18n/meta';
import { useLoadedSettings } from '@/lib/settings';
import { levelProgress } from '@/lib/xp';
import { tokens } from '@/theme';
import {
  DIMENSION_META,
  DIMENSION_ORDER,
  SUB_META,
  SUBS_BY_DIM,
} from '@/theme/dimensions';

interface Props {
  dimensions: CharacterDimension[];
  /** ScrollView that wraps the panel — used to scroll to a card when a hex
   *  axis is tapped. Optional: the panel still renders if absent (no
   *  scroll behavior). */
  scrollViewRef?: React.RefObject<ScrollViewType | null>;
}

const CHIP_LABELS_PT = {
  week: 'Semana',
  month: 'Mês',
  quarter: 'Trimestre',
  all: 'Total',
};
const CHIP_LABELS_EN = {
  week: 'Week',
  month: 'Month',
  quarter: 'Quarter',
  all: 'All',
};

function localeTag(language: 'pt' | 'en'): string {
  return language === 'pt' ? 'pt-BR' : 'en-US';
}

function formatWindowLabel(
  spec: WindowSpec,
  start: Date,
  end: Date,
  language: 'pt' | 'en',
): string {
  const loc = localeTag(language);
  if (spec.granularity === 'all') {
    return language === 'pt' ? 'últimos 12 meses' : 'last 12 months';
  }
  if (spec.granularity === 'week') {
    const day = new Intl.DateTimeFormat(loc, { day: 'numeric' });
    const month = new Intl.DateTimeFormat(loc, { month: 'short' });
    return `${day.format(start)} – ${day.format(end)} ${month
      .format(end)
      .replace('.', '')}`;
  }
  if (spec.granularity === 'month') {
    return new Intl.DateTimeFormat(loc, {
      month: 'long',
      year: 'numeric',
    }).format(start);
  }
  // quarter
  const month = new Intl.DateTimeFormat(loc, { month: 'short' });
  const year = new Intl.DateTimeFormat(loc, { year: 'numeric' });
  return `${month.format(start).replace('.', '')} – ${month
    .format(end)
    .replace('.', '')} ${year.format(end)}`;
}

const SPARK_HEIGHT = 64;

/**
 * Sub-pillar **Dedicação** (Praticada). Windowed XP view: period selector
 * up top, a 6-axis hex summarizing per-dim XP share for the window, and
 * per-dim cards with a tall cumulative sparkline (window XP overlaid
 * top-right). Cards expand for a per-sub breakdown.
 *
 * The hex and the sparklines share one ceiling (`sparkGlobalMax`, the
 * leading dim's final cumulative XP) so the leader peaks consistently
 * across both and a sub-leading dim reads short in either.
 *
 * Tapping a hex axis badge scrolls + briefly highlights the matching dim
 * card. Level + total XP stay all-time — only window XP, sparkline, and
 * sub breakdown change with the selector.
 */
export function DedicacaoPanel({ dimensions, scrollViewRef }: Props) {
  const router = useRouter();
  const { locale } = useT();
  const metaLookup = useMetaLookup();
  const settings = useLoadedSettings();
  const { width: screenWidth } = useWindowDimensions();

  const [spec, setSpec] = useState<WindowSpec>({
    granularity: 'month',
    offset: 0,
  });
  const [highlightDim, setHighlightDim] = useState<DimensionId | null>(null);
  const [expanded, setExpanded] = useState<Set<DimensionId>>(new Set());

  const windowQuery = useDedicacaoWindow(spec, settings.weekStart);

  const dimMap = useMemo(() => {
    const m = new Map<DimensionId, CharacterDimension>();
    for (const d of dimensions) m.set(d.dimension_id, d);
    return m;
  }, [dimensions]);

  const computed = useMemo(
    () => computeWindow(spec, settings.weekStart),
    [spec, settings.weekStart],
  );
  const label = useMemo(
    () => formatWindowLabel(spec, computed.start, computed.end, locale),
    [spec, computed, locale],
  );

  const slices = useMemo(
    () =>
      windowQuery.data
        ? windowQuery.data.perDim.map((d) => ({
            dimId: d.dimId,
            xp: d.windowXp,
          }))
        : DIMENSION_ORDER.map((dimId) => ({ dimId, xp: 0 })),
    [windowQuery.data],
  );

  const perDimWindow = useMemo(() => {
    const m = new Map<
      DimensionId,
      { window: number; cumulative: number[]; perSub: SubWindow[] }
    >();
    for (const d of DIMENSION_ORDER) {
      m.set(d, {
        window: 0,
        cumulative: [],
        perSub: SUBS_BY_DIM[d].map((subId) => ({
          subId,
          windowXp: 0,
          cumulative: [],
        })),
      });
    }
    for (const row of windowQuery.data?.perDim ?? []) {
      m.set(row.dimId, {
        window: row.windowXp,
        cumulative: row.cumulative,
        perSub: row.perSub,
      });
    }
    return m;
  }, [windowQuery.data]);

  const sparkGlobalMax = useMemo(() => {
    let max = 0;
    for (const win of perDimWindow.values()) {
      const last = win.cumulative.length
        ? win.cumulative[win.cumulative.length - 1]
        : 0;
      if (last > max) max = last;
    }
    return max;
  }, [perDimWindow]);

  const labels = locale === 'pt' ? CHIP_LABELS_PT : CHIP_LABELS_EN;
  const isAll = spec.granularity === 'all';
  const totalWindowXp = windowQuery.data?.totalXp ?? 0;
  const prevTotalXp = windowQuery.data?.prevTotalXp ?? 0;

  const cardRefs = useRef<Partial<Record<DimensionId, ViewType | null>>>({});

  useEffect(() => {
    if (!highlightDim) return;
    const id = setTimeout(() => setHighlightDim(null), 1600);
    return () => clearTimeout(id);
  }, [highlightDim]);

  const handleAxisPress = (dim: DimensionId) => {
    setHighlightDim(dim);
    // findNodeHandle isn't supported on web (RN-Web restriction). The
    // border still flashes; user scrolls manually. Native APK keeps
    // the smooth auto-scroll.
    if (Platform.OS === 'web') return;
    const node = cardRefs.current[dim];
    const sv = scrollViewRef?.current;
    if (!node || !sv) return;
    const svHandle = findNodeHandle(sv);
    if (svHandle == null) return;
    (
      node as unknown as {
        measureLayout: (
          rel: number,
          cb: (x: number, y: number) => void,
          err: () => void,
        ) => void;
      }
    ).measureLayout(
      svHandle,
      (_x, y) => {
        sv.scrollTo({ y: Math.max(0, y - 24), animated: true });
      },
      () => {},
    );
  };

  const toggleExpand = (dim: DimensionId) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(dim)) next.delete(dim);
      else next.add(dim);
      return next;
    });
  };

  // Wider than the donut it replaced: the hex reserves ~33px per side for
  // the dimension badge ring, so an equivalent plot radius needs a bigger box.
  const hexSize = Math.max(212, Math.min((screenWidth || 360) - 56, 272));
  const sparkWidth = Math.max(160, (screenWidth || 360) - 64);

  // Order cards by window XP descending — leaders surface first. Ties
  // fall back to the canonical DIMENSION_ORDER so the layout doesn't
  // flicker as the user scrubs periods that yield equal values.
  const orderedDims = useMemo(() => {
    return [...DIMENSION_ORDER].sort((a, b) => {
      const aXp = perDimWindow.get(a)?.window ?? 0;
      const bXp = perDimWindow.get(b)?.window ?? 0;
      if (aXp !== bXp) return bXp - aXp;
      return DIMENSION_ORDER.indexOf(a) - DIMENSION_ORDER.indexOf(b);
    });
  }, [perDimWindow]);

  return (
    <View style={styles.wrap}>
      <InsightCard />

      <PeriodSelector
        spec={spec}
        onChange={setSpec}
        label={label}
        accent={tokens.semantic.xp2}
        halo="rgba(111, 232, 170, 0.18)"
        border="rgba(61, 214, 140, 0.35)"
        labels={labels}
      />

      <View style={styles.hexWrap}>
        <XpHexChart
          slices={slices}
          totalXp={totalWindowXp}
          prevTotalXp={isAll ? null : prevTotalXp}
          globalMax={sparkGlobalMax}
          size={hexSize}
          onAxisPress={handleAxisPress}
          idSuffix="dedicacao"
        />
        {/* Entry point to the history screen — sits in the space where the
            caption used to be. Quiet, contextual, doesn't compete with the
            chip selector above. */}
        <Pressable
          onPress={() =>
            router.push({
              pathname: '/dedicacao-history',
              params: {
                granularity: spec.granularity,
                offset: String(spec.offset),
              },
            })
          }
          hitSlop={6}
          style={({ pressed }) => [
            styles.historyLink,
            pressed && { opacity: 0.6 },
          ]}
          accessibilityRole="link"
        >
          <Text style={styles.historyLinkText}>
            {locale === 'pt'
              ? 'Ver histórico completo'
              : 'Open full history'}
          </Text>
          <Ionicons
            name="arrow-forward"
            size={12}
            color={tokens.text.mid}
          />
        </Pressable>
      </View>

      <View style={styles.list}>
        {orderedDims.map((id) => {
          const meta = DIMENSION_META[id];
          const xp = dimMap.get(id)?.xp ?? 0;
          const lp = levelProgress(xp);
          const win = perDimWindow.get(id);
          const winXp = win?.window ?? 0;
          const cumulative = win?.cumulative ?? [];
          const perSub = win?.perSub ?? [];
          const isHighlighted = highlightDim === id;
          const isExpanded = expanded.has(id);

          return (
            <Pressable
              key={id}
              ref={(node) => {
                cardRefs.current[id] = node;
              }}
              onPress={() => toggleExpand(id)}
              style={({ pressed }) => [
                styles.attribute,
                isHighlighted && {
                  borderColor: `${meta.color}AA`,
                  backgroundColor: meta.bg,
                },
                pressed && { opacity: 0.85 },
              ]}
              accessibilityRole="button"
              accessibilityState={{ expanded: isExpanded }}
            >
              {/* Header: icon + name + total + LV pill + chevron */}
              <View style={styles.attributeTop}>
                <View style={[styles.iconHalo, { backgroundColor: meta.bg }]}>
                  <Ionicons
                    name={meta.iconName as never}
                    size={18}
                    color={meta.color}
                  />
                </View>
                <View style={styles.attributeCopy}>
                  <Text style={styles.attributeName} numberOfLines={1}>
                    {metaLookup.dim(id).label}
                  </Text>
                  <Text style={styles.xpHint}>
                    {xp.toLocaleString()} XP total
                  </Text>
                </View>
                <View
                  style={[styles.levelPill, { borderColor: `${meta.color}55` }]}
                >
                  <Text style={[styles.levelLabel, { color: meta.color }]}>
                    LV
                  </Text>
                  <Text style={styles.levelValue}>{lp.level}</Text>
                </View>
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={tokens.text.dim}
                />
              </View>

              {/* Level progress: bar + fraction inline (replaces the
                  "234 XP até LV 5" sentence — same info, half the height). */}
              <View style={styles.barRow}>
                <View style={styles.barTrack}>
                  <ProgressBar
                    value={lp.xpInLevel}
                    max={lp.xpNeededForLevel}
                    color={meta.color}
                    height={4}
                  />
                </View>
                <Text style={styles.barFrac}>
                  {lp.xpInLevel.toLocaleString()}/
                  {lp.xpNeededForLevel.toLocaleString()}
                </Text>
              </View>

              {/* Sparkline area — tall enough to read, with the window XP
                  overlaid top-right. Empty-window state stays in the same
                  box so card heights don't jump as you scrub periods. */}
              <View style={styles.sparkBlock}>
                <Sparkline
                  cumulative={cumulative}
                  color={meta.color}
                  globalMax={sparkGlobalMax}
                  height={SPARK_HEIGHT}
                  width={sparkWidth}
                  idSuffix={id}
                />
                <View style={styles.sparkOverlay} pointerEvents="none">
                  {winXp > 0 ? (
                    <Text style={[styles.sparkXp, { color: meta.color }]}>
                      +{winXp.toLocaleString()} XP
                    </Text>
                  ) : (
                    <Text style={styles.sparkXpDim}>0 XP</Text>
                  )}
                </View>
              </View>

              {isExpanded && (
                <View style={styles.expandWrap}>
                  <View style={styles.divider} />
                  {(() => {
                    // Normalize sub sparklines against the leader within
                    // this dim — comparing siblings, not cross-dim heroes.
                    const subMax = perSub.reduce(
                      (m, s) =>
                        Math.max(
                          m,
                          s.cumulative.length
                            ? s.cumulative[s.cumulative.length - 1]
                            : 0,
                        ),
                      0,
                    );
                    return perSub.map((sub) => {
                      const subMeta = SUB_META[sub.subId];
                      const subLabel = metaLookup.sub(sub.subId).label;
                      const share =
                        winXp > 0
                          ? Math.round((sub.windowXp / winXp) * 100)
                          : 0;
                      return (
                        <Pressable
                          key={sub.subId}
                          onPress={() =>
                            router.push({
                              pathname: '/dedicacao-history',
                              params: {
                                granularity: spec.granularity,
                                offset: String(spec.offset),
                                subs: sub.subId,
                              },
                            })
                          }
                          style={({ pressed }) => [
                            styles.subRow,
                            pressed && { opacity: 0.6 },
                          ]}
                          hitSlop={4}
                          accessibilityRole="link"
                          accessibilityLabel={`${subLabel} history`}
                        >
                          <View
                            style={[
                              styles.subIcon,
                              { backgroundColor: `${meta.color}1F` },
                            ]}
                          >
                            <Ionicons
                              name={subMeta.iconName as never}
                              size={14}
                              color={meta.color}
                            />
                          </View>
                          <View style={styles.subTextCol}>
                            <Text style={styles.subLabel} numberOfLines={1}>
                              {subLabel}
                            </Text>
                            <Text style={styles.subShare}>
                              {share}% {locale === 'pt' ? 'do' : 'of'}{' '}
                              {metaLookup.dim(id).label}
                            </Text>
                          </View>
                          <View style={styles.subSparkBlock}>
                            <Sparkline
                              cumulative={sub.cumulative}
                              color={meta.color}
                              globalMax={subMax}
                              height={28}
                              width={sparkWidth - 200}
                              idSuffix={`${id}-${sub.subId}`}
                            />
                            <View
                              style={styles.subSparkOverlay}
                              pointerEvents="none"
                            >
                              <Text
                                style={[
                                  styles.subSparkXp,
                                  {
                                    color:
                                      sub.windowXp > 0
                                        ? meta.color
                                        : tokens.text.faint,
                                  },
                                ]}
                              >
                                +{sub.windowXp.toLocaleString()}
                              </Text>
                            </View>
                          </View>
                        </Pressable>
                      );
                    });
                  })()}
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: '/dedicacao-history',
                        params: {
                          granularity: spec.granularity,
                          offset: String(spec.offset),
                          dims: id,
                        },
                      })
                    }
                    style={({ pressed }) => [
                      styles.detailLink,
                      pressed && { opacity: 0.7 },
                    ]}
                    hitSlop={4}
                  >
                    <Text style={[styles.detailLinkText, { color: meta.color }]}>
                      {locale === 'pt'
                        ? `Histórico de ${metaLookup.dim(id).label}`
                        : `${metaLookup.dim(id).label} history`}
                    </Text>
                    <Ionicons
                      name="arrow-forward"
                      size={12}
                      color={meta.color}
                    />
                  </Pressable>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.space[3] },
  hexWrap: { alignItems: 'center', gap: tokens.space[2] },
  historyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  historyLinkText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    color: tokens.text.mid,
    letterSpacing: 0.3,
  },
  list: { gap: tokens.space[2] },
  attribute: {
    paddingVertical: tokens.space[3],
    paddingHorizontal: tokens.space[3],
    borderRadius: tokens.radius.md,
    gap: tokens.space[2],
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  attributeTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
  },
  attributeCopy: { flex: 1, minWidth: 0 },
  iconHalo: {
    width: 32,
    height: 32,
    borderRadius: tokens.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attributeName: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 15,
    color: tokens.text.hi,
  },
  xpHint: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    color: tokens.text.dim,
    letterSpacing: 0.3,
  },
  levelPill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    backgroundColor: tokens.bg.glass,
  },
  levelLabel: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 9,
    letterSpacing: 0.8,
  },
  levelValue: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 13,
    color: tokens.text.hi,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
  },
  barTrack: { flex: 1 },
  barFrac: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    color: tokens.text.dim,
    letterSpacing: 0.3,
    minWidth: 64,
    textAlign: 'right',
  },
  sparkBlock: {
    position: 'relative',
    marginTop: 2,
  },
  sparkOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 2,
  },
  sparkXp: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 20,
    letterSpacing: -0.2,
  },
  sparkXpDim: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
    color: tokens.text.faint,
    letterSpacing: -0.1,
  },
  expandWrap: {
    gap: tokens.space[2],
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: tokens.border.divider,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    paddingVertical: 4,
  },
  subIcon: {
    width: 26,
    height: 26,
    borderRadius: tokens.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subTextCol: {
    minWidth: 90,
    gap: 1,
  },
  subLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    color: tokens.text.base,
  },
  subShare: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10,
    color: tokens.text.dim,
    letterSpacing: 0.2,
  },
  subSparkBlock: {
    position: 'relative',
    flex: 1,
  },
  subSparkOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
  subSparkXp: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 13,
    letterSpacing: -0.1,
  },
  detailLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 2,
  },
  detailLinkText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    letterSpacing: 0.3,
  },
});
