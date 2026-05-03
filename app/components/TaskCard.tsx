import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { TaskWithDimensions } from '@/lib/db/types';
import { describeRecurrence } from '@/lib/recurrence';
import {
  applyStreakMultiplier,
  formatScaledValue,
  rewardForDifficulty,
  scaledTargetValue,
  type Difficulty,
} from '@/lib/xp';
import { tokens } from '@/theme';

import { CoinIcon } from './CoinIcon';
import { DifficultyStars } from './DifficultyStars';
import { DimensionChip } from './DimensionChip';

interface Props {
  task: TaskWithDimensions;
  /** Star difficulty selected by the user via swipe; falls back to task.difficulty. */
  selectedDifficulty?: Difficulty;
  onSelectDifficulty?: (next: Difficulty) => void;
  /** Streak the user is on, for displaying the multiplied reward. */
  streakDays?: number;
  onComplete: () => void;
  onEdit?: () => void;
  isCompleting?: boolean;
}

const SWIPE_THRESHOLD = 60; // px past which a swipe ticks the star count

const clampDifficulty = (n: number): Difficulty => {
  'worklet';
  return Math.max(1, Math.min(5, Math.round(n))) as Difficulty;
};

export function TaskCard({
  task,
  selectedDifficulty,
  onSelectDifficulty,
  streakDays = 0,
  onComplete,
  onEdit,
  isCompleting,
}: Props) {
  const scalingEnabled =
    task.metric_type !== null &&
    task.base_value !== null &&
    task.increment_per_star !== null;

  const effectiveDifficulty: Difficulty = selectedDifficulty ?? task.difficulty;

  const baseReward = rewardForDifficulty(effectiveDifficulty);
  const reward = applyStreakMultiplier(baseReward, streakDays);

  const scaledTarget =
    scalingEnabled && task.base_value !== null && task.increment_per_star !== null
      ? scaledTargetValue(task.base_value, task.increment_per_star, effectiveDifficulty)
      : null;

  const completeScale = useSharedValue(1);
  const dragX = useSharedValue(0);
  const [hintDirection, setHintDirection] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    if (isCompleting) {
      completeScale.value = withSequence(
        withTiming(0.92, { duration: 80 }),
        withSpring(1.06, tokens.motion.springBouncy),
        withSpring(1, tokens.motion.springSnappy),
      );
    }
  }, [isCompleting, completeScale]);

  const showRecurrenceNote =
    task.recurrence.type !== 'daily' || task.target_count > 1;

  const tickDifficulty = (delta: 1 | -1) => {
    if (!scalingEnabled || !onSelectDifficulty) return;
    const next = clampDifficulty(effectiveDifficulty + delta);
    if (next === effectiveDifficulty) return;
    onSelectDifficulty(next);
    setHintDirection(delta > 0 ? 'up' : 'down');
    setTimeout(() => setHintDirection(null), 600);
  };

  // Horizontal pan gesture: drag past SWIPE_THRESHOLD in either direction
  // to tick the star count. Snap back to center on release.
  const panGesture = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-12, 12])
    .enabled(scalingEnabled && !!onSelectDifficulty)
    .onUpdate((e) => {
      dragX.value = e.translationX;
    })
    .onEnd((e) => {
      const t = e.translationX;
      if (t > SWIPE_THRESHOLD) {
        runOnJS(tickDifficulty)(1);
      } else if (t < -SWIPE_THRESHOLD) {
        runOnJS(tickDifficulty)(-1);
      }
      dragX.value = withSpring(0, tokens.motion.springSnappy);
    });

  const buttonAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: completeScale.value }],
  }));

  const bodyAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dragX.value * 0.4 }],
  }));

  const hintRightStyle = useAnimatedStyle(() => ({
    opacity: interpolate(dragX.value, [0, SWIPE_THRESHOLD], [0, 1], 'clamp'),
  }));
  const hintLeftStyle = useAnimatedStyle(() => ({
    opacity: interpolate(dragX.value, [-SWIPE_THRESHOLD, 0], [1, 0], 'clamp'),
  }));

  const handlePressIn = () => {
    completeScale.value = withSpring(0.9, tokens.motion.springSnappy);
  };
  const handlePressOut = () => {
    completeScale.value = withSpring(1, tokens.motion.springBouncy);
  };

  const titleText = scaledTarget !== null
    ? `${task.title} — ${formatScaledValue(scaledTarget, task.metric_label)}`
    : task.title;

  return (
    <View style={styles.container}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[{ flex: 1, minWidth: 0 }, bodyAnimStyle]}>
          <Pressable
            style={({ pressed }) => [styles.body, pressed && onEdit && { opacity: 0.7 }]}
            onPress={onEdit}
            disabled={!onEdit}
          >
            <Text style={styles.title} numberOfLines={2}>
              {titleText}
            </Text>
            <View style={styles.metaRow}>
              <DifficultyStars difficulty={effectiveDifficulty} />
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
                <Text style={[styles.rewardText, { color: tokens.semantic.xp }]}>
                  +{reward.xp} XP
                </Text>
              </View>
              <View style={styles.rewardItem}>
                <CoinIcon size={12} />
                <Text style={[styles.rewardText, { color: tokens.semantic.coin }]}>
                  +{reward.coins}
                </Text>
              </View>
              {hintDirection && (
                <Text
                  style={[
                    styles.tickHint,
                    { color: hintDirection === 'up' ? tokens.semantic.xp : tokens.text.dim },
                  ]}
                >
                  {hintDirection === 'up' ? '+1★' : '−1★'}
                </Text>
              )}
            </View>
          </Pressable>

          {scalingEnabled && (
            <>
              <Animated.View style={[styles.swipeHintLeft, hintLeftStyle]}>
                <Ionicons name="arrow-back" size={14} color={tokens.text.dim} />
                <Text style={styles.swipeHintText}>−1★</Text>
              </Animated.View>
              <Animated.View style={[styles.swipeHintRight, hintRightStyle]}>
                <Text style={styles.swipeHintText}>+1★</Text>
                <Ionicons name="arrow-forward" size={14} color={tokens.semantic.xp} />
              </Animated.View>
            </>
          )}
        </Animated.View>
      </GestureDetector>

      <Animated.View style={[styles.completeShadow, buttonAnimStyle]}>
        <Pressable
          onPress={onComplete}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={isCompleting}
          hitSlop={8}
          style={({ pressed }) => [pressed && styles.completeButtonPressed]}
        >
          <LinearGradient
            colors={tokens.gradient.completeBtn}
            locations={tokens.gradient.completeBtnLocations}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.completeButton}
          >
            <Ionicons name="checkmark" size={26} color={tokens.text.hi} />
          </LinearGradient>
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
    overflow: 'hidden',
  },
  body: {
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
    alignItems: 'center',
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
  tickHint: {
    ...tokens.type.caption,
    fontFamily: 'Manrope_800ExtraBold',
    marginLeft: tokens.space[2],
  },
  recurrenceNote: {
    ...tokens.type.caption,
    color: tokens.text.dim,
    fontStyle: 'italic',
  },
  completeShadow: {
    borderRadius: 14,
    shadowColor: tokens.brand.violet,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
  completeButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  completeButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  swipeHintLeft: {
    position: 'absolute',
    left: 0,
    top: '50%',
    transform: [{ translateY: -10 }],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  swipeHintRight: {
    position: 'absolute',
    right: 0,
    top: '50%',
    transform: [{ translateY: -10 }],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  swipeHintText: {
    ...tokens.type.caption,
    color: tokens.text.dim,
    fontFamily: 'Manrope_700Bold',
  },
});
