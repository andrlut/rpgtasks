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
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    if (!affordable) return;
    scale.value = withSpring(0.9, tokens.motion.springSnappy);
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

      <Animated.View
        style={[
          styles.redeemWrap,
          affordable && tokens.shadow.coinGlow,
          buttonStyle,
        ]}
      >
        <Pressable
          onPress={onRedeem}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={!affordable || isRedeeming}
          hitSlop={6}
          style={[styles.redeemButton, !affordable && styles.redeemButtonDisabled]}
        >
          {affordable ? (
            <>
              <LinearGradient
                colors={tokens.gradient.coinBtn}
                locations={tokens.gradient.coinBtnLocations}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.redeemButtonShine} />
              <Ionicons name="gift" size={20} color="#3D2A00" />
            </>
          ) : (
            <Ionicons name="lock-closed" size={20} color={tokens.text.dim} />
          )}
        </Pressable>
      </Animated.View>
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
  redeemWrap: {
    borderRadius: 22,
  },
  redeemButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  redeemButtonShine: {
    position: 'absolute',
    top: 1,
    left: 1,
    right: 1,
    height: 10,
    borderTopLeftRadius: 21,
    borderTopRightRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  redeemButtonDisabled: {
    backgroundColor: tokens.bg.surface2,
    borderColor: tokens.border.base,
  },
});
