import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TierMedal } from '@/components/TierMedal';
import type { DimensionId, SkillState, TierName } from '@/lib/db/types';
import { tokens } from '@/theme';
import { DIMENSION_META, DIMENSION_ORDER } from '@/theme/dimensions';

interface Props {
  skills: SkillState[];
}

const TIER_RANK: Record<TierName, number> = {
  beginner: 0,
  bronze: 1,
  silver: 2,
  gold: 3,
  master: 4,
};

/**
 * Pillar 3 — Skills. Ceremonious tone.
 *
 * One row per dim showing the user's strongest skill in that dim (best
 * tier, then highest currentPr as tiebreak). Uses tier.percentile —
 * "Top X% adults" — to anchor the achievement against the population.
 *
 * Catalog skills carry a punchy population_stat that lives on the skill
 * detail page; this panel keeps it terse and lets the medal carry the
 * weight.
 */
export function SkillsPanel({ skills }: Props) {
  const router = useRouter();

  const topByDim = useMemo(() => {
    const out = new Map<DimensionId, SkillState>();
    for (const s of skills) {
      const dim = s.skill.dimension_id;
      const cur = out.get(dim);
      const better =
        !cur ||
        TIER_RANK[s.currentTier.tier_name] >
          TIER_RANK[cur.currentTier.tier_name] ||
        (TIER_RANK[s.currentTier.tier_name] ===
          TIER_RANK[cur.currentTier.tier_name] &&
          s.currentPr > cur.currentPr);
      if (better) out.set(dim, s);
    }
    return out;
  }, [skills]);

  const orderedRows = DIMENSION_ORDER.flatMap((d) => {
    const s = topByDim.get(d);
    return s ? [{ dim: d, state: s }] : [];
  });

  const totalTracked = skills.length;
  const medalsEarned = skills.filter(
    (s) => s.currentTier.tier_name !== 'beginner',
  ).length;

  return (
    <View style={styles.card}>
      {orderedRows.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            Comece a registrar PRs no Skills Hub pra ganhar medalhas.
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {orderedRows.map(({ dim, state }, i) => {
            const meta = DIMENSION_META[dim];
            const tier = state.currentTier;
            const pct = tier.percentile;
            return (
              <Pressable
                key={state.skill.id}
                onPress={() =>
                  router.push({
                    pathname: '/skill/[id]',
                    params: { id: state.skill.id },
                  })
                }
                style={({ pressed }) => [
                  styles.row,
                  i > 0 && styles.rowDivider,
                  pressed && { opacity: 0.75 },
                ]}
              >
                <TierMedal tier={tier.tier_name} size={32} />
                <View style={styles.rowBody}>
                  <Text style={styles.skillName} numberOfLines={1}>
                    {state.skill.display_name}
                    <Text style={[styles.dimTag, { color: meta.color }]}>
                      {' · '}
                      {meta.label.toUpperCase()}
                    </Text>
                  </Text>
                  <Text style={styles.skillSub} numberOfLines={1}>
                    {pct ? `Top ${pct}% adults · ` : ''}
                    {capitalize(tier.tier_name)}
                  </Text>
                </View>
                <View style={styles.rowRight}>
                  <Text style={styles.pr}>{state.currentPr}</Text>
                  <Text style={styles.unit}>{state.skill.unit}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      <View style={styles.footerRow}>
        <Text style={styles.footerText}>
          <Text style={styles.footerNum}>{totalTracked}</Text>{' '}
          {totalTracked === 1 ? 'skill' : 'skills'} tracked
        </Text>
        <Text style={styles.footerText}>
          <Text style={styles.footerNum}>{medalsEarned}</Text>{' '}
          {medalsEarned === 1 ? 'medalha' : 'medalhas'}
        </Text>
      </View>

      <Pressable
        onPress={() => router.push('/skills')}
        style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}
        hitSlop={4}
      >
        <Text style={styles.ctaText}>Ver todas as skills</Text>
        <Ionicons name="arrow-forward" size={14} color={tokens.semantic.coin} />
      </Pressable>
    </View>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: tokens.bg.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 200, 61, 0.22)',
    padding: tokens.space[4],
    gap: tokens.space[3],
  },
  list: {
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    paddingVertical: tokens.space[3],
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  skillName: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: tokens.text.hi,
  },
  dimTag: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    letterSpacing: 0.6,
  },
  skillSub: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    color: tokens.text.mid,
    marginTop: 2,
  },
  rowRight: {
    alignItems: 'flex-end',
  },
  pr: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 16,
    color: tokens.semantic.coin,
  },
  unit: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10,
    color: tokens.text.dim,
  },
  empty: {
    paddingVertical: tokens.space[4],
  },
  emptyText: {
    ...tokens.type.body,
    color: tokens.text.mid,
    textAlign: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.space[1],
    paddingTop: tokens.space[2],
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
  },
  footerText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    color: tokens.text.mid,
  },
  footerNum: {
    fontFamily: 'Manrope_800ExtraBold',
    color: tokens.semantic.coin,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: tokens.space[3],
    borderRadius: tokens.radius.md,
    backgroundColor: 'rgba(255, 200, 61, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255, 200, 61, 0.30)',
  },
  ctaText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 13,
    letterSpacing: 0.3,
    color: tokens.semantic.coin,
  },
});
