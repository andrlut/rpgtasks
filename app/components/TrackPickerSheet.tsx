import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Reward } from '@/lib/db/types';
import { useT } from '@/lib/i18n';
import { tokens } from '@/theme';
import { REWARD_CATEGORY_META } from '@/theme/rewards';

import { CoinIcon } from './CoinIcon';

interface Props {
  visible: boolean;
  onClose: () => void;
  rewards: Reward[];
  coins: number;
  currentTrackedId: string | null;
  onPick: (rewardId: string) => void;
}

/**
 * Bottom sheet for picking a reward to track. Tap-to-select with no
 * confirm step — instant feedback, instant close. Mirrors the lúdico flow
 * the user described: open, tap, done.
 *
 * Disabled state for the currently tracked reward (so re-tapping it doesn't
 * silently no-op). Affordable rewards get a subtle gold glow tint.
 */
export function TrackPickerSheet({
  visible,
  onClose,
  rewards,
  coins,
  currentTrackedId,
  onPick,
}: Props) {
  const { t } = useT();
  const handlePick = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onPick(id);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{t('trackPicker.title')}</Text>
              <Text style={styles.subtitle}>{t('trackPicker.subtitle')}</Text>
            </View>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeBtn,
                pressed && { opacity: 0.6 },
              ]}
              hitSlop={10}
            >
              <Ionicons name="close" size={20} color={tokens.text.mid} />
            </Pressable>
          </View>

          {rewards.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="gift-outline" size={32} color={tokens.text.dim} />
              <Text style={styles.emptyTitle}>{t('trackPicker.emptyTitle')}</Text>
              <Text style={styles.emptySub}>{t('trackPicker.emptyBody')}</Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.grid}
            >
              {rewards.map((r) => {
                const cat = REWARD_CATEGORY_META[r.category];
                const isCurrent = r.id === currentTrackedId;
                const affordable = coins >= r.cost;
                return (
                  <Pressable
                    key={r.id}
                    onPress={() => handlePick(r.id)}
                    disabled={isCurrent}
                    style={({ pressed }) => [
                      styles.card,
                      affordable && styles.cardAffordable,
                      isCurrent && styles.cardCurrent,
                      pressed && !isCurrent && { transform: [{ scale: 0.97 }] },
                    ]}
                  >
                    <View style={[styles.iconWrap, { backgroundColor: cat.bg }]}>
                      <Ionicons name={r.icon as never} size={20} color={cat.color} />
                    </View>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {r.title}
                    </Text>
                    <View style={styles.costRow}>
                      <CoinIcon size={11} />
                      <Text style={styles.costText}>{r.cost.toLocaleString()}</Text>
                    </View>
                    {isCurrent ? (
                      <View style={styles.currentBadge}>
                        <Ionicons name="bookmark" size={10} color={cat.color} />
                        <Text style={[styles.currentBadgeText, { color: cat.color }]}>
                          Tracking
                        </Text>
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: tokens.bg.surface,
    borderTopLeftRadius: tokens.radius.xl,
    borderTopRightRadius: tokens.radius.xl,
    borderTopWidth: 1,
    borderColor: tokens.border.strong,
    paddingHorizontal: tokens.space[4],
    paddingTop: tokens.space[2],
    paddingBottom: tokens.space[6],
    maxHeight: '82%',
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: tokens.text.faint,
    marginBottom: tokens.space[3],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: tokens.space[3],
    marginBottom: tokens.space[4],
  },
  title: {
    ...tokens.type.h2,
    color: tokens.text.hi,
  },
  subtitle: {
    ...tokens.type.caption,
    color: tokens.text.mid,
    marginTop: 4,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.space[3],
  },
  card: {
    width: '48%',
    flexGrow: 1,
    minHeight: 130,
    padding: tokens.space[3],
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.bg.surface2,
    borderWidth: 1,
    borderColor: tokens.border.base,
    gap: 6,
  },
  cardAffordable: {
    borderColor: 'rgba(255, 200, 61, 0.3)',
  },
  cardCurrent: {
    borderColor: tokens.brand.violet2,
    backgroundColor: tokens.bg.surface,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    ...tokens.type.body,
    color: tokens.text.hi,
    fontFamily: 'Manrope_700Bold',
    marginTop: 4,
  },
  costRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 'auto',
  },
  costText: {
    ...tokens.type.caption,
    color: tokens.semantic.coin,
    fontFamily: 'Manrope_800ExtraBold',
  },
  currentBadge: {
    position: 'absolute',
    top: tokens.space[2],
    right: tokens.space[2],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: tokens.radius.pill,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  currentBadgeText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 9,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  emptyBox: {
    paddingVertical: tokens.space[8],
    alignItems: 'center',
    gap: tokens.space[2],
  },
  emptyTitle: {
    ...tokens.type.h3,
    color: tokens.text.hi,
    marginTop: tokens.space[2],
  },
  emptySub: {
    ...tokens.type.caption,
    color: tokens.text.mid,
    textAlign: 'center',
    paddingHorizontal: tokens.space[4],
  },
});
