import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { tokens } from '@/theme';

export type PillarTone = 'contemplative' | 'dopaminergic' | 'ceremonious';

interface PillarCardProps {
  /** Short uppercase label — "AVALIAÇÃO", "DEDICAÇÃO", "SKILLS". */
  eyebrow: string;
  /** Lowercase question that anchors the pillar's purpose. */
  question: string;
  tone: PillarTone;
  iconName: keyof typeof Ionicons.glyphMap;
  children: ReactNode;
  /** Optional CTA at the footer — label + onPress. */
  cta?: { label: string; onPress: () => void };
}

/**
 * Shell shared by the three Hero pillars (Avaliação / Dedicação / Skills).
 *
 * Tone drives the accent color of the eyebrow + icon halo + footer CTA, so the
 * three cards read as visually distinct at a glance:
 *  - contemplative → muted violet, low contrast (Avaliação)
 *  - dopaminergic  → bright XP green (Dedicação)
 *  - ceremonious   → warm coin gold (Skills)
 *
 * Body padding stays consistent so each pillar feels like the same chassis.
 */
export function PillarCard({
  eyebrow,
  question,
  tone,
  iconName,
  children,
  cta,
}: PillarCardProps) {
  const accent = TONE[tone];
  return (
    <View style={[styles.card, { borderColor: accent.border }]}>
      <View style={styles.header}>
        <View style={[styles.iconHalo, { backgroundColor: accent.halo }]}>
          <Ionicons name={iconName} size={14} color={accent.color} />
        </View>
        <Text style={[styles.eyebrow, { color: accent.color }]}>{eyebrow}</Text>
        <View style={styles.dot} />
        <Text style={styles.question} numberOfLines={1}>
          {question}
        </Text>
      </View>
      <View style={styles.body}>{children}</View>
      {cta && (
        <Pressable
          onPress={cta.onPress}
          style={({ pressed }) => [
            styles.cta,
            { backgroundColor: accent.ctaBg, borderColor: accent.ctaBorder },
            pressed && { opacity: 0.85 },
          ]}
          hitSlop={4}
        >
          <Text style={[styles.ctaText, { color: accent.color }]}>{cta.label}</Text>
          <Ionicons name="arrow-forward" size={14} color={accent.color} />
        </Pressable>
      )}
    </View>
  );
}

const TONE: Record<
  PillarTone,
  {
    color: string;
    halo: string;
    border: string;
    ctaBg: string;
    ctaBorder: string;
  }
> = {
  contemplative: {
    color: tokens.brand.violet2,
    halo: 'rgba(155, 130, 255, 0.16)',
    border: 'rgba(155, 130, 255, 0.22)',
    ctaBg: 'rgba(123, 92, 255, 0.10)',
    ctaBorder: 'rgba(123, 92, 255, 0.30)',
  },
  dopaminergic: {
    color: tokens.semantic.xp2,
    halo: 'rgba(111, 232, 170, 0.16)',
    border: 'rgba(61, 214, 140, 0.22)',
    ctaBg: 'rgba(61, 214, 140, 0.10)',
    ctaBorder: 'rgba(61, 214, 140, 0.30)',
  },
  ceremonious: {
    color: tokens.semantic.coin,
    halo: 'rgba(255, 200, 61, 0.16)',
    border: 'rgba(255, 200, 61, 0.22)',
    ctaBg: 'rgba(255, 200, 61, 0.10)',
    ctaBorder: 'rgba(255, 200, 61, 0.30)',
  },
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: tokens.bg.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    paddingHorizontal: tokens.space[4],
    paddingTop: tokens.space[3],
    paddingBottom: tokens.space[4],
    gap: tokens.space[3],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
  },
  iconHalo: {
    width: 24,
    height: 24,
    borderRadius: tokens.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
    letterSpacing: 1.2,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: tokens.text.dim,
    opacity: 0.6,
  },
  question: {
    flex: 1,
    minWidth: 0,
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    color: tokens.text.mid,
    fontStyle: 'italic',
  },
  body: {
    gap: tokens.space[3],
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: tokens.space[3],
    borderRadius: tokens.radius.md,
    borderWidth: 1,
  },
  ctaText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 13,
    letterSpacing: 0.3,
  },
});
