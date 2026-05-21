import { StyleSheet, Text, View } from 'react-native';

import { tokens } from '@/theme';

interface Props {
  /** Section title — typically the category label, uppercased by the style. */
  label: string;
  /** Accent dot + label color. */
  color: string;
  /** Number of cards in this section. */
  count: number;
}

/**
 * One-line group header used on the quest board to separate categories.
 * Renders a colored dot + uppercased label on the left, and a count chip
 * on the right.
 */
export function CategoryHeader({ label, color, count }: Props) {
  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.count}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 2,
    paddingTop: tokens.space[3],
    paddingBottom: tokens.space[1],
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    flex: 1,
  },
  count: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    color: tokens.text.dim,
  },
});
