import { StyleSheet, Text, View } from 'react-native';

import { tokens } from '@/theme';

export type AnchorVariant = 'low' | 'mid' | 'high';

const VARIANT_META: Record<
  AnchorVariant,
  { label: string; range: string; tint: string }
> = {
  low: { label: 'Baixo', range: '0–1', tint: tokens.semantic.warn },
  mid: { label: 'Médio', range: '2–3', tint: tokens.text.mid },
  high: { label: 'Alto', range: '4–5', tint: tokens.semantic.xp2 },
};

const EN_LABELS: Record<AnchorVariant, string> = {
  low: 'Low',
  mid: 'Mid',
  high: 'High',
};

interface Props {
  variant: AnchorVariant;
  text: string;
  /** Override label text (defaults to PT). Pass `EN_LABELS[variant]` for en. */
  label?: string;
}

/**
 * Small card that surfaces the day-to-day signs at one rung of a sub's
 * scale. Used in the SubPanel "Ver detalhes" expansion and in the
 * permanent glossary screen at /sub/[id]. Tone is mostly neutral: a thin
 * accent strip on the left in the variant's tint, no big colored
 * backgrounds — these are meant to be read, not decorate.
 */
export function SubAnchorCard({ variant, text, label }: Props) {
  const meta = VARIANT_META[variant];
  return (
    <View style={[styles.card, { borderLeftColor: meta.tint }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.label, { color: meta.tint }]}>
          {(label ?? meta.label).toUpperCase()}
        </Text>
        <Text style={styles.range}>{meta.range}</Text>
      </View>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

export const SubAnchorCardLabels = { en: EN_LABELS };

const styles = StyleSheet.create({
  card: {
    borderRadius: tokens.radius.sm,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderLeftWidth: 3,
    paddingHorizontal: tokens.space[3],
    paddingVertical: tokens.space[3],
    gap: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  label: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    letterSpacing: 1.3,
  },
  range: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    color: tokens.text.dim,
    letterSpacing: 0.5,
  },
  text: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    lineHeight: 19,
    color: tokens.text.base,
  },
});
