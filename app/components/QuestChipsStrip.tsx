import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useQuests } from '@/lib/api/quests';
import { tokens } from '@/theme';

/**
 * V3 quest chips strip — horizontal scroll of compact gold pills,
 * one per active quest, plus a trailing violet "+ Browse" pill that
 * routes to the quest board. Replaces the bulkier ActiveQuestsCard
 * on the home screen.
 *
 *   [⚔ Sem açúcar 21d] [⚔ Dormir 8h+ 14d] [+ Browse]
 *
 * Each chip carries: quest icon (Ionicons flash), name, and a small
 * progress label (`{done}/{total}` requirements met). The strip is
 * a no-op (renders nothing) when the user has no active quests AND
 * the design-time goal is to keep the screen lighter — to nudge
 * discovery anyway, the +Browse pill ALWAYS renders.
 */
export function QuestChipsStrip() {
  const router = useRouter();
  const quests = useQuests();
  const active = (quests.data ?? []).filter(
    (q) => q.quest.status === 'active',
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {active.map((q) => {
        const done = q.requirements.filter((r) => r.isMet).length;
        const total = q.requirements.length;
        return (
          <Pressable
            key={q.quest.id}
            onPress={() => router.push('/quests')}
            style={({ pressed }) => [pressed && styles.chipPressed]}
          >
            <LinearGradient
              colors={tokens.gradient.questChipGold}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={[styles.chip, styles.chipGold]}
            >
              <Ionicons name="flash" size={11} color={tokens.semantic.coin} />
              <Text style={styles.chipName} numberOfLines={1}>
                {q.quest.title}
              </Text>
              {total > 0 && (
                <Text style={styles.chipProgress}>
                  {done}/{total}
                </Text>
              )}
            </LinearGradient>
          </Pressable>
        );
      })}

      <Pressable
        onPress={() => router.push('/quests')}
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
            Browse
          </Text>
        </LinearGradient>
      </Pressable>

      {/* Pad the right edge so the last chip doesn't kiss the screen edge. */}
      <View style={{ width: tokens.space[4] }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 6,
    paddingLeft: tokens.space[4],
    paddingTop: 10,
    paddingBottom: 4,
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
    color: tokens.semantic.coin,
    letterSpacing: 0.2,
  },
});
