import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { SubId } from '@/lib/db/types';
import { tokens } from '@/theme';
import { DIMENSION_META, DIMENSION_ORDER, SUB_META, SUBS_BY_DIM } from '@/theme/dimensions';

interface Props {
  value: SubId | null;
  onChange: (next: SubId) => void;
}

/**
 * Picks exactly one sub. Subs are grouped under their parent dim with the
 * dim's color used to tint the selected pill. Required by the sub-first
 * task model: every task lives under exactly one sub (and inherits its
 * parent dim from there).
 */
export function SubPicker({ value, onChange }: Props) {
  return (
    <View style={styles.groups}>
      {DIMENSION_ORDER.map((dimId) => {
        const dimMeta = DIMENSION_META[dimId];
        const subs = SUBS_BY_DIM[dimId];
        return (
          <View key={dimId} style={styles.group}>
            <View style={styles.groupHeader}>
              <Ionicons
                name={dimMeta.iconName as never}
                size={12}
                color={dimMeta.color}
              />
              <Text style={[styles.groupLabel, { color: dimMeta.color }]}>
                {dimMeta.label}
              </Text>
            </View>
            <View style={styles.row}>
              {subs.map((subId) => {
                const subMeta = SUB_META[subId];
                const selected = value === subId;
                return (
                  <Pressable
                    key={subId}
                    onPress={() => onChange(subId)}
                    style={({ pressed }) => [
                      styles.chip,
                      selected && {
                        backgroundColor: dimMeta.bg,
                        borderColor: dimMeta.color,
                      },
                      pressed && { opacity: 0.6 },
                    ]}
                    hitSlop={4}
                  >
                    <Ionicons
                      name={subMeta.iconName as never}
                      size={14}
                      color={selected ? dimMeta.color : tokens.text.dim}
                    />
                    <Text
                      style={[
                        styles.chipLabel,
                        { color: selected ? dimMeta.color : tokens.text.mid },
                      ]}
                    >
                      {subMeta.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  groups: {
    gap: tokens.space[3],
  },
  group: {
    gap: tokens.space[2],
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  groupLabel: {
    ...tokens.type.caption,
    fontFamily: 'Manrope_800ExtraBold',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  row: {
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
  chipLabel: {
    ...tokens.type.caption,
    fontFamily: 'Manrope_700Bold',
  },
});
