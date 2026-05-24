import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Granularity, WindowSpec } from '@/lib/api/dedicacao';
import { tokens } from '@/theme';

interface Props {
  spec: WindowSpec;
  onChange: (spec: WindowSpec) => void;
  /** Window label (e.g. "Maio 2026" / "12 - 18 mai") rendered between the arrows. */
  label: string;
  /** Accent color — matches the Praticada pillar tone. */
  accent: string;
  halo: string;
  border: string;
  /** Localized chip labels: week / month / quarter / all. */
  labels: { week: string; month: string; quarter: string; all: string };
}

const GRANULARITIES: Granularity[] = ['week', 'month', 'quarter', 'all'];

/**
 * Period picker for the Dedicação panel. Top row: 4 granularity chips. Bottom
 * row: ◀ "label" ▶ to scrub backward/forward through past periods (hidden
 * for "Total" since there's no prev/next). The ▶ arrow is disabled at
 * offset 0 — you can't peek into the future.
 */
export function PeriodSelector({
  spec,
  onChange,
  label,
  accent,
  halo,
  border,
  labels,
}: Props) {
  const changeGranularity = (g: Granularity) => {
    if (g === spec.granularity) return;
    Haptics.selectionAsync().catch(() => {});
    onChange({ granularity: g, offset: 0 });
  };

  const shift = (delta: number) => {
    const nextOffset = spec.offset + delta;
    if (nextOffset < 0) return;
    Haptics.selectionAsync().catch(() => {});
    onChange({ ...spec, offset: nextOffset });
  };

  const canGoForward = spec.offset > 0;
  const showArrows = spec.granularity !== 'all';

  return (
    <View style={styles.wrap}>
      <View style={styles.chipRow}>
        {GRANULARITIES.map((g) => {
          const isActive = g === spec.granularity;
          return (
            <Pressable
              key={g}
              onPress={() => changeGranularity(g)}
              style={({ pressed }) => [
                styles.chip,
                isActive && { backgroundColor: halo, borderColor: border },
                pressed && { opacity: 0.85 },
              ]}
              hitSlop={4}
              accessibilityRole="button"
              accessibilityState={isActive ? { selected: true } : {}}
            >
              <Text
                style={[
                  styles.chipLabel,
                  { color: isActive ? accent : tokens.text.dim },
                ]}
                numberOfLines={1}
              >
                {labels[g]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {showArrows && (
        <View style={styles.navRow}>
          <Pressable
            onPress={() => shift(1)}
            style={({ pressed }) => [styles.arrow, pressed && { opacity: 0.6 }]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Período anterior"
          >
            <Ionicons name="chevron-back" size={16} color={tokens.text.mid} />
          </Pressable>
          <Text style={styles.label} numberOfLines={1}>
            {label}
          </Text>
          <Pressable
            onPress={() => shift(-1)}
            disabled={!canGoForward}
            style={({ pressed }) => [
              styles.arrow,
              !canGoForward && { opacity: 0.25 },
              pressed && canGoForward && { opacity: 0.6 },
            ]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Próximo período"
            accessibilityState={{ disabled: !canGoForward }}
          >
            <Ionicons
              name="chevron-forward"
              size={16}
              color={tokens.text.mid}
            />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.space[2] },
  chipRow: { flexDirection: 'row', gap: 6 },
  chip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: tokens.space[2],
    paddingHorizontal: tokens.space[2],
    borderRadius: tokens.radius.pill,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: tokens.border.base,
  },
  chipLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    letterSpacing: 0.3,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.space[3],
    marginTop: 2,
  },
  arrow: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.pill,
  },
  label: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    color: tokens.text.base,
    letterSpacing: 0.4,
    textAlign: 'center',
    minWidth: 140,
    textTransform: 'capitalize',
  },
});
