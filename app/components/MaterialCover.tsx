import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as RNImage, StyleSheet, View } from 'react-native';

import type { DimensionId, SubId } from '@/lib/db/types';
import { SUB_META } from '@/theme/dimensions';

/**
 * Visual cover for a learning material. Two modes:
 *   - With `hero_image_url`: shows the actual image with a soft gradient
 *     overlay so foreground text stays readable.
 *   - Without: shows a generated cover (dim-tinted gradient + giant sub
 *     icon centered, with a faint decorative blur). Acts as the
 *     "placeholder until art ships" — Spotify-style abstract.
 *
 * `variant`:
 *   - `card`   — banner used on the feed (rounded top corners only,
 *                aspect ~16:10)
 *   - `hero`   — full-bleed detail-screen hero (taller, more breathing
 *                room around the icon)
 */

type Variant = 'card' | 'hero';

interface Props {
  dimensionId: DimensionId;
  /** If set, this sub's icon is shown centered. Otherwise fallback to dim. */
  subId?: SubId | null;
  /** Fallback icon when no sub is provided. */
  dimIconName?: string;
  /** Real cover image. Takes priority over the generated one. */
  imageUrl?: string | null;
  variant?: Variant;
}

const TINT: Record<DimensionId, [string, string]> = {
  health: ['#FF8A92', '#A93341'],
  body:   ['#FFA66A', '#A0431A'],
  mind:   ['#C8A0FF', '#5A2EA8'],
  wealth: ['#FFD96A', '#A06A14'],
  bonds:  ['#80E0FF', '#1F7DA8'],
  craft:  ['#5DDDCD', '#197E72'],
};

export function MaterialCover({
  dimensionId,
  subId,
  dimIconName,
  imageUrl,
  variant = 'card',
}: Props) {
  const [from, to] = TINT[dimensionId];
  const iconName =
    subId && SUB_META[subId]
      ? (SUB_META[subId].iconName as keyof typeof Ionicons.glyphMap)
      : ((dimIconName ?? 'sparkles') as keyof typeof Ionicons.glyphMap);

  const size = variant === 'hero' ? 88 : 64;
  const containerStyle = variant === 'hero' ? styles.hero : styles.card;

  if (imageUrl) {
    return (
      <View style={containerStyle}>
        <RNImage
          source={{ uri: imageUrl }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
        {/* Soft dark gradient so foreground caption text on top reads. */}
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(10, 14, 38, 0.55)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      <LinearGradient
        colors={[from, to]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Soft radial highlight in the top-left for depth. */}
      <View style={styles.glow} />
      <View style={styles.iconWrap}>
        <Ionicons name={iconName} size={size} color="rgba(255,255,255,0.92)" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    aspectRatio: 16 / 10,
    overflow: 'hidden',
    backgroundColor: '#1A1F44',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    width: '100%',
    height: 220,
    overflow: 'hidden',
    backgroundColor: '#1A1F44',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    top: -60,
    left: -60,
    width: 200,
    height: 200,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
});
