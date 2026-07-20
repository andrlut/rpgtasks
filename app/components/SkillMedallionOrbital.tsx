import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import type { TierName } from '@/lib/db/types';
import {
  lighten,
  TIER_ORDER,
  TIER_VISUAL_META,
} from '@/theme/skillTiers';

interface Props {
  tier: TierName;
  /** Number rendered at the center. Hidden when showGlyph is false (e.g. mini
   *  preview nodes in the tier path). */
  pr: number;
  /** Default 180 (hero). Mini variants: 56 (current path node), 48 (next-tier
   *  card preview), 40 (other path nodes). All internals scale proportionally. */
  size?: number;
  showGlyph?: boolean;
}

/**
 * Hero medallion for the Skill Detail screen — Variant D · Orbital.
 *
 * A central core with one or two orbital rings, planets that appear at
 * higher tiers, and the user's PR rendered as the central glyph. The
 * sophistication of the medallion ramps with tier:
 *
 *   beginner → empty husk: dashed orbit, no fill, dim glyph
 *   bronze   → core lights up, arc accent, planet 1
 *   silver   → planet 2
 *   gold     → second orbit, planet 3
 *   master   → roxo + dourado palette (categorical leap, not "more gold")
 *
 * Built with plain Views + expo-linear-gradient — no react-native-svg
 * (Android crash mitigations apply across the codebase).
 *
 * OBSOLETE CONSTRAINT: those Android crashes no longer apply —
 * react-native-svg ships in production here. Kept as-is because it works;
 * don't cite this as a reason to avoid SVG in new components.
 */
export function SkillMedallionOrbital({
  tier,
  pr,
  size = 180,
  showGlyph = true,
}: Props) {
  const meta = TIER_VISUAL_META[tier];
  const isBeginner = tier === 'beginner';
  const tierIdx = TIER_ORDER.indexOf(tier);
  const c1Light = lighten(meta.c1);

  // Proportional scaling — every internal element is sized as a fraction
  // of the requested medallion size so 56px and 180px render the same
  // shape, just smaller. Numbers anchored to the 180px hero spec.
  const r = size / 180;
  const coreSize = 140 * r;
  const coreInnerSize = 86 * r;
  const planet1 = 14 * r;
  const planet2 = 8 * r;
  const planet3 = 6 * r;
  const orbitInset = 4 * r;
  const orbit2Inset = 12 * r;
  const arcInset = 4 * r;
  const arcWidth = Math.max(2, Math.round(3 * r));
  const orbitWidth = Math.max(1, Math.round(2 * r));
  const glyphFontSize = Math.max(10, Math.round(36 * r));

  // Per-tier visibility flags (mirrors the html prototype's medallionVariantD)
  const showOrbit2 = tierIdx >= 3;
  const showArc = tierIdx >= 1;
  const showPlanet1 = tierIdx >= 1;
  const showPlanet2 = tierIdx >= 2;
  const showPlanet3 = tierIdx >= 3;

  const orbitOpacity = isBeginner ? 0.25 : 0.55;
  const orbitColor = isBeginner ? 'rgba(180,184,210,0.4)' : meta.cBorder;

  return (
    <View
      style={[
        styles.stage,
        { width: size, height: size },
      ]}
    >
      {/* Aura — soft halo behind everything (no real blur in RN; rely on the
          translucent glow color and a slight overshoot of the bounds) */}
      {meta.auraOn > 0 && (
        <View
          style={[
            styles.aura,
            {
              width: size * 1.22,
              height: size * 1.22,
              borderRadius: (size * 1.22) / 2,
              backgroundColor: meta.glow,
              opacity: meta.auraOn,
            },
          ]}
        />
      )}

      {/* Dashed orbit ring */}
      <View
        style={[
          styles.fullCircle,
          {
            top: orbitInset,
            bottom: orbitInset,
            left: orbitInset,
            right: orbitInset,
            borderRadius: (size - orbitInset * 2) / 2,
            borderWidth: orbitWidth,
            borderStyle: 'dashed',
            borderColor: orbitColor,
            opacity: orbitOpacity,
          },
        ]}
      />

      {/* Solid second orbit (Gold+) */}
      {showOrbit2 && (
        <View
          style={[
            styles.fullCircle,
            {
              top: orbit2Inset,
              bottom: orbit2Inset,
              left: orbit2Inset,
              right: orbit2Inset,
              borderRadius: (size - orbit2Inset * 2) / 2,
              borderWidth: 1,
              borderColor: meta.cBorder,
              opacity: 0.5,
            },
          ]}
        />
      )}

      {/* Orbit arc (Bronze+) — top + right border colored, others transparent.
          Shadow leaks beyond the colored arcs but the dashed ring sells it
          as a moving highlight rather than a clean half-ring. */}
      {showArc && (
        <View
          style={[
            styles.fullCircle,
            {
              top: arcInset,
              bottom: arcInset,
              left: arcInset,
              right: arcInset,
              borderRadius: (size - arcInset * 2) / 2,
              borderWidth: arcWidth,
              borderTopColor: c1Light,
              borderRightColor: c1Light,
              borderBottomColor: 'transparent',
              borderLeftColor: 'transparent',
              shadowColor: meta.c1,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.6,
              shadowRadius: 16 * r,
              elevation: 4,
            },
          ]}
        />
      )}

      {/* Planet 1 — top, on the orbit (Bronze+) */}
      {showPlanet1 && (
        <View
          style={[
            styles.planet,
            {
              width: planet1,
              height: planet1,
              borderRadius: planet1 / 2,
              backgroundColor: c1Light,
              top: 6 * r,
              left: (size - planet1) / 2,
              shadowColor: c1Light,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.85,
              shadowRadius: 8 * r,
              elevation: 4,
            },
          ]}
        />
      )}

      {/* Planet 2 — bottom-left (Silver+) */}
      {showPlanet2 && (
        <View
          style={[
            styles.planet,
            {
              width: planet2,
              height: planet2,
              borderRadius: planet2 / 2,
              backgroundColor: meta.c2,
              bottom: 14 * r,
              left: size * 0.3 - planet2 / 2,
              opacity: 0.9,
              shadowColor: meta.c2,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.7,
              shadowRadius: 6 * r,
              elevation: 3,
            },
          ]}
        />
      )}

      {/* Planet 3 — bottom-right (Gold+) */}
      {showPlanet3 && (
        <View
          style={[
            styles.planet,
            {
              width: planet3,
              height: planet3,
              borderRadius: planet3 / 2,
              backgroundColor: c1Light,
              bottom: 30 * r,
              right: size * 0.18 - planet3 / 2,
              opacity: 0.85,
            },
          ]}
        />
      )}

      {/* Core — gradient fill (or transparent dashed for beginner) + inner ring */}
      {isBeginner ? (
        <View
          style={[
            styles.coreEmpty,
            {
              width: coreSize,
              height: coreSize,
              borderRadius: coreSize / 2,
            },
          ]}
        >
          <View
            style={[
              styles.coreInnerEmpty,
              {
                width: coreInnerSize,
                height: coreInnerSize,
                borderRadius: coreInnerSize / 2,
              },
            ]}
          >
            {showGlyph && (
              <Text
                style={[
                  styles.glyphEmpty,
                  { fontSize: glyphFontSize },
                ]}
              >
                {pr}
              </Text>
            )}
          </View>
        </View>
      ) : (
        <LinearGradient
          colors={[c1Light, meta.c2]}
          // Approximate radial highlight by anchoring the gradient to top-left;
          // RN doesn't ship a radial gradient, but the off-axis stop still
          // reads as "lit from above" which is the semantic we need.
          start={{ x: 0.25, y: 0.2 }}
          end={{ x: 0.85, y: 1 }}
          style={[
            styles.core,
            {
              width: coreSize,
              height: coreSize,
              borderRadius: coreSize / 2,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 12 * r },
              shadowOpacity: 0.45,
              shadowRadius: 28 * r,
              elevation: 12,
            },
          ]}
        >
          <View
            style={[
              styles.coreInner,
              {
                width: coreInnerSize,
                height: coreInnerSize,
                borderRadius: coreInnerSize / 2,
                borderWidth: Math.max(1, 1.5 * r),
                borderColor: 'rgba(255,255,255,0.2)',
              },
            ]}
          >
            {showGlyph && (
              <Text
                style={[
                  styles.glyph,
                  {
                    fontSize: glyphFontSize,
                    letterSpacing: -2 * r,
                  },
                ]}
              >
                {pr}
              </Text>
            )}
          </View>
        </LinearGradient>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aura: {
    position: 'absolute',
  },
  fullCircle: {
    position: 'absolute',
  },
  planet: {
    position: 'absolute',
  },
  core: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  coreEmpty: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(180,184,210,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coreInner: {
    backgroundColor: 'rgba(0,0,0,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coreInnerEmpty: {
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    fontFamily: 'Manrope_800ExtraBold',
    color: 'rgba(255,255,255,0.95)',
  },
  glyphEmpty: {
    fontFamily: 'Manrope_800ExtraBold',
    color: 'rgba(180,184,210,0.5)',
  },
});

// Re-export the alpha helper so screens importing the medallion don't need
// a second import line for tier color tinting. Keeps callers thin.
export { alpha } from '@/theme/skillTiers';
