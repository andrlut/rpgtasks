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
  halo: {
    position: 'absolute',
    top: -160,
    right: -200,
  },
  glyphSlot: {
    position: 'absolute',
    top: -40,
    right: -50,
    width: 240,
    height: 240,
    opacity: 0.1,
  },
});
