import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Line,
  Polygon,
  RadialGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import type { SubId } from '@/lib/db/types';
import { tokens } from '@/theme';
import { DIMENSION_META, DIMENSION_ORDER, SUB_META, SUBS_BY_DIM } from '@/theme/dimensions';

interface HexChartProps {
  /** Map of sub_id → score (0-5). Missing keys render as 0. */
  scores: Map<SubId, number>;
  size?: number;
}

const VIEWBOX = 340;
const CX = 170;
const CY = 170;
const R = 118; // outer ring radius
const SUB_MAX = 5; // 5 pips per sub
const DIM_MAX = SUB_MAX * 2; // sum of two subs

// Vertex angle (j in 0..5, top is 0).
function angleAt(j: number) {
  return (j / 6) * Math.PI * 2 - Math.PI / 2;
}

/** Hex polygon ring at a given fraction of R. */
function hexPoints(fraction: number) {
  const r = R * fraction;
  return Array.from({ length: 6 }, (_, j) => {
    const a = angleAt(j);
    return `${(CX + Math.cos(a) * r).toFixed(2)},${(CY + Math.sin(a) * r).toFixed(2)}`;
  }).join(' ');
}

/**
 * Self-assessment chart — Option A from the design handoff.
 *
 *   - 6-vertex hexagon polygon (one vertex per dim, clockwise from top:
 *     health, strength, mind, wealth, bonds, craft)
 *   - Each vertex carries a colored disc with the main score (sum of the
 *     dim's two subs, 0-10)
 *   - Outer dim labels at R + 22 in dim color
 *   - Center stamp: "OVERALL" + average of all 6 mains (rounded to 0.1)
 *   - Legend below: 3 × 2 grid of cards, one per dim, each with a square
 *     score badge and 2 sub rows of 5 pips
 */
export function HexChart({ scores, size = 340 }: HexChartProps) {
  // Per-dim main scores in vertex order (clockwise from top).
  const mains = useMemo(() => {
    return DIMENSION_ORDER.map((dim) => {
      const [a, b] = SUBS_BY_DIM[dim];
      const sa = scores.get(a) ?? 0;
      const sb = scores.get(b) ?? 0;
      return { dim, score: sa + sb, sa, sb };
    });
  }, [scores]);

  const overall = useMemo(() => {
    const sum = mains.reduce((s, m) => s + m.score, 0);
    return Math.round((sum / mains.length) * 10) / 10;
  }, [mains]);

  // Concentric ring polygons.
  const rings = [1 / 4, 2 / 4, 3 / 4, 4 / 4];

  // Score polygon points.
  const scorePts = mains
    .map((m, j) => {
      const a = angleAt(j);
      const r = (m.score / DIM_MAX) * R;
      return `${(CX + Math.cos(a) * r).toFixed(2)},${(CY + Math.sin(a) * r).toFixed(2)}`;
    })
    .join(' ');

  // Vertex positions for badges + outer labels.
  const verts = mains.map((m, j) => {
    const a = angleAt(j);
    const r = (m.score / DIM_MAX) * R;
    const x = CX + Math.cos(a) * r;
    const y = CY + Math.sin(a) * r;
    const lx = CX + Math.cos(a) * (R + 22);
    const ly = CY + Math.sin(a) * (R + 22);
    return { ...m, x, y, lx, ly };
  });

  return (
    <View>
      <Svg width={size} height={size} viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}>
        <Defs>
          <RadialGradient id="hexGradA" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#9B82FF" stopOpacity={0.5} />
            <Stop offset="100%" stopColor="#7B5CFF" stopOpacity={0.18} />
          </RadialGradient>
        </Defs>

        {/* Concentric hex rings */}
        {rings.map((g, i) => {
          const idx = i + 1;
          const dashed = idx === 2 || idx === 3;
          const isOuter = idx === 4;
          return (
            <Polygon
              key={`ring-${i}`}
              points={hexPoints(g)}
              fill={isOuter ? 'rgba(255,255,255,0.025)' : 'none'}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={1}
              strokeDasharray={dashed ? '2 4' : undefined}
            />
          );
        })}

        {/* Spokes from center to each outer vertex */}
        {mains.map((_, j) => {
          const a = angleAt(j);
          const x = CX + Math.cos(a) * R;
          const y = CY + Math.sin(a) * R;
          return (
            <Line
              key={`spoke-${j}`}
              x1={CX}
              y1={CY}
              x2={x}
              y2={y}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={1}
            />
          );
        })}

        {/* Score polygon */}
        <Polygon
          points={scorePts}
          fill="url(#hexGradA)"
          stroke="#9B82FF"
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {/* Vertex score discs */}
        {verts.map((v, j) => {
          const meta = DIMENSION_META[v.dim];
          return (
            <Circle
              key={`disc-${j}`}
              cx={v.x}
              cy={v.y}
              r={15}
              fill={meta.color}
            />
          );
        })}
        {verts.map((v, j) => (
          <SvgText
            key={`disc-text-${j}`}
            x={v.x}
            y={v.y + 4}
            textAnchor="middle"
            fontFamily="Manrope_800ExtraBold"
            fontSize={13}
            fill="#0E1230"
          >
            {v.score}
          </SvgText>
        ))}

        {/* Outer dim labels */}
        {verts.map((v, j) => (
          <SvgText
            key={`outer-${j}`}
            x={v.lx}
            y={v.ly + 4}
            textAnchor="middle"
            fontFamily="Manrope_800ExtraBold"
            fontSize={10}
            fill={DIMENSION_META[v.dim].color}
          >
            {DIMENSION_META[v.dim].label.toUpperCase()}
          </SvgText>
        ))}

        {/* Center stamp */}
        <SvgText
          x={CX}
          y={CY - 6}
          textAnchor="middle"
          fontFamily="Manrope_700Bold"
          fontSize={9}
          fill="#9AA0D4"
        >
          OVERALL
        </SvgText>
        <SvgText
          x={CX}
          y={CY + 18}
          textAnchor="middle"
          fontFamily="Manrope_800ExtraBold"
          fontSize={24}
          fill="#F2F3FF"
        >
          {overall.toFixed(1)}
        </SvgText>
      </Svg>

      {/* Legend grid: 2 rows × 3 cols */}
      <View style={styles.legendGrid}>
        {mains.map((m) => {
          const meta = DIMENSION_META[m.dim];
          const subIds = SUBS_BY_DIM[m.dim];
          return (
            <View
              key={m.dim}
              style={[styles.card, { borderColor: `${meta.color}40` }]}
            >
              <View style={styles.cardHeader}>
                <Text
                  style={[styles.cardLabel, { color: meta.color }]}
                  numberOfLines={1}
                >
                  {meta.label.toUpperCase()}
                </Text>
                <View style={[styles.cardBadge, { backgroundColor: meta.color }]}>
                  <Text style={styles.cardBadgeText}>{m.score}</Text>
                </View>
              </View>
              {subIds.map((subId, i) => {
                const subMeta = SUB_META[subId];
                const score = i === 0 ? m.sa : m.sb;
                return (
                  <View key={subId} style={styles.subRow}>
                    <Text style={styles.subLabel} numberOfLines={1}>
                      {subMeta.label}
                    </Text>
                    <View style={styles.pips}>
                      {[1, 2, 3, 4, 5].map((p) => (
                        <View
                          key={p}
                          style={[
                            styles.pip,
                            {
                              backgroundColor:
                                p <= score ? meta.color : 'rgba(255,255,255,0.10)',
                            },
                          ]}
                        />
                      ))}
                    </View>
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
  legendGrid: {
    marginTop: tokens.space[3],
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.space[2],
  },
  card: {
    width: '31.5%',
    flexGrow: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardLabel: {
    flex: 1,
    minWidth: 0,
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 9,
    letterSpacing: 1.2,
  },
  cardBadge: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBadgeText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
    color: '#0E1230',
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 5,
  },
  subLabel: {
    flex: 1,
    minWidth: 0,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10,
    color: tokens.text.mid,
  },
  pips: {
    flexDirection: 'row',
    gap: 2,
  },
  pip: {
    width: 6,
    height: 6,
    borderRadius: 2,
  },
});
