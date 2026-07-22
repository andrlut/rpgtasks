import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { MoodTag } from '@/lib/db/types';
import { useT } from '@/lib/i18n';
import { tokens } from '@/theme';

interface Props {
  /** Pre-filtered, pre-ordered tags to render (the screen owns the list). */
  tags: MoodTag[];
  selected: string[];
  onToggle: (slug: string) => void;
  /**
   * Appended as a last pseudo-chip — the "show all (24)" / "show fewer"
   * toggle of the emotion section. Omitted → no trailing chip.
   */
  trailingAction?: { label: string; onPress: () => void };
}

/**
 * Optional, single-tap tag chips. Toggling a chip never gates save — it's a
 * vocabulary aid, not data entry. Labels come from the bilingual mood_tag
 * catalog (client picks the column by locale). Dumb by design: ordering and
 * grouping (emotion vs. context, valence-adaptive sort) live in the caller.
 */
export function MoodTagRow({ tags, selected, onToggle, trailingAction }: Props) {
  const { locale } = useT();

  if (tags.length === 0) return null;

  return (
    <View style={styles.wrap}>
      {tags.map((tag) => {
        const active = selected.includes(tag.slug);
        const label = locale === 'en' ? tag.label_en : tag.label_pt;
        return (
          <Pressable
            key={tag.slug}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              onToggle(tag.slug);
            }}
            style={({ pressed }) => [
              styles.chip,
              active && styles.chipActive,
              pressed && { opacity: 0.7 },
            ]}
            hitSlop={2}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={label}
          >
            {tag.emoji ? <Text style={styles.emoji}>{tag.emoji}</Text> : null}
            <Text style={[styles.label, active && styles.labelActive]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
      {trailingAction && (
        <Pressable
          onPress={trailingAction.onPress}
          style={({ pressed }) => [styles.moreChip, pressed && { opacity: 0.7 }]}
          hitSlop={2}
          accessibilityRole="button"
        >
          <Text style={styles.moreLabel}>{trailingAction.label}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.border.base,
    backgroundColor: tokens.bg.surface,
  },
  chipActive: {
    borderColor: tokens.brand.violet2,
    backgroundColor: 'rgba(123, 92, 255, 0.16)',
  },
  emoji: {
    fontSize: 13,
  },
  label: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: tokens.text.mid,
  },
  labelActive: {
    fontFamily: 'Manrope_800ExtraBold',
    color: tokens.text.hi,
  },
  moreChip: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: tokens.border.strong,
  },
  moreLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: tokens.brand.violet2,
  },
});
