import { Ionicons } from '@expo/vector-icons';
import {
  Stack,
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  findNodeHandle,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CompletionLog } from '@/components/history/CompletionLog';
import { HistoryLensTabs } from '@/components/history/HistoryLensTabs';
import {
  HeatmapLegend,
  MonthHeatmap,
} from '@/components/history/MonthHeatmap';
import { HistoryFilters } from '@/components/history/HistoryFilters';
import { ScreenBackground } from '@/components/ScreenBackground';
import {
  computeWindow,
  type Granularity,
  type WindowSpec,
} from '@/lib/api/dedicacao';
import {
  dayKey,
  useDedicacaoHistory,
  type HistoryFilters as Filters,
} from '@/lib/api/dedicacaoHistory';
import type { DimensionId, SubId } from '@/lib/db/types';
import { useT } from '@/lib/i18n';
import { useLoadedSettings } from '@/lib/settings';
import { tokens } from '@/theme';
import { DIMENSION_META, SUB_META } from '@/theme/dimensions';

const VALID_DIMS = new Set<DimensionId>([
  'health',
  'body',
  'mind',
  'wealth',
  'bonds',
  'craft',
]);
const VALID_SUBS = new Set<SubId>(Object.keys(SUB_META) as SubId[]);
const VALID_GRANULARITY = new Set<Granularity>([
  'week',
  'month',
  'quarter',
  'all',
]);

function parseSet<T>(raw: string | string[] | undefined, valid: Set<T>): Set<T> {
  if (!raw) return new Set<T>();
  const s = Array.isArray(raw) ? raw.join(',') : raw;
  const out = new Set<T>();
  for (const piece of s.split(',')) {
    const trimmed = piece.trim();
    if (valid.has(trimmed as T)) out.add(trimmed as T);
  }
  return out;
}

function parseGranularity(raw: unknown): Granularity {
  const s = typeof raw === 'string' ? raw : '';
  return VALID_GRANULARITY.has(s as Granularity)
    ? (s as Granularity)
    : 'month';
}

function parseNumber(raw: unknown, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
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

function formatWindowLabel(
  spec: WindowSpec,
  start: Date,
  end: Date,
  language: 'pt' | 'en',
): string {
  const loc = language === 'pt' ? 'pt-BR' : 'en-US';
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
  const month = new Intl.DateTimeFormat(loc, { month: 'short' });
  const year = new Intl.DateTimeFormat(loc, { year: 'numeric' });
  return `${month.format(start).replace('.', '')} – ${month
    .format(end)
    .replace('.', '')} ${year.format(end)}`;
}

/**
 * History screen for the Dedicação subsystem — drill-down accessed from
 * the Eu tab. Three vertically-stacked surfaces:
 *
 *   - HistoryFilters: period chips + ◀▶ + dim/sub multi-select + min XP.
 *   - CalendarHeatmap: GitHub-style daily heatmap, recolored as filters
 *     change. Tap on a day scrolls the log to that day's group.
 *   - CompletionLog: chronological list grouped by day, with task title +
 *     per-sub breakdown + dim-tinted left rail.
 *
 * Entry deep links can pre-seed filters via URL params:
 *   ?granularity=month&offset=1&dims=body,mind&subs=nutrition&minXp=50
 */
export default function DedicacaoHistoryScreen() {
  const router = useRouter();
  const { t, locale } = useT();
  const settings = useLoadedSettings();
  const params = useLocalSearchParams<{
    granularity?: string;
    offset?: string;
    dims?: string;
    subs?: string;
    minXp?: string;
  }>();

  // Initial state seeded from URL params; the user can then toggle freely
  // without back-syncing to the URL (keeps the back stack quiet).
  const [spec, setSpec] = useState<WindowSpec>(() => ({
    granularity: parseGranularity(params.granularity),
    offset: Math.max(0, parseNumber(params.offset, 0)),
  }));
  const [filters, setFilters] = useState<Filters>(() => {
    const { start, end } = computeWindow(
      {
        granularity: parseGranularity(params.granularity),
        offset: Math.max(0, parseNumber(params.offset, 0)),
      },
      settings.weekStart,
    );
    return {
      from: start,
      to: end,
      dims: parseSet<DimensionId>(params.dims, VALID_DIMS),
      subs: parseSet<SubId>(params.subs, VALID_SUBS),
      minXp: Math.max(0, parseNumber(params.minXp, 0)),
    };
  });

  // Recompute date range whenever the spec changes.
  const windowComp = useMemo(
    () => computeWindow(spec, settings.weekStart),
    [spec, settings.weekStart],
  );

  // Keep the filter's `from/to` in sync with the active spec.
  const effectiveFilters = useMemo<Filters>(
    () => ({
      ...filters,
      from: windowComp.start,
      to: windowComp.end,
    }),
    [filters, windowComp.start, windowComp.end],
  );

  const history = useDedicacaoHistory(effectiveFilters);

  // Pick an accent color: if exactly one dim is selected, recolor the
  // heatmap with that dim's hue. Otherwise stay neutral violet.
  const accent = useMemo(() => {
    if (filters.dims.size === 1) {
      const only = [...filters.dims][0];
      return DIMENSION_META[only].color;
    }
    return tokens.brand.violet2;
  }, [filters.dims]);

  // ── Scroll-to-day on heatmap cell press ──
  const scrollViewRef = useRef<ScrollView>(null);
  const dayHeaderRefs = useRef<Map<string, View | null>>(new Map());
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  const handleCellPress = (date: Date, _xp: number, hasEntries: boolean) => {
    const k = dayKey(date);
    setSelectedDayKey(k);
    // No entries on this day → just highlight the cell. The log is the
    // source of truth for "what happened"; an empty day has nothing to
    // scroll to.
    if (!hasEntries) return;
    // findNodeHandle isn't supported on web (RN-Web restriction). The
    // cell still highlights; user can scroll manually. Native APK keeps
    // the smooth auto-scroll.
    if (Platform.OS === 'web') return;
    const node = dayHeaderRefs.current.get(k);
    const sv = scrollViewRef.current;
    if (!node || !sv) return;
    const handle = findNodeHandle(sv);
    if (handle == null) return;
    (
      node as unknown as {
        measureLayout: (
          rel: number,
          cb: (x: number, y: number) => void,
          err: () => void,
        ) => void;
      }
    ).measureLayout(
      handle,
      (_x, y) => {
        sv.scrollTo({ y: Math.max(0, y - 16), animated: true });
      },
      () => {},
    );
  };

  const chipLabels = locale === 'pt' ? CHIP_LABELS_PT : CHIP_LABELS_EN;
  const periodLabel = formatWindowLabel(
    spec,
    windowComp.start,
    windowComp.end,
    locale,
  );

  const totalEntries = history.data?.entries.length ?? 0;
  const totalXp = history.data?.totalXp ?? 0;
  const dailyMax = history.data?.dailyMax ?? 0;
  const dailyTotals = history.data?.dailyTotals ?? new Map<string, number>();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenBackground>
        {/* Custom header: just a back button + title. The filter row sits
            below the header so the navigation stays simple. */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            style={({ pressed }) => [
              styles.backBtn,
              pressed && { opacity: 0.7 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
          >
            <Ionicons name="chevron-back" size={22} color={tokens.text.hi} />
          </Pressable>
          <View style={styles.headerTextCol}>
            <Text style={styles.headerEyebrow}>
              {locale === 'pt' ? 'DEDICAÇÃO · HISTÓRICO' : 'DEDICAÇÃO · HISTORY'}
            </Text>
            <Text style={styles.headerTitle}>
              {locale === 'pt' ? 'O que eu fiz' : 'What I did'}
            </Text>
          </View>
        </View>

        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={history.isRefetching}
              onRefresh={history.refetch}
              tintColor={tokens.brand.violet2}
            />
          }
        >
          <HistoryLensTabs current="dedicacao" />

          <HistoryFilters
            spec={spec}
            onSpecChange={setSpec}
            periodLabel={periodLabel}
            filters={effectiveFilters}
            onFiltersChange={(f) =>
              setFilters({
                ...filters,
                dims: f.dims,
                subs: f.subs,
                minXp: f.minXp,
              })
            }
            chipLabels={chipLabels}
          />

          {/* Heatmap section */}
          <View style={styles.section}>
            <View style={styles.sectionTopRow}>
              <View style={styles.sectionTitleCol}>
                <Text style={styles.sectionTitle}>
                  {locale === 'pt' ? 'Mapa de dias' : 'Day heatmap'}
                </Text>
                <Text style={styles.sectionHint}>
                  {locale === 'pt'
                    ? 'cada quadrado = um dia · toque pra abrir o log'
                    : 'each square = one day · tap to open the log'}
                </Text>
              </View>
              <View style={styles.statsCol}>
                <Text style={[styles.statXp, { color: accent }]}>
                  +{totalXp.toLocaleString()}
                </Text>
                <Text style={styles.statHint}>
                  {totalEntries} {locale === 'pt' ? 'completions' : 'completions'}
                </Text>
              </View>
            </View>
            {history.isLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={tokens.brand.violet2} />
              </View>
            ) : (
              <>
                <MonthHeatmap
                  from={windowComp.start}
                  to={windowComp.end}
                  dailyTotals={dailyTotals}
                  dailyMax={dailyMax}
                  weekStart={settings.weekStart}
                  onCellPress={handleCellPress}
                  accent={accent}
                  selectedKey={selectedDayKey}
                />
                <HeatmapLegend accent={accent} />
              </>
            )}
          </View>

          {/* Log */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {locale === 'pt' ? 'Log cronológico' : 'Chronological log'}
            </Text>
            {history.isLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={tokens.brand.violet2} />
              </View>
            ) : (
              <CompletionLog
                entries={history.data?.entries ?? []}
                dayHeaderRefs={dayHeaderRefs}
              />
            )}
          </View>
        </ScrollView>
      </ScreenBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.bg.deep },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: tokens.space[4],
    paddingTop: tokens.space[2],
    paddingBottom: tokens.space[3],
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.pill,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  headerTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  headerEyebrow: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    letterSpacing: 1.4,
    color: tokens.brand.violet2,
  },
  headerTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 20,
    color: tokens.text.hi,
    letterSpacing: -0.2,
  },
  content: {
    paddingHorizontal: tokens.space[4],
    paddingBottom: tokens.space[8],
    gap: tokens.space[5],
  },
  section: {
    gap: tokens.space[2],
  },
  sectionTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: tokens.space[3],
  },
  sectionTitleCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  sectionTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 14,
    color: tokens.text.hi,
    letterSpacing: -0.1,
  },
  sectionHint: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    color: tokens.text.dim,
    letterSpacing: 0.2,
  },
  statsCol: {
    alignItems: 'flex-end',
    gap: 0,
  },
  statXp: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 22,
    letterSpacing: -0.3,
  },
  statHint: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    color: tokens.text.dim,
    letterSpacing: 0.3,
  },
  loadingBox: {
    paddingVertical: tokens.space[5],
    alignItems: 'center',
  },
});
