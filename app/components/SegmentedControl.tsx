import { Pressable, StyleSheet, Text, View } from 'react-native';

import { tokens } from '@/theme';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  /** Optional count badge rendered next to the label (e.g. 17). */
  count?: number;
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
        const labelColor = selected ? tokens.text.hi : tokens.text.mid;
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
            <Text style={[styles.label, { color: labelColor }]}>{opt.label}</Text>
            {opt.count != null && (
              <View
                style={[
                  styles.countChip,
                  selected
                    ? { backgroundColor: 'rgba(255,255,255,0.18)' }
                    : { backgroundColor: tokens.bg.glass },
                ]}
              >
                <Text style={[styles.countText, { color: labelColor }]}>
                  {opt.count}
                </Text>
              </View>
            )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: tokens.space[3],
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
  countChip: {
    minWidth: 22,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    letterSpacing: 0.3,
  },
});
