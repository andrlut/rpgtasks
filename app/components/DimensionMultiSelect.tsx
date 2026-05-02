import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { DimensionId } from '@/lib/db/types';
import { tokens } from '@/theme';
import { DIMENSION_META, DIMENSION_ORDER } from '@/theme/dimensions';

interface Props {
  value: DimensionId[];
  onChange: (next: DimensionId[]) => void;
}

export function DimensionMultiSelect({ value, onChange }: Props) {
  const toggle = (id: DimensionId) => {
    if (value.includes(id)) onChange(value.filter((v) => v !== id));
    else onChange([...value, id]);
  };

  return (
    <View style={styles.grid}>
      {DIMENSION_ORDER.map((id) => {
        const meta = DIMENSION_META[id];
        const selected = value.includes(id);
        return (
          <Pressable
            key={id}
            onPress={() => toggle(id)}
            style={({ pressed }) => [
              styles.chip,
              selected && {
                backgroundColor: meta.bg,
                borderColor: meta.color,
              },
              pressed && { opacity: 0.6 },
            ]}
            hitSlop={4}
          >
            <Ionicons
              name={meta.iconName as never}
              size={14}
              color={selected ? meta.color : tokens.text.dim}
            />
            <Text
              style={[
                styles.label,
                { color: selected ? meta.color : tokens.text.mid },
              ]}
            >
              {meta.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.space[2],
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: tokens.space[3],
    paddingVertical: tokens.space[2],
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.border.base,
    backgroundColor: tokens.bg.surface,
  },
  label: {
    ...tokens.type.caption,
    fontFamily: 'Manrope_700Bold',
  },
});
