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

import { AddCard } from '@/components/AddCard';
import { CoinIcon } from '@/components/CoinIcon';
import { EmptyHero } from '@/components/EmptyHero';
import { RewardCard } from '@/components/RewardCard';
import { ScreenBackground } from '@/components/ScreenBackground';
import { SegmentedControl } from '@/components/SegmentedControl';
import { TemplateCard } from '@/components/TemplateCard';
import { useCharacter } from '@/lib/api/character';
import {
  useAddTemplateToShop,
  useArchiveReward,
  useBankedRewards,
  useRedeemReward,
  useRewardTemplates,
  useRewards,
  useUseReward,
  useUsedRewards,
} from '@/lib/api/rewards';
import type { Reward, RewardCategory, RewardTemplate } from '@/lib/db/types';
import { timeAgo } from '@/lib/time';
import { confirmAction, showInfo } from '@/lib/util/confirm';
import { tokens } from '@/theme';
import { REWARD_CATEGORY_META, REWARD_CATEGORY_ORDER } from '@/theme/rewards';

type RewardView = 'shop' | 'bank' | 'used';

export default function RewardsScreen() {
  const router = useRouter();
  const character = useCharacter();
  const rewards = useRewards();
  const templates = useRewardTemplates();
  const redeem = useRedeemReward();
  const useReward = useUseReward();
  const addTemplate = useAddTemplateToShop();
  const archiveReward = useArchiveReward();
  const banked = useBankedRewards();
  const used = useUsedRewards(50);

  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [usingId, setUsingId] = useState<string | null>(null);
  const [addingTemplateId, setAddingTemplateId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<RewardCategory>('indulgence');
  const [view, setView] = useState<RewardView>('shop');

  const coins = character.data?.character.coins ?? 0;
  const bankCount = banked.data?.length ?? 0;

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
    const ok = await confirmAction(
      `Remove "${reward.title}"?`,
      'It stops appearing in the Shop. Past purchases stay in your Bank/Used.',
      { okText: 'Remove', cancelText: 'Cancel', destructive: true },
    );
    if (!ok) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    try {
      await archiveReward.mutateAsync(reward.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      showInfo('Could not remove', msg);
    }
  };

  const handleBuy = async (reward: Reward) => {
    if (coins < reward.cost) {
      showInfo('Not enough coins', `You need ${reward.cost - coins} more coins.`);
      return;
    }
    const ok = await confirmAction(
      `Buy "${reward.title}"?`,
      `Spend ${reward.cost} coins. It goes to your Bank — use it whenever you're ready.`,
      { okText: 'Buy', cancelText: 'Cancel' },
    );
    if (!ok) return;
    setRedeemingId(reward.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    try {
      await redeem.mutateAsync({ rewardId: reward.id, cost: reward.cost });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      showInfo('Could not buy', msg);
    } finally {
      setRedeemingId(null);
    }
  };

  const handleUse = async (entry: { id: string; reward_title: string }) => {
    const ok = await confirmAction(
      `Use "${entry.reward_title}"?`,
      'Mark this reward as redeemed. It moves to your Used list.',
      { okText: 'Use it', cancelText: 'Cancel' },
    );
    if (!ok) return;
    setUsingId(entry.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    try {
      await useReward.mutateAsync(entry.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      showInfo('Could not use', msg);
    } finally {
      setUsingId(null);
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
      <ScreenBackground>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={
              rewards.isRefetching ||
              character.isRefetching ||
              templates.isRefetching ||
              banked.isRefetching ||
              used.isRefetching
            }
            onRefresh={() => {
              rewards.refetch();
              character.refetch();
              templates.refetch();
              banked.refetch();
              used.refetch();
            }}
            tintColor={tokens.brand.violet2}
          />
        }
      >
        <View style={styles.balanceHero}>
          <Text style={styles.balanceEyebrow}>Your balance</Text>
          <View style={styles.balanceRow}>
            <CoinIcon size={48} />
            <Text style={styles.balanceValue}>{coins.toLocaleString()}</Text>
          </View>
          {bankCount > 0 ? (
            <Text style={styles.balanceSub}>
              {bankCount} {bankCount === 1 ? 'reward' : 'rewards'} in your bank
            </Text>
          ) : character.data?.character.total_xp ? (
            <Text style={styles.balanceSub}>
              {character.data.character.total_xp.toLocaleString()} XP earned lifetime
            </Text>
          ) : null}
        </View>

        <View style={styles.viewToggle}>
          <SegmentedControl
            options={[
              { value: 'shop' as RewardView, label: 'Shop' },
              { value: 'bank' as RewardView, label: bankCount > 0 ? `Bank (${bankCount})` : 'Bank' },
              { value: 'used' as RewardView, label: 'Used' },
            ]}
            value={view}
            onChange={setView}
          />
        </View>

        {view === 'shop' && (
          <>
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
                  Tap a suggestion below to add it, or create your own.
                </Text>
              </View>
            ) : (
              <View style={styles.grid}>
                {myList.map((reward) => (
                  <View key={reward.id} style={styles.gridItem}>
                    <RewardCard
                      reward={reward}
                      affordable={coins >= reward.cost}
                      deficit={Math.max(0, reward.cost - coins)}
                      onRedeem={() => handleBuy(reward)}
                      onEdit={() => handleRewardActions(reward)}
                      onLongPress={() => handleRewardActions(reward)}
                      isRedeeming={redeemingId === reward.id}
                    />
                  </View>
                ))}
              </View>
            )}

            <View style={styles.addCardWrap}>
              <AddCard
                label="New reward"
                sublabel={`Add a custom ${meta.short.toLowerCase()}`}
                tint={meta.color}
                onPress={() =>
                  router.push({
                    pathname: '/reward-form',
                    params: { category: activeCategory },
                  })
                }
              />
            </View>

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
          </>
        )}

        {view === 'bank' && (
          <>
            {banked.isLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={tokens.brand.violet2} />
              </View>
            ) : (banked.data?.length ?? 0) === 0 ? (
              <View style={styles.emptyBox}>
                <EmptyHero tone="coin" iconName="wallet" size={140} />
                <Text style={styles.emptyTitle}>Your bank is empty</Text>
                <Text style={styles.emptySub}>
                  Buy a reward from the Shop. It lands here for whenever you&apos;re ready to use it.
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Ready to use</Text>
                  <Text style={styles.sectionMeta}>
                    {banked.data!.length}{' '}
                    {banked.data!.length === 1 ? 'item' : 'items'}
                  </Text>
                </View>
                <View style={styles.bankList}>
                  {banked.data!.map((b) => (
                    <View key={b.id} style={styles.bankCard}>
                      <View style={styles.bankIconWrap}>
                        <Ionicons
                          name={b.reward_icon as never}
                          size={20}
                          color={tokens.semantic.coin}
                        />
                      </View>
                      <View style={styles.bankBody}>
                        <Text style={styles.bankTitle} numberOfLines={1}>
                          {b.reward_title}
                        </Text>
                        <View style={styles.bankMetaRow}>
                          <CoinIcon size={10} />
                          <Text style={styles.bankMetaCost}>
                            {b.cost_paid.toLocaleString()}
                          </Text>
                          <Text style={styles.bankMetaDot}>·</Text>
                          <Text style={styles.bankMetaTime}>
                            bought {timeAgo(b.redeemed_at)}
                          </Text>
                        </View>
                      </View>
                      <Pressable
                        disabled={usingId === b.id}
                        onPress={() => handleUse(b)}
                        style={({ pressed }) => [
                          styles.useBtn,
                          pressed && { opacity: 0.85 },
                          usingId === b.id && { opacity: 0.6 },
                        ]}
                        hitSlop={6}
                      >
                        {usingId === b.id ? (
                          <ActivityIndicator size="small" color={tokens.text.hi} />
                        ) : (
                          <>
                            <Ionicons name="checkmark-circle" size={14} color={tokens.text.hi} />
                            <Text style={styles.useBtnText}>Use</Text>
                          </>
                        )}
                      </Pressable>
                    </View>
                  ))}
                </View>
              </>
            )}
          </>
        )}

        {view === 'used' && (
          <>
            {used.isLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={tokens.brand.violet2} />
              </View>
            ) : (used.data?.length ?? 0) === 0 ? (
              <View style={styles.emptyBox}>
                <EmptyHero tone="coin" iconName="gift" size={140} />
                <Text style={styles.emptyTitle}>Nothing used yet</Text>
                <Text style={styles.emptySub}>
                  Once you use a reward from your Bank, it shows up here.
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Used</Text>
                  <Text style={styles.sectionMeta}>
                    {used.data!.length}{' '}
                    {used.data!.length === 1 ? 'item' : 'items'}
                  </Text>
                </View>
                <View style={styles.historyList}>
                  {used.data!.map((r) => (
                    <View key={r.id} style={styles.historyRow}>
                      <View style={styles.historyIconWrap}>
                        <Ionicons
                          name={r.reward_icon as never}
                          size={16}
                          color={tokens.text.mid}
                        />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.historyTitle} numberOfLines={1}>
                          {r.reward_title}
                        </Text>
                        <Text style={styles.historyMeta}>
                          used {r.used_at ? timeAgo(r.used_at) : ''}
                        </Text>
                      </View>
                      <View style={styles.historyCost}>
                        <CoinIcon size={11} />
                        <Text style={styles.historyCostText}>
                          −{r.cost_paid.toLocaleString()}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
      </ScreenBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.bg.deep },
  content: {
    padding: tokens.space[4],
    paddingBottom: tokens.layout.bottomNavClearance,
  },
  balanceHero: {
    alignItems: 'center',
    paddingTop: tokens.space[4],
    paddingBottom: tokens.space[5],
    gap: tokens.space[2],
  },
  balanceEyebrow: {
    ...tokens.type.eyebrow,
    color: tokens.semantic.coin2,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    marginTop: 4,
  },
  balanceValue: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 56,
    lineHeight: 56,
    color: tokens.semantic.coin,
    letterSpacing: -1,
  },
  balanceSub: {
    ...tokens.type.caption,
    color: tokens.text.mid,
    fontFamily: 'Manrope_600SemiBold',
    marginTop: 4,
  },
  viewToggle: {
    marginBottom: tokens.space[5],
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.space[3],
  },
  gridItem: {
    width: '48%',
    flexGrow: 1,
  },

  // BANK — hero rows with the explicit "Use" CTA
  bankList: {
    gap: tokens.space[3],
  },
  bankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    paddingHorizontal: tokens.space[3],
    paddingVertical: tokens.space[3],
    backgroundColor: tokens.bg.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,200,61,0.25)',
  },
  bankIconWrap: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.md,
    backgroundColor: 'rgba(255, 200, 61, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  bankTitle: {
    ...tokens.type.bodyLg,
    fontFamily: 'Manrope_700Bold',
    color: tokens.text.hi,
  },
  bankMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bankMetaCost: {
    ...tokens.type.caption,
    color: tokens.semantic.coin,
    fontFamily: 'Manrope_700Bold',
  },
  bankMetaDot: {
    ...tokens.type.caption,
    color: tokens.text.dim,
  },
  bankMetaTime: {
    ...tokens.type.caption,
    color: tokens.text.dim,
  },
  useBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: tokens.space[3],
    paddingVertical: tokens.space[2],
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.semantic.xp,
    minWidth: 64,
    justifyContent: 'center',
  },
  useBtnText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 12,
    color: tokens.text.hi,
    letterSpacing: 0.3,
  },

  // USED history (compact list)
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
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
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
    color: tokens.text.dim,
    fontFamily: 'Manrope_700Bold',
  },

  addCardWrap: {
    marginTop: tokens.space[4],
  },
});
