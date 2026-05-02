import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { tokens } from '@/theme';

interface Props {
  xp: number;
  coins: number;
  onDone: () => void;
}

export function XPCoinFloat({ xp, coins, onDone }: Props) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withSequence(
      withTiming(1, { duration: 140 }),
      withDelay(
        780,
        withTiming(0, { duration: 350 }, (finished) => {
          if (finished) runOnJS(onDone)();
        }),
      ),
    );
    translateY.value = withTiming(-90, { duration: 1300 });
    scale.value = withSequence(
      withSpring(1.15, tokens.motion.springBouncy),
      withSpring(1, tokens.motion.springSnappy),
    );
  }, [opacity, translateY, scale, onDone]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]} pointerEvents="none">
      <View style={[styles.badge, styles.xpBadge]}>
        <Ionicons name="flash" size={16} color={tokens.semantic.xp} />
        <Text style={[styles.text, { color: tokens.semantic.xp }]}>+{xp} XP</Text>
      </View>
      <View style={[styles.badge, styles.coinBadge]}>
        <Ionicons name="ellipse" size={14} color={tokens.semantic.coin} />
        <Text style={[styles.text, { color: tokens.semantic.coin }]}>+{coins}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '40%',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: tokens.space[3],
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[2],
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
  },
  xpBadge: {
    backgroundColor: 'rgba(61, 214, 140, 0.18)',
    borderColor: 'rgba(61, 214, 140, 0.45)',
    ...tokens.shadow.xpGlow,
  },
  coinBadge: {
    backgroundColor: 'rgba(255, 200, 61, 0.20)',
    borderColor: 'rgba(255, 200, 61, 0.5)',
    ...tokens.shadow.coinGlowSoft,
  },
  text: {
    ...tokens.type.h3,
  },
});
