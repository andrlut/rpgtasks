import { StyleSheet, View } from 'react-native';

interface SparklineProps {
  /** Series of values, oldest → newest. Each value is clamped to [0, max]. */
  values: number[];
  max?: number;
  width?: number;
  height?: number;
  color: string;
  /** Color for the most-recent dot; falls back to `color`. */
  endDotColor?: string;
}

/**
 * Tiny pure-RN sparkline (no SVG). Plots a polyline of `values` left→right
 * inside a `width × height` box, with a colored dot at the most-recent
 * point. Returns null if there are fewer than 2 points (a single dot is
 * not informative).
 *
 * Implementation note: each segment is a thin View rotated to the segment
 * angle — a trick to dodge the react-native-svg native crashes on Android.
 *
 * OBSOLETE CONSTRAINT: those crashes no longer apply — react-native-svg
 * ships in production here, and `dedicacao/Sparkline` is an SVG sparkline.
 * Kept as-is because it works; don't cite this as a reason to avoid SVG.
 */
export function Sparkline({
  values,
  max = 5,
  width = 64,
  height = 18,
  color,
  endDotColor,
}: SparklineProps) {
  if (values.length < 2) return null;

  const PAD = 2;
  const w = width - PAD * 2;
  const h = height - PAD * 2;
  const N = values.length;
  const points = values.map((raw, i) => {
    const v = Math.max(0, Math.min(max, raw));
    return {
      x: PAD + (i / (N - 1)) * w,
      y: PAD + (1 - v / max) * h,
    };
  });

  const segments = points.slice(1).map((p, i) => {
    const prev = points[i];
    const dx = p.x - prev.x;
    const dy = p.y - prev.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    return { x: prev.x, y: prev.y, len, angle };
  });

  const last = points[N - 1];

  return (
    <View style={[styles.canvas, { width, height }]}>
      {segments.map((s, i) => (
        <View
          key={`seg-${i}`}
          style={{
            position: 'absolute',
            left: s.x,
            top: s.y - 1,
            width: s.len,
            height: 2,
            backgroundColor: color,
            opacity: 0.85,
            transformOrigin: '0% 50%',
            transform: [{ rotate: `${s.angle}deg` }],
          }}
        />
      ))}
      <View
        style={{
          position: 'absolute',
          left: last.x - 3,
          top: last.y - 3,
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: endDotColor ?? color,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    position: 'relative',
    overflow: 'hidden',
  },
});
