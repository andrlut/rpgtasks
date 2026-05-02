import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import type { Difficulty } from '@/lib/xp';
import { tokens } from '@/theme';

export function DifficultyStars({ difficulty, size = 12 }: { difficulty: Difficulty; size?: number }) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={i <= difficulty ? 'star' : 'star-outline'}
          size={size}
          color={i <= difficulty ? tokens.semantic.coin : tokens.text.faint}
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
