import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { tokens } from '@/theme';

interface Props {
  value: number;
  max: number;
  color?: string;
  height?: number;
  trackColor?: string;
}

export function ProgressBar({
  value,
  max,
  color = tokens.brand.violet,
  height = 6,
  trackColor = tokens.bg.surface2,
}: Props) {
  const fraction = Math.min(1, Math.max(0, max === 0 ? 0 : value / max));
  const widthSv = useSharedValue(fraction);

  useEffect(() => {
    widthSv.value = withTiming(fraction, { duration: 480 });
  }, [fraction, widthSv]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${widthSv.value * 100}%`,
  }));

  return (
    <View style={[styles.track, { height, backgroundColor: trackColor }]}>
      <Animated.View
        style={[
          styles.fill,
          { backgroundColor: color, height },
          fillStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    borderRadius: tokens.radius.pill,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: tokens.radius.pill,
  },
});
