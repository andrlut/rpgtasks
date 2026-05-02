import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
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
  const scale = useSharedValue(0.6);

  useEffect(() => {
    opacity.value = withSequence(
      withTiming(1, { duration: 160 }),
      withDelay(700, withTiming(0, { duration: 350 }, (finished) => {
        if (finished) runOnJS(onDone)();
      })),
    );
    translateY.value = withTiming(-80, { duration: 1200 });
    scale.value = withSequence(
      withTiming(1.1, { duration: 160 }),
      withTiming(1, { duration: 200 }),
    );
  }, [opacity, translateY, scale, onDone]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]} pointerEvents="none">
      <View style={[styles.badge, { backgroundColor: 'rgba(61, 214, 140, 0.15)' }]}>
        <Ionicons name="flash" size={16} color={tokens.semantic.xp} />
        <Text style={[styles.text, { color: tokens.semantic.xp }]}>+{xp} XP</Text>
      </View>
      <View style={[styles.badge, { backgroundColor: 'rgba(255, 200, 61, 0.18)' }]}>
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
  },
  text: {
    ...tokens.type.h3,
  },
});
