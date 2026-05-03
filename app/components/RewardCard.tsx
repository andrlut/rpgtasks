import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import type { Reward } from '@/lib/db/types';
import { tokens } from '@/theme';
import { REWARD_CATEGORY_META } from '@/theme/rewards';

import { CoinIcon } from './CoinIcon';

interface Props {
  reward: Reward;
  affordable: boolean;
  /** Coins still needed to afford this reward (used in the disabled button label). */
  deficit?: number;
  onRedeem: () => void;
  onEdit?: () => void;
  onLongPress?: () => void;
  isRedeeming?: boolean;
}

/**
 * Vertical 2-column reward card. Top: icon tile + title + cost.
 * Bottom: full-width REDEEM button (gold gradient when affordable, dim with
 * "NEEDS X" message when not).
 */
export function RewardCard({
  reward,
  affordable,
  deficit,
  onRedeem,
  onEdit,
  onLongPress,
  isRedeeming,
}: Props) {
  const cat = REWARD_CATEGORY_META[reward.category];
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    if (!affordable) return;
    scale.value = withSpring(0.96, tokens.motion.springSnappy);
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, tokens.motion.springBouncy);
  };
  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={[styles.container, !affordable && styles.containerLocked]}>
      <Pressable
        style={({ pressed }) => [styles.body, pressed && onEdit && { opacity: 0.7 }]}
        onPress={onEdit}
        onLongPress={onLongPress}
        disabled={!onEdit && !onLongPress}
      >
        {!affordable && (
          <View style={styles.lockBadge} pointerEvents="none">
            <Ionicons name="lock-closed" size={12} color={tokens.text.dim} />
          </View>
        )}
        <View style={[styles.iconWrap, { backgroundColor: cat.bg }]}>
          <Ionicons name={reward.icon as never} size={22} color={cat.color} />
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {reward.title}
        </Text>
        {reward.description ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {reward.description}
          </Text>
        ) : null}
        <View style={styles.costRow}>
          <CoinIcon size={13} />
          <Text style={[styles.cost, !affordable && { color: tokens.text.dim }]}>
            {reward.cost.toLocaleString()}
          </Text>
        </View>
      </Pressable>

      <Animated.View style={buttonStyle}>
        <Pressable
          onPress={onRedeem}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={!affordable || isRedeeming}
          hitSlop={4}
        >
          {affordable ? (
            <LinearGradient
              colors={tokens.gradient.coinBtn}
              locations={tokens.gradient.coinBtnLocations}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={[styles.redeemButton, styles.redeemAffordable]}
            >
              <Text style={styles.redeemText}>BUY</Text>
            </LinearGradient>
          ) : (
            <View style={[styles.redeemButton, styles.redeemDisabled]}>
              <Text style={styles.redeemDisabledText}>
                {deficit !== undefined
                  ? `NEEDS ${deficit.toLocaleString()}`
                  : 'LOCKED'}
              </Text>
            </View>
          )}
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: tokens.bg.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.border.base,
    padding: tokens.space[4],
    gap: tokens.space[2],
    minHeight: 168,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  containerLocked: {
    opacity: 0.78,
  },
  body: {
    gap: 4,
  },
  lockBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    ...tokens.type.bodyLg,
    color: tokens.text.hi,
    fontFamily: 'Manrope_700Bold',
  },
  subtitle: {
    ...tokens.type.caption,
    color: tokens.text.mid,
  },
  costRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  cost: {
    ...tokens.type.body,
    color: tokens.semantic.coin,
    fontFamily: 'Manrope_800ExtraBold',
  },
  redeemButton: {
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  redeemAffordable: {
    borderWidth: 1,
    borderColor: 'rgba(255, 235, 180, 0.4)',
    shadowColor: tokens.semantic.coin,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
  },
  redeemDisabled: {
    backgroundColor: tokens.bg.surface2,
    borderWidth: 1,
    borderColor: tokens.border.base,
  },
  redeemText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 12,
    color: '#3D2A00',
    letterSpacing: 0.6,
  },
  redeemDisabledText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    color: tokens.text.dim,
    letterSpacing: 0.4,
  },
});
