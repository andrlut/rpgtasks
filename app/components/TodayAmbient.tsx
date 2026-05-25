import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { PercevaGlyph } from '@/components/PercevaGlyph';

/**
 * V3 ambient backdrop for the Tasks home screen. Absolute-positioned,
 * full-bleed, behind all content. Renders two layers:
 *
 *   1. **Violet halo** — radial gradient anchored top-right, fading
 *      out so it reads as a glow rather than a hard disc.
 *   2. **Topo Iris glyph** — the Perceva mark, oversized and clipped
 *      by the screen edge so only ~half is visible. 10% opacity so
 *      it's a "watermark", not a focal element.
 *
 * `pointerEvents="none"` so taps fall through to the layered content.
 */
export function TodayAmbient() {
  return (
    <View style={styles.wrap} pointerEvents="none">
      <Svg
        width={480}
        height={480}
        viewBox="0 0 480 480"
        style={styles.halo}
      >
        <Defs>
          <RadialGradient
            id="todayHalo"
            cx="50%"
            cy="50%"
            r="50%"
            fx="50%"
            fy="50%"
          >
            <Stop offset="0%" stopColor="#9B82FF" stopOpacity={0.22} />
            <Stop offset="40%" stopColor="#9B82FF" stopOpacity={0.1} />
            <Stop offset="70%" stopColor="#9B82FF" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={240} cy={240} r={240} fill="url(#todayHalo)" />
      </Svg>

      <View style={styles.glyphSlot}>
        <PercevaGlyph size={240} bare palette="primary" idSuffix="today-amb" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    zIndex: 0,
  },
  // The halo + glyph are deliberately oversized and clipped — they
  // anchor visually on the TodayHeader's ring. Ring center math:
  //   horizontal: header paddingHorizontal (16) + ring/2 (26)
  //               = 42 from screen right edge
  //   vertical:   header paddingTop (8) + eyebrow row (32) + gap (10)
  //               + ring/2 (26) = 76 from safe-area top
  //
  // Glyph (240×240): top = 76 - 120 = -44, right = 240/2 - 42 ... actually
  //   we want glyph center at (x_from_right=42, y_from_top=76)
  //   right offset = width - 2*x_from_right ... let's just verify with
  //   the formula: center_x_from_screen_right = -(right_offset) - width/2
  //   wait, for `right: R`: right edge at x = W-R (from screen left).
  //   With R=-78, w=240: center = (W-R-w/2) = W - (-78) - 120 = W + 78 - 120
  //   from screen right: W - (W+78-120) = 42 ✓
  //
  // So both anchors stay at right: -78 (horizontal) and top: -44.
  // Halo (480×480) follows the same anchor:
  //   right: -(480/2 - 42) = -198, top: -(480/2 - 76) = -164
  halo: {
    position: 'absolute',
    top: -164,
    right: -198,
  },
  glyphSlot: {
    position: 'absolute',
    top: -44,
    right: -78,
    width: 240,
    height: 240,
    opacity: 0.1,
  },
});
