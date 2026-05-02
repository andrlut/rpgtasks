import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { QuestWithProgress } from '@/lib/db/types';
import { tokens } from '@/theme';

interface Props {
  quests: QuestWithProgress[] | undefined;
}

/**
 * Compact "🏆 X active · Y ready to claim" chip for the Home screen.
 * Tapping opens the Quest Board modal. When the user has no active
 * quests, shows "Take a quest →" so the board is still discoverable.
 */
export function QuestChip({ quests }: Props) {
  const router = useRouter();

  const active = (quests ?? []).filter((q) => q.quest.status === 'active');
  const ready = active.filter((q) => q.isComplete).length;

  const summary =
    ready > 0
      ? `${ready} ready to claim`
      : active.length > 0
        ? `${active.length} active quest${active.length === 1 ? '' : 's'}`
        : 'Take a quest';

  return (
    <Pressable
      onPress={() => router.push('/quests')}
      style={({ pressed }) => [
        styles.chipWrap,
        ready > 0 && tokens.shadow.coinGlowSoft,
        pressed && { opacity: 0.85 },
      ]}
    >
      <LinearGradient
        colors={
          ready > 0
            ? tokens.gradient.coinPill
            : tokens.gradient.questBoard
        }
        locations={
          ready > 0
            ? tokens.gradient.coinPillLocations
            : tokens.gradient.questBoardLocations
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.6 }}
        style={[StyleSheet.absoluteFill, styles.passthrough]}
      />
      <View style={styles.row}>
        <Ionicons
          name="trophy"
          size={14}
          color={ready > 0 ? '#3D2A00' : tokens.brand.violet2}
        />
        <Text
          style={[
            styles.text,
            { color: ready > 0 ? '#3D2A00' : tokens.text.hi },
          ]}
        >
          {summary}
        </Text>
        <Ionicons
          name="chevron-forward"
          size={14}
          color={ready > 0 ? '#3D2A00' : tokens.text.mid}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chipWrap: {
    borderRadius: tokens.radius.pill,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: tokens.border.strong,
    alignSelf: 'flex-start',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: tokens.space[3],
    paddingVertical: 6,
  },
  text: {
    ...tokens.type.caption,
    fontFamily: 'Manrope_700Bold',
  },
  passthrough: {
    pointerEvents: 'none',
  },
});
