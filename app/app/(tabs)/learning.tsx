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

import { CarouselRow } from '@/components/learning/CarouselRow';
import { LearningStatsPanel } from '@/components/LearningStatsPanel';
import { ScreenBackground } from '@/components/ScreenBackground';
import { useLearningFeed, useReadMaterialIds, type LearningFeedCard } from '@/lib/api/learning';
import type { DimensionId, LearningMaterialType } from '@/lib/db/types';
import { useT, type TranslateOptions } from '@/lib/i18n';
import { useMetaLookup } from '@/lib/i18n/meta';
import { tokens } from '@/theme';
import { DIMENSION_ORDER } from '@/theme/dimensions';

type Translator = (key: string, options?: TranslateOptions) => string;
type ReadFilter = 'all' | 'unread' | 'read';

const TYPE_ORDER: LearningMaterialType[] = ['explainer', 'summary', 'news'];
const NEW_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export default function LearningScreen() {
  const router = useRouter();
  const { t } = useT();
  const feed = useLearningFeed();
  const reads = useReadMaterialIds();
  const meta = useMetaLookup();

  const [readFilter, setReadFilter] = useState<ReadFilter>('all');
  const [statsOpen, setStatsOpen] = useState(false);

  const all = useMemo(() => feed.data ?? [], [feed.data]);
  const readSet = useMemo(() => reads.data ?? new Set<string>(), [reads.data]);

  // Apply the read-state filter once; every carousel sees the same filtered set.
  const filtered = useMemo(() => {
    if (readFilter === 'all') return all;
    return all.filter((c) => {
      const r = readSet.has(c.id);
      return readFilter === 'read' ? r : !r;
    });
  }, [all, readFilter, readSet]);

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

    const byType = new Map<LearningMaterialType, LearningFeedCard[]>();
    for (const c of filtered) {
      const arr = byType.get(c.type) ?? [];
      arr.push(c);
      byType.set(c.type, arr);
    }

    return { novidades, byDim, byType };
  }, [filtered]);

  // Show "by type" rows only when there is real variety across types,
  // i.e. at least 2 types have content. Until summaries / news ship,
  // this section sleeps.
  const showByType = useMemo(() => {
    let withContent = 0;
    for (const v of buckets.byType.values()) if (v.length > 0) withContent++;
    return withContent >= 2;
  }, [buckets.byType]);

  const onCardPress = (card: LearningFeedCard) => {
    Haptics.selectionAsync().catch(() => {});
    router.push(`/material/${card.slug}`);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenBackground>
        <ScrollView
          contentContainerStyle={styles.scroll}
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

          {/* Por tipo — only when content variety exists */}
          {showByType && (
            <View style={styles.sectionGroup}>
              <Text style={styles.sectionGroupTitle}>{t('learning.section.byType')}</Text>
              {TYPE_ORDER.map((type) => {
                const list = buckets.byType.get(type);
                if (!list || list.length === 0) return null;
                return (
                  <CarouselRow
                    key={type}
                    title={t(`learning.type.${type}`)}
                    cards={list}
                    readSet={readSet}
                    onCardPress={onCardPress}
                    count={list.length}
                  />
                );
              })}
            </View>
          )}

          {/* Por dimensão — 6 rows */}
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
// Read-state filter — segmented pill control.
// ─────────────────────────────────────────────────────────────────────────────

interface ReadFilterRowProps {
  value: ReadFilter;
  onChange: (v: ReadFilter) => void;
  t: Translator;
}

function ReadFilterRow({ value, onChange, t }: ReadFilterRowProps) {
  const opts: { key: ReadFilter; label: string }[] = [
    { key: 'all', label: t('learning.readFilter.all') },
    { key: 'unread', label: t('learning.readFilter.unread') },
    { key: 'read', label: t('learning.readFilter.read') },
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
  scroll: {
    paddingBottom: tokens.layout.bottomNavClearance,
  },
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
