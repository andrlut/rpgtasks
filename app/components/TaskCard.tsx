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

import type { TaskSub, TaskWithSubs } from '@/lib/db/types';
import { describeRecurrence } from '@/lib/recurrence';
import { rewardForTaskSubs } from '@/lib/xp';
import { tokens } from '@/theme';
import { DIMENSION_META, SUB_META } from '@/theme/dimensions';

import { SubStack } from './SubStack';

interface Props {
  task: TaskWithSubs;
  /** Quick-tap completion (uses the task's default subs). */
  onComplete: () => void;
  /** Long-press the check button to open the per-sub adjust popup. */
  onLongPress?: () => void;
  /** Tap the body to navigate to edit. */
  onEdit?: () => void;
  isCompleting?: boolean;
}

/**
 * Compact task card.
 *
 *   ┌────────────────────────────────────────────────┐
 *   │ ▎ Title                              ┌─────┐  │
 *   │   [sub stack]  ▪▪▪▪  +45              │ ✓   │  │
 *   │                                       └─────┘  │
 *   └────────────────────────────────────────────────┘
 *
 * Vertical accent bar on the left tinted by the primary sub's dim color.
 * Pips below the title are colored by sub — a 2★+1★+1★ task draws 2 of
 * sub-1's color, 1 of sub-2's, 1 of sub-3's (no cap; user liked the
 * visual). The number next to them is the task's total reward in XP
 * (coins == xp by current convention, so we collapse to one value).
 *
 * Single primary action: violet rounded check on the right. Tap = quick
 * complete with defaults, long-press = open the per-sub adjust popup.
 */
export function TaskCard({
  task,
  onComplete,
  onLongPress,
  onEdit,
  isCompleting,
}: Props) {
  const accent = DIMENSION_META[task.primary_dimension_id].color;
  const reward = rewardForTaskSubs(task.subs);

  const completeScale = useSharedValue(1);

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

  const buttonAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: completeScale.value }],
  }));

  const handlePressIn = () => {
    completeScale.value = withSpring(0.9, tokens.motion.springSnappy);
  };
  const handlePressOut = () => {
    completeScale.value = withSpring(1, tokens.motion.springBouncy);
  };

  const subIds = task.subs.map((s) => s.sub_id);

  return (
    <View style={styles.container}>
      {/* Vertical accent bar on the left, tinted by primary sub's dim */}
      <View
        style={[
          styles.accentBar,
          { backgroundColor: accent, opacity: 0.6 },
        ]}
      />

      <Pressable
        style={({ pressed }) => [
          styles.bodyWrap,
          pressed && (onEdit || onLongPress) && { opacity: 0.85 },
        ]}
        onPress={onEdit}
        onLongPress={onLongPress}
        delayLongPress={350}
        disabled={!onEdit && !onLongPress}
      >
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>
            {task.title}
          </Text>
          <Text style={styles.xpBadge}>+{reward.total.xp} XP</Text>
        </View>

        <View style={styles.metaRow}>
          {subIds.length > 0 && <SubStack subIds={subIds} max={3} size={28} />}
          <SubColoredPips subs={task.subs} />
          <View style={styles.targetGroup}>
            {showRecurrenceNote && (
              <Text style={styles.recurrenceNote} numberOfLines={1}>
                {describeRecurrence(task.recurrence, task.target_count)}
              </Text>
            )}
            <View style={styles.coinBadge}>
              <Ionicons name="ellipse" size={9} color={tokens.semantic.coin} />
              <Text style={styles.coinBadgeText}>+{reward.total.coins}</Text>
            </View>
          </View>
        </View>
      </Pressable>

      <Animated.View style={[styles.completeShadow, buttonAnimStyle]}>
        <Pressable
          onPress={onComplete}
          onLongPress={onLongPress}
          delayLongPress={350}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={isCompleting}
          hitSlop={8}
          style={({ pressed }) => [
            styles.completeButton,
            pressed && styles.completeButtonPressed,
          ]}
          accessibilityHint={
            onLongPress ? 'Long-press to adjust per-sub stars' : undefined
          }
        >
          <Ionicons name="checkmark" size={22} color="#fff" />
        </Pressable>
      </Animated.View>
    </View>
  );
}

/** Pips colored per-sub: a 2★+1★+1★ task draws 2 of sub-1's color,
 *  1 of sub-2's, 1 of sub-3's. Total pips = sum of stars across subs. */
function SubColoredPips({ subs }: { subs: TaskSub[] }) {
  const pips: string[] = [];
  for (const s of subs) {
    const sub = SUB_META[s.sub_id];
    const color = sub ? DIMENSION_META[sub.dimensionId].color : tokens.brand.violet2;
    for (let i = 0; i < s.stars; i++) {
      pips.push(color);
    }
  }
  if (pips.length === 0) return null;
  return (
    <View style={styles.pipsRow}>
      {pips.map((color, i) => (
        <View key={i} style={[styles.pip, { backgroundColor: color }]} />
      ))}
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
    gap: tokens.space[2],
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    flex: 1,
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    lineHeight: 18,
    color: tokens.text.hi,
  },
  xpBadge: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 13,
    color: tokens.semantic.xp,
    letterSpacing: 0.2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  targetGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  coinBadgeText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 12,
    color: tokens.semantic.coin,
    letterSpacing: 0.2,
  },
  pipsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  pip: {
    width: 6,
    height: 6,
    borderRadius: 1,
  },
  recurrenceNote: {
    ...tokens.type.caption,
    color: tokens.text.dim,
    fontStyle: 'italic',
    flexShrink: 1,
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
});
