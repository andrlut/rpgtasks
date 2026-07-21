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

/**
 * Flat segmented control used by the Tasks filters, the Histórico lens tabs
 * and the Insights lens switch.
 *
 * The selected pill used to stack three glow treatments at once — a violet
 * halo (`shadowOpacity: 0.55` plus a duplicate `boxShadow`), the
 * `taskCheckBtn` gradient fill, and a bright violet border — which read as
 * *illuminated* rather than *selected* and dominated every screen it sat on.
 * It is now a quiet raised surface.
 *
 * Selection is carried by three channels that survive color blindness: the
 * fill (a lighter neutral step, not a hue), the border, and the label weight
 * and lightness. Never rely on any one of them alone.
 */
export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <View style={styles.container}>
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={({ pressed }) => [
              styles.segment,
              selected && styles.segmentSelected,
              pressed && { opacity: 0.75 },
            ]}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>
              {opt.label}
            </Text>
            {opt.count != null && (
              <View style={[styles.countChip, selected && styles.countChipSelected]}>
                <Text style={[styles.countText, selected && styles.countTextSelected]}>
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
    // Transparent border on the idle segment so selecting one does not shift
    // the label by a pixel — the 1dp is always in the box.
    borderWidth: 1,
    borderColor: 'transparent',
  },
  segmentSelected: {
    backgroundColor: tokens.bg.surface3,
    borderColor: tokens.border.strong,
  },
  label: {
    ...tokens.type.caption,
    fontFamily: 'Manrope_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: tokens.text.mid,
  },
  labelSelected: {
    fontFamily: 'Manrope_800ExtraBold',
    color: tokens.text.hi,
  },
  countChip: {
    minWidth: 22,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.bg.glass,
  },
  // The selected segment's own fill is already surface3, so the chip needs a
  // lighter backing than bg.glass to stay visible against it.
  countChipSelected: { backgroundColor: 'rgba(255, 255, 255, 0.16)' },
  countText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    letterSpacing: 0.3,
    color: tokens.text.mid,
  },
  countTextSelected: { color: tokens.text.hi },
});
