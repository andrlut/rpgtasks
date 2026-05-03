import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polygon } from 'react-native-svg';

import type { SubId } from '@/lib/db/types';
import { tokens } from '@/theme';
import { DIMENSION_META, DIMENSION_ORDER, SUB_META, SUBS_BY_DIM } from '@/theme/dimensions';

interface HexChartProps {
  /** Map of sub_id → score (0-5). Missing keys render as 0. */
  scores: Map<SubId, number>;
  size?: number;
}

const SUB_MAX = 5;
const DIM_MAX = SUB_MAX * 2;
const PADDING = 56; // room for outer labels

function angleAt(j: number) {
  return (j / 6) * Math.PI * 2 - Math.PI / 2;
}

/**
 * Wheel-of-life style hex chart, identical on every platform.
 *
 * The SVG layer ONLY uses primitive shapes (Polygon / Line / Circle) — no
 * gradients, no SvgText, no Defs. Those were the parts of react-native-svg
 * 15.12.1 that crashed on Android natively. Numbers and labels are
 * absolutely-positioned RN <Text> overlays so they use the same Manrope
 * fonts the rest of the app uses.
 */
export function HexChart({ scores, size = 320 }: HexChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - PADDING;

  const mains = useMemo(() => {
    return DIMENSION_ORDER.map((dim, j) => {
      const [a, b] = SUBS_BY_DIM[dim];
      const sa = scores.get(a) ?? 0;
      const sb = scores.get(b) ?? 0;
      const score = sa + sb;
      const angle = angleAt(j);
      const r = (score / DIM_MAX) * R;
      return {
        dim,
        score,
        sa,
        sb,
        angle,
        // Score-vertex (where the colored disc lives).
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        // Outer hex frame vertex (full R).
        fx: cx + Math.cos(angle) * R,
        fy: cy + Math.sin(angle) * R,
        // Outer label position.
        lx: cx + Math.cos(angle) * (R + 22),
        ly: cy + Math.sin(angle) * (R + 22),
      };
    });
  }, [scores, cx, cy, R]);

  const overall = useMemo(() => {
    const sum = mains.reduce((s, m) => s + m.score, 0);
    return Math.round((sum / mains.length) * 10) / 10;
  }, [mains]);

  // Concentric reference rings (every 20% of R).
  const ringFractions = [0.25, 0.5, 0.75, 1.0];

  const framePoints = mains.map((m) => `${m.fx},${m.fy}`).join(' ');
  const scorePoints = mains.map((m) => `${m.x},${m.y}`).join(' ');

  return (
    <View>
      <View style={[styles.canvas, { width: size, height: size }]}>
        <Svg width={size} height={size}>
          {/* Concentric hex rings */}
          {ringFractions.map((g, i) => {
            const pts = mains
              .map((m) => {
                const x = cx + Math.cos(m.angle) * R * g;
                const y = cy + Math.sin(m.angle) * R * g;
                return `${x},${y}`;
              })
              .join(' ');
            return (
              <Polygon
                key={`ring-${i}`}
                points={pts}
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={1}
              />
            );
          })}

          {/* Spokes from center to each frame vertex */}
          {mains.map((m, j) => (
            <Line
              key={`spoke-${j}`}
              x1={cx}
              y1={cy}
              x2={m.fx}
              y2={m.fy}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={1}
            />
          ))}

          {/* Outer frame */}
          <Polygon
            points={framePoints}
            fill="none"
            stroke="rgba(255,255,255,0.18)"
            strokeWidth={1.5}
          />

          {/* Score polygon — flat semi-transparent violet fill */}
          <Polygon
            points={scorePoints}
            fill="rgba(155,130,255,0.28)"
            stroke="#9B82FF"
            strokeWidth={2}
            strokeLinejoin="round"
          />

          {/* Vertex score discs */}
          {mains.map((m) => {
            const meta = DIMENSION_META[m.dim];
            return (
              <Circle
                key={`disc-${m.dim}`}
                cx={m.x}
                cy={m.y}
                r={15}
                fill={meta.color}
                stroke={tokens.bg.deep}
                strokeWidth={2}
              />
            );
          })}
        </Svg>

        {/* RN <Text> overlays for numbers and labels — uses Manrope. */}

        {/* Score numbers inside each disc */}
        {mains.map((m) => (
          <Text
            key={`disc-text-${m.dim}`}
            style={[
              styles.discText,
              {
                left: m.x - 16,
                top: m.y - 9,
                width: 32,
              },
            ]}
            allowFontScaling={false}
          >
            {m.score}
          </Text>
        ))}

        {/* Outer dim labels around the perimeter */}
        {mains.map((m) => {
          const meta = DIMENSION_META[m.dim];
          const dx = m.lx - cx;
          const align: 'left' | 'right' | 'center' =
            dx > 5 ? 'left' : dx < -5 ? 'right' : 'center';
          const labelWidth = 76;
          const labelLeft =
            align === 'left'
              ? m.lx - 4
              : align === 'right'
                ? m.lx - labelWidth + 4
                : m.lx - labelWidth / 2;
          return (
            <Text
              key={`outer-${m.dim}`}
              style={[
                styles.outerLabel,
                {
                  left: labelLeft,
                  top: m.ly - 7,
                  width: labelWidth,
                  textAlign: align,
                  color: meta.color,
                },
              ]}
              numberOfLines={1}
              allowFontScaling={false}
            >
              {meta.label.toUpperCase()}
            </Text>
          );
        })}

        {/* Center overall number */}
        <Text
          style={[
            styles.overallText,
            { left: 0, top: cy - 18, width: size },
          ]}
          allowFontScaling={false}
        >
          {overall.toFixed(1)}
        </Text>
      </View>

      {/* Legend: 2 rows × 3 cols, exact widths via flex:1 */}
      <View style={{ gap: tokens.space[2], marginTop: tokens.space[3] }}>
        {[0, 3].map((rowStart) => (
          <View key={`row-${rowStart}`} style={styles.legendRow}>
            {mains.slice(rowStart, rowStart + 3).map((m) => {
              const meta = DIMENSION_META[m.dim];
              const subIds = SUBS_BY_DIM[m.dim];
              return (
                <View
                  key={`card-${m.dim}`}
                  style={[styles.card, { borderColor: `${meta.color}40` }]}
                >
                  <View style={styles.cardHeader}>
                    <Ionicons
                      name={meta.iconName as never}
                      size={12}
                      color={meta.color}
                    />
                    <Text
                      style={[styles.cardLabel, { color: meta.color }]}
                      numberOfLines={1}
                    >
                      {meta.label.toUpperCase()}
                    </Text>
                    <View
                      style={[styles.cardBadge, { backgroundColor: meta.color }]}
                    >
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
                                    p <= score
                                      ? meta.color
                                      : 'rgba(255,255,255,0.10)',
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
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    alignSelf: 'center',
    position: 'relative',
  },
  outerLabel: {
    position: 'absolute',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    letterSpacing: 1.2,
  },
  discText: {
    position: 'absolute',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 13,
    color: '#0E1230',
    textAlign: 'center',
    lineHeight: 16,
  },
  overallText: {
    position: 'absolute',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 28,
    color: tokens.text.hi,
    textAlign: 'center',
  },
  legendRow: {
    flexDirection: 'row',
    gap: tokens.space[2],
  },
  card: {
    flex: 1,
    minWidth: 0,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
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
