import { useMemo } from 'react';
import {
  type GestureResponderEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';

import { PercevaGlyph } from '@/components/PercevaGlyph';
import type { DimensionId } from '@/lib/db/types';
import { useT } from '@/lib/i18n';
import { tokens } from '@/theme';
import { DIMENSION_META } from '@/theme/dimensions';

interface DimSlice {
  dimId: DimensionId;
  xp: number;
}

interface Props {
  /** Per-dim XP for this window. Zero values render as gaps. */
  slices: DimSlice[];
  totalXp: number;
  /** Total XP in the prior window, or null when comparison doesn't apply
   *  (granularity = 'all'). */
  prevTotalXp: number | null;
  size?: number;
  onSlicePress?: (dim: DimensionId) => void;
}

const STROKE_W = 14;
const GAP_DEG = 2;
// Extra hit radius on either side of the ring stroke — fingers are fat,
// and a 14px stroke is hostile to a literal hit test.
const HIT_RADIUS_INNER = 18;
const HIT_RADIUS_OUTER = 12;

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function arcPath(
  cx: number,
  cy: number,
  r: number,
  startAngleDeg: number,
  endAngleDeg: number,
): string {
  const start = polar(cx, cy, r, startAngleDeg);
  const end = polar(cx, cy, r, endAngleDeg);
  const largeArc = endAngleDeg - startAngleDeg > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

/**
 * Donut chart showing per-dimension XP share for a window. Center renders
 * the total XP and an optional ▲/▼ delta vs the prior window.
 *
 * Tap handling: a single outer Pressable covers the SVG and maps the touch
 * to a slice via angle math (atan2 from center). `onPress` on SVG Path was
 * inconsistent — RN-svg's hit testing on stroked-only paths drops events
 * near the inner edge — so we don't rely on it.
 *
 * Empty window: faint full-circle ring + "0 XP" center.
 * Single-dim window (all XP in one dim): full ring with no gap.
 */
export function XpDonut({
  slices,
  totalXp,
  prevTotalXp,
  size = 168,
  onSlicePress,
}: Props) {
  const { t } = useT();
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - STROKE_W) / 2;
  const glyphSize = Math.round(size * 0.62);

  const nonZero = useMemo(() => slices.filter((s) => s.xp > 0), [slices]);

  const arcs = useMemo(() => {
    if (totalXp <= 0 || nonZero.length === 0) return [];
    const totalGap = nonZero.length > 1 ? GAP_DEG * nonZero.length : 0;
    const available = 360 - totalGap;
    let cursor = 0;
    return nonZero.map((s) => {
      const span = (s.xp / totalXp) * available;
      const start = cursor;
      const end = cursor + span;
      cursor = end + (nonZero.length > 1 ? GAP_DEG : 0);
      return { dimId: s.dimId, start, end };
    });
  }, [nonZero, totalXp]);

  const delta = useMemo(() => {
    if (prevTotalXp === null) return null;
    if (prevTotalXp === 0 && totalXp === 0) return null;
    if (prevTotalXp === 0) return { kind: 'new' as const };
    const diff = totalXp - prevTotalXp;
    const pct = Math.round((diff / prevTotalXp) * 100);
    return { kind: 'pct' as const, pct, positive: diff >= 0 };
  }, [totalXp, prevTotalXp]);

  const handleTap = (event: GestureResponderEvent) => {
    if (!onSlicePress || arcs.length === 0) return;
    const { locationX, locationY } = event.nativeEvent;
    const dx = locationX - cx;
    const dy = locationY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    // Accept taps within a generous annulus around the stroke.
    const innerEdge = r - STROKE_W / 2 - HIT_RADIUS_INNER;
    const outerEdge = r + STROKE_W / 2 + HIT_RADIUS_OUTER;
    if (dist < innerEdge || dist > outerEdge) return;
    let angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    if (angle < 0) angle += 360;
    for (const arc of arcs) {
      if (angle >= arc.start && angle <= arc.end) {
        onSlicePress(arc.dimId);
        return;
      }
    }
  };

  return (
    <Pressable
      onPress={handleTap}
      style={{ width: size, height: size }}
      accessibilityRole="button"
      accessibilityLabel={t('a11y.xpByDimension')}
    >
      {/* Engraved Perceva mark inside the hole — same visual vocabulary
          as Vault cards. */}
      <View style={styles.glyphWrap} pointerEvents="none">
        <PercevaGlyph
          size={glyphSize}
          bare
          palette="gilded"
          idSuffix="donut"
        />
      </View>
      <Svg width={size} height={size} pointerEvents="none">
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          stroke={tokens.border.base}
          strokeWidth={STROKE_W}
          fill="none"
        />
        <G>
          {arcs.map((arc) => {
            const color = DIMENSION_META[arc.dimId].color;
            if (arc.end - arc.start >= 359.5) {
              return (
                <Circle
                  key={arc.dimId}
                  cx={cx}
                  cy={cy}
                  r={r}
                  stroke={color}
                  strokeWidth={STROKE_W}
                  fill="none"
                />
              );
            }
            return (
              <Path
                key={arc.dimId}
                d={arcPath(cx, cy, r, arc.start, arc.end)}
                stroke={color}
                strokeWidth={STROKE_W}
                strokeLinecap="butt"
                fill="none"
              />
            );
          })}
        </G>
      </Svg>

      <View style={styles.center} pointerEvents="none">
        <Text style={styles.totalXp}>{totalXp.toLocaleString()}</Text>
        <Text style={styles.xpLabel}>XP</Text>
        {delta && (
          <View style={styles.deltaRow}>
            {delta.kind === 'new' ? (
              <Text style={[styles.deltaText, { color: tokens.semantic.xp2 }]}>
                +{totalXp.toLocaleString()} novo
              </Text>
            ) : (
              <Text
                style={[
                  styles.deltaText,
                  {
                    color: delta.positive
                      ? tokens.semantic.xp2
                      : tokens.semantic.warn,
                  },
                ]}
              >
                {delta.positive ? '▲' : '▼'} {delta.positive ? '+' : ''}
                {delta.pct}%
              </Text>
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  glyphWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.1,
  },
  totalXp: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 38,
    color: tokens.text.hi,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  xpLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    color: tokens.text.dim,
    letterSpacing: 1.4,
    marginTop: 0,
  },
  deltaRow: {
    marginTop: 4,
    paddingHorizontal: 6,
  },
  deltaText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    letterSpacing: 0.3,
  },
});
