import { Pressable, StyleSheet, Text, View } from 'react-native';

import { tokens } from '@/theme';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (v: T) => void;
}

export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <View style={styles.container}>
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={({ pressed }) => [
              styles.segment,
              selected && styles.segmentSelected,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text
              style={[
                styles.label,
                { color: selected ? tokens.text.hi : tokens.text.mid },
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: tokens.bg.surface,
    borderRadius: tokens.radius.md,
    padding: 4,
    borderWidth: 1,
    borderColor: tokens.border.base,
  },
  segment: {
    flex: 1,
    paddingVertical: tokens.space[3],
    alignItems: 'center',
    borderRadius: tokens.radius.sm,
  },
  segmentSelected: {
    backgroundColor: tokens.brand.violet,
  },
  label: {
    ...tokens.type.caption,
    fontFamily: 'Manrope_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
