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

interface Props {
  items: CompletedItem[];
  title: string;
  /** Tap a row → undo that completion. Receives the row's `completionId`. */
  onUndo?: (completionId: string) => void;
}

/**
 * Collapsible "completed in this bucket" group rendered at the end of each
 * Home tab. Header is always visible (title + count chip); body is hidden
 * by default and expands on tap with a layout animation.
 *
 * When `onUndo` is provided and a row has a `completionId`, tapping the row
 * triggers an undo. Otherwise rows are non-interactive.
 *
 * Renders nothing when `items` is empty — callers don't need to guard.
 */
export function CompletedBucket({ items, title, onUndo }: Props) {
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
            const canUndo = !!(onUndo && item.completionId);
            return (
              <Pressable
                key={item.task.id}
                disabled={!canUndo}
                onPress={() => {
                  if (canUndo && item.completionId) onUndo!(item.completionId);
                }}
                style={({ pressed }) => [
                  styles.row,
                  idx === items.length - 1 && styles.rowLast,
                  pressed && canUndo && { opacity: 0.85, backgroundColor: tokens.bg.surface2 },
                ]}
                accessibilityRole={canUndo ? 'button' : 'text'}
                accessibilityLabel={
                  canUndo ? `Undo completion of ${item.task.title}` : item.task.title
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
                <Text style={styles.taskTitle} numberOfLines={1}>
                  {item.task.title}
                </Text>
                <Ionicons
                  name={canUndo ? 'arrow-undo' : 'checkmark'}
                  size={14}
                  color={canUndo ? tokens.text.mid : tokens.brand.violet2}
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
});
