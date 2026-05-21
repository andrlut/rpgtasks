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

import { TypeSash } from './TypeSash';

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

        {/* Bottom dark fade — only the lower 55% of the cover, transparent
           at the top fading to a stronger opacity at the bottom. Matches
           the design's `bottom-anchored 55% height` mask so the title
           reads without darkening the upper cover art. */}
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.65)'] as [string, string]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.bottomFade}
        />

        {/* Top-left type sash — distinguishes explainer / summary / news */}
        <TypeSash type={card.type} />

        {/* Title overlay — bottom-anchored with padding */}
        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={4}>
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
    // Subtle elevation — matches the design's `0 8px 18px rgba(0,0,0,0.35)`.
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  bottomFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
  },
  titleWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingBottom: 14,
    paddingTop: 20,
  },
  title: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 15,
    lineHeight: 18,
    color: '#FFFFFF',
    letterSpacing: 0.1,
    textShadowColor: 'rgba(0, 0, 0, 0.65)',
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
