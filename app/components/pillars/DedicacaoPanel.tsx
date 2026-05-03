import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ProgressBar } from '@/components/ProgressBar';
import type { CharacterDimension, DimensionId } from '@/lib/db/types';
import { levelProgress } from '@/lib/xp';
import { tokens } from '@/theme';
import { DIMENSION_META, DIMENSION_ORDER } from '@/theme/dimensions';

interface Props {
  dimensions: CharacterDimension[];
}

/** 3-letter abbreviation per dim — keeps the grid airy at small widths. */
const DIM_ABBREV: Record<DimensionId, string> = {
  health: 'HEA',
  strength: 'STR',
  mind: 'MIN',
  wealth: 'WEA',
  bonds: 'BND',
  craft: 'CRA',
};

/**
 * Pillar 2 — Dedicação. Dopaminergic tone.
 *
 * 2×3 grid of dim cells (level + mini XP bar). Each cell drills into the
 * dim detail. CTA opens quests — the mid-term ambition layer.
 *
 * Punchy on purpose: bigger numbers, brighter accents than the other
 * pillars. This is the "agora vamos lá" panel.
 */
export function DedicacaoPanel({ dimensions }: Props) {
  const router = useRouter();
  const dimMap = useMemo(() => {
    const m = new Map<DimensionId, CharacterDimension>();
    for (const d of dimensions) m.set(d.dimension_id, d);
    return m;
  }, [dimensions]);

  return (
    <View style={styles.card}>
      <View style={styles.grid}>
        {DIMENSION_ORDER.map((id) => {
          const meta = DIMENSION_META[id];
          const xp = dimMap.get(id)?.xp ?? 0;
          const lp = levelProgress(xp);
          return (
            <Pressable
              key={id}
              onPress={() =>
                router.push({ pathname: '/dimension/[id]', params: { id } })
              }
              style={({ pressed }) => [
                styles.cell,
                pressed && { opacity: 0.7 },
              ]}
            >
              <View style={[styles.iconHalo, { backgroundColor: meta.bg }]}>
                <Ionicons
                  name={meta.iconName as never}
                  size={18}
                  color={meta.color}
                />
              </View>
              <Text style={[styles.abbrev, { color: meta.color }]}>
                {DIM_ABBREV[id]}
              </Text>
              <Text style={styles.level}>{lp.level}</Text>
              <View style={styles.barWrap}>
                <ProgressBar
                  value={lp.xpInLevel}
                  max={lp.xpNeededForLevel}
                  color={meta.color}
                  height={3}
                />
              </View>
              <Text style={styles.xpHint}>
                {lp.xpInLevel}/{lp.xpNeededForLevel}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={() => router.push('/quests')}
        style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}
        hitSlop={4}
      >
        <Text style={styles.ctaText}>Ver quests</Text>
        <Ionicons name="arrow-forward" size={14} color={tokens.semantic.xp2} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: tokens.bg.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(61, 214, 140, 0.22)',
    padding: tokens.space[4],
    gap: tokens.space[3],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.space[2],
  },
  cell: {
    width: '31.5%',
    alignItems: 'center',
    paddingVertical: tokens.space[3],
    paddingHorizontal: tokens.space[2],
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderRadius: tokens.radius.md,
    gap: 4,
  },
  iconHalo: {
    width: 32,
    height: 32,
    borderRadius: tokens.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  abbrev: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 9,
    letterSpacing: 1,
    marginTop: 4,
  },
  level: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 26,
    lineHeight: 28,
    color: tokens.text.hi,
    marginTop: 2,
  },
  barWrap: {
    width: '90%',
    marginTop: 4,
  },
  xpHint: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 9,
    color: tokens.text.dim,
    marginTop: 2,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: tokens.space[3],
    borderRadius: tokens.radius.md,
    backgroundColor: 'rgba(61, 214, 140, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(61, 214, 140, 0.30)',
  },
  ctaText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 13,
    letterSpacing: 0.3,
    color: tokens.semantic.xp2,
  },
});
