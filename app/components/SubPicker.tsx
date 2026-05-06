import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { SubId, TaskSub } from '@/lib/db/types';
import { tokens } from '@/theme';
import {
  DIMENSION_META,
  DIMENSION_ORDER,
  SUBS_BY_DIM,
  SUB_META,
} from '@/theme/dimensions';

interface Props {
  /** Current selection. Per-sub stars capped at 5; no total cap. */
  value: TaskSub[];
  onChange: (next: TaskSub[]) => void;
}

/**
 * Multi-sub picker for tasks. The user can:
 *   - Tap any sub chip to add it (defaults to 1★) or remove it.
 *   - Use the [− N★ +] stepper on a selected sub to adjust its stars.
 *
 * Per-sub stars cap at 5 (single hard ceiling). No total cap — the
 * exponential XP curve self-regulates: filling 10 subs at 1★ each nets
 * 50 XP, less than a single honest 4★ task. Trust the user.
 *
 * Subs are grouped under their parent dim using the dim's color for the
 * group header and the active chip tint.
 */
export function SubPicker({ value, onChange }: Props) {
  const totalStars = value.reduce((s, x) => s + x.stars, 0);

  const findIdx = (subId: SubId) => value.findIndex((v) => v.sub_id === subId);

  const toggle = (subId: SubId) => {
    const idx = findIdx(subId);
    if (idx >= 0) {
      onChange(value.filter((_, i) => i !== idx));
    } else {
      onChange([...value, { sub_id: subId, stars: 1 }]);
    }
  };

  const adjust = (subId: SubId, delta: 1 | -1) => {
    const idx = findIdx(subId);
    if (idx < 0) return;
    const cur = value[idx]!.stars;
    const next = cur + delta;
    if (next < 1 || next > 5) return;
    onChange(
      value.map((v, i) =>
        i === idx ? { ...v, stars: next as TaskSub['stars'] } : v,
      ),
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>
          {value.length === 0
            ? 'Pick at least one sub'
            : `${value.length} sub${value.length === 1 ? '' : 's'} · ${totalStars}★ total`}
        </Text>
      </View>

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
                  const idx = findIdx(subId);
                  const selected = idx >= 0;
                  const stars = selected ? value[idx]!.stars : 0;
                  const canDec = selected && stars > 1;
                  const canInc = selected && stars < 5;

                  return (
                    <View
                      key={subId}
                      style={[
                        styles.chip,
                        selected && {
                          backgroundColor: dimMeta.bg,
                          borderColor: dimMeta.color,
                        },
                      ]}
                    >
                      <Pressable
                        onPress={() => toggle(subId)}
                        style={styles.chipBody}
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
                      {selected && (
                        <View style={styles.stepper}>
                          <Pressable
                            onPress={() => adjust(subId, -1)}
                            disabled={!canDec}
                            style={({ pressed }) => [
                              styles.stepBtn,
                              !canDec && styles.stepBtnDisabled,
                              pressed && canDec && { opacity: 0.6 },
                            ]}
                            hitSlop={4}
                          >
                            <Ionicons
                              name="remove"
                              size={12}
                              color={canDec ? dimMeta.color : tokens.text.faint}
                            />
                          </Pressable>
                          <Text
                            style={[
                              styles.stepValue,
                              { color: dimMeta.color },
                            ]}
                          >
                            {stars}★
                          </Text>
                          <Pressable
                            onPress={() => adjust(subId, 1)}
                            disabled={!canInc}
                            style={({ pressed }) => [
                              styles.stepBtn,
                              !canInc && styles.stepBtnDisabled,
                              pressed && canInc && { opacity: 0.6 },
                            ]}
                            hitSlop={4}
                          >
                            <Ionicons
                              name="add"
                              size={12}
                              color={canInc ? dimMeta.color : tokens.text.faint}
                            />
                          </Pressable>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: tokens.space[3],
  },
  header: {
    gap: 2,
  },
  headerText: {
    ...tokens.type.caption,
    color: tokens.text.mid,
    fontFamily: 'Manrope_700Bold',
  },
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.border.base,
    backgroundColor: tokens.bg.surface,
    gap: 6,
  },
  chipBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  chipLabel: {
    ...tokens.type.caption,
    fontFamily: 'Manrope_700Bold',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 4,
    borderLeftWidth: 1,
    borderLeftColor: tokens.border.divider,
    marginLeft: 2,
  },
  stepBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnDisabled: {
    opacity: 0.4,
  },
  stepValue: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
    minWidth: 22,
    textAlign: 'center',
  },
});
