import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useBottomNavClearance } from '@/components/BottomNavBar';
import { CarouselRow } from '@/components/learning/CarouselRow';
import { LearningStatsPanel, type PillFilter } from '@/components/LearningStatsPanel';
import { ScreenBackground } from '@/components/ScreenBackground';
import { useLearningFeed, useReadMaterialIds, type LearningFeedCard } from '@/lib/api/learning';
import type { DimensionId, LearningMaterialType, SubId } from '@/lib/db/types';
import { useT, type TranslateOptions } from '@/lib/i18n';
import { useMetaLookup } from '@/lib/i18n/meta';
import { tokens } from '@/theme';
import { DIMENSION_ORDER, SUB_META } from '@/theme/dimensions';

type Translator = (key: string, options?: TranslateOptions) => string;
type ReadFilter = 'all' | 'unread' | 'read';

const NEW_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export default function LearningScreen() {
  const router = useRouter();
  const { t } = useT();
  const feed = useLearningFeed();
  const reads = useReadMaterialIds();
  const meta = useMetaLookup();

  const [readFilter, setReadFilter] = useState<ReadFilter>('unread');
  const [pillFilter, setPillFilter] = useState<PillFilter>(null);
  const [statsOpen, setStatsOpen] = useState(false);
  const bottomClearance = useBottomNavClearance();

  // Chronological: newest released material first. Sorting once at the
  // source means every derived bucket (filtered, byDim, novidades)
  // inherits the order without each carousel re-sorting.
  const all = useMemo(
    () =>
      (feed.data ?? [])
        .slice()
        .sort(
          (a, b) =>
            new Date(b.released_at).getTime() - new Date(a.released_at).getTime(),
        ),
    [feed.data],
  );
  const readSet = useMemo(() => reads.data ?? new Set<string>(), [reads.data]);

  // Apply both filters (read-state AND pill). Each carousel reads from
  // the same filtered set, so empty groups drop out naturally.
  const filtered = useMemo(() => {
    return all.filter((c) => {
      // Read-state filter
      if (readFilter !== 'all') {
        const r = readSet.has(c.id);
        if (readFilter === 'read' && !r) return false;
        if (readFilter === 'unread' && r) return false;
      }
      // Pill filter — exclusive (only one active at a time)
      if (pillFilter) {
        if (pillFilter.kind === 'dim' && c.dimension_id !== pillFilter.value) return false;
        if (pillFilter.kind === 'type' && c.type !== pillFilter.value) return false;
        if (pillFilter.kind === 'sub' && !c.subs.includes(pillFilter.value as SubId)) return false;
      }
      return true;
    });
  }, [all, readFilter, readSet, pillFilter]);

  // Group buckets for the carousel rows. We compute against `filtered`
  // so empty groups drop out naturally.
  const buckets = useMemo(() => {
    const now = Date.now();
    const novidades = filtered.filter(
      (c) => now - new Date(c.released_at).getTime() < NEW_WINDOW_MS,
    );

    const byDim = new Map<DimensionId, LearningFeedCard[]>();
    for (const c of filtered) {
      const arr = byDim.get(c.dimension_id) ?? [];
      arr.push(c);
      byDim.set(c.dimension_id, arr);
    }

    return { novidades, byDim };
  }, [filtered]);

  const onCardPress = (card: LearningFeedCard) => {
    Haptics.selectionAsync().catch(() => {});
    router.push(`/material/${card.slug}`);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenBackground>
        <ScrollView
          contentContainerStyle={{ paddingBottom: bottomClearance }}
          refreshControl={
            <RefreshControl
              refreshing={feed.isFetching && !feed.isLoading}
              onRefresh={() => feed.refetch()}
              tintColor={tokens.text.mid}
            />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.eyebrow}>{t('learning.eyebrow')}</Text>
            <Text style={styles.title}>{t('learning.title')}</Text>
            <Text style={styles.subtitle}>{t('learning.subtitle')}</Text>
          </View>

          {!feed.isLoading && all.length > 0 && (
            <LearningStatsPanel
              cards={all}
              readSet={readSet}
              open={statsOpen}
              onToggle={() => {
                Haptics.selectionAsync().catch(() => {});
                setStatsOpen((v) => !v);
              }}
              filter={pillFilter}
              onFilterChange={(next) => {
                setPillFilter(next);
                // Auto-open the panel when picking a filter from elsewhere
                // (no-op when already open). Don't close on clear — the
                // user might want to pick another.
                if (next && !statsOpen) setStatsOpen(true);
              }}
            />
          )}

          {/* Active filter chip — shown when pillFilter is set */}
          {pillFilter && (
            <ActiveFilterChip
              filter={pillFilter}
              onClear={() => setPillFilter(null)}
            />
          )}

          {/* Read-state filter */}
          <View style={styles.readFilterWrap}>
            <ReadFilterRow value={readFilter} onChange={setReadFilter} t={t} />
          </View>

          {/* Loading */}
          {feed.isLoading && (
            <View style={styles.loading}>
              <ActivityIndicator color={tokens.brand.violet2} />
            </View>
          )}

          {/* Empty (after filtering) */}
          {!feed.isLoading && filtered.length === 0 && (
            <View style={styles.empty}>
              <Ionicons name="book-outline" size={36} color={tokens.text.dim} />
              <Text style={styles.emptyText}>{t('learning.empty')}</Text>
            </View>
          )}

          {/* Novidades */}
          {buckets.novidades.length > 0 && (
            <CarouselRow
              title={t('learning.section.new')}
              iconName="sparkles"
              accentColor={tokens.brand.violet2}
              cards={buckets.novidades}
              readSet={readSet}
              onCardPress={onCardPress}
              count={buckets.novidades.length}
            />
          )}

          {/* Por dimensão — 6 rows. "Por tipo" was removed since the
             TypeSash on each cover now communicates type inline. */}
          <View style={styles.sectionGroup}>
            <Text style={styles.sectionGroupTitle}>{t('learning.section.byDim')}</Text>
            {DIMENSION_ORDER.map((dimId) => {
              const list = buckets.byDim.get(dimId);
              if (!list || list.length === 0) return null;
              const dim = meta.dim(dimId);
              return (
                <CarouselRow
                  key={dimId}
                  title={dim.label}
                  iconName={dim.iconName as keyof typeof Ionicons.glyphMap}
                  accentColor={dim.color}
                  cards={list}
                  readSet={readSet}
                  onCardPress={onCardPress}
                  count={list.length}
                />
              );
            })}
          </View>
        </ScrollView>
      </ScreenBackground>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Active-filter chip — surfaces a non-null PillFilter at the top of the feed
// with the option to clear it. Uses the dim/sub color where applicable so
// the chip reads as "filtered by Craft" visually, not just textually.
// ─────────────────────────────────────────────────────────────────────────────

interface ActiveFilterChipProps {
  filter: NonNullable<PillFilter>;
  onClear: () => void;
}

function ActiveFilterChip({ filter, onClear }: ActiveFilterChipProps) {
  const { t } = useT();
  const meta = useMetaLookup();

  let label = '';
  let iconName: keyof typeof Ionicons.glyphMap = 'funnel';
  let accent: string = tokens.brand.violet2;

  if (filter.kind === 'dim') {
    const dim = meta.dim(filter.value as DimensionId);
    label = dim.label;
    iconName = dim.iconName as keyof typeof Ionicons.glyphMap;
    accent = dim.color;
  } else if (filter.kind === 'sub') {
    const subId = filter.value as SubId;
    const sub = meta.sub(subId);
    const dim = meta.dim(SUB_META[subId].dimensionId);
    label = sub.label;
    iconName = SUB_META[subId].iconName as keyof typeof Ionicons.glyphMap;
    accent = dim.color;
  } else {
    label = t(`learning.type.${filter.value as LearningMaterialType}`);
  }

  return (
    <View style={activeChipStyles.wrap}>
      <View
        style={[
          activeChipStyles.chip,
          { backgroundColor: accent + '22', borderColor: accent },
        ]}
      >
        <Ionicons name={iconName} size={13} color={accent} />
        <Text style={[activeChipStyles.label, { color: accent }]}>
          {t('learning.filteringBy', { what: label })}
        </Text>
        <Pressable
          hitSlop={6}
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            onClear();
          }}
          style={({ pressed }) => [
            activeChipStyles.clearBtn,
            { backgroundColor: accent + '33' },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Ionicons name="close" size={12} color={accent} />
        </Pressable>
      </View>
    </View>
  );
}

const activeChipStyles = StyleSheet.create({
  wrap: {
    paddingHorizontal: tokens.space[4],
    paddingTop: tokens.space[3],
  },
  chip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 11,
    paddingRight: 4,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  label: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    letterSpacing: 0.2,
  },
  clearBtn: {
    width: 20,
    height: 20,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Read-state filter — segmented pill control.
// ─────────────────────────────────────────────────────────────────────────────

interface ReadFilterRowProps {
  value: ReadFilter;
  onChange: (v: ReadFilter) => void;
  t: Translator;
}

function ReadFilterRow({ value, onChange, t }: ReadFilterRowProps) {
  const opts: { key: ReadFilter; label: string }[] = [
    { key: 'unread', label: t('learning.readFilter.unread') },
    { key: 'read', label: t('learning.readFilter.read') },
    { key: 'all', label: t('learning.readFilter.all') },
  ];
  return (
    <View style={readFilterStyles.row}>
      {opts.map((o) => {
        const active = value === o.key;
        return (
          <Pressable
            key={o.key}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              onChange(o.key);
            }}
            style={({ pressed }) => [
              readFilterStyles.seg,
              active && readFilterStyles.segActive,
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text
              style={[
                readFilterStyles.segText,
                active && readFilterStyles.segTextActive,
              ]}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const readFilterStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: tokens.bg.glass,
    borderRadius: 999,
    padding: 3,
    borderWidth: 1,
    borderColor: tokens.border.base,
  },
  seg: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 999,
  },
  segActive: {
    backgroundColor: tokens.brand.violet,
  },
  segText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: tokens.text.mid,
  },
  segTextActive: {
    color: tokens.text.hi,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Screen styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.bg.deep },
  header: {
    paddingHorizontal: tokens.space[4],
    paddingTop: tokens.space[4],
    paddingBottom: tokens.space[2],
  },
  eyebrow: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    letterSpacing: 1.6,
    color: tokens.brand.violet2,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 28,
    color: tokens.text.hi,
    marginTop: 2,
  },
  subtitle: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    color: tokens.text.mid,
    marginTop: 2,
  },
  readFilterWrap: {
    paddingHorizontal: tokens.space[4],
    paddingTop: tokens.space[3],
    paddingBottom: tokens.space[4],
  },
  loading: {
    paddingVertical: tokens.space[7],
  },
  empty: {
    alignItems: 'center',
    paddingVertical: tokens.space[8],
    gap: 8,
  },
  emptyText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    color: tokens.text.dim,
    textAlign: 'center',
  },
  sectionGroup: {
    marginTop: tokens.space[2],
  },
  sectionGroupTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: tokens.text.dim,
    paddingHorizontal: tokens.space[4],
    marginBottom: tokens.space[3],
    marginTop: tokens.space[2],
  },
});
