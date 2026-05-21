import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as RNImage, StyleSheet, View } from 'react-native';
import Svg, {
  Defs,
  Line,
  Pattern,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

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

  const size = variant === 'hero' ? 88 : 80;
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
      {/* Faint diagonal stripes — gives the cover the "Headway-ish" texture
         (white lines at 45°, 8% opacity over the gradient). */}
      <Svg
        width="100%"
        height="100%"
        style={StyleSheet.absoluteFill}
        opacity={0.08}
        preserveAspectRatio="none"
      >
        <Defs>
          <Pattern
            id="cover-stripes"
            width="14"
            height="14"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <Line x1="0" y1="0" x2="0" y2="14" stroke="#ffffff" strokeWidth="1.5" />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#cover-stripes)" />
      </Svg>
      {/* Soft radial highlight anchored at top-left corner. SVG radial
         gradient fades from 20% white at the corner out to 0% at the
         edge — replaces the previous solid circle that read as a sharp
         bright spot. */}
      <Svg
        width="100%"
        height="100%"
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        <Defs>
          <RadialGradient
            id="cover-glow"
            cx="0%"
            cy="0%"
            rx="80%"
            ry="80%"
            fx="0%"
            fy="0%"
          >
            <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.2" />
            <Stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#cover-glow)" />
      </Svg>
      <View style={styles.iconWrap}>
        <Ionicons name={iconName} size={size} color="rgba(255,255,255,0.92)" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    // Fills its parent fully — CoverCard wraps it in a fixed 2:3 frame
    // so we don't need our own aspect ratio constraint here. Without
    // this, an aspectRatio:16/10 left a dark band below the cover art.
    ...StyleSheet.absoluteFillObject,
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
