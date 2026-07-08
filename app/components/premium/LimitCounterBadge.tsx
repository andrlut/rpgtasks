import { StyleSheet, Text, View } from 'react-native';

import type { EntityLimit } from '@/lib/premium';
import { tokens } from '@/theme';

/**
 * Discreet "8/10" counter for a create button. Shows only when a free user is
 * within the last ~20% of their cap (`limit.near`); renders nothing for
 * premium users or when they're well under the cap. Turns gold at the cap.
 */
export function LimitCounterBadge({ limit }: { limit: EntityLimit }) {
  if (!limit.near) return null;
  const full = limit.atLimit;
  return (
    <View style={[styles.badge, full && styles.badgeFull]}>
      <Text style={[styles.text, full && styles.textFull]}>
        {limit.count}/{limit.limit}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 34,
    height: 20,
    paddingHorizontal: 7,
    borderRadius: tokens.radius.pill,
    backgroundColor: 'rgba(155, 130, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(155, 130, 255, 0.30)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeFull: {
    backgroundColor: 'rgba(255, 200, 61, 0.14)',
    borderColor: tokens.semantic.coinRim,
  },
  text: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
    lineHeight: 13,
    letterSpacing: 0.2,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
    color: tokens.brand.violet2,
  },
  textFull: {
    color: tokens.semantic.coin2,
  },
});
