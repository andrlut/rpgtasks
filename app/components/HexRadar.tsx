import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Polygon,
  Stop,
} from 'react-native-svg';

import type { DimensionId } from '@/lib/db/types';
import { tokens } from '@/theme';
import { DIMENSION_META, DIMENSION_ORDER } from '@/theme/dimensions';

export interface HexAxis {
  dimId: DimensionId;
  /** Distance from the center as a fraction of the outer ring (0..1). The
   *  caller owns the scale — absolute, relative, capped, floored, whatever
   *  its screen means — this component only draws what it is handed. */
  ratio: number;
  /** Lights the badge and draws the vertex dot. False renders the axis
   *  present-but-muted, which is how "no data on this axis" reads. */
  active: boolean;
  a11yLabel: string;
}

interface Props {
  /** Six axes in DIMENSION_ORDER. */
  axes: HexAxis[];
  /** Optional comparison series, ratios in DIMENSION_ORDER. Outline only —
   *  no fill, no dots — so it never competes with the primary shape. */
  secondary?: number[];
  secondaryColor?: string;
  centerValue: string;
  /** Small caps under the value (e.g. "XP"). Omit for a bare number. */
  centerUnit?: string;
  centerFontSize?: number;
  /** Gradient endpoints for the polygon fill — pass solid colors; the
   *  opacity ramp is fixed here so both charts fade identically. */
  fillFrom: string;
  fillTo: string;
  strokeColor: string;
  size?: number;
  onAxisPress?: (dim: DimensionId) => void;
  /** Stable id for the gradient def — required because SVG defs share a
   *  flat namespace and two hexes can render on the same screen. */
  idSuffix: string;
  a11yLabel: string;
}

// 32 + hitSlop 8 = a 48×48 tap target, clearing the 44×44 iOS HIG /
// WCAG 2.5.5 floor. Don't shrink either number without checking that sum.
const BADGE = 32;
const LABEL_GAP = 17;
const PADDING = BADGE / 2 + LABEL_GAP + 1;

/** Evenly spaced thirds. The grid is a ruler, not a scoring band — equal
 *  steps keep the two charts readable as the same instrument even though
 *  one axis is absolute (0..10) and the other relative to its window. */
const RING_STEPS = [0.34, 0.67, 1];

function angleAt(j: number) {
  return (j / 6) * Math.PI * 2 - Math.PI / 2;
}

function ringPoints(cx: number, cy: number, r: number): string {
  return DIMENSION_ORDER.map((_, j) => {
    const a = angleAt(j);
    return `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`;
  }).join(' ');
}

/**
 * Six-axis hexagonal radar — the shared canvas behind Avaliação's
 * wheel-of-life and Dedicação's XP distribution.
 *
 * Deliberately ignorant of what it plots. It receives ratios already
 * normalized to 0..1 and a pre-formatted center string; every domain
 * decision (what the ceiling is, how to round, what counts as empty)
 * belongs to the caller. That is what lets the two screens share one
 * visual language without sharing any semantics.
 *
 * Dimension identity rides on the outer icon badges and the colored vertex
 * dots, never on the fill: the shape is a single region and can't honestly
 * be six colors at once.
 *
 * Empty state: when no axis is active the polygon is skipped entirely, so
 * an all-zero series renders as bare grid instead of a degenerate spike
 * collapsed onto the center point.
 */
export function HexRadar({
  axes,
  secondary,
  secondaryColor = tokens.dimension.bonds,
  centerValue,
  centerUnit,
  centerFontSize = 28,
  fillFrom,
  fillTo,
  strokeColor,
  size = 260,
  onAxisPress,
  idSuffix,
  a11yLabel,
}: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - PADDING;

  const points = useMemo(
    () =>
      axes.map((axis, j) => {
        const angle = angleAt(j);
        const r = Math.max(0, Math.min(1, axis.ratio)) * R;
        return {
          x: cx + Math.cos(angle) * r,
          y: cy + Math.sin(angle) * r,
          bx: cx + Math.cos(angle) * (R + LABEL_GAP),
          by: cy + Math.sin(angle) * (R + LABEL_GAP),
        };
      }),
    [axes, cx, cy, R],
  );

  const hasShape = axes.some((a) => a.active && a.ratio > 0);

  const shapePoints = useMemo(
    () => points.map((p) => `${p.x},${p.y}`).join(' '),
    [points],
  );

  const secondaryPoints = useMemo(() => {
    if (!secondary || !secondary.some((r) => r > 0)) return null;
    return secondary
      .map((ratio, j) => {
        const angle = angleAt(j);
        const r = Math.max(0, Math.min(1, ratio)) * R;
        return `${cx + Math.cos(angle) * r},${cy + Math.sin(angle) * r}`;
      })
      .join(' ');
  }, [secondary, cx, cy, R]);

  const gradId = `hexradar-${idSuffix}`;

  return (
    <View
      style={{ width: size, height: size }}
      accessibilityRole="image"
      accessibilityLabel={a11yLabel}
    >
      <Svg width={size} height={size} pointerEvents="none">
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={fillFrom} stopOpacity={0.34} />
            <Stop offset="1" stopColor={fillTo} stopOpacity={0.08} />
          </LinearGradient>
        </Defs>

        {RING_STEPS.map((step) => (
          <Polygon
            key={step}
            points={ringPoints(cx, cy, R * step)}
            fill="none"
            stroke={step === 1 ? tokens.border.strong : tokens.border.divider}
            strokeWidth={1}
          />
        ))}

        {axes.map((axis, j) => {
          const a = angleAt(j);
          return (
            <Line
              key={axis.dimId}
              x1={cx}
              y1={cy}
              x2={cx + Math.cos(a) * R}
              y2={cy + Math.sin(a) * R}
              stroke={tokens.border.divider}
              strokeWidth={1}
            />
          );
        })}

        {/* Comparison series sits under the primary so the shape the screen
            is actually about stays on top. */}
        {secondaryPoints && (
          <Polygon
            points={secondaryPoints}
            fill="none"
            stroke={secondaryColor}
            strokeWidth={1.5}
            strokeOpacity={0.85}
            strokeLinejoin="round"
          />
        )}

        {hasShape && (
          <Polygon
            points={shapePoints}
            fill={`url(#${gradId})`}
            stroke={strokeColor}
            strokeWidth={1.75}
            strokeLinejoin="round"
          />
        )}

        {hasShape &&
          axes.map((axis, j) =>
            axis.active ? (
              <Circle
                key={axis.dimId}
                cx={points[j].x}
                cy={points[j].y}
                r={4}
                fill={DIMENSION_META[axis.dimId].color}
              />
            ) : null,
          )}
      </Svg>

      <View style={styles.center} pointerEvents="none">
        <Text
          style={[
            styles.centerValue,
            { fontSize: centerFontSize, lineHeight: centerFontSize * 1.1 },
          ]}
          allowFontScaling={false}
          numberOfLines={1}
        >
          {centerValue}
        </Text>
        {centerUnit ? (
          <Text style={styles.centerUnit} allowFontScaling={false}>
            {centerUnit}
          </Text>
        ) : null}
      </View>

      {axes.map((axis, j) => {
        const meta = DIMENSION_META[axis.dimId];
        return (
          <Pressable
            key={axis.dimId}
            disabled={!onAxisPress}
            onPress={() => onAxisPress?.(axis.dimId)}
            hitSlop={8}
            style={({ pressed }) => [
              styles.badge,
              {
                left: points[j].bx - BADGE / 2,
                top: points[j].by - BADGE / 2,
                backgroundColor: meta.bg,
                borderColor: axis.active ? `${meta.color}66` : 'transparent',
              },
              pressed && { opacity: 0.6 },
            ]}
            accessibilityRole={onAxisPress ? 'button' : 'image'}
            accessibilityLabel={axis.a11yLabel}
          >
            <Ionicons
              name={meta.iconName as never}
              size={15}
              color={axis.active ? meta.color : tokens.text.faint}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    width: BADGE,
    height: BADGE,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerValue: {
    fontFamily: 'Manrope_800ExtraBold',
    color: tokens.text.hi,
    letterSpacing: -0.5,
  },
  centerUnit: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    color: tokens.text.dim,
    letterSpacing: 1.4,
    marginTop: 1,
  },
});
