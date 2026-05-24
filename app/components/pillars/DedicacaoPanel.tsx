import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  findNodeHandle,
  Pressable,
  type ScrollView as ScrollViewType,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type View as ViewType,
} from 'react-native';

import { PeriodSelector } from '@/components/dedicacao/PeriodSelector';
import { Sparkline } from '@/components/dedicacao/Sparkline';
import { XpDonut } from '@/components/dedicacao/XpDonut';
import { ProgressBar } from '@/components/ProgressBar';
import {
  computeWindow,
  useDedicacaoWindow,
  type WindowSpec,
} from '@/lib/api/dedicacao';
import type { CharacterDimension, DimensionId } from '@/lib/db/types';
import { useT } from '@/lib/i18n';
import { useMetaLookup } from '@/lib/i18n/meta';
import { useLoadedSettings } from '@/lib/settings';
import { levelProgress } from '@/lib/xp';
import { tokens } from '@/theme';
import { DIMENSION_META, DIMENSION_ORDER } from '@/theme/dimensions';

interface Props {
  dimensions: CharacterDimension[];
  /** ScrollView that wraps the panel — used to scroll to a card when a donut
   *  slice is tapped. Optional: the panel still renders if absent (no
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

/**
 * Sub-pillar **Dedicação** (Praticada). Windowed XP view: period selector
 * up top (Semana / Mês / Trimestre / Total + ◀ ▶ to scrub past periods),
 * a donut summarizing per-dim XP share for the window, and per-dim cards
 * with a cumulative sparkline of XP across the window.
 *
 * Tapping a donut slice scrolls + briefly highlights the matching dim
 * card. Level and total XP stay all-time — only the window XP and
 * sparkline change with the selector.
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

  const windowQuery = useDedicacaoWindow(spec, settings.weekStart);

  const dimMap = useMemo(() => {
    const m = new Map<DimensionId, CharacterDimension>();
    for (const d of dimensions) m.set(d.dimension_id, d);
    return m;
  }, [dimensions]);

  // Compute the window even while data is loading so the period label
  // ("Maio 2026", "12 – 18 mai", ...) stays present.
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
    const m = new Map<DimensionId, { window: number; cumulative: number[] }>();
    for (const d of DIMENSION_ORDER) m.set(d, { window: 0, cumulative: [] });
    for (const row of windowQuery.data?.perDim ?? []) {
      m.set(row.dimId, { window: row.windowXp, cumulative: row.cumulative });
    }
    return m;
  }, [windowQuery.data]);

  const labels = locale === 'pt' ? CHIP_LABELS_PT : CHIP_LABELS_EN;
  const isAll = spec.granularity === 'all';
  const totalWindowXp = windowQuery.data?.totalXp ?? 0;
  const prevTotalXp = windowQuery.data?.prevTotalXp ?? 0;

  // ── Scroll-to-card on donut press ───────────────────────────────────
  const cardRefs = useRef<Partial<Record<DimensionId, ViewType | null>>>({});

  useEffect(() => {
    if (!highlightDim) return;
    const id = setTimeout(() => setHighlightDim(null), 1600);
    return () => clearTimeout(id);
  }, [highlightDim]);

  const handleSlicePress = (dim: DimensionId) => {
    setHighlightDim(dim);
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

  const donutSize = Math.max(200, Math.min((screenWidth || 360) - 64, 260));
  const sparkWidth = Math.max(160, (screenWidth || 360) - 80);

  return (
    <View style={styles.wrap}>
      <PeriodSelector
        spec={spec}
        onChange={setSpec}
        label={label}
        accent={tokens.semantic.xp2}
        halo="rgba(111, 232, 170, 0.18)"
        border="rgba(61, 214, 140, 0.35)"
        labels={labels}
      />

      <View style={styles.donutWrap}>
        <XpDonut
          slices={slices}
          totalXp={totalWindowXp}
          prevTotalXp={isAll ? null : prevTotalXp}
          size={donutSize}
          onSlicePress={handleSlicePress}
        />
        {totalWindowXp === 0 ? (
          <Text style={styles.emptyCaption}>
            {locale === 'pt'
              ? 'nenhum XP nesta janela — abra Tasks pra começar'
              : 'no XP in this window — open Tasks to get started'}
          </Text>
        ) : (
          <Text style={styles.donutCaption}>
            {locale === 'pt'
              ? 'XP desta janela · toque numa fatia pra ver o atributo'
              : 'XP in this window · tap a slice to focus an attribute'}
          </Text>
        )}
      </View>

      <View style={styles.list}>
        {DIMENSION_ORDER.map((id) => {
          const meta = DIMENSION_META[id];
          const xp = dimMap.get(id)?.xp ?? 0;
          const lp = levelProgress(xp);
          const win = perDimWindow.get(id);
          const winXp = win?.window ?? 0;
          const cumulative = win?.cumulative ?? [];
          const isHighlighted = highlightDim === id;

          return (
            <Pressable
              key={id}
              ref={(node) => {
                cardRefs.current[id] = node;
              }}
              onPress={() =>
                router.push({ pathname: '/dimension/[id]', params: { id } })
              }
              style={({ pressed }) => [
                styles.attribute,
                isHighlighted && {
                  borderColor: `${meta.color}AA`,
                  backgroundColor: meta.bg,
                },
                pressed && { opacity: 0.7 },
              ]}
            >
              <View style={styles.attributeTop}>
                <View style={styles.attributeNameRow}>
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
                </View>
                <View
                  style={[styles.levelPill, { borderColor: `${meta.color}55` }]}
                >
                  <Text style={[styles.levelLabel, { color: meta.color }]}>
                    LV
                  </Text>
                  <Text style={styles.levelValue}>{lp.level}</Text>
                </View>
              </View>

              <ProgressBar
                value={lp.xpInLevel}
                max={lp.xpNeededForLevel}
                color={meta.color}
                height={4}
              />
              <Text style={styles.toNext}>
                {Math.max(
                  0,
                  lp.xpNeededForLevel - lp.xpInLevel,
                ).toLocaleString()}{' '}
                XP {locale === 'pt' ? 'até' : 'to'} LV {lp.level + 1}
              </Text>

              {winXp > 0 ? (
                <>
                  <View style={styles.windowRow}>
                    <Text style={[styles.windowXp, { color: meta.color }]}>
                      +{winXp.toLocaleString()} XP
                    </Text>
                    <Text style={styles.windowHint} numberOfLines={1}>
                      {locale === 'pt' ? 'nesta janela' : 'this window'}
                    </Text>
                  </View>
                  <Sparkline
                    cumulative={cumulative}
                    color={meta.color}
                    height={32}
                    width={sparkWidth}
                  />
                </>
              ) : (
                <Text style={styles.windowEmpty}>
                  {locale === 'pt'
                    ? '— sem XP nesta janela'
                    : '— no XP this window'}
                </Text>
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
  donutWrap: { alignItems: 'center', gap: tokens.space[2] },
  donutCaption: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    color: tokens.text.dim,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  emptyCaption: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    color: tokens.text.mid,
    textAlign: 'center',
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
    justifyContent: 'space-between',
    gap: tokens.space[3],
  },
  attributeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    flex: 1,
    minWidth: 0,
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
    fontSize: 14,
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
  toNext: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10,
    color: tokens.text.dim,
    letterSpacing: 0.3,
  },
  windowRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 2,
  },
  windowXp: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 13,
    letterSpacing: 0.3,
  },
  windowHint: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    color: tokens.text.dim,
    letterSpacing: 0.3,
  },
  windowEmpty: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    color: tokens.text.dim,
    fontStyle: 'italic',
    marginTop: 2,
  },
});
