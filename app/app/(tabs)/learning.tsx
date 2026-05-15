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

import { LearningStatsPanel } from '@/components/LearningStatsPanel';
import { MaterialCover } from '@/components/MaterialCover';
import { ScreenBackground } from '@/components/ScreenBackground';
import { useLearningFeed, useReadMaterialIds, type LearningFeedCard } from '@/lib/api/learning';
import type { DimensionId, LearningMaterialType } from '@/lib/db/types';
import { useT, type TranslateOptions } from '@/lib/i18n';
import { useMetaLookup } from '@/lib/i18n/meta';
import { tokens } from '@/theme';
import { DIMENSION_ORDER, SUB_META } from '@/theme/dimensions';

type Translator = (key: string, options?: TranslateOptions) => string;
type ReadFilter = 'all' | 'unread' | 'read';

function typeLabel(type: LearningMaterialType, t: Translator): string {
  return t(`learning.type.${type}`);
}

export default function LearningScreen() {
  const router = useRouter();
  const { t, locale } = useT();
  const feed = useLearningFeed();
  const reads = useReadMaterialIds();
  const meta = useMetaLookup();

  const [dimFilter, setDimFilter] = useState<DimensionId | null>(null);
  const [readFilter, setReadFilter] = useState<ReadFilter>('all');
  const [statsOpen, setStatsOpen] = useState(false);

  const all = useMemo(() => feed.data ?? [], [feed.data]);
  const readSet = useMemo(() => reads.data ?? new Set<string>(), [reads.data]);

  const filtered = useMemo(() => {
    return all.filter((c) => {
      if (dimFilter && c.dimension_id !== dimFilter) return false;
      const read = readSet.has(c.id);
      if (readFilter === 'read' && !read) return false;
      if (readFilter === 'unread' && read) return false;
      return true;
    });
  }, [all, dimFilter, readFilter, readSet]);

  const onCardPress = (card: LearningFeedCard) => {
    Haptics.selectionAsync().catch(() => {});
    router.push(`/material/${card.slug}`);
  };

  const toggleDim = (id: DimensionId) => {
    Haptics.selectionAsync().catch(() => {});
    setDimFilter((prev) => (prev === id ? null : id));
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

          {/* Stats pill (collapsed by default) */}
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

          {/* Dim filter chips — wrapped in a fixed-height View so the
              nested horizontal ScrollView can't collapse vertically. */}
          <View style={styles.chipScrollWrap}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              <FilterChip
                label={t('common.all')}
                active={!dimFilter}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setDimFilter(null);
                }}
              />
              {DIMENSION_ORDER.map((id) => {
                const dim = meta.dim(id);
                const active = dimFilter === id;
                return (
                  <FilterChip
                    key={id}
                    label={dim.label}
                    iconName={dim.iconName as keyof typeof Ionicons.glyphMap}
                    active={active}
                    activeColor={dim.color}
                    activeBg={dim.bg}
                    onPress={() => toggleDim(id)}
                  />
                );
              })}
            </ScrollView>
          </View>

          {/* Read-state filter */}
          <View style={styles.readFilterWrap}>
            <ReadFilterRow value={readFilter} onChange={setReadFilter} t={t} />
          </View>

          {/* Loading / empty / list */}
          {feed.isLoading && (
            <View style={styles.loading}>
              <ActivityIndicator color={tokens.brand.violet2} />
            </View>
          )}

          {!feed.isLoading && filtered.length === 0 && (
            <View style={styles.empty}>
              <Ionicons name="book-outline" size={36} color={tokens.text.dim} />
              <Text style={styles.emptyText}>{t('learning.empty')}</Text>
            </View>
          )}

          <View style={styles.feedList}>
            {filtered.map((card) => {
              const title = locale === 'pt' ? card.title_pt : card.title_en;
              const summary = locale === 'pt' ? card.summary_pt : card.summary_en;
              const dim = meta.dim(card.dimension_id);
              const read = readSet.has(card.id);

              return (
                <Pressable
                  key={card.id}
                  onPress={() => onCardPress(card)}
                  style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                >
                  <View style={styles.coverWrap}>
                    <MaterialCover
                      dimensionId={card.dimension_id}
                      subId={card.subs[0] ?? null}
                      imageUrl={card.hero_image_url}
                      variant="card"
                    />
                    {/* Type badge over banner top-left */}
                    <View style={[styles.typeBadge, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
                      <Text style={styles.typeBadgeText}>{typeLabel(card.type, t)}</Text>
                    </View>
                    {/* Read flag over banner top-right */}
                    {read && (
                      <View style={styles.readBadge}>
                        <Ionicons
                          name="checkmark-circle"
                          size={14}
                          color={tokens.semantic.xp}
                        />
                        <Text style={styles.readBadgeText}>{t('learning.read')}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.cardBody}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {title}
                    </Text>
                    <Text style={styles.cardSummary} numberOfLines={2}>
                      {summary}
                    </Text>

                    <View style={styles.cardFoot}>
                      <View style={styles.metaPill}>
                        <Ionicons name="time-outline" size={11} color={tokens.text.mid} />
                        <Text style={styles.metaPillText}>
                          {t('learning.readMin', { count: card.reading_minutes })}
                        </Text>
                      </View>
                      {card.subs.slice(0, 2).map((subId) => {
                        const sub = meta.sub(subId);
                        return (
                          <View
                            key={subId}
                            style={[styles.metaPill, { borderColor: dim.color + '44' }]}
                          >
                            <Ionicons
                              name={SUB_META[subId].iconName as keyof typeof Ionicons.glyphMap}
                              size={11}
                              color={dim.color}
                            />
                            <Text style={[styles.metaPillText, { color: dim.color }]}>
                              {sub.label}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </ScreenBackground>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Filter chip — sized so the row never clips the last chip and the active
// state doesn't grow the chip's box (only changes color).
// ─────────────────────────────────────────────────────────────────────────────

interface FilterChipProps {
  label: string;
  iconName?: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
  active: boolean;
  activeColor?: string;
  activeBg?: string;
  onPress: () => void;
}

function FilterChip({
  label,
  iconName,
  active,
  activeColor,
  activeBg,
  onPress,
}: FilterChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        chipStyles.chip,
        active && {
          backgroundColor: activeBg ?? 'rgba(123, 92, 255, 0.18)',
          borderColor: activeColor ?? tokens.brand.violet2,
        },
        pressed && { opacity: 0.7 },
      ]}
    >
      {iconName && (
        <Ionicons
          name={iconName}
          size={13}
          color={active ? activeColor ?? tokens.brand.violet2 : tokens.text.mid}
        />
      )}
      <Text
        style={[
          chipStyles.text,
          active && { color: activeColor ?? tokens.brand.violet2 },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: tokens.bg.glassStrong,
    borderWidth: 1,
    borderColor: tokens.border.strong,
    flexShrink: 0,
  },
  text: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    color: tokens.text.base,
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
  chipScrollWrap: {
    height: 50, // explicit so the nested horizontal ScrollView can't collapse
    marginTop: tokens.space[2],
  },
  chipRow: {
    paddingHorizontal: tokens.space[4],
    paddingRight: tokens.space[5] + tokens.space[2], // last chip never clips
    paddingVertical: tokens.space[2],
    alignItems: 'center',
    gap: 8,
  },
  readFilterWrap: {
    paddingHorizontal: tokens.space[4],
    paddingTop: tokens.space[1],
    paddingBottom: tokens.space[3],
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
  feedList: {
    paddingHorizontal: tokens.space[4],
    gap: 16,
  },
  card: {
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.bg.glass,
    borderWidth: 1,
    borderColor: tokens.border.strong,
    overflow: 'hidden',
  },
  cardPressed: { opacity: 0.85 },
  coverWrap: {
    position: 'relative',
  },
  typeBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  typeBadgeText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    letterSpacing: 0.8,
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  readBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  readBadgeText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    color: tokens.semantic.xp,
    letterSpacing: 0.4,
  },
  cardBody: {
    padding: tokens.space[4],
    gap: 6,
  },
  cardTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 19,
    lineHeight: 24,
    color: tokens.text.hi,
  },
  cardSummary: {
    fontFamily: 'Manrope_500Medium',
    fontStyle: 'italic',
    fontSize: 13,
    lineHeight: 19,
    color: tokens.text.mid,
  },
  cardFoot: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: tokens.bg.glassStrong,
    borderWidth: 1,
    borderColor: tokens.border.base,
  },
  metaPillText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    color: tokens.text.mid,
  },
});
