import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import type { DimensionId, SubId } from '@/lib/db/types';
import { useMetaLookup } from '@/lib/i18n/meta';
import { tokens } from '@/theme';
import { SUBS_BY_DIM } from '@/theme/dimensions';

interface Props {
  dimensionId: DimensionId;
  /** Diameter in px. Default 220. */
  size?: number;
  /** Optional self-scores to render as small "pip" rings inside each
   *  hemisphere (0-5). When omitted, hemispheres render flat. */
  scores?: Map<SubId, number>;
}

/**
 * Heraldic crest for a dimension — pure RN, no SVG.
 *
 * A large circle split vertically into 2 hemispheres (one per sub),
 * sealed by a vertical divider line with a diamond "buckle" in the
 * center. Each hemisphere shows that sub's icon centered. Above the
 * crest sits the dim icon as a small "crown" badge. A halo glow in
 * the dim color surrounds everything.
 *
 * Same approach as HexChart: views and rotated rectangles only, so it
 * renders identically on iOS, Android, and web without depending on
 * react-native-svg (which has native crashes on 15.12.1).
 */
export function DimensionCrest({ dimensionId, size = 220, scores }: Props) {
  const meta = useMetaLookup();
  const dimMeta = meta.dim(dimensionId);
  const [subA, subB] = SUBS_BY_DIM[dimensionId];
  const subAMeta = meta.sub(subA);
  const subBMeta = meta.sub(subB);

  const radius = size / 2;
  const subIconSize = Math.round(size * 0.22);
  const crownSize = Math.round(size * 0.22);
  const haloSize = size + 32;

  const scoreA = scores?.get(subA) ?? 0;
  const scoreB = scores?.get(subB) ?? 0;

  return (
    <View
      style={[
        styles.wrap,
        { width: haloSize, height: haloSize + crownSize / 2 },
      ]}
    >
      {/* outer halo (dim color glow) */}
      <View
        style={[
          styles.halo,
          {
            width: haloSize,
            height: haloSize,
            borderRadius: haloSize / 2,
            backgroundColor: dimMeta.bg,
            top: crownSize / 2,
          },
        ]}
      />

      {/* main crest disc */}
      <View
        style={[
          styles.disc,
          {
            width: size,
            height: size,
            borderRadius: radius,
            top: crownSize / 2 + 16,
            borderColor: `${dimMeta.color}55`,
          },
        ]}
      >
        {/* inner gradient-ish layered backgrounds for depth */}
        <View
          style={[
            styles.discInner,
            {
              borderRadius: radius - 6,
              backgroundColor: tokens.bg.surface,
            },
          ]}
        />

        {/* left hemisphere — sub A */}
        <View style={[styles.hemi, styles.hemiLeft, { width: radius }]}>
          <View
            style={[
              styles.subIconHalo,
              {
                width: subIconSize + 16,
                height: subIconSize + 16,
                borderRadius: (subIconSize + 16) / 2,
                backgroundColor: dimMeta.bg,
                borderColor: `${dimMeta.color}66`,
              },
            ]}
          >
            <Ionicons
              name={subAMeta.iconName as never}
              size={subIconSize}
              color={dimMeta.color}
            />
          </View>
          <Text
            style={[styles.subLabel, { color: dimMeta.color }]}
            numberOfLines={1}
          >
            {subAMeta.label.toUpperCase()}
          </Text>
          <ScorePips score={scoreA} color={dimMeta.color} />
        </View>

        {/* divider — vertical "seal" line */}
        <View style={styles.dividerWrap}>
          <View
            style={[
              styles.dividerLine,
              { backgroundColor: `${dimMeta.color}55` },
            ]}
          />
          <View
            style={[
              styles.dividerLineInner,
              { backgroundColor: `${dimMeta.color}33` },
            ]}
          />
          {/* center buckle — rotated square = diamond */}
          <View
            style={[
              styles.buckle,
              {
                backgroundColor: dimMeta.color,
                shadowColor: dimMeta.color,
              },
            ]}
          />
          <View
            style={[
              styles.buckleCore,
              { backgroundColor: tokens.bg.surface },
            ]}
          />
          <View
            style={[
              styles.buckleDot,
              { backgroundColor: dimMeta.color },
            ]}
          />
        </View>

        {/* right hemisphere — sub B */}
        <View style={[styles.hemi, styles.hemiRight, { width: radius }]}>
          <View
            style={[
              styles.subIconHalo,
              {
                width: subIconSize + 16,
                height: subIconSize + 16,
                borderRadius: (subIconSize + 16) / 2,
                backgroundColor: dimMeta.bg,
                borderColor: `${dimMeta.color}66`,
              },
            ]}
          >
            <Ionicons
              name={subBMeta.iconName as never}
              size={subIconSize}
              color={dimMeta.color}
            />
          </View>
          <Text
            style={[styles.subLabel, { color: dimMeta.color }]}
            numberOfLines={1}
          >
            {subBMeta.label.toUpperCase()}
          </Text>
          <ScorePips score={scoreB} color={dimMeta.color} />
        </View>
      </View>

      {/* crown — dim icon at top center */}
      <View
        style={[
          styles.crown,
          {
            width: crownSize + 12,
            height: crownSize + 12,
            borderRadius: (crownSize + 12) / 2,
            backgroundColor: tokens.bg.surface,
            borderColor: dimMeta.color,
          },
        ]}
      >
        <Ionicons
          name={dimMeta.iconName as never}
          size={crownSize - 4}
          color={dimMeta.color}
        />
      </View>
    </View>
  );
}

/** Continuous score bar — score 0-5 rendered as a proportional fill. */
function ScorePips({ score, color }: { score: number; color: string }) {
  const pct = Math.max(0, Math.min(100, (score / 5) * 100));
  return (
    <View style={[styles.scoreBarTrack, { borderColor: `${color}55` }]}>
      <View
        style={[
          styles.scoreBarFill,
          { width: `${pct}%`, backgroundColor: color },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'flex-start',
    position: 'relative',
  },
  halo: {
    position: 'absolute',
    left: 0,
    opacity: 0.55,
  },
  disc: {
    position: 'absolute',
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: tokens.bg.deep,
    borderWidth: 2,
    overflow: 'hidden',
  },
  discInner: {
    ...StyleSheet.absoluteFillObject,
    margin: 6,
    opacity: 0.6,
  },
  hemi: {
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: tokens.space[2],
  },
  hemiLeft: {
    paddingRight: tokens.space[3],
  },
  hemiRight: {
    paddingLeft: tokens.space[3],
  },
  subIconHalo: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  subLabel: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
    letterSpacing: 1.2,
    marginTop: 2,
  },
  scoreBarTrack: {
    width: 56,
    height: 6,
    borderRadius: 3,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: 2,
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  dividerWrap: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 2,
    marginLeft: -1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dividerLine: {
    position: 'absolute',
    top: 12,
    bottom: 12,
    width: 2,
  },
  dividerLineInner: {
    position: 'absolute',
    top: 12,
    bottom: 12,
    width: 4,
    marginLeft: -1,
    opacity: 0.4,
  },
  buckle: {
    width: 18,
    height: 18,
    transform: [{ rotate: '45deg' }],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 6,
  },
  buckleCore: {
    position: 'absolute',
    width: 10,
    height: 10,
    transform: [{ rotate: '45deg' }],
  },
  buckleDot: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  crown: {
    position: 'absolute',
    top: 0,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    zIndex: 2,
  },
});
