import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { LearningFeedCard } from '@/lib/api/learning';
import { useT } from '@/lib/i18n';
import { useMetaLookup } from '@/lib/i18n/meta';
import { tokens } from '@/theme';
import { SUB_META } from '@/theme/dimensions';

import { MaterialCover } from '../MaterialCover';

import { coverFontForSlug, coverFontSize } from './coverFont';

/**
 * Book-cover-style tile for the Learn carousel. 2:3 aspect ratio, title
 * rendered ON the cover with a per-material display font, summary +
 * meta as a caption below. Tap routes to the material detail.
 */

export const COVER_WIDTH = 156;
export const COVER_HEIGHT = Math.round(COVER_WIDTH * 1.5); // 2:3 book aspect

interface Props {
  card: LearningFeedCard;
  read: boolean;
  onPress: (card: LearningFeedCard) => void;
}

export function CoverCard({ card, read, onPress }: Props) {
  const { t, locale } = useT();
  const meta = useMetaLookup();

  const title = locale === 'pt' ? card.title_pt : card.title_en;
  const summary = locale === 'pt' ? card.summary_pt : card.summary_en;
  const fontName = coverFontForSlug(card.slug);
  const fontMetrics = coverFontSize(fontName);
  const dim = meta.dim(card.dimension_id);
  const primarySub = card.subs[0];
  const subMeta = primarySub ? meta.sub(primarySub) : null;

  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress(card);
      }}
      style={({ pressed }) => [styles.root, pressed && styles.pressed]}
    >
      {/* The 2:3 cover */}
      <View style={styles.cover}>
        <MaterialCover
          dimensionId={card.dimension_id}
          subId={primarySub ?? null}
          imageUrl={card.hero_image_url}
          variant="card"
        />

        {/* Bottom gradient mask so title sits readable over the cover */}
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.55)'] as [string, string]}
          start={{ x: 0.5, y: 0.4 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Title overlay — bottom-anchored with padding */}
        <View style={styles.titleWrap}>
          <Text
            style={[
              styles.title,
              { fontFamily: fontName, fontSize: fontMetrics.fontSize, lineHeight: fontMetrics.lineHeight },
            ]}
            numberOfLines={3}
          >
            {title}
          </Text>
        </View>

        {/* Read indicator */}
        {read && (
          <View style={styles.readBadge}>
            <Ionicons name="checkmark" size={12} color="#FFFFFF" />
          </View>
        )}
      </View>

      {/* Caption — summary + meta below cover */}
      <Text style={styles.summary} numberOfLines={2}>
        {summary}
      </Text>
      <View style={styles.metaRow}>
        {subMeta && (
          <View style={styles.metaPill}>
            <Ionicons
              name={SUB_META[primarySub!].iconName as keyof typeof Ionicons.glyphMap}
              size={10}
              color={dim.color}
            />
            <Text style={[styles.metaText, { color: dim.color }]}>{subMeta.label}</Text>
          </View>
        )}
        <Text style={styles.metaText}>·</Text>
        <Text style={styles.metaText}>
          {t('learning.readMin', { count: card.reading_minutes })}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    width: COVER_WIDTH,
  },
  pressed: { opacity: 0.85 },
  cover: {
    width: COVER_WIDTH,
    height: COVER_HEIGHT,
    borderRadius: tokens.radius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  titleWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 18,
  },
  title: {
    color: '#FFFFFF',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0, 0, 0, 0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  readBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.semantic.xp,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  summary: {
    marginTop: 8,
    fontFamily: 'Manrope_500Medium',
    fontStyle: 'italic',
    fontSize: 11.5,
    lineHeight: 16,
    color: tokens.text.mid,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10,
    color: tokens.text.dim,
  },
});
