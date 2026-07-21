import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useQuests } from '@/lib/api/quests';
import { useT } from '@/lib/i18n';
import { emitTourEvent } from '@/lib/tour/eventBus';
import { M3_EVENTS } from '@/lib/tour/m3Steps';
import type { QuestWithProgress } from '@/lib/db/types';
import { questProgressRatio } from '@/lib/quests/progress';
import { tokens } from '@/theme';

/**
 * V3 quest chips strip — horizontal scroll on the Home tab.
 *
 * Splits the user's active items into two visually-distinct groups so the
 * dual identity of the schema (one `quest` table, two product surfaces) reads
 * at a glance:
 *
 *   1. **Missões** (sub_stars) — gold pills, flash icon. Trailing violet
 *      "+ Browse" routes to `/quests`.
 *   2. **Metas** (goals: skill / challenge / dim) — orange→red pills, flag
 *      icon. Trailing violet "+ Browse" routes to `/goals`.
 *
 * Quests always come first per design. A thin vertical divider sits between
 * the groups when both are present. Each chip opens its own quest detail so
 * tapping a Goal chip doesn't drop the user onto the Missões browse.
 */
export function QuestChipsStrip() {
  const router = useRouter();
  const { t } = useT();
  const quests = useQuests();

  const { missoes, metas } = useMemo(() => {
    const m: QuestWithProgress[] = [];
    const g: QuestWithProgress[] = [];
    for (const q of quests.data ?? []) {
      if (q.quest.status !== 'active') continue;
      const isSubStars = q.requirements.some(
        (r) => r.requirement.kind === 'accumulate_sub_stars',
      );
      (isSubStars ? m : g).push(q);
    }
    return { missoes: m, metas: g };
  }, [quests.data]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {/* ── Missões (gold) ───────────────────────────────────────────── */}
      {missoes.map((q) => (
        <QuestChip
          key={`m-${q.quest.id}`}
          quest={q}
          variant="missao"
          onPress={() =>
            router.push({
              pathname: '/quest-detail/[id]',
              params: { id: q.quest.id, kind: 'quest' },
            })
          }
        />
      ))}

      <BrowsePill
        variant="violet"
        label={t('home.quests.browseChip')}
        onPress={() => {
          emitTourEvent(M3_EVENTS.QUESTS_NAVIGATED);
          router.push('/quests');
        }}
      />

      {/* ── Divider between the Missões group and the Metas group ─────── */}
      <View style={styles.groupDivider} />

      {/* ── Metas (orange) ───────────────────────────────────────────── */}
      {metas.map((q) => (
        <QuestChip
          key={`g-${q.quest.id}`}
          quest={q}
          variant="meta"
          onPress={() =>
            router.push({
              pathname: '/quest-detail/[id]',
              params: { id: q.quest.id, kind: 'quest' },
            })
          }
        />
      ))}

      {/* Always show the "+ Metas" pill so goals are discoverable even at
         zero — mirrors the always-present "+ Missões" pill above. */}
      <BrowsePill
        variant="violet"
        label={t('home.goals.browseChip')}
        onPress={() => router.push('/goals')}
      />

      {/* Pad the right edge so the last chip doesn't kiss the screen edge. */}
      <View style={{ width: tokens.space[4] }} />
    </ScrollView>
  );
}

// ─── Chip ──────────────────────────────────────────────────────────────────

function QuestChip({
  quest,
  variant,
  onPress,
}: {
  quest: QuestWithProgress;
  variant: 'missao' | 'meta';
  onPress: () => void;
}) {
  // Percent of the real progress bar — NOT met-requirements over total, which
  // reported a 40-of-100 quest as `0/1` for 13 days and then jumped to `1/1`.
  const pct = Math.round(questProgressRatio(quest) * 100);

  const isMissao = variant === 'missao';
  const gradient = isMissao
    ? tokens.gradient.questChipGold
    : tokens.gradient.questChipOrange;
  const iconName = isMissao ? 'flash' : 'flag';
  const accentColor = isMissao ? tokens.semantic.coin : tokens.dimension.body;
  const chipBorder = isMissao ? styles.chipGold : styles.chipOrange;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.chipPressed]}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.chip, chipBorder]}
      >
        <Ionicons name={iconName} size={11} color={accentColor} />
        <Text style={styles.chipName} numberOfLines={1}>
          {quest.quest.title}
        </Text>
        <Text style={[styles.chipProgress, { color: accentColor }]}>
          {pct}%
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

// ─── Browse pill ───────────────────────────────────────────────────────────

function BrowsePill({
  variant: _variant,
  label,
  onPress,
}: {
  variant: 'violet';
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.chipPressed]}
    >
      <LinearGradient
        colors={tokens.gradient.questChipViolet}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.chip, styles.chipViolet]}
      >
        <Ionicons name="add" size={12} color={tokens.brand.violet2} />
        <Text style={[styles.chipName, { color: tokens.brand.violet2 }]}>
          {label}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 6,
    paddingLeft: tokens.space[4],
    paddingTop: 10,
    paddingBottom: 4,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipGold: {
    borderColor: tokens.semantic.coinRim,
    borderTopColor: 'rgba(255, 224, 138, 0.6)',
  },
  chipOrange: {
    borderColor: 'rgba(255, 138, 61, 0.45)',
    borderTopColor: 'rgba(255, 170, 110, 0.7)',
  },
  chipViolet: {
    borderColor: 'rgba(155, 130, 255, 0.4)',
    borderTopColor: 'rgba(194, 161, 255, 0.6)',
  },
  chipPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  chipName: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    color: tokens.text.hi,
    letterSpacing: 0.2,
    maxWidth: 140,
  },
  chipProgress: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
    letterSpacing: 0.2,
  },
  /** Thin vertical line between the Missões group and the Metas group. */
  groupDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: tokens.border.strong,
    marginHorizontal: 4,
    marginVertical: 6,
  },
});
