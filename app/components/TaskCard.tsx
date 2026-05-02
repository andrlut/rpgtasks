import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { TaskWithDimensions } from '@/lib/db/types';
import { rewardForDifficulty } from '@/lib/xp';
import { tokens } from '@/theme';

import { DifficultyStars } from './DifficultyStars';
import { DimensionChip } from './DimensionChip';

interface Props {
  task: TaskWithDimensions;
  onComplete: () => void;
  isCompleting?: boolean;
}

export function TaskCard({ task, onComplete, isCompleting }: Props) {
  const reward = rewardForDifficulty(task.difficulty);

  return (
    <View style={styles.container}>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {task.title}
        </Text>
        <View style={styles.metaRow}>
          <DifficultyStars difficulty={task.difficulty} />
          {task.dimensions.length > 0 && (
            <View style={styles.chipsRow}>
              {task.dimensions.slice(0, 2).map((d) => (
                <DimensionChip key={d} id={d} size="sm" />
              ))}
            </View>
          )}
        </View>
        <View style={styles.rewardRow}>
          <View style={styles.rewardItem}>
            <Ionicons name="flash" size={12} color={tokens.semantic.xp} />
            <Text style={[styles.rewardText, { color: tokens.semantic.xp }]}>+{reward.xp} XP</Text>
          </View>
          <View style={styles.rewardItem}>
            <Ionicons name="ellipse" size={10} color={tokens.semantic.coin} />
            <Text style={[styles.rewardText, { color: tokens.semantic.coin }]}>
              +{reward.coins}
            </Text>
          </View>
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.completeButton,
          (pressed || isCompleting) && styles.completeButtonPressed,
        ]}
        onPress={onComplete}
        disabled={isCompleting}
        hitSlop={8}
      >
        <Ionicons name="checkmark" size={28} color={tokens.text.hi} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    padding: tokens.space[4],
    backgroundColor: tokens.bg.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.border.base,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: tokens.space[2],
  },
  title: {
    ...tokens.type.bodyLg,
    color: tokens.text.hi,
    fontFamily: 'Manrope_700Bold',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    flexWrap: 'wrap',
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  rewardRow: {
    flexDirection: 'row',
    gap: tokens.space[3],
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rewardText: {
    ...tokens.type.caption,
    fontFamily: 'Manrope_700Bold',
  },
  completeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: tokens.brand.violet,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: tokens.brand.violet,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  completeButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
});
