import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { DimensionId, SubId } from '@/lib/db/types';
import { formatScore } from '@/lib/util/formatScore';
import { tokens } from '@/theme';
import { useMetaLookup } from '@/lib/i18n/meta';
import { DIMENSION_ORDER, SUBS_BY_DIM } from '@/theme/dimensions';

interface HexChartProps {
  /** Map of sub_id → score (0-5). Missing keys render as 0. */
  scores: Map<SubId, number>;
  /** Optional second series — rendered as an outline-only polygon in the
   *  secondary color, no vertex discs. Used for "self vs questionnaire"
   *  comparison without doubling up the visual weight. */
  secondaryScores?: Map<SubId, number>;
  size?: number;
  /** Color for the secondary polygon outline. Defaults to bonds teal. */
  secondaryColor?: string;
  /** When provided, the 6 legend cards become tappable and call this with
   *  the dim id. Used to drill into the dim detail screen from the hex. */
  onDimPress?: (dim: DimensionId) => void;
}

const SUB_MAX = 5;
const DIM_MAX = SUB_MAX * 2;
const PADDING = 56;

function angleAt(j: number) {
  return (j / 6) * Math.PI * 2 - Math.PI / 2;
}

interface LineProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  width?: number;
  opacity?: number;
}

/** A line segment between two points, drawn as a thin rotated View. */
function Line({ x1, y1, x2, y2, color, width = 1, opacity = 1 }: LineProps) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  return (
    <View
      style={{
        position: 'absolute',
        left: x1,
        top: y1 - width / 2,
        width: length,
        height: width,
        backgroundColor: color,
        opacity,
        transformOrigin: '0% 50%',
        transform: [{ rotate: `${angle}deg` }],
      }}
    />
  );
}

/**
 * Wheel-of-life hexagon — pure React Native, no react-native-svg anywhere.
 *
 * react-native-svg 15.12.1 has native crashes on Android even with just
 * the basic primitives (Polygon/Line/Circle). To keep the chart identical
 * everywhere, this version uses only Views and rotated Line segments.
 *
 * Trade-off: no filled polygon — only outline. The score shape comes
 * across via the outline + the 6 colored vertex discs at varying radii.
 *
 * OBSOLETE CONSTRAINT: react-native-svg is stable on Android now and ships
 * in production (dedicacao/Sparkline and dedicacao/XpHexChart both use it).
 * Nothing forces the View-and-rotation approach anymore. This component is
 * not being rewritten because it works and is live in Avaliação — but a new
 * chart should reach for SVG, not copy this.
 */
export function HexChart({
  scores,
  secondaryScores,
  size = 320,
  secondaryColor = '#4DD0FF',
  onDimPress,
}: HexChartProps) {
  const metaLookup = useMetaLookup();
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
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        fx: cx + Math.cos(angle) * R,
        fy: cy + Math.sin(angle) * R,
        lx: cx + Math.cos(angle) * (R + 22),
        ly: cy + Math.sin(angle) * (R + 22),
      };
    });
  }, [scores, cx, cy, R]);

  const secondary = useMemo(() => {
    if (!secondaryScores) return null;
    return DIMENSION_ORDER.map((dim, j) => {
      const [a, b] = SUBS_BY_DIM[dim];
      const sa = secondaryScores.get(a) ?? 0;
      const sb = secondaryScores.get(b) ?? 0;
      const score = sa + sb;
      const angle = angleAt(j);
      const r = (score / DIM_MAX) * R;
      return {
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
      };
    });
  }, [secondaryScores, cx, cy, R]);

  const overall = useMemo(() => {
    const sum = mains.reduce((s, m) => s + m.score, 0);
    return Math.round((sum / mains.length) * 10) / 10;
  }, [mains]);

  const ringFractions = [0.5, 0.75, 1.0];

  return (
    <View>
      <View style={[styles.canvas, { width: size, height: size }]}>
        {/* Concentric reference circles */}
        {ringFractions.map((g, i) => {
          const d = R * 2 * g;
          return (
            <View
              key={`ring-${i}`}
              style={{
                position: 'absolute',
                left: cx - d / 2,
                top: cy - d / 2,
                width: d,
                height: d,
                borderRadius: d / 2,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.06)',
                borderStyle: g === 1 ? 'solid' : 'dashed',
              }}
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
            color="rgba(255,255,255,0.06)"
            width={1}
          />
        ))}

        {/* Static hex frame */}
        {mains.map((m, j) => {
          const next = mains[(j + 1) % 6];
          return (
            <Line
              key={`frame-${j}`}
              x1={m.fx}
              y1={m.fy}
              x2={next.fx}
              y2={next.fy}
              color="rgba(255,255,255,0.18)"
              width={1}
            />
          );
        })}

        {/* Secondary polygon (questionnaire) — drawn below the primary so
            the main score sits on top visually. Outline only, smaller dots. */}
        {secondary &&
          secondary.map((m, j) => {
            const next = secondary[(j + 1) % 6];
            return (
              <Line
                key={`sec-line-${j}`}
                x1={m.x}
                y1={m.y}
                x2={next.x}
                y2={next.y}
                color={secondaryColor}
                width={1.5}
                opacity={0.85}
              />
            );
          })}
        {secondary &&
          secondary.map((m, j) => (
            <View
              key={`sec-dot-${j}`}
              style={{
                position: 'absolute',
                left: m.x - 4,
                top: m.y - 4,
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: secondaryColor,
                borderWidth: 1,
                borderColor: tokens.bg.deep,
              }}
            />
          ))}

        {/* Score polygon outline */}
        {mains.map((m, j) => {
          const next = mains[(j + 1) % 6];
          return (
            <Line
              key={`score-${j}`}
              x1={m.x}
              y1={m.y}
              x2={next.x}
              y2={next.y}
              color={tokens.brand.violet2}
              width={2}
            />
          );
        })}

        {/* Outer dim labels with smart text alignment */}
        {mains.map((m) => {
          const meta = metaLookup.dim(m.dim);
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
              key={`label-${m.dim}`}
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

        {/* Vertex score discs */}
        {mains.map((m) => {
          const meta = metaLookup.dim(m.dim);
          const DISC = 30;
          return (
            <View
              key={`disc-${m.dim}`}
              style={{
                position: 'absolute',
                left: m.x - DISC / 2,
                top: m.y - DISC / 2,
                width: DISC,
                height: DISC,
                borderRadius: DISC / 2,
                backgroundColor: meta.color,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: tokens.bg.deep,
              }}
            >
              <Text style={styles.discText} allowFontScaling={false}>
                {formatScore(m.score)}
              </Text>
            </View>
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

      {/* Legend: 3 rows × 2 cards, exact widths via flex:1. Two-per-row
          gives each dim card more horizontal room than the old 3-per-row
          layout (which felt cramped). When onDimPress is provided, each
          card becomes a Pressable that drills into the dim detail. */}
      <View style={styles.legend}>
        {[0, 2, 4].map((rowStart) => (
          <View key={`row-${rowStart}`} style={styles.legendRow}>
            {mains.slice(rowStart, rowStart + 2).map((m) => {
              const meta = metaLookup.dim(m.dim);
              const subIds = SUBS_BY_DIM[m.dim];
              const cardContent = (
                <>
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
                      <Text style={styles.cardBadgeText}>
                        {formatScore(m.score)}
                      </Text>
                    </View>
                  </View>
                  {subIds.map((subId, i) => {
                    const subMeta = metaLookup.sub(subId);
                    const score = i === 0 ? m.sa : m.sb;
                    return (
                      <View key={subId} style={styles.subRow}>
                        <Ionicons
                          name={subMeta.iconName as never}
                          size={12}
                          color={meta.color}
                        />
                        <View
                          style={[
                            styles.bar,
                            { backgroundColor: `${meta.color}1A` },
                          ]}
                        >
                          <View
                            style={[
                              styles.barFill,
                              {
                                width: `${Math.max(
                                  0,
                                  Math.min(100, (score / 5) * 100),
                                )}%`,
                                backgroundColor: meta.color,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    );
                  })}
                </>
              );
              if (onDimPress) {
                return (
                  <Pressable
                    key={`card-${m.dim}`}
                    onPress={() => onDimPress(m.dim)}
                    style={({ pressed }) => [
                      styles.card,
                      { borderColor: `${meta.color}40` },
                      pressed && { opacity: 0.7 },
                    ]}
                    hitSlop={2}
                  >
                    {cardContent}
                  </Pressable>
                );
              }
              return (
                <View
                  key={`card-${m.dim}`}
                  style={[styles.card, { borderColor: `${meta.color}40` }]}
                >
                  {cardContent}
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
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 13,
    color: '#0E1230',
    lineHeight: 16,
  },
  overallText: {
    position: 'absolute',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 28,
    color: tokens.text.hi,
    textAlign: 'center',
  },
  legend: {
    marginTop: tokens.space[3],
    gap: tokens.space[2],
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
    padding: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  cardLabel: {
    flex: 1,
    minWidth: 0,
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
    letterSpacing: 1,
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
    marginTop: 6,
  },
  bar: {
    flex: 1,
    height: 5,
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
  },
});
