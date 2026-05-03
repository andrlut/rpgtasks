import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';

import type { CharacterSub, DimensionId } from '@/lib/db/types';
import { tokens } from '@/theme';
import { DIMENSION_META, DIMENSION_ORDER, SUB_META, SUBS_BY_DIM } from '@/theme/dimensions';

interface HexChartProps {
  /** All 12 character_sub rows. Missing subs default to score 0. */
  subs: CharacterSub[];
  size?: number;
}

/**
 * Wheel-of-life inspired hex chart.
 *
 *   - 6 corners = 6 dimensions, value 0-10 (sum of the 2 sub scores).
 *   - Filled polygon shows the user's current shape.
 *   - Below the chart: 6 columns, each with 2 sub rows showing the 0-5 score
 *     that fed into the dim's total.
 */
export function HexChart({ subs, size = 280 }: HexChartProps) {
  const subScores = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of subs) map.set(s.sub_id, s.subjective_score);
    return map;
  }, [subs]);

  const dimScores = useMemo(() => {
    const map = new Map<DimensionId, number>();
    for (const dim of DIMENSION_ORDER) {
      const [a, b] = SUBS_BY_DIM[dim];
      map.set(dim, (subScores.get(a) ?? 0) + (subScores.get(b) ?? 0));
    }
    return map;
  }, [subScores]);

  // Geometry
  const padding = 36; // room for labels
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - padding;
  const MAX = 10;

  // Hex corners — start at top, go clockwise.
  const corners = useMemo(() => {
    return DIMENSION_ORDER.map((dim, i) => {
      const angle = (Math.PI / 3) * i - Math.PI / 2; // -90° start
      return {
        dim,
        angle,
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
      };
    });
  }, [cx, cy, radius]);

  // Concentric grid rings (5 levels = every 2 points on 0-10 scale)
  const gridRings = [0.2, 0.4, 0.6, 0.8, 1.0];

  // Outer hex frame points (always at full radius)
  const framePoints = corners
    .map((c) => `${c.x.toFixed(2)},${c.y.toFixed(2)}`)
    .join(' ');

  // Polygon for the user's actual scores
  const valuePoints = corners
    .map((c) => {
      const v = dimScores.get(c.dim) ?? 0;
      const r = (v / MAX) * radius;
      const x = cx + r * Math.cos(c.angle);
      const y = cy + r * Math.sin(c.angle);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');

  return (
    <View>
      <View style={{ width: size, height: size, alignSelf: 'center' }}>
        <Svg width={size} height={size}>
          {/* Concentric grid rings (hex-shaped) */}
          {gridRings.map((g, i) => {
            const pts = corners
              .map((c) => {
                const r = g * radius;
                const x = cx + r * Math.cos(c.angle);
                const y = cy + r * Math.sin(c.angle);
                return `${x.toFixed(2)},${y.toFixed(2)}`;
              })
              .join(' ');
            return (
              <Polygon
                key={`ring-${i}`}
                points={pts}
                fill="none"
                stroke={tokens.border.divider}
                strokeWidth={1}
              />
            );
          })}

          {/* Spokes from center to each corner */}
          {corners.map((c, i) => (
            <Line
              key={`spoke-${i}`}
              x1={cx}
              y1={cy}
              x2={c.x}
              y2={c.y}
              stroke={tokens.border.divider}
              strokeWidth={1}
            />
          ))}

          {/* Outer frame */}
          <Polygon
            points={framePoints}
            fill="none"
            stroke={tokens.border.strong}
            strokeWidth={1.5}
          />

          {/* User value polygon */}
          <Polygon
            points={valuePoints}
            fill={tokens.brand.violetGlow}
            stroke={tokens.brand.violet2}
            strokeWidth={2}
          />

          {/* Corner dots */}
          {corners.map((c, i) => {
            const meta = DIMENSION_META[c.dim];
            const v = dimScores.get(c.dim) ?? 0;
            const r = (v / MAX) * radius;
            const x = cx + r * Math.cos(c.angle);
            const y = cy + r * Math.sin(c.angle);
            return (
              <Circle
                key={`corner-${i}`}
                cx={x}
                cy={y}
                r={5}
                fill={meta.color}
                stroke={tokens.bg.deep}
                strokeWidth={2}
              />
            );
          })}

          {/* Numeric value at each frame corner (0-10 dim score) */}
          {corners.map((c, i) => {
            const v = dimScores.get(c.dim) ?? 0;
            // Place text just outside the corner
            const labelR = radius + 18;
            const lx = cx + labelR * Math.cos(c.angle);
            const ly = cy + labelR * Math.sin(c.angle);
            const meta = DIMENSION_META[c.dim];
            return (
              <SvgText
                key={`val-${i}`}
                x={lx}
                y={ly + 4}
                fontSize={13}
                fontWeight="800"
                fill={meta.color}
                textAnchor="middle"
              >
                {v}
              </SvgText>
            );
          })}
        </Svg>

        {/* Dim icons positioned over corners (RN View overlay so we get Ionicons) */}
        {corners.map((c, i) => {
          const meta = DIMENSION_META[c.dim];
          // Place icon at frame corner, slightly outward
          const iconR = radius + 2;
          const ix = cx + iconR * Math.cos(c.angle) - 14;
          const iy = cy + iconR * Math.sin(c.angle) - 14;
          return (
            <View
              key={`icon-${i}`}
              style={[
                styles.cornerIconWrap,
                { left: ix, top: iy, backgroundColor: meta.bg, borderColor: `${meta.color}88` },
              ]}
            >
              <Ionicons
                name={meta.iconName as never}
                size={14}
                color={meta.color}
              />
            </View>
          );
        })}
      </View>

      {/* Legend: 6 columns, 2 sub rows each, showing 0-5 sub scores */}
      <View style={styles.legend}>
        {DIMENSION_ORDER.map((dim) => {
          const meta = DIMENSION_META[dim];
          const subIds = SUBS_BY_DIM[dim];
          return (
            <View key={dim} style={styles.legendCol}>
              <Text
                style={[styles.legendDim, { color: meta.color }]}
                numberOfLines={1}
              >
                {meta.label.toUpperCase()}
              </Text>
              {subIds.map((subId) => {
                const subMeta = SUB_META[subId];
                const score = subScores.get(subId) ?? 0;
                return (
                  <View key={subId} style={styles.legendSubRow}>
                    <Ionicons
                      name={subMeta.iconName as never}
                      size={10}
                      color={meta.color}
                    />
                    <Text style={styles.legendSubLabel} numberOfLines={1}>
                      {subMeta.label}
                    </Text>
                    <Text style={[styles.legendSubScore, { color: meta.color }]}>
                      {score}
                    </Text>
                  </View>
                );
              })}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cornerIconWrap: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  legend: {
    flexDirection: 'row',
    marginTop: tokens.space[3],
    gap: tokens.space[1],
  },
  legendCol: {
    flex: 1,
    gap: 4,
    paddingHorizontal: 2,
    paddingVertical: tokens.space[2],
    backgroundColor: tokens.bg.surface,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
    borderColor: tokens.border.base,
    alignItems: 'stretch',
  },
  legendDim: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 8,
    letterSpacing: 0.6,
    textAlign: 'center',
    marginBottom: 2,
  },
  legendSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 2,
  },
  legendSubLabel: {
    flex: 1,
    fontFamily: 'Manrope_500Medium',
    fontSize: 8,
    color: tokens.text.mid,
  },
  legendSubScore: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
  },
});
