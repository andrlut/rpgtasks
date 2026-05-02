import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { DimensionId } from '@/lib/db/types';
import { tokens } from '@/theme';
import { DIMENSION_META } from '@/theme/dimensions';

interface Props {
  id: DimensionId;
  size?: 'sm' | 'md';
  // When false, renders as a static View (e.g. inside read-only summaries).
  pressable?: boolean;
}

export function DimensionChip({ id, size = 'md', pressable = true }: Props) {
  const router = useRouter();
  const meta = DIMENSION_META[id];
  const small = size === 'sm';

  const chipStyle = [
    styles.chip,
    {
      backgroundColor: meta.bg,
      paddingHorizontal: small ? tokens.space[2] : tokens.space[3],
      paddingVertical: small ? 2 : 4,
    },
  ];

  const inner = (
    <>
      <View style={[styles.dot, { backgroundColor: meta.color }]} />
      <Text style={[styles.label, { color: meta.color, fontSize: small ? 10 : 11 }]}>
        {meta.label}
      </Text>
    </>
  );

  if (!pressable) {
    return <View style={chipStyle}>{inner}</View>;
  }

  return (
    <Pressable
      hitSlop={6}
      onPress={() => router.push({ pathname: '/dimension/[id]', params: { id } })}
      style={({ pressed }) => [...chipStyle, pressed && styles.chipPressed]}
    >
      {inner}
    </Pressable>
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
  chipPressed: {
    opacity: 0.7,
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
