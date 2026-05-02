import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { Recurrence, RecurrenceType } from '@/lib/db/types';
import { tokens } from '@/theme';

interface Props {
  recurrence: Recurrence;
  onChange: (next: Recurrence) => void;
  targetCount: number;
  onChangeTargetCount: (n: number) => void;
}

const TYPE_OPTIONS: { type: RecurrenceType; label: string; icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap }[] = [
  { type: 'one_shot', label: 'One-shot', icon: 'flag' },
  { type: 'daily', label: 'Daily', icon: 'sunny' },
  { type: 'weekly', label: 'Weekly', icon: 'calendar' },
  { type: 'monthly', label: 'Monthly', icon: 'calendar-outline' },
];

const WEEKDAYS = [
  { idx: 0, label: 'S' },
  { idx: 1, label: 'M' },
  { idx: 2, label: 'T' },
  { idx: 3, label: 'W' },
  { idx: 4, label: 'T' },
  { idx: 5, label: 'F' },
  { idx: 6, label: 'S' },
];

function defaultFor(type: RecurrenceType): Recurrence {
  switch (type) {
    case 'one_shot':
      return { type: 'one_shot' };
    case 'daily':
      return { type: 'daily' };
    case 'weekly':
      return { type: 'weekly', days: [1, 3, 5] };
    case 'monthly':
      return { type: 'monthly', day: 1 };
  }
}

export function RecurrencePicker({
  recurrence,
  onChange,
  targetCount,
  onChangeTargetCount,
}: Props) {
  const handleTypeChange = (type: RecurrenceType) => {
    onChange(defaultFor(type));
    if (type === 'one_shot') onChangeTargetCount(1);
  };

  const toggleDay = (idx: number) => {
    if (recurrence.type !== 'weekly') return;
    const set = new Set(recurrence.days);
    if (set.has(idx)) set.delete(idx);
    else set.add(idx);
    onChange({ type: 'weekly', days: Array.from(set).sort((a, b) => a - b) });
  };

  const adjustMonthDay = (delta: number) => {
    if (recurrence.type !== 'monthly') return;
    const next = Math.max(1, Math.min(31, recurrence.day + delta));
    onChange({ type: 'monthly', day: next });
  };

  const adjustTarget = (delta: number) => {
    const next = Math.max(1, Math.min(20, targetCount + delta));
    onChangeTargetCount(next);
  };

  return (
    <View style={styles.container}>
      {/* type picker */}
      <View style={styles.typeRow}>
        {TYPE_OPTIONS.map((opt) => {
          const selected = recurrence.type === opt.type;
          return (
            <Pressable
              key={opt.type}
              onPress={() => handleTypeChange(opt.type)}
              style={[styles.typeCell, selected && styles.typeCellSelected]}
            >
              <Ionicons
                name={opt.icon}
                size={16}
                color={selected ? tokens.brand.violet2 : tokens.text.mid}
              />
              <Text
                style={[
                  styles.typeLabel,
                  { color: selected ? tokens.brand.violet2 : tokens.text.mid },
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* sub-controls */}
      {recurrence.type === 'weekly' && (
        <View style={styles.subBlock}>
          <Text style={styles.subLabel}>Pick the days</Text>
          <View style={styles.dowRow}>
            {WEEKDAYS.map((d) => {
              const selected = recurrence.days.includes(d.idx);
              return (
                <Pressable
                  key={d.idx}
                  onPress={() => toggleDay(d.idx)}
                  style={[styles.dowCell, selected && styles.dowCellSelected]}
                >
                  <Text
                    style={[
                      styles.dowLabel,
                      { color: selected ? tokens.text.hi : tokens.text.mid },
                    ]}
                  >
                    {d.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {recurrence.type === 'monthly' && (
        <View style={styles.subBlock}>
          <Text style={styles.subLabel}>Day of the month</Text>
          <View style={styles.stepperRow}>
            <Pressable
              onPress={() => adjustMonthDay(-1)}
              style={styles.stepperBtn}
              hitSlop={6}
            >
              <Ionicons name="remove" size={20} color={tokens.text.hi} />
            </Pressable>
            <View style={styles.stepperValueWrap}>
              <Text style={styles.stepperValue}>{recurrence.day}</Text>
            </View>
            <Pressable
              onPress={() => adjustMonthDay(1)}
              style={styles.stepperBtn}
              hitSlop={6}
            >
              <Ionicons name="add" size={20} color={tokens.text.hi} />
            </Pressable>
          </View>
          {recurrence.day >= 29 && (
            <Text style={styles.helperText}>
              Months without day {recurrence.day} will skip silently.
            </Text>
          )}
        </View>
      )}

      {/* target count — only for non-one_shot */}
      {recurrence.type !== 'one_shot' && (
        <View style={styles.subBlock}>
          <Text style={styles.subLabel}>Times per occurrence</Text>
          <View style={styles.stepperRow}>
            <Pressable
              onPress={() => adjustTarget(-1)}
              style={styles.stepperBtn}
              hitSlop={6}
            >
              <Ionicons name="remove" size={20} color={tokens.text.hi} />
            </Pressable>
            <TextInput
              value={String(targetCount)}
              onChangeText={(v) => {
                const n = parseInt(v.replace(/[^0-9]/g, ''), 10);
                if (Number.isFinite(n) && n >= 1 && n <= 20) onChangeTargetCount(n);
              }}
              keyboardType="number-pad"
              style={styles.stepperInput}
            />
            <Pressable
              onPress={() => adjustTarget(1)}
              style={styles.stepperBtn}
              hitSlop={6}
            >
              <Ionicons name="add" size={20} color={tokens.text.hi} />
            </Pressable>
          </View>
          {targetCount > 1 && (
            <Text style={styles.helperText}>
              {targetCount}× per {recurrence.type === 'daily' ? 'day' : recurrence.type === 'weekly' ? 'scheduled day' : 'month'}
              .
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: tokens.space[3],
  },
  typeRow: {
    flexDirection: 'row',
    gap: tokens.space[2],
    flexWrap: 'wrap',
  },
  typeCell: {
    flex: 1,
    minWidth: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: tokens.space[3],
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.border.base,
    backgroundColor: tokens.bg.surface,
  },
  typeCellSelected: {
    borderColor: tokens.brand.violet2,
    backgroundColor: 'rgba(123, 92, 255, 0.16)',
  },
  typeLabel: {
    ...tokens.type.caption,
    fontFamily: 'Manrope_700Bold',
  },
  subBlock: {
    gap: tokens.space[2],
  },
  subLabel: {
    ...tokens.type.caption,
    color: tokens.text.mid,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dowRow: {
    flexDirection: 'row',
    gap: 6,
  },
  dowCell: {
    flex: 1,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.border.base,
    backgroundColor: tokens.bg.surface,
  },
  dowCellSelected: {
    borderColor: tokens.brand.violet2,
    backgroundColor: tokens.brand.violet,
  },
  dowLabel: {
    ...tokens.type.body,
    fontFamily: 'Manrope_700Bold',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
  },
  stepperBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: tokens.bg.surface,
    borderWidth: 1,
    borderColor: tokens.border.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValueWrap: {
    flex: 1,
    backgroundColor: tokens.bg.surface,
    borderWidth: 1,
    borderColor: tokens.border.base,
    borderRadius: tokens.radius.md,
    paddingVertical: tokens.space[3],
    alignItems: 'center',
  },
  stepperValue: {
    ...tokens.type.h3,
    color: tokens.text.hi,
  },
  stepperInput: {
    flex: 1,
    backgroundColor: tokens.bg.surface,
    borderWidth: 1,
    borderColor: tokens.border.base,
    borderRadius: tokens.radius.md,
    paddingVertical: tokens.space[3],
    color: tokens.text.hi,
    textAlign: 'center',
    ...tokens.type.h3,
  },
  helperText: {
    ...tokens.type.caption,
    color: tokens.text.dim,
  },
});
