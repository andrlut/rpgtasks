import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RewardCard } from '@/components/RewardCard';
import { TemplateCard } from '@/components/TemplateCard';
import { useCharacter } from '@/lib/api/character';
import {
  useAddTemplateToShop,
  useArchiveReward,
  useRedeemReward,
  useRedemptionHistory,
  useRewardTemplates,
  useRewards,
} from '@/lib/api/rewards';
import { timeAgo } from '@/lib/time';
import type { Reward, RewardCategory, RewardTemplate } from '@/lib/db/types';
import { confirmAction, showInfo } from '@/lib/util/confirm';
import { tokens } from '@/theme';
import { REWARD_CATEGORY_META, REWARD_CATEGORY_ORDER } from '@/theme/rewards';

export default function RewardsScreen() {
  const router = useRouter();
  const character = useCharacter();
  const rewards = useRewards();
  const templates = useRewardTemplates();
  const redeem = useRedeemReward();
  const addTemplate = useAddTemplateToShop();
  const archiveReward = useArchiveReward();
  const redemptions = useRedemptionHistory(15);

  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [addingTemplateId, setAddingTemplateId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<RewardCategory>('indulgence');

  const coins = character.data?.character.coins ?? 0;

  const myRewardsByCategory = useMemo(() => {
    const map: Record<RewardCategory, Reward[]> = {
      indulgence: [],
      good: [],
      experience: [],
    };
    (rewards.data ?? []).forEach((r) => map[r.category]?.push(r));
    return map;
  }, [rewards.data]);

  const myTitlesByCategory = useMemo(() => {
    const map: Record<RewardCategory, Set<string>> = {
      indulgence: new Set(),
      good: new Set(),
      experience: new Set(),
    };
    (rewards.data ?? []).forEach((r) =>
      map[r.category]?.add(r.title.trim().toLowerCase()),
    );
    return map;
  }, [rewards.data]);

  const templatesByCategory = useMemo(() => {
    const map: Record<RewardCategory, RewardTemplate[]> = {
      indulgence: [],
      good: [],
      experience: [],
    };
    (templates.data ?? []).forEach((t) => {
      if (!myTitlesByCategory[t.category].has(t.title.trim().toLowerCase())) {
        map[t.category]?.push(t);
      }
    });
    return map;
  }, [templates.data, myTitlesByCategory]);

  const meta = REWARD_CATEGORY_META[activeCategory];
  const myList = myRewardsByCategory[activeCategory];
  const tmplList = templatesByCategory[activeCategory];

  const handleRewardActions = async (reward: Reward) => {
    // 3-way action sheet: web doesn't have one out of the box, so split
    // into a simpler "remove or cancel?" path. Edit is handled by the
    // tap on the body (not long-press) so the split is fine.
    const ok = await confirmAction(
      `Remove "${reward.title}"?`,
      'It stops appearing on Rewards. Past redemptions stay in your history.',
      { okText: 'Remove', cancelText: 'Cancel', destructive: true },
    );
    if (!ok) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(
      () => {},
    );
    try {
      await archiveReward.mutateAsync(reward.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      showInfo('Could not remove', msg);
    }
  };

  const handleRedeem = async (reward: Reward) => {
    const ok = await confirmAction(
      'Redeem reward?',
      `Spend ${reward.cost} coins on "${reward.title}"?`,
      { okText: 'Redeem', cancelText: 'Cancel' },
    );
    if (!ok) return;
    setRedeemingId(reward.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {},
    );
    try {
      await redeem.mutateAsync({ rewardId: reward.id, cost: reward.cost });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      showInfo('Could not redeem', msg);
    } finally {
      setRedeemingId(null);
    }
  };

  const handleAddTemplate = async (template: RewardTemplate) => {
    setAddingTemplateId(template.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      await addTemplate.mutateAsync(template);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      showInfo('Could not add', msg);
    } finally {
      setAddingTemplateId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={
              rewards.isRefetching || character.isRefetching || templates.isRefetching
            }
            onRefresh={() => {
              rewards.refetch();
              character.refetch();
              templates.refetch();
            }}
            tintColor={tokens.brand.violet2}
          />
        }
      >
        <View style={styles.balanceCard}>
          <Ionicons name="ellipse" size={28} color={tokens.semantic.coin} />
          <Text style={styles.balanceValue}>{coins.toLocaleString()}</Text>
          <Text style={styles.balanceLabel}>coins available</Text>
        </View>

        <View style={styles.tabs}>
          {REWARD_CATEGORY_ORDER.map((cat) => {
            const m = REWARD_CATEGORY_META[cat];
            const active = cat === activeCategory;
            return (
              <Pressable
                key={cat}
                onPress={() => setActiveCategory(cat)}
                style={[
                  styles.tab,
                  active && {
                    backgroundColor: m.bg,
                    borderColor: m.color,
                  },
                ]}
              >
                <Ionicons
                  name={m.icon as never}
                  size={16}
                  color={active ? m.color : tokens.text.mid}
                />
                <Text
                  style={[
                    styles.tabText,
                    { color: active ? m.color : tokens.text.mid },
                  ]}
                >
                  {m.short}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.tagline}>{meta.tagline}</Text>

        {/* YOUR SHOP */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your shop</Text>
          {myList.length > 0 && (
            <Text style={styles.sectionMeta}>{myList.length}</Text>
          )}
        </View>

        {rewards.isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={tokens.brand.violet2} />
          </View>
        ) : myList.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name={meta.icon as never} size={40} color={meta.color} />
            <Text style={styles.emptyTitle}>Nothing here yet</Text>
            <Text style={styles.emptySub}>
              Tap a suggestion below to add it, or use + to make your own.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {myList.map((reward) => (
              <RewardCard
                key={reward.id}
                reward={reward}
                affordable={coins >= reward.cost}
                onRedeem={() => handleRedeem(reward)}
                onEdit={() => handleRewardActions(reward)}
                onLongPress={() => handleRewardActions(reward)}
                isRedeeming={redeemingId === reward.id}
              />
            ))}
          </View>
        )}

        {/* RECENT REDEMPTIONS */}
        {(redemptions.data?.length ?? 0) > 0 && (
          <>
            <View style={[styles.sectionHeader, { marginTop: tokens.space[6] }]}>
              <View style={styles.inspirationLabel}>
                <Ionicons name="receipt-outline" size={14} color={tokens.text.mid} />
                <Text style={styles.sectionTitle}>Recently redeemed</Text>
              </View>
              <Text style={styles.sectionMeta}>
                {redemptions.data!.length} {redemptions.data!.length === 1 ? 'item' : 'items'}
              </Text>
            </View>

            <View style={styles.historyList}>
              {redemptions.data!.map((r) => (
                <View key={r.id} style={styles.historyRow}>
                  <View style={styles.historyIconWrap}>
                    <Ionicons
                      name={r.reward_icon as never}
                      size={16}
                      color={tokens.semantic.coin}
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.historyTitle} numberOfLines={1}>
                      {r.reward_title}
                    </Text>
                    <Text style={styles.historyMeta}>{timeAgo(r.redeemed_at)}</Text>
                  </View>
                  <View style={styles.historyCost}>
                    <Ionicons name="ellipse" size={9} color={tokens.semantic.coin} />
                    <Text style={styles.historyCostText}>
                      −{r.cost_paid.toLocaleString()}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* INSPIRATION */}
        {tmplList.length > 0 && (
          <>
            <View style={[styles.sectionHeader, { marginTop: tokens.space[6] }]}>
              <View style={styles.inspirationLabel}>
                <Ionicons name="bulb" size={14} color={tokens.text.mid} />
                <Text style={styles.sectionTitle}>Inspiration</Text>
              </View>
              <Text style={styles.sectionMeta}>tap to add</Text>
            </View>

            <View style={styles.list}>
              {tmplList.map((t) => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  onAdd={() => handleAddTemplate(t)}
                  isAdding={addingTemplateId === t.id}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <Pressable
        onPress={() =>
          router.push({
            pathname: '/reward-form',
            params: { category: activeCategory },
          })
        }
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
    paddingBottom: tokens.layout.bottomNavClearance,
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
    marginBottom: tokens.space[5],
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
  tabs: {
    flexDirection: 'row',
    gap: tokens.space[2],
    marginBottom: tokens.space[3],
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: tokens.space[3],
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.border.base,
    backgroundColor: tokens.bg.surface,
  },
  tabText: {
    ...tokens.type.caption,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 0.3,
  },
  tagline: {
    ...tokens.type.caption,
    color: tokens.text.mid,
    fontStyle: 'italic',
    marginBottom: tokens.space[5],
    paddingHorizontal: tokens.space[1],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.space[3],
  },
  sectionTitle: {
    ...tokens.type.h3,
    color: tokens.text.hi,
  },
  sectionMeta: {
    ...tokens.type.caption,
    color: tokens.text.mid,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inspirationLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  loadingBox: {
    paddingVertical: tokens.space[8],
    alignItems: 'center',
  },
  emptyBox: {
    paddingVertical: tokens.space[6],
    alignItems: 'center',
    gap: tokens.space[2],
    backgroundColor: tokens.bg.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.border.base,
    borderStyle: 'dashed',
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
  historyList: {
    backgroundColor: tokens.bg.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.border.base,
    overflow: 'hidden',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[3],
    borderBottomWidth: 1,
    borderBottomColor: tokens.border.base,
  },
  historyIconWrap: {
    width: 32,
    height: 32,
    borderRadius: tokens.radius.sm,
    backgroundColor: 'rgba(255, 200, 61, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyTitle: {
    ...tokens.type.body,
    color: tokens.text.hi,
    fontFamily: 'Manrope_700Bold',
  },
  historyMeta: {
    ...tokens.type.caption,
    color: tokens.text.dim,
    marginTop: 2,
  },
  historyCost: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  historyCostText: {
    ...tokens.type.caption,
    color: tokens.semantic.coin,
    fontFamily: 'Manrope_700Bold',
  },
  fab: {
    position: 'absolute',
    right: tokens.space[5],
    bottom: tokens.layout.bottomNavClearance + tokens.space[3],
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
