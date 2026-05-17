import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useT } from '@/lib/i18n';
import { tokens } from '@/theme';

const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'list',
  rewards: 'gift',
  character: 'person',
  learning: 'book',
  profile: 'settings',
};

const TAB_LABEL_KEYS: Record<string, string> = {
  index: 'tabs.tasks',
  rewards: 'tabs.rewards',
  character: 'tabs.hero',
  learning: 'tabs.learning',
  profile: 'tabs.settings',
};

const BAR_HORIZONTAL_MARGIN = 12;
const BAR_HEIGHT = 64;
const INDICATOR_WIDTH = 32;
const INDICATOR_HEIGHT = 3;

export const TAB_BAR_HEIGHT = BAR_HEIGHT;

/**
 * paddingBottom that any tab-screen ScrollView should reserve so its last
 * items don't hide behind the floating glass nav bar. Replicates the bar's
 * own `bottom` formula (`Math.max(insets.bottom, 8)`) and adds the bar
 * height plus 12px of visual breathing room.
 */
export function useBottomNavClearance(): number {
  const insets = useSafeAreaInsets();
  return TAB_BAR_HEIGHT + Math.max(insets.bottom, 8) + 12;
}

export function BottomNavBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { t } = useT();
  const tabCount = state.routes.length;
  const barWidth = screenWidth - BAR_HORIZONTAL_MARGIN * 2;
  const tabWidth = (barWidth - 12) / tabCount; // 6px padding each side inside bar

  // Animated indicator position: shared value follows the active tab.
  const indicatorX = useSharedValue(0);

  useEffect(() => {
    const target =
      6 + state.index * tabWidth + tabWidth / 2 - INDICATOR_WIDTH / 2;
    indicatorX.value = withSpring(target, { damping: 18, stiffness: 220 });
  }, [state.index, tabWidth, indicatorX]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        { bottom: Math.max(insets.bottom, 8) },
      ]}
    >
      <View style={styles.bar}>
        <Animated.View style={[styles.indicator, indicatorStyle]} />

        {state.routes.map((route, idx) => {
          const isFocused = state.index === idx;
          const iconName = TAB_ICONS[route.name] ?? 'ellipse';
          const labelKey = TAB_LABEL_KEYS[route.name];
          const label = labelKey ? t(labelKey) : route.name;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={styles.tab}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={label}
            >
              <Ionicons
                name={iconName}
                size={22}
                color={isFocused ? tokens.brand.violet2 : tokens.text.dim}
              />
              <Text
                style={[
                  styles.label,
                  {
                    color: isFocused ? tokens.brand.violet2 : tokens.text.dim,
                    fontFamily: isFocused
                      ? 'Manrope_800ExtraBold'
                      : 'Manrope_600SemiBold',
                  },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: BAR_HORIZONTAL_MARGIN,
    right: BAR_HORIZONTAL_MARGIN,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: {
    flex: 1,
    height: BAR_HEIGHT,
    borderRadius: 22,
    backgroundColor: tokens.bg.glassStrong,
    borderWidth: 1,
    borderColor: tokens.border.strong,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 16,
  },
  indicator: {
    position: 'absolute',
    top: 4,
    left: 0,
    width: INDICATOR_WIDTH,
    height: INDICATOR_HEIGHT,
    borderRadius: 2,
    backgroundColor: tokens.brand.violet,
    shadowColor: tokens.brand.violet,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  tab: {
    flex: 1,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  label: {
    fontSize: 10,
    letterSpacing: 0.2,
  },
});
