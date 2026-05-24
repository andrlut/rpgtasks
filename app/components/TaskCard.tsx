import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
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
  Extrapolation,
} from 'react-native-reanimated';

import { useT } from '@/lib/i18n';
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
  /** Swipe-left handler (skip-today). When omitted, swipe-left does nothing. */
  onSkip?: () => void;
  isCompleting?: boolean;
}

const SWIPE_COMMIT = 96;
const SWIPE_MAX = 160;

/**
 * Compact task card with swipe gestures.
 *
 *   ┌────────────────────────────────────────────────┐
 *   │ ▎ Title                              ┌─────┐  │
 *   │   [sub stack]  ▪▪▪▪  +45              │ ✓   │  │
 *   │                                       └─────┘  │
 *   └────────────────────────────────────────────────┘
 *
 * Swipe right past ~100px → fires `onComplete` with haptic feedback,
 * the card slides out and the green "complete" action zone fills in
 * behind it. Swipe left past ~100px → fires `onSkip`. Below threshold
 * the card springs back home.
 *
 * Vertical accent bar on the left tinted by the primary sub's dim color.
 * Pips below the title are colored by sub — a 2★+1★+1★ task draws 2 of
 * sub-1's color, 1 of sub-2's, 1 of sub-3's. The number next to them is
 * the task's total reward in XP.
 *
 * Tap on the body opens edit. Tap on the violet check button (or swipe
 * right) completes. Long-press opens the per-sub adjust popup.
 */
export function TaskCard({
  task,
  onComplete,
  onLongPress,
  onEdit,
  onSkip,
  isCompleting,
}: Props) {
  const { t } = useT();
  const accent = DIMENSION_META[task.primary_dimension_id].color;
  const reward = rewardForTaskSubs(task.subs);

  const completeScale = useSharedValue(1);
  const tx = useSharedValue(0);

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

  // ── Swipe gesture ───────────────────────────────────────────────────
  // Activates only after the user has pulled ≥15px horizontally, so taps
  // on the card body / check button still work.
  const fireComplete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {},
    );
    onComplete();
  };
  const fireSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onSkip?.();
  };

  // Coexisting with a vertical ScrollView is the tricky bit here.
  // - `activeOffsetX([-22, 22])` waits for a *clearly* horizontal pull
  //   before the gesture engages.
  // - `failOffsetY([-6, 6])` hands the touch back to the ScrollView at
  //   the slightest vertical motion, so swiping up/down from on top of
  //   a card still scrolls.
  // Tuning these tighter would block scroll; looser would steal taps.
  const pan = Gesture.Pan()
    .activeOffsetX([-22, 22])
    .failOffsetY([-6, 6])
    .onUpdate((e) => {
      // Right swipe is always allowed (complete). Left swipe only when
      // a skip handler is wired up — otherwise resist past 0.
      const next = e.translationX;
      if (next < 0 && !onSkip) {
        tx.value = next * 0.25; // soft resistance
      } else {
        // Clamp so the card never flies completely off-screen.
        tx.value = Math.max(-SWIPE_MAX, Math.min(SWIPE_MAX, next));
      }
    })
    .onEnd((e) => {
      const x = e.translationX;
      if (x > SWIPE_COMMIT) {
        // Throw the card off to the right, then fire.
        tx.value = withTiming(SWIPE_MAX, { duration: 140 }, () => {
          tx.value = withSpring(0, tokens.motion.springSnappy);
          runOnJS(fireComplete)();
        });
      } else if (x < -SWIPE_COMMIT && onSkip) {
        tx.value = withTiming(-SWIPE_MAX, { duration: 140 }, () => {
          tx.value = withSpring(0, tokens.motion.springSnappy);
          runOnJS(fireSkip)();
        });
      } else {
        tx.value = withSpring(0, tokens.motion.springSnappy);
      }
    });

  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }],
  }));

  // Action backgrounds — slot revealed grows as the card moves.
  // Right swipe (complete) reveals the LEFT bg; left swipe (skip)
  // reveals the RIGHT bg.
  const completeBgStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      tx.value,
      [0, SWIPE_COMMIT],
      [0, 1],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        scale: interpolate(
          tx.value,
          [0, SWIPE_COMMIT, SWIPE_MAX],
          [0.7, 1, 1.05],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));
  const skipBgStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      tx.value,
      [-SWIPE_COMMIT, 0],
      [1, 0],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        scale: interpolate(
          tx.value,
          [-SWIPE_MAX, -SWIPE_COMMIT, 0],
          [1.05, 1, 0.7],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  return (
    <View style={styles.outerWrap}>
      {/* Left action zone — revealed when swiping RIGHT (complete) */}
      <Animated.View style={[styles.actionZone, styles.actionLeft, completeBgStyle]}>
        <View style={[styles.actionPill, styles.actionPillComplete]}>
          <Ionicons name="checkmark-circle" size={22} color="#fff" />
          <Text style={styles.actionLabel}>{t('home.swipe.complete')}</Text>
        </View>
      </Animated.View>

      {/* Right action zone — revealed when swiping LEFT (skip) */}
      {onSkip && (
        <Animated.View style={[styles.actionZone, styles.actionRight, skipBgStyle]}>
          <View style={[styles.actionPill, styles.actionPillSkip]}>
            <Ionicons name="play-skip-forward" size={20} color="#fff" />
            <Text style={styles.actionLabel}>{t('home.swipe.skip')}</Text>
          </View>
        </Animated.View>
      )}

      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.container, cardAnimStyle]}>
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
            <Text style={styles.title} numberOfLines={2}>
              {task.title}
            </Text>

            <View style={styles.metaRow}>
              {subIds.length > 0 && <SubStack subIds={subIds} max={3} size={28} />}
              <SubColoredPips subs={task.subs} />
              <Text style={styles.rewardValue}>+{reward.total.xp}</Text>
              {showRecurrenceNote && (
                <Text style={styles.recurrenceNote} numberOfLines={1}>
                  {describeRecurrence(task.recurrence, task.target_count)}
                </Text>
              )}
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
        </Animated.View>
      </GestureDetector>
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
  outerWrap: {
    position: 'relative',
  },
  actionZone: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 140,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tokens.space[3],
  },
  actionLeft: {
    left: 0,
    alignItems: 'flex-start',
  },
  actionRight: {
    right: 0,
    alignItems: 'flex-end',
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  actionPillComplete: {
    backgroundColor: tokens.semantic.xp,
  },
  actionPillSkip: {
    backgroundColor: tokens.semantic.coin,
  },
  actionLabel: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 12,
    color: '#fff',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
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
  rewardValue: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 14,
    color: tokens.semantic.xp,
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
