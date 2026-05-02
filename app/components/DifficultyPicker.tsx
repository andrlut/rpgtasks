import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DIFFICULTY_LABEL, rewardForDifficulty, type Difficulty } from '@/lib/xp';
import { tokens } from '@/theme';

interface Props {
  value: Difficulty;
  onChange: (v: Difficulty) => void;
}

export function DifficultyPicker({ value, onChange }: Props) {
  const reward = rewardForDifficulty(value);
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {([1, 2, 3, 4, 5] as Difficulty[]).map((i) => {
          const active = i <= value;
          return (
            <Pressable
              key={i}
              onPress={() => onChange(i)}
              style={({ pressed }) => [
                styles.starButton,
                pressed && { opacity: 0.6 },
              ]}
              hitSlop={6}
            >
              <Ionicons
                name={active ? 'star' : 'star-outline'}
                size={32}
                color={active ? tokens.semantic.coin : tokens.text.faint}
              />
            </Pressable>
          );
        })}
      </View>
      <View style={styles.summary}>
        <Text style={styles.label}>{DIFFICULTY_LABEL[value]}</Text>
        <Text style={styles.reward}>
          +{reward.xp} XP / +{reward.coins} coins
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: tokens.space[2],
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  starButton: {
    padding: 4,
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    ...tokens.type.h3,
    color: tokens.text.hi,
  },
  reward: {
    ...tokens.type.caption,
    color: tokens.text.mid,
  },
});
