import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';

import type { CharacterSub, SubId } from '@/lib/db/types';
import { tokens } from '@/theme';
import { DIMENSION_META, DIMENSION_ORDER, SUB_META, SUBS_BY_DIM } from '@/theme/dimensions';

interface HexChartProps {
  /** All 12 character_sub rows. Missing subs default to score 0. */
  subs: CharacterSub[];
  size?: number;
}

/**
 * Wheel-of-life chart with 12 axes (one per sub) plus a 6-ball overlay
 * showing the per-dim average.
 *
 *   - 12 corners = 12 subs, value 0-5 each. Adjacent pairs share their
 *     parent dim's color.
 *   - User shape: filled polygon connecting the 12 sub scores.
 *   - 6 dim "balls" sit at the midpoint angle between each dim's two
 *     subs, radius = avg of the pair, color = dim color, value inside.
 *   - Bottom legend: 6 columns (one per dim), each with the dim avg
 *     and the 2 sub scores.
 */
export function HexChart({ subs, size = 300 }: HexChartProps) {
  const subScores = useMemo(() => {
    const map = new Map<SubId, number>();
    for (const s of subs) map.set(s.sub_id as SubId, s.subjective_score);
    return map;
  }, [subs]);

  // Flat list of 12 subs in display order (dim-paired).
  const subOrder = useMemo<SubId[]>(
    () => DIMENSION_ORDER.flatMap((d) => SUBS_BY_DIM[d]),
    [],
  );

  const padding = 56;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - padding;
  const SUB_MAX = 5;

  // Sub corners — 12 axes, 30° steps starting at top.
  const corners = useMemo(() => {
    return subOrder.map((subId, i) => {
      const angle = (Math.PI / 6) * i - Math.PI / 2;
      const meta = SUB_META[subId];
      return {
        subId,
        dimensionId: meta.dimensionId,
        angle,
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
      };
    });
  }, [subOrder, cx, cy, radius]);

  // Dim midpoints — angle bisects the two sub axes of a dim.
  const dimMids = useMemo(() => {
    return DIMENSION_ORDER.map((dim, d) => {
      const angle = (Math.PI / 6) * (2 * d + 0.5) - Math.PI / 2;
      const [a, b] = SUBS_BY_DIM[dim];
      const sa = subScores.get(a) ?? 0;
      const sb = subScores.get(b) ?? 0;
      const avg = (sa + sb) / 2;
      const r = (avg / SUB_MAX) * radius;
      return {
        dim,
        angle,
        avg,
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
        labelX: cx + (radius + 26) * Math.cos(angle),
        labelY: cy + (radius + 26) * Math.sin(angle),
      };
    });
  }, [subScores, cx, cy, radius]);

  // Concentric grid (every full point on the 0-5 scale).
  const gridRings = [1 / 5, 2 / 5, 3 / 5, 4 / 5, 1.0];

  const framePoints = corners
    .map((c) => `${c.x.toFixed(2)},${c.y.toFixed(2)}`)
    .join(' ');

  const valuePoints = corners
    .map((c) => {
      const v = subScores.get(c.subId) ?? 0;
      const r = (v / SUB_MAX) * radius;
      const x = cx + r * Math.cos(c.angle);
      const y = cy + r * Math.sin(c.angle);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');

  return (
    <View>
      <View style={{ width: size, height: size, alignSelf: 'center' }}>
        <Svg width={size} height={size}>
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

          {corners.map((c, i) => (
            <Line
              key={`spoke-${i}`}
              x1={cx}
              y1={cy}
              x2={c.x}
              y2={c.y}
              stroke={`${DIMENSION_META[c.dimensionId].color}40`}
              strokeWidth={1}
            />
          ))}

          <Polygon
            points={framePoints}
            fill="none"
            stroke={tokens.border.strong}
            strokeWidth={1.5}
          />

          <Polygon
            points={valuePoints}
            fill={tokens.brand.violetGlow}
            stroke={tokens.brand.violet2}
            strokeWidth={2}
          />

          {corners.map((c, i) => {
            const v = subScores.get(c.subId) ?? 0;
            const r = (v / SUB_MAX) * radius;
            const x = cx + r * Math.cos(c.angle);
            const y = cy + r * Math.sin(c.angle);
            return (
              <Circle
                key={`sub-dot-${i}`}
                cx={x}
                cy={y}
                r={3.5}
                fill={DIMENSION_META[c.dimensionId].color}
                stroke={tokens.bg.deep}
                strokeWidth={1}
              />
            );
          })}

          {dimMids.map((m, i) => (
            <Circle
              key={`dim-ball-${i}`}
              cx={m.x}
              cy={m.y}
              r={13}
              fill={DIMENSION_META[m.dim].color}
              stroke={tokens.bg.deep}
              strokeWidth={2}
              opacity={0.95}
            />
          ))}
          {dimMids.map((m, i) => (
            <SvgText
              key={`dim-ball-text-${i}`}
              x={m.x}
              y={m.y + 4}
              textAnchor="middle"
              fontSize={11}
              fontWeight="800"
              fill={tokens.text.hi}
            >
              {m.avg.toFixed(1)}
            </SvgText>
          ))}

          {dimMids.map((m, i) => (
            <SvgText
              key={`dim-label-${i}`}
              x={m.labelX}
              y={m.labelY + 4}
              textAnchor="middle"
              fontSize={10}
              fontWeight="800"
              fill={DIMENSION_META[m.dim].color}
            >
              {DIMENSION_META[m.dim].label.toUpperCase()}
            </SvgText>
          ))}
        </Svg>
      </View>

      <View style={styles.legend}>
        {DIMENSION_ORDER.map((dim) => {
          const meta = DIMENSION_META[dim];
          const subIds = SUBS_BY_DIM[dim];
          const sa = subScores.get(subIds[0]) ?? 0;
          const sb = subScores.get(subIds[1]) ?? 0;
          const avg = (sa + sb) / 2;
          return (
            <View
              key={dim}
              style={[styles.legendCol, { borderColor: `${meta.color}33` }]}
            >
              <View style={[styles.legendBadge, { backgroundColor: meta.color }]}>
                <Text style={styles.legendBadgeText}>{avg.toFixed(1)}</Text>
              </View>
              <Text
                style={[styles.legendDim, { color: meta.color }]}
                numberOfLines={1}
              >
                {meta.label}
              </Text>
              {subIds.map((subId, i) => {
                const subMeta = SUB_META[subId];
                const score = i === 0 ? sa : sb;
                return (
                  <View key={subId} style={styles.legendSubRow}>
                    <Ionicons
                      name={subMeta.iconName as never}
                      size={9}
                      color={tokens.text.dim}
                    />
                    <Text style={styles.legendSubLabel} numberOfLines={1}>
                      {subMeta.label}
                    </Text>
                    <Text style={styles.legendSubScore}>{score}</Text>
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
  legend: {
    flexDirection: 'row',
    marginTop: tokens.space[4],
    gap: tokens.space[1],
  },
  legendCol: {
    flex: 1,
    gap: 3,
    paddingHorizontal: 3,
    paddingTop: tokens.space[3],
    paddingBottom: tokens.space[2],
    backgroundColor: tokens.bg.surface,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
    alignItems: 'stretch',
  },
  legendBadge: {
    alignSelf: 'center',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  legendBadgeText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 12,
    color: tokens.text.hi,
  },
  legendDim: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 9,
    letterSpacing: 0.4,
    textAlign: 'center',
    marginBottom: 4,
    textTransform: 'uppercase',
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
    color: tokens.text.hi,
  },
});
