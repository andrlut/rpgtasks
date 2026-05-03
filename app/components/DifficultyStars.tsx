import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import type { Difficulty } from '@/lib/xp';
import { tokens } from '@/theme';

/**
 * Per-tier color ladder mirroring the design's DIFFICULTY scale.
 * Trivial → Easy → Medium → Hard → Heroic.
 */
const TIER_COLOR: Record<Difficulty, string> = {
  1: '#9AA0D4',
  2: '#3DD68C',
  3: '#4DD0FF',
  4: '#FF8A3D',
  5: '#FF5C7A',
};

export function DifficultyStars({
  difficulty,
  size = 12,
}: {
  difficulty: Difficulty;
  size?: number;
}) {
  const activeColor = TIER_COLOR[difficulty];
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={i <= difficulty ? 'star' : 'star-outline'}
          size={size}
          color={i <= difficulty ? activeColor : tokens.text.faint}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 1,
  },
});
