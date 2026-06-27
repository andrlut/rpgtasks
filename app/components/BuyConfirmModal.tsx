import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { Reward } from '@/lib/db/types';
import { useT } from '@/lib/i18n';
import { tokens } from '@/theme';
import { REWARD_CATEGORY_META } from '@/theme/rewards';

import { CoinIcon } from './CoinIcon';

/** Server enforces 50 too — mirror it here for the UX guard. */
const MAX_QTY = 50;

interface Props {
  visible: boolean;
  reward: Reward | null;
  /** Current coin balance — drives the "Faltam X" warning and the
   *  disabled state of the primary CTA. */
  coins: number;
  /**
   * Where to start the qty counter. Defaults to 1; the long-press path
   * could pass a higher value if it ever wants to (today it doesn't).
   */
  initialQty?: number;
  onCancel: () => void;
  /** Fired with the confirmed quantity. Caller owns the actual purchase. */
  onConfirm: (qty: number) => void;
}

/**
 * Custom purchase confirmation modal — replaces the system Alert that
 * the user (rightly) found ugly. Shows the reward, a qty stepper, and
 * a live total cost. Disables the Comprar button when the user can't
 * afford the batch and surfaces the shortfall inline.
 *
 * Same visual language as BuyCelebrationModal so the user experiences
 * a coherent two-beat flow: confirm modal → success modal.
 */
export function BuyConfirmModal({
  visible,
  reward,
  coins,
  initialQty = 1,
  onCancel,
  onConfirm,
}: Props) {
  const { t } = useT();

  const [qty, setQty] = useState(initialQty);

  // Reset qty whenever the modal opens for a new reward so leftover
  // state from the last purchase doesn't surprise the user.
  useEffect(() => {
    if (visible) setQty(initialQty);
  }, [visible, initialQty, reward?.id]);

  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(20);

  useEffect(() => {
    if (visible) {
      cardOpacity.value = withTiming(1, { duration: 220 });
      cardTranslateY.value = withSpring(0, { damping: 18, stiffness: 180 });
    } else {
      cardOpacity.value = 0;
      cardTranslateY.value = 20;
    }
  }, [visible, cardOpacity, cardTranslateY]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslateY.value }],
  }));

  if (!reward) {
    return (
      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.scrim} />
      </Modal>
    );
  }

  const cat = REWARD_CATEGORY_META[reward.category];
  const total = reward.cost * qty;
  const deficit = Math.max(0, total - coins);
  const canBuy = deficit === 0;

  const bumpQty = (delta: number) => {
    const next = Math.max(1, Math.min(MAX_QTY, qty + delta));
    if (next !== qty) {
      Haptics.selectionAsync().catch(() => {});
      setQty(next);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <Pressable style={styles.scrim} onPress={onCancel}>
        <Animated.View style={[styles.cardWrap, cardStyle]}>
          <Pressable onPress={(e) => e.stopPropagation()} style={styles.card}>
            <LinearGradient
              colors={['rgba(50,38,18,0.95)', 'rgba(20,24,60,0.98)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <LinearGradient
              colors={[`${cat.color}20`, 'transparent']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              locations={[0, 0.45]}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />

            <View style={styles.content}>
              {/* Header row: icon + title/category */}
              <View style={styles.headerRow}>
                <View
                  style={[
                    styles.iconTile,
                    {
                      borderColor: `${cat.color}60`,
                      backgroundColor: `${cat.color}26`,
                    },
                  ]}
                >
                  <Ionicons
                    name={reward.icon as never}
                    size={28}
                    color={cat.color}
                  />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.category, { color: cat.color }]}>
                    {t(`rewards.categories.${reward.category}` as const).toUpperCase()}
                  </Text>
                  <Text style={styles.title} numberOfLines={2}>
                    {reward.title}
                  </Text>
                </View>
              </View>

              {/* Qty stepper */}
              <View style={styles.qtyRow}>
                <Text style={styles.qtyLabel}>
                  {t('rewards.buyConfirm.qtyLabel')}
                </Text>
                <View style={styles.qtyStepper}>
                  <Pressable
                    onPress={() => bumpQty(-1)}
                    disabled={qty <= 1}
                    style={({ pressed }) => [
                      styles.qtyBtn,
                      qty <= 1 && styles.qtyBtnDisabled,
                      pressed && qty > 1 && { opacity: 0.7 },
                    ]}
                    hitSlop={6}
                    accessibilityLabel={t('a11y.decreaseQty')}
                  >
                    <Ionicons
                      name="remove"
                      size={18}
                      color={qty <= 1 ? tokens.text.faint : tokens.text.hi}
                    />
                  </Pressable>
                  <Text style={styles.qtyValue}>{qty}</Text>
                  <Pressable
                    onPress={() => bumpQty(1)}
                    disabled={qty >= MAX_QTY}
                    style={({ pressed }) => [
                      styles.qtyBtn,
                      qty >= MAX_QTY && styles.qtyBtnDisabled,
                      pressed && qty < MAX_QTY && { opacity: 0.7 },
                    ]}
                    hitSlop={6}
                    accessibilityLabel={t('a11y.increaseQty')}
                  >
                    <Ionicons
                      name="add"
                      size={18}
                      color={qty >= MAX_QTY ? tokens.text.faint : tokens.text.hi}
                    />
                  </Pressable>
                </View>
              </View>

              {/* Total line + (conditional) shortfall */}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>
                  {t('rewards.buyConfirm.total')}
                </Text>
                <View style={styles.totalValue}>
                  <CoinIcon size={16} />
                  <Text
                    style={[
                      styles.totalText,
                      { color: canBuy ? '#FFE3A6' : tokens.semantic.danger },
                    ]}
                  >
                    {total.toLocaleString()}
                  </Text>
                </View>
              </View>
              {!canBuy && (
                <Text style={styles.deficitText}>
                  {t('rewards.buyConfirm.deficit', {
                    deficit: deficit.toLocaleString(),
                  })}
                </Text>
              )}

              {/* CTAs */}
              <View style={styles.actions}>
                <Pressable
                  onPress={() => onConfirm(qty)}
                  disabled={!canBuy}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    !canBuy && styles.primaryBtnDisabled,
                    pressed && canBuy && { opacity: 0.85 },
                  ]}
                  accessibilityRole="button"
                >
                  {canBuy && (
                    <LinearGradient
                      colors={['#FFE890', '#FFC83D', '#C8881C']}
                      locations={[0, 0.5, 1]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                  )}
                  <Text
                    style={[
                      styles.primaryText,
                      !canBuy && { color: tokens.text.faint },
                    ]}
                  >
                    {t('rewards.buyConfirm.confirm').toUpperCase()}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={onCancel}
                  style={({ pressed }) => [
                    styles.ghostBtn,
                    pressed && { opacity: 0.6 },
                  ]}
                  accessibilityRole="button"
                >
                  <Text style={styles.ghostText}>
                    {t('rewards.buyConfirm.cancel')}
                  </Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.space[5],
  },
  cardWrap: {
    width: '100%',
    maxWidth: 360,
  },
  card: {
    position: 'relative',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 200, 61, 0.45)',
    overflow: 'hidden',
  },
  content: {
    padding: tokens.space[5],
    gap: tokens.space[4],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
  },
  iconTile: {
    width: 60,
    height: 60,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  category: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  title: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 18,
    lineHeight: 22,
    color: tokens.text.hi,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.space[3],
    paddingVertical: tokens.space[3],
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.border.base,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  qtyLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: tokens.text.mid,
    letterSpacing: 0.3,
  },
  qtyStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
  },
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: tokens.border.strong,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  qtyBtnDisabled: {
    opacity: 0.4,
  },
  qtyValue: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 22,
    color: tokens.text.hi,
    minWidth: 36,
    textAlign: 'center',
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: tokens.text.mid,
    letterSpacing: 0.3,
  },
  totalValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  totalText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 20,
  },
  deficitText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    color: tokens.semantic.danger,
    textAlign: 'right',
    marginTop: -tokens.space[3],
  },
  actions: {
    gap: tokens.space[2],
    marginTop: tokens.space[2],
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: tokens.space[3],
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,224,138,0.55)',
    overflow: 'hidden',
  },
  primaryBtnDisabled: {
    borderColor: tokens.border.base,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  primaryText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 13,
    letterSpacing: 0.7,
    color: '#3D2A00',
  },
  ghostBtn: {
    paddingVertical: tokens.space[2],
    alignItems: 'center',
  },
  ghostText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: tokens.text.mid,
  },
});
