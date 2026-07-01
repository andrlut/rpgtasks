import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { SkillState, SubId } from '@/lib/db/types';
import { useT } from '@/lib/i18n';
import { useMetaLookup } from '@/lib/i18n/meta';
import { tokens } from '@/theme';

interface Props {
  skills: SkillState[];
}

/**
 * Pillar 3 — Skills. Ceremonious tone.
 *
 * Top 5 sub-attributes ranked by medal count (non-beginner tiers reached
 * across the user's skills in that sub). The user wanted the Hero
 * surface to break Skills down by sub — never "tudo jogado junto".
 *
 * Skills with sub_id = null (custom skills not mapped to a sub) are
 * counted toward the totals but not represented as a sub row, since
 * they don't belong to one of the 12 sub buckets.
 */
export function SkillsPanel({ skills }: Props) {
  const router = useRouter();
  const { t } = useT();
  const meta = useMetaLookup();

  const subRows = useMemo(() => {
    const counts = new Map<SubId, number>();
    for (const s of skills) {
      if (!s.skill.sub_id) continue;
      if (s.currentTier.tier_name === 'beginner') continue;
      counts.set(s.skill.sub_id, (counts.get(s.skill.sub_id) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([subId, count]) => ({ subId, count }));
  }, [skills]);

  const totalSkills = skills.length;
  const totalMedals = skills.filter(
    (s) => s.currentTier.tier_name !== 'beginner',
  ).length;

  return (
    <View style={styles.wrap}>
      {subRows.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="trophy-outline" size={28} color={tokens.text.dim} />
          <Text style={styles.emptyText}>{t('pillar.skills.empty')}</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {subRows.map(({ subId, count }, i) => {
            const subMeta = meta.sub(subId);
            const dimMeta = meta.dim(subMeta.dimensionId);
            return (
              <Pressable
                key={subId}
                onPress={() => router.push('/skills')}
                style={({ pressed }) => [
                  styles.row,
                  i > 0 && styles.rowDivider,
                  pressed && { opacity: 0.75 },
                ]}
              >
                <View style={styles.rank}>
                  <Text style={styles.rankText}>{i + 1}</Text>
                </View>
                <View
                  style={[styles.subIcon, { backgroundColor: dimMeta.bg }]}
                >
                  <Ionicons
                    name={subMeta.iconName as never}
                    size={16}
                    color={dimMeta.color}
                  />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.subLabel} numberOfLines={1}>
                    {subMeta.label}
                  </Text>
                  <Text
                    style={[styles.dimLabel, { color: dimMeta.color }]}
                    numberOfLines={1}
                  >
                    {dimMeta.label.toUpperCase()}
                  </Text>
                </View>
                <View style={styles.medalBadge}>
                  <Ionicons name="medal" size={12} color={tokens.semantic.coin} />
                  <Text style={styles.medalCount}>{count}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      <View style={styles.footerRow}>
        <Text style={styles.footerText}>
          <Text style={styles.footerNum}>{totalMedals}</Text>{' '}
          {t('pillar.skills.medals', { count: totalMedals })}
        </Text>
        <Text style={styles.footerText}>
          <Text style={styles.footerNum}>{totalSkills}</Text>{' '}
          {t('pillar.skills.count', { count: totalSkills })}
        </Text>
      </View>

      <Pressable
        onPress={() => router.push('/skills')}
        style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}
        hitSlop={4}
      >
        <Text style={styles.ctaText}>{t('pillar.skills.viewAll')}</Text>
        <Ionicons name="arrow-forward" size={14} color={tokens.semantic.coin} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: tokens.space[3],
  },
  list: {
    paddingHorizontal: tokens.space[3],
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
  rank: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 200, 61, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255, 200, 61, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
    color: tokens.semantic.coin,
  },
  subIcon: {
    width: 32,
    height: 32,
    borderRadius: tokens.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  subLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: tokens.text.hi,
  },
  dimLabel: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 9.5,
    letterSpacing: 1,
  },
  medalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: tokens.space[2],
    paddingVertical: 4,
    borderRadius: tokens.radius.pill,
    backgroundColor: 'rgba(255, 200, 61, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 200, 61, 0.30)',
  },
  medalCount: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 13,
    color: tokens.semantic.coin,
  },
  empty: {
    paddingVertical: tokens.space[6],
    alignItems: 'center',
    gap: tokens.space[2],
  },
  emptyText: {
    ...tokens.type.body,
    color: tokens.text.mid,
    textAlign: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.space[2],
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
