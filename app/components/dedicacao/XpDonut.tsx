import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';

import { PercevaGlyph } from '@/components/PercevaGlyph';
import type { DimensionId } from '@/lib/db/types';
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
 * Empty window: faint full-circle ring + "0 XP" center.
 * Single-dim window (all XP in one dim): renders that dim's full ring with
 * no gap.
 */
export function XpDonut({
  slices,
  totalXp,
  prevTotalXp,
  size = 168,
  onSlicePress,
}: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - STROKE_W) / 2;
  // Glyph sits inside the donut hole — keep clear of the ring stroke.
  const glyphSize = Math.round(size * 0.62);

  const nonZero = useMemo(() => slices.filter((s) => s.xp > 0), [slices]);

  // Lay out arc ranges. Each non-zero dim gets (share * 360) - gap degrees.
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

  return (
    <View style={{ width: size, height: size }}>
      {/* Engraved Perceva mark inside the hole — same visual vocabulary
          as Vault cards; keeps the screen on-brand without competing
          with the data. */}
      <View style={styles.glyphWrap} pointerEvents="none">
        <PercevaGlyph
          size={glyphSize}
          bare
          palette="gilded"
          idSuffix="donut"
        />
      </View>
      <Svg width={size} height={size}>
        {/* Background ring — always present so the empty state still reads as a donut. */}
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
            // Single-dim window: end-start ≈ 360; arcPath collapses at 360,
            // so render as a full circle instead.
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
                  onPress={
                    onSlicePress ? () => onSlicePress(arc.dimId) : undefined
                  }
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
                onPress={
                  onSlicePress ? () => onSlicePress(arc.dimId) : undefined
                }
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
    </View>
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
    fontSize: 22,
    color: tokens.text.hi,
    lineHeight: 24,
  },
  xpLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
    color: tokens.text.dim,
    letterSpacing: 1.4,
    marginTop: -1,
  },
  deltaRow: {
    marginTop: 3,
    paddingHorizontal: 6,
  },
  deltaText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    letterSpacing: 0.3,
  },
});
