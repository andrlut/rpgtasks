import { StyleSheet, Text, View } from 'react-native';

import type { DimensionId } from '@/lib/db/types';
import { tokens } from '@/theme';
import { DIMENSION_META } from '@/theme/dimensions';

export function DimensionChip({ id, size = 'md' }: { id: DimensionId; size?: 'sm' | 'md' }) {
  const meta = DIMENSION_META[id];
  const small = size === 'sm';
  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: meta.bg,
          paddingHorizontal: small ? tokens.space[2] : tokens.space[3],
          paddingVertical: small ? 2 : 4,
        },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: meta.color }]} />
      <Text style={[styles.label, { color: meta.color, fontSize: small ? 10 : 11 }]}>
        {meta.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: tokens.radius.pill,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 0.3,
  },
});
