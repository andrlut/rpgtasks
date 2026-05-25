import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { tokens } from '@/theme';

export interface BucketTabSpec<T extends string> {
  value: T;
  label: string;
  count: number;
}

interface Props<T extends string> {
  tabs: BucketTabSpec<T>[];
  value: T;
  onChange: (next: T) => void;
}

/**
 * V3 bucket tabs — underlined style, replaces the previous pill-shaped
 * segmented control on the home screen. Each tab is a label + a tiny
 * count chip; active tab gets a 2px violet underline that sits flush
 * on the divider rule running across the bottom of the strip.
 *
 *   Daily 1 | Weekly 3 ▔▔▔ | One-shot 2
 *
 * Hairline divider at the bottom doubles as the inactive-state
 * underline so the rhythm reads cleanly across all 3 tabs.
 */
export function BucketTabsV2<T extends string>({ tabs, value, onChange }: Props<T>) {
  return (
    <View style={styles.row}>
      {tabs.map((tab) => {
        const isActive = tab.value === value;
        return (
          <Pressable
            key={tab.value}
            onPress={() => {
              if (!isActive) Haptics.selectionAsync().catch(() => {});
              onChange(tab.value);
            }}
            style={({ pressed }) => [
              styles.tab,
              isActive && styles.tabActive,
              pressed && { opacity: 0.85 },
            ]}
            hitSlop={4}
          >
            <Text
              style={[
                styles.label,
                isActive ? styles.labelActive : styles.labelInactive,
              ]}
            >
              {tab.label}
            </Text>
            <View
              style={[
                styles.countChip,
                isActive ? styles.countChipActive : styles.countChipInactive,
              ]}
            >
              <Text
                style={[
                  styles.countText,
                  isActive ? styles.countTextActive : styles.countTextInactive,
                ]}
              >
                {tab.count}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginHorizontal: tokens.space[4],
    marginTop: tokens.space[3],
    borderBottomWidth: 1,
    borderBottomColor: tokens.border.base,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    // Pull the inactive border up 1px so it sits ON the row's hairline
    // divider instead of below it — keeps the active 2px underline
    // visually anchored.
    marginBottom: -1,
  },
  tabActive: {
    borderBottomColor: tokens.brand.violet2,
  },
  label: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 12,
    letterSpacing: 0.2,
  },
  labelInactive: {
    color: tokens.text.faint,
  },
  labelActive: {
    color: tokens.text.hi,
  },
  countChip: {
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 999,
    minWidth: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countChipInactive: {
    backgroundColor: tokens.bg.surface2,
  },
  countChipActive: {
    backgroundColor: tokens.brand.violetGlow,
  },
  countText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 9,
    letterSpacing: 0.3,
  },
  countTextInactive: {
    color: tokens.text.faint,
  },
  countTextActive: {
    color: tokens.brand.violet2,
  },
});
