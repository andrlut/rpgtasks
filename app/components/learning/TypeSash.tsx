import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import type { LearningMaterialType } from '@/lib/db/types';
import { useT } from '@/lib/i18n';
import { tokens } from '@/theme';

/**
 * Tiny diagonal-corner badge surfacing the material type on a book cover.
 * Each type gets a distinct color + glyph so the user can tell explainer
 * vs summary vs news at a glance without tapping in.
 *
 * Positioned absolute top-left of the cover; not interactive — filtering
 * by type happens via the LearningStatsPanel.
 */
const TYPE_META: Record<
  LearningMaterialType,
  { color: string; glyph: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap }
> = {
  explainer: { color: tokens.brand.violet2, glyph: 'book' },
  summary: { color: tokens.semantic.coin, glyph: 'bookmark' },
  news: { color: tokens.dimension.bonds, glyph: 'flash' },
};

interface Props {
  type: LearningMaterialType;
}

export function TypeSash({ type }: Props) {
  const { t } = useT();
  const m = TYPE_META[type];
  return (
    <View style={[styles.sash, { borderColor: m.color + '99' }]}>
      <Ionicons name={m.glyph} size={10} color={m.color} />
      <Text style={[styles.label, { color: m.color }]}>
        {t(`learning.type.${type}`)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sash: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(10, 14, 38, 0.78)',
    borderWidth: 1,
  },
  label: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 9,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
