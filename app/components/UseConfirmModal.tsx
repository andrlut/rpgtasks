import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { RewardCategory } from '@/lib/db/types';
import { useT } from '@/lib/i18n';
import { tokens } from '@/theme';
import { REWARD_CATEGORY_META } from '@/theme/rewards';

import { PercevaGlyph } from './PercevaGlyph';

interface Props {
  visible: boolean;
  rewardTitle: string;
  rewardIcon: string;
  category: RewardCategory | null;
  /** Stable id so the engraved glyph's idSuffix doesn't collide with
   *  other open modals showing the same content. */
  redemptionId?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Custom confirm modal for USING a banked reward. Replaces the system
 * Alert that read as a warning ("Sure you want to use this?") with a
 * celebration framing ("Curtir agora!") — same warm gold palette as
 * the BuyCelebrationModal, animated icon scale-in for the dopamine
 * beat. The gesture should feel rewarding, not gatekept.
 *
 * Visual contract:
 *   - dark scrim
 *   - gold-rimmed card with warm gold gradient + cat-color tint wash
 *   - reward icon big (96px), spring-scales in
 *   - title: "Curtir agora!"
 *   - reward.title below in white
 *   - primary CTA "Curtir" gold gradient (same as BUY pill)
 *   - ghost CTA "Esperar mais"
 */
export function UseConfirmModal({
  visible,
  rewardTitle,
  rewardIcon,
  category,
  redemptionId,
  onCancel,
  onConfirm,
}: Props) {
  const { t } = useT();

  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(20);
  const iconScale = useSharedValue(0.4);

  useEffect(() => {
    if (visible) {
      cardOpacity.value = withTiming(1, { duration: 220 });
      cardTranslateY.value = withSpring(0, { damping: 18, stiffness: 180 });
      iconScale.value = withDelay(
        80,
        withSequence(
          withSpring(1.1, { damping: 8, stiffness: 200 }),
          withSpring(1, { damping: 12, stiffness: 180 }),
        ),
      );
    } else {
      cardOpacity.value = 0;
      cardTranslateY.value = 20;
      iconScale.value = 0.4;
    }
  }, [visible, cardOpacity, cardTranslateY, iconScale]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslateY.value }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const cat = category ? REWARD_CATEGORY_META[category] : null;
  const accent = cat?.color ?? '#FFC83D';

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
              colors={['rgba(60,45,20,0.95)', 'rgba(20,24,60,0.98)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            {cat && (
              <LinearGradient
                colors={[`${cat.color}26`, 'transparent']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                locations={[0, 0.4]}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />
            )}

            <View style={styles.glyphWrap} pointerEvents="none">
              <PercevaGlyph
                size={180}
                bare
                palette="gilded"
                idSuffix={`use-${redemptionId ?? 'x'}`}
              />
            </View>

            <View style={styles.content}>
              <View style={styles.eyebrowRow}>
                <Ionicons name="sparkles" size={12} color="#FFE3A6" />
                <Text style={styles.eyebrow}>
                  {t('rewards.useConfirm.eyebrow')}
                </Text>
              </View>

              <Animated.View
                style={[
                  styles.iconTile,
                  iconStyle,
                  {
                    borderColor: `${accent}90`,
                    backgroundColor: `${accent}26`,
                  },
                ]}
              >
                <Ionicons
                  name={rewardIcon as never}
                  size={48}
                  color={accent}
                />
              </Animated.View>

              <Text style={styles.title} numberOfLines={2}>
                {t('rewards.useConfirm.title')}
              </Text>
              <Text style={styles.reward} numberOfLines={2}>
                {rewardTitle}
              </Text>

              <View style={styles.actions}>
                <Pressable
                  onPress={onConfirm}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    pressed && { opacity: 0.85 },
                  ]}
                  accessibilityRole="button"
                >
                  <LinearGradient
                    colors={['#FFE890', '#FFC83D', '#C8881C']}
                    locations={[0, 0.5, 1]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <Ionicons name="sparkles" size={14} color="#3D2A00" />
                  <Text style={styles.primaryText}>
                    {t('rewards.useConfirm.confirm').toUpperCase()}
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
                    {t('rewards.useConfirm.cancel')}
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
    borderColor: 'rgba(255, 200, 61, 0.55)',
    overflow: 'hidden',
  },
  glyphWrap: {
    position: 'absolute',
    right: -40,
    bottom: -30,
    width: 180,
    height: 180,
    opacity: 0.08,
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
    color: '#FFE3A6',
  },
  iconTile: {
    width: 96,
    height: 96,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: tokens.space[2],
  },
  title: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 22,
    lineHeight: 26,
    textAlign: 'center',
    color: '#FFE3A6',
    paddingHorizontal: tokens.space[2],
  },
  reward: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
    lineHeight: 18,
    textAlign: 'center',
    color: tokens.text.hi,
    paddingHorizontal: tokens.space[3],
    marginTop: -tokens.space[1],
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
    gap: 8,
    paddingVertical: tokens.space[3],
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,224,138,0.55)',
    overflow: 'hidden',
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
