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
import { useT } from '@/lib/i18n';
import { useMetaLookup } from '@/lib/i18n/meta';
import { tokens } from '@/theme';
import { DIMENSION_META, DIMENSION_ORDER } from '@/theme/dimensions';

interface DimSlice {
  dimId: DimensionId;
  xp: number;
}

interface Props {
  /** Per-dim XP for this window, any order. Missing dims count as 0. */
  slices: DimSlice[];
  totalXp: number;
  /** Total XP in the prior window, or null when comparison doesn't apply
   *  (granularity = 'all'). */
  prevTotalXp: number | null;
  /** True while the window query is in flight. Suppresses the "no XP"
   *  caption — `slices` reads all-zero before the data lands, and asserting
   *  an empty period we haven't loaded yet is a lie, not a placeholder. */
  isLoading?: boolean;
  size?: number;
  onAxisPress?: (dim: DimensionId) => void;
  /** Stable id for the gradient def — required when more than one hex can
   *  render on the same screen (SVG defs share a flat namespace). */
  idSuffix: string;
}

// 32 + hitSlop 8 = a 48×48 tap target, clearing the 44×44 iOS HIG /
// WCAG 2.5.5 floor. Don't shrink either number without checking that sum.
const BADGE = 32;
const LABEL_GAP = 17;
const PADDING = BADGE / 2 + LABEL_GAP + 1;
const RING_STEPS = [0.34, 0.67, 1];

/**
 * The leading dimension stops at 85% of the radius instead of touching the
 * outer ring. Without that headroom the leader reads as "maxed out" rather
 * than "biggest this window" — the scale is relative, not an achievement.
 */
const LEADER_RATIO = 0.85;

/**
 * Floor for any dim with non-zero XP, so a token amount still produces a
 * visible vertex instead of collapsing into the center and reading as zero.
 */
const MIN_RATIO = 0.07;

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
 * Six-axis XP radar — one axis per dimension, in DIMENSION_ORDER, normalized
 * against the largest dimension in the current window. It answers "where did
 * my effort concentrate", and reads shape-first: a balanced window fills the
 * hexagon evenly, a lopsided one spikes.
 *
 * The scale is deliberately relative. Nothing here says how much XP is "a
 * lot" — only which dims led. Absolute magnitude lives in the total below
 * the chart and in the per-dim cards.
 *
 * Dimension identity is carried by the tappable icon badges on the outside
 * and the colored vertex discs, not by the fill: the shape is a single
 * region and can't honestly be six colors at once.
 *
 * Empty window: grid only, no shape, and a caption saying so.
 * Single-dominant window: a spike from the center — degenerate but truthful,
 * and the MIN_RATIO floor keeps the other non-zero dims from vanishing.
 */
export function XpHexChart({
  slices,
  totalXp,
  prevTotalXp,
  isLoading = false,
  size = 240,
  onAxisPress,
  idSuffix,
}: Props) {
  const { t } = useT();
  const metaLookup = useMetaLookup();
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - PADDING;

  const vertices = useMemo(() => {
    const xpById = new Map(slices.map((s) => [s.dimId, s.xp]));
    // Normalized against the largest dim in this window — nothing external.
    // The sparklines' ceiling is numerically the same value, but they map it
    // linearly to full height while this maps through LEADER_RATIO/MIN_RATIO,
    // so the two visuals are not interchangeable scales. See the note in
    // DedicacaoPanel.
    const max = DIMENSION_ORDER.reduce(
      (m, d) => Math.max(m, xpById.get(d) ?? 0),
      0,
    );
    return DIMENSION_ORDER.map((dimId, j) => {
      const xp = xpById.get(dimId) ?? 0;
      const angle = angleAt(j);
      const ratio =
        max > 0 && xp > 0
          ? Math.max(MIN_RATIO, (xp / max) * LEADER_RATIO)
          : 0;
      const r = ratio * R;
      return {
        dimId,
        xp,
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        bx: cx + Math.cos(angle) * (R + LABEL_GAP),
        by: cy + Math.sin(angle) * (R + LABEL_GAP),
      };
    });
  }, [slices, cx, cy, R]);

  const hasData = totalXp > 0 && vertices.some((v) => v.xp > 0);

  const shapePoints = useMemo(
    () => vertices.map((v) => `${v.x},${v.y}`).join(' '),
    [vertices],
  );

  const delta = useMemo(() => {
    if (prevTotalXp === null) return null;
    if (prevTotalXp === 0 && totalXp === 0) return null;
    if (prevTotalXp === 0) return { kind: 'new' as const };
    const diff = totalXp - prevTotalXp;
    const pct = Math.round((diff / prevTotalXp) * 100);
    return { kind: 'pct' as const, pct, positive: diff >= 0 };
  }, [totalXp, prevTotalXp]);

  const gradId = `xphex-${idSuffix}`;

  return (
    <View style={styles.wrap}>
      <View
        style={{ width: size, height: size }}
        accessibilityRole="image"
        accessibilityLabel={t('a11y.xpByDimension')}
      >
        <Svg width={size} height={size} pointerEvents="none">
          <Defs>
            <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={tokens.semantic.xp2} stopOpacity={0.34} />
              <Stop offset="1" stopColor={tokens.semantic.xp} stopOpacity={0.08} />
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

          {vertices.map((v, j) => {
            const a = angleAt(j);
            return (
              <Line
                key={v.dimId}
                x1={cx}
                y1={cy}
                x2={cx + Math.cos(a) * R}
                y2={cy + Math.sin(a) * R}
                stroke={tokens.border.divider}
                strokeWidth={1}
              />
            );
          })}

          {hasData && (
            <Polygon
              points={shapePoints}
              fill={`url(#${gradId})`}
              stroke={tokens.semantic.xp2}
              strokeWidth={1.75}
              strokeLinejoin="round"
            />
          )}

          {hasData &&
            vertices.map((v) =>
              v.xp > 0 ? (
                <Circle
                  key={v.dimId}
                  cx={v.x}
                  cy={v.y}
                  r={4}
                  fill={DIMENSION_META[v.dimId].color}
                />
              ) : null,
            )}
        </Svg>

        {vertices.map((v) => {
          const meta = DIMENSION_META[v.dimId];
          const label = metaLookup.dim(v.dimId).label;
          return (
            <Pressable
              key={v.dimId}
              disabled={!onAxisPress}
              onPress={() => onAxisPress?.(v.dimId)}
              hitSlop={8}
              style={({ pressed }) => [
                styles.badge,
                {
                  left: v.bx - BADGE / 2,
                  top: v.by - BADGE / 2,
                  backgroundColor: meta.bg,
                  borderColor: v.xp > 0 ? `${meta.color}66` : 'transparent',
                },
                pressed && { opacity: 0.6 },
              ]}
              accessibilityRole={onAxisPress ? 'button' : 'image'}
              accessibilityLabel={t('dedicacao.hexAxisA11y', {
                dim: label,
                xp: v.xp.toLocaleString(),
              })}
            >
              <Ionicons
                name={meta.iconName as never}
                size={15}
                color={v.xp > 0 ? meta.color : tokens.text.faint}
              />
            </Pressable>
          );
        })}
      </View>

      {/* Absolute magnitude lives here rather than in the middle of the
          hex — a centered number would sit on top of the low-value
          vertices and hide the very data the chart exists to show. */}
      <View style={styles.caption}>
        <View style={styles.totalRow}>
          <Text style={styles.totalXp}>{totalXp.toLocaleString()}</Text>
          <Text style={styles.xpLabel}>XP</Text>
        </View>
        {/* The delta wins whenever it exists, including the empty window
            that follows a non-empty one: "▼ -100%" says strictly more than
            "no XP this period". The caption is the fallback, and it stays
            silent while loading rather than asserting an empty period. */}
        {delta ? (
          <Text
            style={[
              styles.deltaText,
              {
                color:
                  delta.kind === 'new' || delta.positive
                    ? tokens.semantic.xp2
                    : tokens.semantic.warn,
              },
            ]}
          >
            {delta.kind === 'new'
              ? t('dedicacao.deltaNew', { xp: totalXp.toLocaleString() })
              : `${delta.positive ? '▲ +' : '▼ '}${delta.pct}%`}
          </Text>
        ) : !hasData && !isLoading ? (
          <Text style={styles.emptyText}>{t('dedicacao.hexEmpty')}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: tokens.space[2] },
  badge: {
    position: 'absolute',
    width: BADGE,
    height: BADGE,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caption: { alignItems: 'center', gap: 2 },
  totalRow: { flexDirection: 'row', alignItems: 'baseline', gap: 5 },
  totalXp: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 34,
    color: tokens.text.hi,
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  xpLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    color: tokens.text.dim,
    letterSpacing: 1.4,
  },
  deltaText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    letterSpacing: 0.3,
  },
  emptyText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    color: tokens.text.dim,
    letterSpacing: 0.3,
  },
});
