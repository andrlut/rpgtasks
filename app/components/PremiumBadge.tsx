import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { useT } from '@/lib/i18n';
import { tokens } from '@/theme';

interface Props {
  /** Optional size tweak — 'sm' for inline-with-title, 'md' default. */
  size?: 'sm' | 'md';
}

/**
 * Gold "Premium" pill. Purely cosmetic — shown when the user's
 * `profile.subscription_tier === 'premium'`. Callers gate on the tier;
 * this component just renders the badge.
 */
export function PremiumBadge({ size = 'md' }: Props) {
  const { t } = useT();
  const sm = size === 'sm';
  return (
    <LinearGradient
      colors={[tokens.semantic.coin2, tokens.semantic.coin, tokens.semantic.coinDeep]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.pill, sm && styles.pillSm]}
    >
      <View style={styles.inner}>
        <Ionicons name="star" size={sm ? 10 : 12} color={tokens.bg.deep} />
        <Text style={[styles.label, sm && styles.labelSm]}>{t('premium.badge')}</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: tokens.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  pillSm: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 12,
    letterSpacing: 0.4,
    color: tokens.bg.deep,
  },
  labelSm: {
    fontSize: 10,
  },
});
