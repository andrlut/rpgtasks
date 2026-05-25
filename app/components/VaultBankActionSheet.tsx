import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useT } from '@/lib/i18n';
import { tokens } from '@/theme';

interface Props {
  visible: boolean;
  rewardTitle: string;
  onCancel: () => void;
  onUse: () => void;
  onSell: () => void;
}

/**
 * Long-press menu for a banked reward (a VaultBankCard). Two actions:
 * "Usar" (primary use case — consume the reward) and "Vender" (refund
 * scenario — get the coins back). Mirrors RewardActionSheet's shape so
 * the long-press affordance reads the same across shop and bank.
 */
export function VaultBankActionSheet({
  visible,
  rewardTitle,
  onCancel,
  onUse,
  onSell,
}: Props) {
  const { t } = useT();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.scrim} onPress={onCancel}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title} numberOfLines={1}>
            {rewardTitle}
          </Text>

          <Pressable
            onPress={onUse}
            style={({ pressed }) => [
              styles.action,
              pressed && { opacity: 0.7 },
            ]}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="checkmark-circle" size={18} color="#FFC83D" />
            </View>
            <View style={styles.actionBody}>
              <Text style={styles.actionTitle}>
                {t('rewards.bankActionSheet.use')}
              </Text>
              <Text style={styles.actionSub}>
                {t('rewards.bankActionSheet.useSub')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={tokens.text.dim} />
          </Pressable>

          <Pressable
            onPress={onSell}
            style={({ pressed }) => [
              styles.action,
              pressed && { opacity: 0.7 },
            ]}
          >
            <View style={styles.actionIcon}>
              <Ionicons
                name="arrow-undo"
                size={18}
                color={tokens.brand.violet2}
              />
            </View>
            <View style={styles.actionBody}>
              <Text style={styles.actionTitle}>
                {t('rewards.bankActionSheet.sell')}
              </Text>
              <Text style={styles.actionSub}>
                {t('rewards.bankActionSheet.sellSub')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={tokens.text.dim} />
          </Pressable>

          <Pressable
            onPress={onCancel}
            style={({ pressed }) => [
              styles.cancelBtn,
              pressed && { opacity: 0.6 },
            ]}
          >
            <Text style={styles.cancelText}>{t('common.cancel')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: tokens.bg.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: tokens.space[4],
    paddingBottom: tokens.space[6],
    gap: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: tokens.border.strong,
    alignSelf: 'center',
    marginBottom: tokens.space[3],
  },
  title: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 14,
    color: tokens.text.hi,
    paddingHorizontal: 4,
    marginBottom: tokens.space[3],
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.bg.base,
  },
  actionBody: {
    flex: 1,
    gap: 2,
  },
  actionTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: tokens.text.hi,
  },
  actionSub: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    color: tokens.text.dim,
    lineHeight: 14,
  },
  cancelBtn: {
    marginTop: tokens.space[3],
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: tokens.bg.base,
    borderWidth: 1,
    borderColor: tokens.border.base,
    alignItems: 'center',
  },
  cancelText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: tokens.text.hi,
  },
});
