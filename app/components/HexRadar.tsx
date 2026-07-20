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
  /** Optional comparison series, ratios in DIMENSION_ORDER. Unfilled and
   *  lighter-weight than the primary, with smaller vertex dots, so it reads
   *  as the reference rather than the subject. */
  secondary?: number[];
  secondaryColor?: string;
  /** Pre-formatted headline for the middle of the hex. Drawn beneath the
   *  plot, so a low-value vertex crosses it rather than being hidden by it.
   *  Omit for a chart that carries its figure elsewhere. */
  centerValue?: string;
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

// 32 + hitSlop 8 per side = a 48×48 tap target, clearing the 44×44 iOS HIG
// / WCAG 2.5.5 floor. Don't shrink either number without checking that sum.
//
// HIT_SLOP is inside PADDING on purpose. hitSlop only enlarges the target
// within the parent's own bounds — Android does not dispatch touches that
// land outside a ViewGroup's rect, so slop hanging off the container edge
// is silently dead. Reserving it here puts the badge's outer edge exactly
// HIT_SLOP inside the size×size box, which makes the 48×48 real on every
// axis instead of only on the four non-extreme ones. Cost is 7px of plot
// radius versus stopping at +1; that is the price of the claim above.
const BADGE = 32;
const LABEL_GAP = 17;
const HIT_SLOP = 8;
const PADDING = BADGE / 2 + LABEL_GAP + HIT_SLOP;

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
 *
 * The centered readout is opt-in (`centerValue`) rather than structural,
 * because it occludes the middle of the plot and that is where small values
 * sit. Avaliação can afford it — its scale is absolute, so a dim low enough
 * to disappear under the number is one the legend cards below already
 * spell out. Dedicação cannot: its scale is relative, so an ordinary
 * lopsided window pushes real, non-zero dims under the text.
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
    return DIMENSION_ORDER.map((_, j) => {
      const angle = angleAt(j);
      const r = Math.max(0, Math.min(1, secondary[j] ?? 0)) * R;
      return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
    });
  }, [secondary, cx, cy, R]);

  const gradId = `hexradar-${idSuffix}`;

  return (
    <View
      style={{ width: size, height: size }}
      accessibilityRole="image"
      accessibilityLabel={a11yLabel}
    >
      {/* The readout sits UNDER the plot, not over it. A radar's center is
          where the low values live, so whichever of the two is drawn last
          wins that region — and the summary figure is the thing that can
          afford to lose it. A 4px vertex dot crossing a glyph costs the
          number almost nothing and costs the data nothing at all; the other
          order hides a dim entirely. This is what lets both charts carry a
          centered figure without the shape having to make room for it. */}
      {centerValue !== undefined ? (
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
      ) : null}

      <Svg
        width={size}
        height={size}
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
      >
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

        {hasShape && (
          <Polygon
            points={shapePoints}
            fill={`url(#${gradId})`}
            stroke={strokeColor}
            strokeWidth={1.75}
            strokeLinejoin="round"
          />
        )}

        {/* Comparison series draws OVER the primary, not under it. The
            primary is a filled region (opacity ramps 0.34 → 0.08), so an
            outline underneath gets tinted by up to a third wherever the two
            shapes overlap — which on a comparison view is most of the
            interesting area. Keeping it lighter in weight (1.5 vs 1.75) and
            leaving it unfilled is what stops it competing; z-order is not
            the lever that does that.

            The vertex marks matter for the same reason: the comparison this
            view exists for is read per axis, and an untagged outline makes
            the reader interpolate crossings. Smaller (3 vs 4) so the primary
            still leads. */}
        {secondaryPoints && (
          <Polygon
            points={secondaryPoints.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke={secondaryColor}
            strokeWidth={1.5}
            strokeOpacity={0.9}
            strokeLinejoin="round"
          />
        )}

        {secondaryPoints?.map((p, j) => (
          <Circle
            key={`sec-${DIMENSION_ORDER[j]}`}
            cx={p.x}
            cy={p.y}
            r={3}
            fill={secondaryColor}
          />
        ))}

        {hasShape &&
          axes.map((axis, j) =>
            axis.active ? (
              <Circle
                key={axis.dimId}
                cx={points[j].x}
                cy={points[j].y}
                r={4}
                fill={DIMENSION_META[axis.dimId].color}
                stroke={tokens.bg.deep}
                strokeWidth={1}
              />
            ) : null,
          )}
      </Svg>

      {axes.map((axis, j) => {
        const meta = DIMENSION_META[axis.dimId];
        return (
          <Pressable
            key={axis.dimId}
            disabled={!onAxisPress}
            onPress={() => onAxisPress?.(axis.dimId)}
            hitSlop={HIT_SLOP}
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
