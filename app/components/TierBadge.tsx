import { StyleSheet, Text, View } from 'react-native';

import type { TierName } from '@/lib/db/types';
import { tokens } from '@/theme';

const TIER_VISUAL: Record<
  TierName,
  { bg: string; border: string; text: string; label: string }
> = {
  beginner: {
    bg: 'rgba(142, 148, 196, 0.18)',
    border: 'rgba(142, 148, 196, 0.4)',
    text: tokens.tier.beginner,
    label: 'Beginner',
  },
  bronze: {
    bg: 'rgba(230, 149, 89, 0.18)',
    border: 'rgba(230, 149, 89, 0.55)',
    text: tokens.tier.bronze1,
    label: 'Bronze',
  },
  silver: {
    bg: 'rgba(232, 236, 255, 0.12)',
    border: 'rgba(232, 236, 255, 0.4)',
    text: tokens.tier.silver1,
    label: 'Silver',
  },
  gold: {
    bg: 'rgba(255, 224, 138, 0.18)',
    border: 'rgba(255, 224, 138, 0.5)',
    text: tokens.tier.gold1,
    label: 'Gold',
  },
  master: {
    bg: 'rgba(194, 161, 255, 0.18)',
    border: 'rgba(194, 161, 255, 0.55)',
    text: tokens.tier.master1,
    label: 'Master',
  },
};

interface Props {
  tier: TierName;
  size?: 'sm' | 'md' | 'lg';
}

export function TierBadge({ tier, size = 'md' }: Props) {
  const visual = TIER_VISUAL[tier];
  const dims =
    size === 'sm'
      ? { paddingX: 8, paddingY: 2, fontSize: 10 }
      : size === 'lg'
      ? { paddingX: 12, paddingY: 6, fontSize: 14 }
      : { paddingX: 10, paddingY: 3, fontSize: 11 };

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: visual.bg,
          borderColor: visual.border,
          paddingHorizontal: dims.paddingX,
          paddingVertical: dims.paddingY,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: visual.text, fontSize: dims.fontSize },
        ]}
      >
        {visual.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontFamily: 'Manrope_800ExtraBold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
