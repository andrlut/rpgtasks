import { StyleSheet, View } from 'react-native';

import { tokens } from '@/theme';

interface Props {
  /** 1..5 — how many pips light up. */
  value: 1 | 2 | 3 | 4 | 5;
  /** Lit-pip color. Defaults to violet so the component reads everywhere;
   *  pass the task's primary-sub dim color on task cards for cohesion. */
  color?: string;
}

/**
 * Five small dots, lighting up left-to-right with the task's difficulty.
 * Compact substitute for the larger DifficultyStars when the row is busy
 * (e.g. task cards in the new visual where many chips compete for space).
 */
export function DiffPips({ value, color = tokens.brand.violet2 }: Props) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((i) => (
        <View
          key={i}
          style={[
            styles.pip,
            { backgroundColor: i <= value ? color : tokens.bg.surface2 },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 2,
  },
  pip: {
    width: 6,
    height: 6,
    borderRadius: 1,
  },
});
