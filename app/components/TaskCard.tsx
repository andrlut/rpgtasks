import { Ionicons } from '@expo/vector-icons';
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

import type { TaskWithDimension } from '@/lib/db/types';
import { describeRecurrence } from '@/lib/recurrence';
import {
  applyStreakMultiplier,
  formatScaledValue,
  rewardForDifficulty,
  scaledTargetValue,
  type Difficulty,
} from '@/lib/xp';
import { tokens } from '@/theme';
import { DIMENSION_META, SUB_META } from '@/theme/dimensions';

import { CoinIcon } from './CoinIcon';
import { DiffPips } from './DiffPips';
import { SubStack } from './SubStack';

interface Props {
  task: TaskWithDimension;
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

/**
 * Compact task card following the Tasks v2 visual:
 *
 *   ┌────────────────────────────────────────────────┐
 *   │ ▎ Title                              ┌─────┐  │
 *   │   [sub] [pips] +XP +coins            │ ✓   │  │
 *   │                                       └─────┘  │
 *   └────────────────────────────────────────────────┘
 *
 * The vertical accent bar on the left picks up the primary sub's dim
 * color so each card reads as belonging to a particular pillar at a
 * glance. The big violet button on the right is the single primary
 * action — tap it to log a completion.
 *
 * Swipe-to-change-difficulty is preserved for scaling tasks (the metric
 * scaling feature on the task) so users can bump a daily run from 5km
 * to 7km without leaving the card.
 */
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

  const subMeta = SUB_META[task.sub_id];
  const dimMeta = DIMENSION_META[task.dimension_id];
  const accent = dimMeta.color;

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
      {/* Vertical accent bar on the left, tinted by the task's parent dim */}
      <View
        style={[
          styles.accentBar,
          { backgroundColor: accent, opacity: 0.6 },
        ]}
      />

      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.bodyWrap, bodyAnimStyle]}>
          <Pressable
            style={({ pressed }) => [
              styles.body,
              pressed && onEdit && { opacity: 0.85 },
            ]}
            onPress={onEdit}
            disabled={!onEdit}
          >
            <Text style={styles.title} numberOfLines={2}>
              {titleText}
            </Text>

            <View style={styles.metaRow}>
              {subMeta && <SubStack subIds={[task.sub_id]} max={1} size={28} />}
              <DiffPips value={effectiveDifficulty} color={accent} />
              <View style={styles.rewardItem}>
                <Ionicons name="flag" size={11} color={tokens.semantic.xp} />
                <Text style={[styles.rewardText, { color: tokens.semantic.xp }]}>
                  +{reward.xp}
                </Text>
              </View>
              <View style={styles.rewardItem}>
                <CoinIcon size={11} />
                <Text style={[styles.rewardText, { color: tokens.semantic.coin }]}>
                  +{reward.coins}
                </Text>
              </View>
              {hintDirection && (
                <Text
                  style={[
                    styles.tickHint,
                    {
                      color:
                        hintDirection === 'up'
                          ? tokens.semantic.xp
                          : tokens.text.dim,
                    },
                  ]}
                >
                  {hintDirection === 'up' ? '+1★' : '−1★'}
                </Text>
              )}
            </View>

            {showRecurrenceNote && (
              <Text style={styles.recurrenceNote} numberOfLines={1}>
                {describeRecurrence(task.recurrence, task.target_count)}
              </Text>
            )}
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
          style={({ pressed }) => [
            styles.completeButton,
            pressed && styles.completeButtonPressed,
          ]}
        >
          <Ionicons name="checkmark" size={22} color="#fff" />
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
    paddingVertical: tokens.space[3],
    paddingHorizontal: tokens.space[3],
    paddingLeft: tokens.space[4],
    backgroundColor: tokens.bg.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: tokens.border.base,
    overflow: 'hidden',
    position: 'relative',
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
  },
  bodyWrap: {
    flex: 1,
    minWidth: 0,
  },
  body: {
    gap: tokens.space[2],
  },
  title: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    lineHeight: 18,
    color: tokens.text.hi,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  rewardText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
  },
  tickHint: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
    marginLeft: 4,
  },
  recurrenceNote: {
    ...tokens.type.caption,
    color: tokens.text.dim,
    fontStyle: 'italic',
  },
  completeShadow: {
    borderRadius: 12,
    shadowColor: tokens.brand.violet,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 6,
  },
  completeButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: tokens.brand.violet,
    alignItems: 'center',
    justifyContent: 'center',
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
