import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { RewardCategory } from '@/lib/db/types';
import { useT } from '@/lib/i18n';
import { tokens } from '@/theme';
import { REWARD_CATEGORY_META } from '@/theme/rewards';

interface Props {
  visible: boolean;
  rewardTitle: string;
  rewardIcon: string;
  category: RewardCategory | null;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Confirm modal for sending a used redemption back to the bank.
 * Same violet palette as SellConfirmModal — both signal "undo /
 * reverse direction" semantically, so they share the visual language.
 */
export function UnuseConfirmModal({
  visible,
  rewardTitle,
  rewardIcon,
  category,
  onCancel,
  onConfirm,
}: Props) {
  const { t } = useT();

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

  const cat = category ? REWARD_CATEGORY_META[category] : null;
  const accent = cat?.color ?? tokens.text.mid;

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
              colors={['rgba(36,30,68,0.95)', 'rgba(20,24,60,0.98)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <LinearGradient
              colors={['rgba(155, 130, 255, 0.18)', 'transparent']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              locations={[0, 0.45]}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />

            <View style={styles.content}>
              <View style={styles.eyebrowRow}>
                <Ionicons name="arrow-undo" size={12} color="#C2A1FF" />
                <Text style={styles.eyebrow}>
                  {t('rewards.unuseConfirm.eyebrow')}
                </Text>
              </View>

              <View
                style={[
                  styles.iconTile,
                  {
                    borderColor: `${accent}60`,
                    backgroundColor: `${accent}26`,
                  },
                ]}
              >
                <Ionicons name={rewardIcon as never} size={36} color={accent} />
              </View>

              <Text style={styles.title} numberOfLines={2}>
                {rewardTitle}
              </Text>
              <Text style={styles.sub}>{t('rewards.unuseConfirm.sub')}</Text>

              <View style={styles.actions}>
                <Pressable
                  onPress={onConfirm}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    pressed && { opacity: 0.85 },
                  ]}
                  accessibilityRole="button"
                >
                  <Text style={styles.primaryText}>
                    {t('rewards.unuseConfirm.confirm').toUpperCase()}
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
                    {t('rewards.unuseConfirm.cancel')}
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
    borderColor: 'rgba(155, 130, 255, 0.45)',
    overflow: 'hidden',
  },
  content: {
    padding: tokens.space[5],
    alignItems: 'center',
    gap: tokens.space[3],
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eyebrow: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: '#C2A1FF',
  },
  iconTile: {
    width: 72,
    height: 72,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: tokens.space[1],
  },
  title: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 18,
    lineHeight: 22,
    textAlign: 'center',
    color: tokens.text.hi,
    paddingHorizontal: tokens.space[2],
  },
  sub: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    color: tokens.text.mid,
    paddingHorizontal: tokens.space[3],
  },
  actions: {
    width: '100%',
    gap: tokens.space[2],
    marginTop: tokens.space[3],
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: tokens.space[3],
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(155, 130, 255, 0.55)',
    backgroundColor: 'rgba(155, 130, 255, 0.18)',
  },
  primaryText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 13,
    letterSpacing: 0.7,
    color: '#C2A1FF',
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
