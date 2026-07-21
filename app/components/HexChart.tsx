import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { HexRadar, type HexAxis } from '@/components/HexRadar';
import type { DimensionId, SubId } from '@/lib/db/types';
import { formatScore } from '@/lib/util/formatScore';
import { tokens } from '@/theme';
import { useT } from '@/lib/i18n';
import { useMetaLookup } from '@/lib/i18n/meta';
import { DIMENSION_ORDER, SUBS_BY_DIM } from '@/theme/dimensions';

interface HexChartProps {
  /** Map of sub_id → score (0-5). Missing keys render as 0. */
  scores: Map<SubId, number>;
  /** Optional second series — rendered as an outline-only polygon in the
   *  secondary color, no vertex dots. Used for "self vs questionnaire"
   *  comparison without doubling up the visual weight. */
  secondaryScores?: Map<SubId, number>;
  size?: number;
  /** Color for the secondary polygon outline. Defaults to bonds teal. */
  secondaryColor?: string;
  /** When provided, the vertex badges and the 6 legend cards become
   *  tappable and call this with the dim id. Used to drill into the dim
   *  detail screen from the hex. */
  onDimPress?: (dim: DimensionId) => void;
}

const SUB_MAX = 5;
const DIM_MAX = SUB_MAX * 2;

function dimScores(scores: Map<SubId, number>) {
  return DIMENSION_ORDER.map((dim) => {
    const [a, b] = SUBS_BY_DIM[dim];
    const sa = scores.get(a) ?? 0;
    const sb = scores.get(b) ?? 0;
    return { dim, sa, sb, score: sa + sb };
  });
}

/**
 * Wheel-of-life hexagon — the Avaliação side of the shared HexRadar canvas.
 *
 * This component owns only the scoring: two subs sum into a dim score out
 * of DIM_MAX, and that absolute fraction is the axis ratio. Unlike Dedicação
 * the scale is not relative — a full hexagon here means a 10/10 everywhere,
 * which is a claim worth being able to make.
 *
 * Per-dim numbers live in the legend cards below rather than on the vertices,
 * where the dots only mark position. The average sits in the center.
 */
export function HexChart({
  scores,
  secondaryScores,
  size = 320,
  secondaryColor = tokens.dimension.bonds,
  onDimPress,
}: HexChartProps) {
  const { t } = useT();
  const metaLookup = useMetaLookup();

  const mains = useMemo(() => dimScores(scores), [scores]);

  const secondary = useMemo(() => {
    if (!secondaryScores) return undefined;
    return dimScores(secondaryScores).map((m) => m.score / DIM_MAX);
  }, [secondaryScores]);

  const overall = useMemo(() => {
    const sum = mains.reduce((s, m) => s + m.score, 0);
    return Math.round((sum / mains.length) * 10) / 10;
  }, [mains]);

  const axes = useMemo<HexAxis[]>(
    () =>
      mains.map((m) => ({
        dimId: m.dim,
        ratio: m.score / DIM_MAX,
        active: m.score > 0,
        a11yLabel: t('avaliacao.hexAxisA11y', {
          dim: metaLookup.dim(m.dim).label,
          score: formatScore(m.score),
          max: DIM_MAX,
        }),
      })),
    [mains, t, metaLookup],
  );

  return (
    <View>
      <View style={styles.canvas}>
        <HexRadar
          axes={axes}
          secondary={secondary}
          secondaryColor={secondaryColor}
          centerValue={overall.toFixed(1)}
          centerFontSize={28}
          size={size}
          onAxisPress={onDimPress}
          idSuffix="avaliacao"
          a11yLabel={t('a11y.scoreByDimension')}
        />
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
