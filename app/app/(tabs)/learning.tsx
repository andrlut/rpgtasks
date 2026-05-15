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

import { ScreenBackground } from '@/components/ScreenBackground';
import { useLearningFeed, useReadMaterialIds, type LearningFeedCard } from '@/lib/api/learning';
import type { DimensionId, LearningMaterialType } from '@/lib/db/types';
import { useT, type TranslateOptions } from '@/lib/i18n';
import { useMetaLookup } from '@/lib/i18n/meta';
import { tokens } from '@/theme';
import { DIMENSION_ORDER, SUB_META } from '@/theme/dimensions';

type Translator = (key: string, options?: TranslateOptions) => string;

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

  const filtered = useMemo(() => {
    const all = feed.data ?? [];
    if (!dimFilter) return all;
    return all.filter((c) => c.dimension_id === dimFilter);
  }, [feed.data, dimFilter]);

  const isReadSet = reads.data ?? new Set<string>();
  const isLoading = feed.isLoading;

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
        <View style={styles.header}>
          <Text style={styles.eyebrow}>{t('learning.eyebrow')}</Text>
          <Text style={styles.title}>{t('learning.title')}</Text>
          <Text style={styles.subtitle}>{t('learning.subtitle')}</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          <Pressable
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              setDimFilter(null);
            }}
            style={({ pressed }) => [
              styles.chip,
              !dimFilter && styles.chipActive,
              pressed && styles.chipPressed,
            ]}
          >
            <Text style={[styles.chipText, !dimFilter && styles.chipTextActive]}>
              {t('common.all')}
            </Text>
          </Pressable>
          {DIMENSION_ORDER.map((id) => {
            const dim = meta.dim(id);
            const active = dimFilter === id;
            return (
              <Pressable
                key={id}
                onPress={() => toggleDim(id)}
                style={({ pressed }) => [
                  styles.chip,
                  active && { backgroundColor: dim.bg, borderColor: dim.color },
                  pressed && styles.chipPressed,
                ]}
              >
                <Ionicons
                  name={dim.iconName as keyof typeof Ionicons.glyphMap}
                  size={14}
                  color={active ? dim.color : tokens.text.mid}
                />
                <Text style={[styles.chipText, active && { color: dim.color }]}>{dim.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <ScrollView
          contentContainerStyle={styles.feed}
          refreshControl={
            <RefreshControl
              refreshing={feed.isFetching && !feed.isLoading}
              onRefresh={() => feed.refetch()}
              tintColor={tokens.text.mid}
            />
          }
        >
          {isLoading && (
            <View style={styles.loading}>
              <ActivityIndicator color={tokens.brand.violet2} />
            </View>
          )}

          {!isLoading && filtered.length === 0 && (
            <View style={styles.empty}>
              <Ionicons name="book-outline" size={36} color={tokens.text.dim} />
              <Text style={styles.emptyText}>{t('learning.empty')}</Text>
            </View>
          )}

          {filtered.map((card) => {
            const title = locale === 'pt' ? card.title_pt : card.title_en;
            const summary = locale === 'pt' ? card.summary_pt : card.summary_en;
            const dim = meta.dim(card.dimension_id);
            const read = isReadSet.has(card.id);

            return (
              <Pressable
                key={card.id}
                onPress={() => onCardPress(card)}
                style={({ pressed }) => [
                  styles.card,
                  { borderLeftColor: dim.color },
                  pressed && styles.cardPressed,
                ]}
              >
                <View style={styles.cardHead}>
                  <View style={[styles.typeBadge, { backgroundColor: dim.bg }]}>
                    <Text style={[styles.typeBadgeText, { color: dim.color }]}>
                      {typeLabel(card.type, t)}
                    </Text>
                  </View>
                  {read && (
                    <View style={styles.readBadge}>
                      <Ionicons name="checkmark-circle" size={14} color={tokens.semantic.xp} />
                      <Text style={styles.readBadgeText}>{t('learning.read')}</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.cardTitle} numberOfLines={2}>
                  {title}
                </Text>
                <Text style={styles.cardSummary} numberOfLines={2}>
                  {summary}
                </Text>

                <View style={styles.cardFoot}>
                  <View style={styles.metaPill}>
                    <Ionicons name="time-outline" size={12} color={tokens.text.mid} />
                    <Text style={styles.metaPillText}>
                      {t('learning.readMin', { count: card.reading_minutes })}
                    </Text>
                  </View>
                  {card.subs.slice(0, 2).map((subId) => {
                    const sub = meta.sub(subId);
                    return (
                      <View key={subId} style={styles.metaPill}>
                        <Ionicons
                          name={SUB_META[subId].iconName as keyof typeof Ionicons.glyphMap}
                          size={12}
                          color={dim.color}
                        />
                        <Text style={styles.metaPillText}>{sub.label}</Text>
                      </View>
                    );
                  })}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </ScreenBackground>
    </SafeAreaView>
  );
}

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
  chipRow: {
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[3],
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: tokens.bg.glass,
    borderWidth: 1,
    borderColor: tokens.border.strong,
  },
  chipActive: {
    backgroundColor: 'rgba(123, 92, 255, 0.18)',
    borderColor: tokens.brand.violet2,
  },
  chipPressed: { opacity: 0.7 },
  chipText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    color: tokens.text.mid,
  },
  chipTextActive: { color: tokens.brand.violet2 },
  feed: {
    paddingHorizontal: tokens.space[4],
    paddingBottom: tokens.layout.bottomNavClearance,
    gap: 12,
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
  card: {
    backgroundColor: tokens.bg.glass,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.border.strong,
    borderLeftWidth: 4,
    padding: tokens.space[4],
    gap: 6,
  },
  cardPressed: { opacity: 0.85 },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  typeBadgeText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  readBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  readBadgeText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    color: tokens.semantic.xp,
  },
  cardTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 17,
    lineHeight: 22,
    color: tokens.text.hi,
  },
  cardSummary: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    lineHeight: 19,
    color: tokens.text.mid,
  },
  cardFoot: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
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
