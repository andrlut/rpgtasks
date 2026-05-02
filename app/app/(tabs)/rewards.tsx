import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RewardCard } from '@/components/RewardCard';
import { useCharacter } from '@/lib/api/character';
import { useRedeemReward, useRewards } from '@/lib/api/rewards';
import type { Reward } from '@/lib/db/types';
import { tokens } from '@/theme';

export default function RewardsScreen() {
  const router = useRouter();
  const character = useCharacter();
  const rewards = useRewards();
  const redeem = useRedeemReward();
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

  const coins = character.data?.character.coins ?? 0;

  const handleRedeem = (reward: Reward) => {
    Alert.alert(
      'Redeem reward?',
      `Spend ${reward.cost} coins on "${reward.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Redeem',
          onPress: async () => {
            setRedeemingId(reward.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            try {
              await redeem.mutateAsync({ rewardId: reward.id, cost: reward.cost });
            } catch (e) {
              const msg = e instanceof Error ? e.message : 'Unknown error';
              Alert.alert('Could not redeem', msg);
            } finally {
              setRedeemingId(null);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.balanceCard}>
          <Ionicons name="ellipse" size={28} color={tokens.semantic.coin} />
          <Text style={styles.balanceValue}>{coins.toLocaleString()}</Text>
          <Text style={styles.balanceLabel}>coins available</Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My rewards</Text>
          {rewards.data && rewards.data.length > 0 ? (
            <Text style={styles.sectionMeta}>{rewards.data.length} total</Text>
          ) : null}
        </View>

        {rewards.isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={tokens.brand.violet2} />
          </View>
        ) : rewards.data?.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="gift-outline" size={48} color={tokens.text.dim} />
            <Text style={styles.emptyTitle}>No rewards yet</Text>
            <Text style={styles.emptySub}>
              Tap the + below to define what you can spend coins on.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {rewards.data?.map((reward) => (
              <RewardCard
                key={reward.id}
                reward={reward}
                affordable={coins >= reward.cost}
                onRedeem={() => handleRedeem(reward)}
                onEdit={() =>
                  router.push({ pathname: '/reward-form', params: { id: reward.id } })
                }
                isRedeeming={redeemingId === reward.id}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <Pressable
        onPress={() => router.push('/reward-form')}
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        hitSlop={8}
      >
        <Ionicons name="add" size={28} color={tokens.text.hi} />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.bg.base },
  content: {
    padding: tokens.space[4],
    paddingBottom: tokens.space[10],
  },
  balanceCard: {
    alignItems: 'center',
    backgroundColor: tokens.bg.surface,
    borderWidth: 1,
    borderColor: tokens.border.base,
    borderRadius: tokens.radius.xl,
    paddingVertical: tokens.space[6],
    gap: tokens.space[2],
    marginTop: tokens.space[3],
    marginBottom: tokens.space[6],
  },
  balanceValue: {
    ...tokens.type.numXl,
    color: tokens.semantic.coin,
  },
  balanceLabel: {
    ...tokens.type.caption,
    color: tokens.text.mid,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.space[3],
  },
  sectionTitle: {
    ...tokens.type.h2,
    color: tokens.text.hi,
  },
  sectionMeta: {
    ...tokens.type.caption,
    color: tokens.text.mid,
  },
  loadingBox: {
    paddingVertical: tokens.space[8],
    alignItems: 'center',
  },
  emptyBox: {
    paddingVertical: tokens.space[7],
    alignItems: 'center',
    gap: tokens.space[2],
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
  list: {
    gap: tokens.space[3],
  },
  fab: {
    position: 'absolute',
    right: tokens.space[5],
    bottom: tokens.space[5],
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: tokens.brand.violet,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: tokens.brand.violet,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  fabPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
});
