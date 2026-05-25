import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyHero } from '@/components/EmptyHero';
import { SellConfirmModal } from '@/components/SellConfirmModal';
import { VaultBankActionSheet } from '@/components/VaultBankActionSheet';
import { VaultBankCard } from '@/components/VaultBankCard';
import {
  useBankedRewards,
  useSellReward,
  useUseReward,
  type RedemptionEntry,
} from '@/lib/api/rewards';
import { useT } from '@/lib/i18n';
import { timeAgo } from '@/lib/time';
import { confirmAction, showInfo } from '@/lib/util/confirm';
import { tokens } from '@/theme';

/**
 * Full-screen Bank route — replaces the old in-screen tab that lived
 * alongside Shop. Reached from the BankFab on the Shop screen and from
 * the BuyCelebrationModal's "Ir pro banco" CTA.
 *
 * Owns the long-press → action sheet → use/sell flow. Same components
 * the old in-screen view used, just hoisted to their own route so
 * navigation reads cleanly (and so the Shop tabs went away).
 */
export default function RewardsBankScreen() {
  const router = useRouter();
  const { t } = useT();
  const banked = useBankedRewards();
  const useReward = useUseReward();
  const sellReward = useSellReward();

  const [usingId, setUsingId] = useState<string | null>(null);
  const [bankActionSheet, setBankActionSheet] = useState<RedemptionEntry | null>(null);
  const [sellingItem, setSellingItem] = useState<RedemptionEntry | null>(null);

  const handleUse = async (entry: { id: string; reward_title: string }) => {
    const ok = await confirmAction(
      t('reward.shop.useTitle', { title: entry.reward_title }),
      t('reward.shop.useBody'),
      { okText: t('reward.shop.useOk'), cancelText: t('reward.common.cancel') },
    );
    if (!ok) return;
    setUsingId(entry.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    try {
      await useReward.mutateAsync(entry.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      showInfo(t('reward.shop.useFail'), msg);
    } finally {
      setUsingId(null);
    }
  };

  const openBankActionSheet = (entry: RedemptionEntry) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setBankActionSheet(entry);
  };

  const handleConfirmSell = async (entry: RedemptionEntry) => {
    setSellingItem(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    try {
      await sellReward.mutateAsync({
        redemptionId: entry.id,
        refund: entry.cost_paid,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      showInfo(t('rewards.sellConfirm.failTitle'), msg);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false, presentation: 'modal' }} />

      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.6 }]}
          hitSlop={8}
        >
          <Ionicons name="close" size={24} color={tokens.text.hi} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('rewards.bank.title')}</Text>
        <View style={styles.iconButton} />
      </View>

      {banked.isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={tokens.brand.violet2} />
        </View>
      ) : (banked.data?.length ?? 0) === 0 ? (
        <View style={styles.emptyBox}>
          <EmptyHero tone="coin" iconName="wallet" size={140} />
          <Text style={styles.emptyTitle}>{t('rewards.bank.emptyTitle')}</Text>
          <Text style={styles.emptySub}>{t('rewards.bank.emptySub')}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.bankList}>
            {banked.data!.map((b) => (
              <VaultBankCard
                key={b.id}
                entry={b}
                cta={t('rewards.vault.cta.use')}
                earnedTime={t('rewards.vault.earnedTime', {
                  when: timeAgo(b.redeemed_at),
                })}
                busy={usingId === b.id}
                onUse={() => handleUse(b)}
                onLongPress={() => openBankActionSheet(b)}
              />
            ))}
          </View>
        </ScrollView>
      )}

      <VaultBankActionSheet
        visible={!!bankActionSheet}
        rewardTitle={bankActionSheet?.reward_title ?? ''}
        onCancel={() => setBankActionSheet(null)}
        onUse={() => {
          const b = bankActionSheet;
          setBankActionSheet(null);
          if (b) handleUse(b);
        }}
        onSell={() => {
          const b = bankActionSheet;
          setBankActionSheet(null);
          if (b) setSellingItem(b);
        }}
      />

      <SellConfirmModal
        visible={!!sellingItem}
        rewardTitle={sellingItem?.reward_title ?? ''}
        rewardIcon={sellingItem?.reward_icon ?? 'gift'}
        category={sellingItem?.reward_category ?? null}
        refund={sellingItem?.cost_paid ?? 0}
        onCancel={() => setSellingItem(null)}
        onConfirm={() => {
          const b = sellingItem;
          if (b) handleConfirmSell(b);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.bg.base },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[3],
    borderBottomWidth: 1,
    borderBottomColor: tokens.border.base,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.bg.surface,
  },
  headerTitle: {
    ...tokens.type.h3,
    color: tokens.text.hi,
  },
  content: {
    padding: tokens.space[4],
    paddingBottom: tokens.space[10],
  },
  bankList: {
    gap: tokens.space[2],
  },
  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.space[2],
    padding: tokens.space[6],
  },
  emptyTitle: {
    ...tokens.type.h3,
    color: tokens.text.hi,
    marginTop: tokens.space[2],
  },
  emptySub: {
    ...tokens.type.body,
    color: tokens.text.mid,
    textAlign: 'center',
    paddingHorizontal: tokens.space[6],
  },
});
