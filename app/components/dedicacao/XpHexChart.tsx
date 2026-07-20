import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { HexRadar, type HexAxis } from '@/components/HexRadar';
import type { DimensionId } from '@/lib/db/types';
import { useT } from '@/lib/i18n';
import { useMetaLookup } from '@/lib/i18n/meta';
import { tokens } from '@/theme';
import { DIMENSION_ORDER } from '@/theme/dimensions';

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

/**
 * The center of the hex fits about five glyphs before the number starts
 * running over the inner ring and the near-zero vertices underneath it.
 * Six-figure totals are real once a period is wide enough, so anything at
 * or above 10k collapses to `k`/`M` rather than being allowed to sprawl.
 * The full figure still reads exactly in the per-dim cards below.
 */
function formatCenterXp(xp: number): string {
  const round = (n: number, digits: number) =>
    n.toLocaleString(undefined, { maximumFractionDigits: digits });
  if (xp < 10_000) return xp.toLocaleString();
  const k = xp / 1000;
  if (k < 100) return `${round(k, 1)}k`;
  // 999_500 rather than 1_000_000, so the last bucket can't print "1.000k".
  if (xp < 999_500) return `${round(k, 0)}k`;
  return `${round(xp / 1_000_000, 1)}M`;
}

/**
 * Six-axis XP radar — one axis per dimension, in DIMENSION_ORDER, normalized
 * against the largest dimension in the current window. It answers "where did
 * my effort concentrate", and reads shape-first: a balanced window fills the
 * hexagon evenly, a lopsided one spikes.
 *
 * The scale is deliberately relative. Nothing here says how much XP is "a
 * lot" — only which dims led. Absolute magnitude lives in the total at the
 * center and in the per-dim cards.
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
    return DIMENSION_ORDER.map((dimId) => {
      const xp = xpById.get(dimId) ?? 0;
      const ratio =
        max > 0 && xp > 0
          ? Math.max(MIN_RATIO, (xp / max) * LEADER_RATIO)
          : 0;
      return { dimId, xp, ratio };
    });
  }, [slices]);

  const hasData = totalXp > 0 && vertices.some((v) => v.xp > 0);

  const axes = useMemo<HexAxis[]>(
    () =>
      vertices.map((v) => ({
        dimId: v.dimId,
        ratio: hasData ? v.ratio : 0,
        active: v.xp > 0,
        a11yLabel: t('dedicacao.hexAxisA11y', {
          dim: metaLookup.dim(v.dimId).label,
          xp: v.xp.toLocaleString(),
        }),
      })),
    [vertices, hasData, t, metaLookup],
  );

  const delta = useMemo(() => {
    if (prevTotalXp === null) return null;
    if (prevTotalXp === 0 && totalXp === 0) return null;
    if (prevTotalXp === 0) return { kind: 'new' as const };
    const diff = totalXp - prevTotalXp;
    const pct = Math.round((diff / prevTotalXp) * 100);
    return { kind: 'pct' as const, pct, positive: diff >= 0 };
  }, [totalXp, prevTotalXp]);

  return (
    <View style={styles.wrap}>
      {/* The total sits in the middle, matching Avaliação. It is set well
          below that screen's score because an XP figure runs several times
          longer — see formatCenterXp for where the ceiling comes from. */}
      <HexRadar
        axes={axes}
        centerValue={formatCenterXp(totalXp)}
        centerUnit="XP"
        centerFontSize={20}
        fillFrom={tokens.semantic.xp2}
        fillTo={tokens.semantic.xp}
        strokeColor={tokens.semantic.xp2}
        size={size}
        onAxisPress={onAxisPress}
        idSuffix={idSuffix}
        a11yLabel={t('a11y.xpByDimension')}
      />

      <View style={styles.caption}>
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
  caption: { alignItems: 'center', gap: 2 },
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
