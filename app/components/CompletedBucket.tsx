import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { LayoutAnimation, Pressable, StyleSheet, Text, View } from 'react-native';

import { useMetaLookup } from '@/lib/i18n/meta';
import type { TaskWithSubs } from '@/lib/db/types';
import { tokens } from '@/theme';

export interface CompletedItem {
  task: TaskWithSubs;
  /** When provided, the row becomes tappable and calls `onUndo(completionId)`. */
  completionId?: string;
}

type Variant = 'completed' | 'skipped';

interface Props {
  items: CompletedItem[];
  title: string;
  /** Visual + behavior mode. Defaults to 'completed' (strikethrough + undo). */
  variant?: Variant;
  /** Tap a row → undo that completion. Receives the row's `completionId`. */
  onUndo?: (completionId: string) => void;
  /** Tap a row → unskip that task. Receives the row's `task.id`. */
  onUnskip?: (taskId: string) => void;
  /**
   * Tap the "+1" pill → log another completion of this task with the
   * defaults. Only renders on the 'completed' variant; the pill is
   * tap-target-distinct from the row body (which still triggers undo
   * via long-press or tap depending on caller wiring). When omitted,
   * no pill renders and the row behaves like before.
   */
  onExtra?: (task: TaskWithSubs) => void;
}

/**
 * Collapsible "today's activity" group rendered inside each Home tab.
 * Header is always visible (title + count chip); body is hidden by default
 * and expands on tap with a layout animation.
 *
 * Two variants:
 *   - 'completed' (default): rows show strikethrough; tapping calls
 *     onUndo(completionId) when both are present.
 *   - 'skipped': no strikethrough; tapping calls onUnskip(task.id) when
 *     onUnskip is provided.
 *
 * Renders nothing when `items` is empty — callers don't need to guard.
 */
export function CompletedBucket({
  items,
  title,
  variant = 'completed',
  onUndo,
  onUnskip,
  onExtra,
}: Props) {
  const [open, setOpen] = useState(false);
  const meta = useMetaLookup();

  if (items.length === 0) return null;

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((v) => !v);
  };

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={toggle}
        style={({ pressed }) => [
          styles.header,
          open && styles.headerOpen,
          pressed && { opacity: 0.85 },
        ]}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <View style={styles.headerLeft}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.countChip}>
            <Text style={styles.countText}>{items.length}</Text>
          </View>
        </View>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={tokens.text.dim}
        />
      </Pressable>

      {open && (
        <View style={styles.body}>
          {items.map((item, idx) => {
            const dim = meta.dim(item.task.primary_dimension_id);
            const isSkipped = variant === 'skipped';
            const canTap = isSkipped
              ? !!onUnskip
              : !!(onUndo && item.completionId);
            const defaultIcon = isSkipped
              ? 'play-skip-forward-outline'
              : 'checkmark';
            const defaultIconColor = isSkipped
              ? tokens.text.dim
              : tokens.brand.violet2;
            return (
              <Pressable
                key={item.task.id}
                disabled={!canTap}
                onPress={() => {
                  if (!canTap) return;
                  if (isSkipped) {
                    onUnskip!(item.task.id);
                  } else if (item.completionId) {
                    onUndo!(item.completionId);
                  }
                }}
                style={({ pressed }) => [
                  styles.row,
                  idx === items.length - 1 && styles.rowLast,
                  pressed && canTap && { opacity: 0.85, backgroundColor: tokens.bg.surface2 },
                ]}
                accessibilityRole={canTap ? 'button' : 'text'}
                accessibilityLabel={
                  canTap
                    ? isSkipped
                      ? `Unskip ${item.task.title}`
                      : `Undo completion of ${item.task.title}`
                    : item.task.title
                }
              >
                <View
                  style={[
                    styles.dimDot,
                    { backgroundColor: dim.bg },
                  ]}
                >
                  <Ionicons
                    name={dim.iconName as never}
                    size={14}
                    color={dim.color}
                  />
                </View>
                <Text
                  style={[styles.taskTitle, isSkipped && styles.taskTitleSkipped]}
                  numberOfLines={1}
                >
                  {item.task.title}
                </Text>
                {/* +1 extra pill — only on the completed variant when
                    onExtra is wired. Tap target is distinct from the
                    row body so the user can log an extra without
                    accidentally undoing the original completion. */}
                {!isSkipped && onExtra && (
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      onExtra(item.task);
                    }}
                    hitSlop={6}
                    style={({ pressed }) => [
                      styles.extraPill,
                      pressed && styles.extraPillPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Log another completion of ${item.task.title}`}
                  >
                    <Ionicons
                      name="add"
                      size={11}
                      color={tokens.semantic.xp}
                    />
                    <Text style={styles.extraPillText}>1</Text>
                  </Pressable>
                )}
                <Ionicons
                  name={canTap ? 'arrow-undo' : defaultIcon}
                  size={14}
                  color={canTap ? tokens.text.mid : defaultIconColor}
                />
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: tokens.space[3],
    marginTop: tokens.space[2],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.space[3],
    paddingVertical: tokens.space[3],
    backgroundColor: tokens.bg.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.border.base,
  },
  headerOpen: {
    borderRadius: 0,
    borderTopLeftRadius: tokens.radius.lg,
    borderTopRightRadius: tokens.radius.lg,
    borderBottomColor: 'transparent',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
  },
  title: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 12,
    color: tokens.text.mid,
  },
  countChip: {
    backgroundColor: tokens.bg.surface2,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: tokens.border.base,
  },
  countText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    color: tokens.semantic.xp,
  },
  body: {
    backgroundColor: tokens.bg.surface,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: tokens.border.base,
    borderBottomLeftRadius: tokens.radius.lg,
    borderBottomRightRadius: tokens.radius.lg,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    paddingHorizontal: tokens.space[3],
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: tokens.border.base,
    opacity: 0.65,
  },
  extraPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(61, 214, 140, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(61, 214, 140, 0.35)',
  },
  extraPillPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.94 }],
  },
  extraPillText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
    color: tokens.semantic.xp,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  dimDot: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskTitle: {
    flex: 1,
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    color: tokens.text.hi,
    textDecorationLine: 'line-through',
  },
  taskTitleSkipped: {
    textDecorationLine: 'none',
    color: tokens.text.mid,
  },
});
