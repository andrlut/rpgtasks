import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { TaskSub, TaskWithSubs } from '@/lib/db/types';
import { rewardForTaskSubs } from '@/lib/xp';
import { tokens } from '@/theme';
import { DIMENSION_META, SUB_META } from '@/theme/dimensions';

import { CoinIcon } from './CoinIcon';

interface Props {
  visible: boolean;
  task: TaskWithSubs | null;
  streakDays?: number;
  onCancel: () => void;
  onConfirm: (subs: TaskSub[]) => void;
}

/**
 * Bottom-sheet popup that lets the user adjust per-sub stars at completion
 * time before logging. Opens via long-press on the task's check button.
 *
 * Each sub the task touches gets a stepper [− N ★ +]. Per-sub stars cap
 * at 5; no total cap (the exponential XP curve self-regulates). Reset
 * returns to defaults.
 *
 * Confirming sends the adjusted (sub_id, stars) array as the override
 * payload to complete_task.
 */
export function CompleteTaskSheet({
  visible,
  task,
  streakDays = 0,
  onCancel,
  onConfirm,
}: Props) {
  const [draft, setDraft] = useState<TaskSub[]>([]);

  // Reset draft each time we open with a new task.
  useEffect(() => {
    if (visible && task) {
      setDraft(task.subs.map((s) => ({ sub_id: s.sub_id, stars: s.stars })));
    }
  }, [visible, task]);

  const totalStars = useMemo(
    () => draft.reduce((s, x) => s + x.stars, 0),
    [draft],
  );

  const reward = useMemo(
    () => rewardForTaskSubs(draft, streakDays),
    [draft, streakDays],
  );

  if (!task) return null;

  const adjust = (subId: string, delta: 1 | -1) => {
    setDraft((prev) => {
      const cur = prev.find((p) => p.sub_id === subId)?.stars ?? 0;
      const next = cur + delta;
      if (next < 1 || next > 5) return prev;
      return prev.map((p) =>
        p.sub_id === subId ? { ...p, stars: next as TaskSub['stars'] } : p,
      );
    });
  };

  const reset = () => {
    setDraft(task.subs.map((s) => ({ sub_id: s.sub_id, stars: s.stars })));
  };

  const confirm = () => {
    onConfirm(draft);
  };

  const isDirty =
    draft.length !== task.subs.length ||
    draft.some((d, i) => task.subs[i]?.stars !== d.stars);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.scrim} onPress={onCancel}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.eyebrow}>ADJUST STARS · {task.title.toUpperCase()}</Text>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total stars</Text>
            <Text style={styles.totalValue}>{totalStars}★</Text>
          </View>

          {draft.map((s) => {
            const subMeta = SUB_META[s.sub_id];
            const dim = subMeta ? DIMENSION_META[subMeta.dimensionId] : null;
            const color = dim?.color ?? tokens.brand.violet2;
            const canDec = s.stars > 1;
            const canInc = s.stars < 5;
            return (
              <View key={s.sub_id} style={styles.subRow}>
                <View
                  style={[
                    styles.subIcon,
                    {
                      backgroundColor: dim?.bg ?? tokens.bg.surface,
                      borderColor: color + '55',
                    },
                  ]}
                >
                  {subMeta && (
                    <Ionicons
                      name={subMeta.iconName as never}
                      size={16}
                      color={color}
                    />
                  )}
                </View>
                <View style={styles.subBody}>
                  <Text style={styles.subLabel}>
                    {subMeta?.label ?? s.sub_id}
                  </Text>
                  {dim && (
                    <Text style={[styles.subDim, { color }]}>
                      {dim.label.toUpperCase()}
                    </Text>
                  )}
                </View>
                <View style={styles.stepper}>
                  <Pressable
                    onPress={() => adjust(s.sub_id, -1)}
                    disabled={!canDec}
                    style={({ pressed }) => [
                      styles.stepperBtn,
                      !canDec && styles.stepperBtnDisabled,
                      pressed && canDec && { opacity: 0.6 },
                    ]}
                    hitSlop={6}
                  >
                    <Ionicons
                      name="remove"
                      size={16}
                      color={canDec ? tokens.text.hi : tokens.text.faint}
                    />
                  </Pressable>
                  <View style={styles.starsBox}>
                    <Text style={[styles.starsValue, { color }]}>
                      {s.stars}
                    </Text>
                    <Text style={[styles.starsGlyph, { color }]}>★</Text>
                  </View>
                  <Pressable
                    onPress={() => adjust(s.sub_id, 1)}
                    disabled={!canInc}
                    style={({ pressed }) => [
                      styles.stepperBtn,
                      !canInc && styles.stepperBtnDisabled,
                      pressed && canInc && { opacity: 0.6 },
                    ]}
                    hitSlop={6}
                  >
                    <Ionicons
                      name="add"
                      size={16}
                      color={canInc ? tokens.text.hi : tokens.text.faint}
                    />
                  </Pressable>
                </View>
              </View>
            );
          })}

          <View style={styles.divider} />

          <View style={styles.rewardRow}>
            <View style={styles.rewardItem}>
              <Ionicons name="flag" size={14} color={tokens.semantic.xp} />
              <Text style={[styles.rewardText, { color: tokens.semantic.xp }]}>
                +{reward.total.xp} XP
              </Text>
            </View>
            <View style={styles.rewardItem}>
              <CoinIcon size={14} />
              <Text style={[styles.rewardText, { color: tokens.semantic.coin }]}>
                +{reward.total.coins}
              </Text>
            </View>
            <View style={{ flex: 1 }} />
            {isDirty && (
              <Pressable
                onPress={reset}
                hitSlop={6}
                style={({ pressed }) => [
                  styles.resetBtn,
                  pressed && { opacity: 0.6 },
                ]}
              >
                <Ionicons name="refresh" size={12} color={tokens.text.dim} />
                <Text style={styles.resetText}>Reset</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.actionsRow}>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [
                styles.cancelBtn,
                pressed && { opacity: 0.6 },
              ]}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={confirm}
              style={({ pressed }) => [
                styles.confirmBtn,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={styles.confirmText}>Log</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: tokens.bg.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: tokens.space[4],
    paddingBottom: tokens.space[6],
    gap: tokens.space[3],
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: tokens.border.strong,
    alignSelf: 'center',
    marginBottom: 4,
  },
  eyebrow: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    letterSpacing: 1.4,
    color: tokens.text.mid,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  totalLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    color: tokens.text.dim,
    letterSpacing: 0.4,
  },
  totalValue: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 22,
    color: tokens.text.hi,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  subIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subBody: {
    flex: 1,
    minWidth: 0,
  },
  subLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: tokens.text.hi,
  },
  subDim: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 9,
    letterSpacing: 0.6,
    marginTop: 2,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: tokens.bg.base,
    borderWidth: 1,
    borderColor: tokens.border.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnDisabled: {
    opacity: 0.4,
  },
  starsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minWidth: 40,
    justifyContent: 'center',
  },
  starsValue: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 18,
  },
  starsGlyph: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
  },
  divider: {
    height: 1,
    backgroundColor: tokens.border.divider,
    marginVertical: 4,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rewardText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 13,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resetText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    color: tokens.text.dim,
    letterSpacing: 0.4,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: tokens.bg.base,
    borderWidth: 1,
    borderColor: tokens.border.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: tokens.text.hi,
  },
  confirmBtn: {
    flex: 2,
    height: 48,
    borderRadius: 12,
    backgroundColor: tokens.brand.violet,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  confirmText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 14,
    color: '#fff',
    letterSpacing: 0.4,
  },
});
