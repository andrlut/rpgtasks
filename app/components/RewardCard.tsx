import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Reward } from '@/lib/db/types';
import { tokens } from '@/theme';
import { REWARD_CATEGORY_META } from '@/theme/rewards';

interface Props {
  reward: Reward;
  affordable: boolean;
  onRedeem: () => void;
  onEdit?: () => void;
  onLongPress?: () => void;
  isRedeeming?: boolean;
}

export function RewardCard({
  reward,
  affordable,
  onRedeem,
  onEdit,
  onLongPress,
  isRedeeming,
}: Props) {
  const cat = REWARD_CATEGORY_META[reward.category];
  return (
    <View style={[styles.container, !affordable && styles.containerLocked]}>
      <Pressable
        style={({ pressed }) => [styles.body, pressed && onEdit && { opacity: 0.7 }]}
        onPress={onEdit}
        onLongPress={onLongPress}
        disabled={!onEdit && !onLongPress}
      >
        <View style={[styles.iconWrap, { backgroundColor: cat.bg }]}>
          <Ionicons name={reward.icon as never} size={20} color={cat.color} />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text style={styles.title} numberOfLines={1}>
            {reward.title}
          </Text>
          {reward.description ? (
            <Text style={styles.subtitle} numberOfLines={2}>
              {reward.description}
            </Text>
          ) : null}
          <View style={styles.costRow}>
            <Ionicons name="ellipse" size={10} color={tokens.semantic.coin} />
            <Text style={styles.cost}>{reward.cost.toLocaleString()}</Text>
          </View>
        </View>
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.redeemButton,
          !affordable && styles.redeemButtonDisabled,
          (pressed || isRedeeming) && affordable && styles.redeemButtonPressed,
        ]}
        onPress={onRedeem}
        disabled={!affordable || isRedeeming}
        hitSlop={6}
      >
        <Ionicons
          name={affordable ? 'gift' : 'lock-closed'}
          size={20}
          color={affordable ? tokens.text.hi : tokens.text.dim}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    padding: tokens.space[4],
    backgroundColor: tokens.bg.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.border.base,
  },
  containerLocked: {
    opacity: 0.6,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    flex: 1,
    minWidth: 0,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
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
    gap: 4,
    marginTop: 4,
  },
  cost: {
    ...tokens.type.caption,
    color: tokens.semantic.coin,
    fontFamily: 'Manrope_700Bold',
  },
  redeemButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: tokens.semantic.coin,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: tokens.semantic.coin,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  redeemButtonDisabled: {
    backgroundColor: tokens.bg.surface2,
    shadowOpacity: 0,
    elevation: 0,
  },
  redeemButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
});
