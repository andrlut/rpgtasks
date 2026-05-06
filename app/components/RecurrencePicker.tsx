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

const TYPE_OPTIONS: {
  type: RecurrenceType;
  label: string;
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
}[] = [
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
      return { type: 'weekly' }; // no schedule by default — flex N/week
    case 'monthly':
      return { type: 'monthly' }; // no schedule by default — flex N/month
  }
}

function targetLabelFor(type: RecurrenceType): string {
  switch (type) {
    case 'daily':
      return 'Times per day';
    case 'weekly':
      return 'Times per week';
    case 'monthly':
      return 'Times per month';
    default:
      return 'Times';
  }
}

/**
 * Picks how often a task runs. Three concepts:
 *   - Type: one_shot / daily / weekly / monthly
 *   - Target count: how many times per period (always shown except one_shot)
 *   - Optional schedule: for weekly/monthly, OPTIONAL day(s) that promote
 *     the task into Today. Without schedule, task lives only in This Week
 *     / This Month — pure cadence.
 */
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
    const set = new Set(recurrence.days ?? []);
    if (set.has(idx)) set.delete(idx);
    else set.add(idx);
    const days = Array.from(set).sort((a, b) => a - b);
    onChange(days.length > 0 ? { type: 'weekly', days } : { type: 'weekly' });
  };

  const setMonthlyDay = (day: number | null) => {
    if (recurrence.type !== 'monthly') return;
    if (day === null) onChange({ type: 'monthly' });
    else onChange({ type: 'monthly', day: Math.max(1, Math.min(31, day)) });
  };

  const adjustMonthDay = (delta: number) => {
    if (recurrence.type !== 'monthly') return;
    const cur = recurrence.day ?? 1;
    setMonthlyDay(Math.max(1, Math.min(31, cur + delta)));
  };

  const adjustTarget = (delta: number) => {
    const next = Math.max(1, Math.min(99, targetCount + delta));
    onChangeTargetCount(next);
  };

  const weeklyDays = recurrence.type === 'weekly' ? (recurrence.days ?? []) : [];
  const monthlyDay = recurrence.type === 'monthly' ? recurrence.day : undefined;

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

      {/* target count — for any non-one_shot */}
      {recurrence.type !== 'one_shot' && (
        <View style={styles.subBlock}>
          <Text style={styles.subLabel}>{targetLabelFor(recurrence.type)}</Text>
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
                if (Number.isFinite(n) && n >= 1 && n <= 99) onChangeTargetCount(n);
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
        </View>
      )}

      {/* weekly schedule (optional) */}
      {recurrence.type === 'weekly' && (
        <View style={styles.subBlock}>
          <View style={styles.scheduleHeader}>
            <Text style={styles.subLabel}>Specific days (optional)</Text>
            {weeklyDays.length > 0 && (
              <Pressable
                onPress={() => onChange({ type: 'weekly' })}
                hitSlop={6}
              >
                <Text style={styles.clearBtn}>Clear</Text>
              </Pressable>
            )}
          </View>
          <Text style={styles.helperText}>
            Picked days surface in Today as a reminder. Leave empty for
            pure {targetCount}×/week with no day preference.
          </Text>
          <View style={styles.dowRow}>
            {WEEKDAYS.map((d) => {
              const selected = weeklyDays.includes(d.idx);
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

      {/* monthly schedule (optional) */}
      {recurrence.type === 'monthly' && (
        <View style={styles.subBlock}>
          <View style={styles.scheduleHeader}>
            <Text style={styles.subLabel}>Specific day (optional)</Text>
            {monthlyDay !== undefined && (
              <Pressable onPress={() => setMonthlyDay(null)} hitSlop={6}>
                <Text style={styles.clearBtn}>Clear</Text>
              </Pressable>
            )}
          </View>
          {monthlyDay === undefined ? (
            <Pressable
              onPress={() => setMonthlyDay(1)}
              style={styles.setDayBtn}
            >
              <Ionicons name="add" size={16} color={tokens.brand.violet2} />
              <Text style={styles.setDayText}>Pick a day</Text>
            </Pressable>
          ) : (
            <>
              <View style={styles.stepperRow}>
                <Pressable
                  onPress={() => adjustMonthDay(-1)}
                  style={styles.stepperBtn}
                  hitSlop={6}
                >
                  <Ionicons name="remove" size={20} color={tokens.text.hi} />
                </Pressable>
                <View style={styles.stepperValueWrap}>
                  <Text style={styles.stepperValue}>Day {monthlyDay}</Text>
                </View>
                <Pressable
                  onPress={() => adjustMonthDay(1)}
                  style={styles.stepperBtn}
                  hitSlop={6}
                >
                  <Ionicons name="add" size={20} color={tokens.text.hi} />
                </Pressable>
              </View>
              {monthlyDay >= 29 && (
                <Text style={styles.helperText}>
                  Months without day {monthlyDay} will skip silently.
                </Text>
              )}
            </>
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
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clearBtn: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    color: tokens.brand.violet2,
    letterSpacing: 0.4,
  },
  setDayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: tokens.space[3],
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: tokens.border.strong,
    backgroundColor: tokens.bg.surface,
  },
  setDayText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: tokens.brand.violet2,
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
