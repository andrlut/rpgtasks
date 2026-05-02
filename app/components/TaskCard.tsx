import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { TaskWithDimensions } from '@/lib/db/types';
import { describeRecurrence } from '@/lib/recurrence';
import { rewardForDifficulty } from '@/lib/xp';
import { tokens } from '@/theme';

import { DifficultyStars } from './DifficultyStars';
import { DimensionChip } from './DimensionChip';

interface Props {
  task: TaskWithDimensions;
  onComplete: () => void;
  onEdit?: () => void;
  isCompleting?: boolean;
}

export function TaskCard({ task, onComplete, onEdit, isCompleting }: Props) {
  const reward = rewardForDifficulty(task.difficulty);
  const scale = useSharedValue(1);

  // Only show the recurrence note when it deviates from the default
  // ("daily, target=1") — otherwise it'd add clutter to every card.
  const showRecurrenceNote =
    task.recurrence.type !== 'daily' || task.target_count > 1;

  // Brief celebration pulse if the parent flips isCompleting briefly.
  useEffect(() => {
    if (isCompleting) {
      scale.value = withSequence(
        withTiming(0.92, { duration: 80 }),
        withSpring(1.06, tokens.motion.springBouncy),
        withSpring(1, tokens.motion.springSnappy),
      );
    }
  }, [isCompleting, scale]);

  const buttonAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9, tokens.motion.springSnappy);
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, tokens.motion.springBouncy);
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={({ pressed }) => [styles.body, pressed && onEdit && { opacity: 0.7 }]}
        onPress={onEdit}
        disabled={!onEdit}
      >
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
        {showRecurrenceNote && (
          <Text style={styles.recurrenceNote} numberOfLines={1}>
            {describeRecurrence(task.recurrence, task.target_count)}
          </Text>
        )}
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
      </Pressable>

      <Animated.View style={buttonAnimStyle}>
        <Pressable
          onPress={onComplete}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={isCompleting}
          hitSlop={8}
          style={({ pressed }) => [
            styles.completeButton,
            pressed && styles.completeButtonPressed,
          ]}
        >
          <Ionicons name="checkmark" size={26} color={tokens.text.hi} />
        </Pressable>
      </Animated.View>
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
  recurrenceNote: {
    ...tokens.type.caption,
    color: tokens.text.dim,
    fontStyle: 'italic',
  },
  completeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.brand.violet,
  },
  completeButtonPressed: {
    opacity: 0.7,
  },
});
