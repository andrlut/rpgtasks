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
import { TrackedRewardCard } from '@/components/TrackedRewardCard';
import { TrackPickerSheet } from '@/components/TrackPickerSheet';
import { useCharacter } from '@/lib/api/character';
import {
  useAddTemplateToShop,
  useArchiveReward,
  useBankedRewards,
  useRedeemReward,
  useRewardTemplates,
  useRewards,
  useSetTrackedReward,
  useTrackedRewardId,
  useUseReward,
  useUsedRewards,
} from '@/lib/api/rewards';
import type { Reward, RewardCategory, RewardTemplate } from '@/lib/db/types';
import { timeAgo } from '@/lib/time';
import { confirmAction, showInfo } from '@/lib/util/confirm';
import { tokens } from '@/theme';
import { REWARD_CATEGORY_META, REWARD_CATEGORY_ORDER } from '@/theme/rewards';

type RewardView = 'shop' | 'bank' | 'used';

/** Rewards with a deficit ≤ this go to "Almost there"; the rest, to "Big goals". */
const ALMOST_THRESHOLD = 800;

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
  const trackedId = useTrackedRewardId();
  const setTracked = useSetTrackedReward();

  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [usingId, setUsingId] = useState<string | null>(null);
  const [addingTemplateId, setAddingTemplateId] = useState<string | null>(null);
  // Multi-toggle category filter. Default all on; user can mute one or two
  // but never all three (the last enabled chip is non-deactivatable).
  const [enabledCategories, setEnabledCategories] = useState<Set<RewardCategory>>(
    new Set(REWARD_CATEGORY_ORDER),
  );
  const [view, setView] = useState<RewardView>('shop');
  const [pickerOpen, setPickerOpen] = useState(false);

  const coins = character.data?.character.coins ?? 0;
  const bankCount = banked.data?.length ?? 0;
  const trackedReward = useMemo(
    () =>
      trackedId.data
        ? (rewards.data ?? []).find((r) => r.id === trackedId.data) ?? null
        : null,
    [trackedId.data, rewards.data],
  );

  // Reward set after applying the category multi-toggle filter, with the
  // tracked reward removed (it gets its own hero card so we don't duplicate).
  const filteredRewards = useMemo(() => {
    return (rewards.data ?? []).filter(
      (r) => enabledCategories.has(r.category) && r.id !== trackedId.data,
    );
  }, [rewards.data, enabledCategories, trackedId.data]);

  // Bucket every visible reward into exactly one section so the screen
  // partitions cleanly with no overlap or orphans.
  const sections = useMemo(() => {
    const available: Reward[] = [];
    const almost: Reward[] = [];
    const bigGoals: Reward[] = [];

    for (const r of filteredRewards) {
      const deficit = r.cost - coins;
      if (deficit <= 0) {
        available.push(r);
      } else if (deficit <= ALMOST_THRESHOLD) {
        almost.push(r);
      } else {
        bigGoals.push(r);
      }
    }

    almost.sort((a, b) => a.cost - coins - (b.cost - coins));
    bigGoals.sort((a, b) => b.cost - a.cost);

    return { available, almost, bigGoals };
  }, [filteredRewards, coins]);

  // Templates we don't already own (case-insensitive title match), filtered
  // by the same enabled-categories set.
  const visibleTemplates = useMemo(() => {
    const owned = new Set(
      (rewards.data ?? []).map((r) => r.title.trim().toLowerCase()),
    );
    return (templates.data ?? []).filter(
      (t) =>
        enabledCategories.has(t.category) &&
        !owned.has(t.title.trim().toLowerCase()),
    );
  }, [templates.data, rewards.data, enabledCategories]);

  // Headline for the hero. Mirrors the mock's narrative copy.
  const headline = useMemo(() => {
    if (trackedReward) {
      const deficit = Math.max(0, trackedReward.cost - coins);
      return deficit > 0
        ? `${deficit.toLocaleString()} to go for ${trackedReward.title}`
        : `${trackedReward.title} is yours to claim`;
    }
    const affordable = sections.available.length;
    if (affordable === 0) return 'Earn some coins to unlock rewards';
    return `You can buy ${affordable} ${affordable === 1 ? 'reward' : 'rewards'} now`;
  }, [trackedReward, coins, sections.available.length]);

  const toggleCategory = (cat: RewardCategory) => {
    setEnabledCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        // Don't allow disabling the last active chip.
        if (next.size === 1) return prev;
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
    Haptics.selectionAsync().catch(() => {});
  };

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

  const handleTrack = (rewardId: string) => {
    setTracked.mutate(rewardId);
  };

  const handleUntrack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setTracked.mutate(null);
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

  const renderRewardGrid = (list: Reward[]) => (
    <View style={styles.grid}>
      {list.map((reward) => (
        <View key={reward.id} style={styles.gridItem}>
          <RewardCard
            reward={reward}
            affordable={coins >= reward.cost}
            deficit={Math.max(0, reward.cost - coins)}
            coins={coins}
            tracked={trackedId.data === reward.id}
            onRedeem={() => handleBuy(reward)}
            onEdit={() => handleRewardActions(reward)}
            onLongPress={() => handleRewardActions(reward)}
            onTrack={() => handleTrack(reward.id)}
            onUntrack={handleUntrack}
            isRedeeming={redeemingId === reward.id}
          />
        </View>
      ))}
    </View>
  );

  const noRewardsAtAll = (rewards.data ?? []).length === 0;

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
          <View style={styles.balanceRow}>
            <CoinIcon size={48} />
            <Text style={styles.balanceValue}>{coins.toLocaleString()}</Text>
          </View>
          <Text style={styles.headline} numberOfLines={2}>
            {view === 'shop'
              ? headline
              : view === 'bank'
                ? bankCount > 0
                  ? `${bankCount} ${bankCount === 1 ? 'reward' : 'rewards'} ready to use`
                  : 'Your bank is waiting on a first buy'
                : `${(used.data ?? []).length} redeemed lifetime`}
          </Text>
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
            {trackedReward ? (
              <View style={styles.trackedWrap}>
                <TrackedRewardCard
                  reward={trackedReward}
                  coins={coins}
                  onChange={() => setPickerOpen(true)}
                  onUntrack={handleUntrack}
                  onBuy={() => handleBuy(trackedReward)}
                  isBuying={redeemingId === trackedReward.id}
                />
              </View>
            ) : (
              <Pressable
                onPress={() => setPickerOpen(true)}
                style={({ pressed }) => [
                  styles.trackCta,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <View style={styles.trackCtaIcon}>
                  <Ionicons name="bookmark" size={18} color={tokens.brand.violet2} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.trackCtaTitle}>Track a reward</Text>
                  <Text style={styles.trackCtaSub}>
                    Pin one to keep its progress close.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={tokens.text.mid} />
              </Pressable>
            )}

            <View style={styles.chipsRow}>
              {REWARD_CATEGORY_ORDER.map((cat) => {
                const m = REWARD_CATEGORY_META[cat];
                const active = enabledCategories.has(cat);
                return (
                  <Pressable
                    key={cat}
                    onPress={() => toggleCategory(cat)}
                    style={[
                      styles.chip,
                      active
                        ? { backgroundColor: m.bg, borderColor: m.color }
                        : styles.chipMuted,
                    ]}
                  >
                    <Ionicons
                      name={m.icon as never}
                      size={14}
                      color={active ? m.color : tokens.text.dim}
                    />
                    <Text
                      style={[
                        styles.chipText,
                        { color: active ? m.color : tokens.text.dim },
                      ]}
                    >
                      {m.short}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {rewards.isLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={tokens.brand.violet2} />
              </View>
            ) : noRewardsAtAll ? (
              <View style={styles.emptyBox}>
                <Ionicons name="gift-outline" size={40} color={tokens.brand.violet2} />
                <Text style={styles.emptyTitle}>Your shop is empty</Text>
                <Text style={styles.emptySub}>
                  Tap a suggestion below to add it, or create your own.
                </Text>
              </View>
            ) : (
              <>
                {sections.available.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>Available now</Text>
                      <Text style={styles.sectionMeta}>
                        {sections.available.length}
                      </Text>
                    </View>
                    {renderRewardGrid(sections.available)}
                  </View>
                )}

                {sections.almost.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>Almost there</Text>
                      <Text style={styles.sectionMeta}>
                        {sections.almost.length}
                      </Text>
                    </View>
                    {renderRewardGrid(sections.almost)}
                  </View>
                )}

                {sections.bigGoals.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>Big goals</Text>
                      <Text style={styles.sectionMeta}>
                        {sections.bigGoals.length}
                      </Text>
                    </View>
                    {renderRewardGrid(sections.bigGoals)}
                  </View>
                )}
              </>
            )}

            <View style={styles.addCardWrap}>
              <AddCard
                label="New reward"
                sublabel="Add a custom one"
                tint={tokens.brand.violet2}
                onPress={() => router.push('/reward-form')}
              />
            </View>

            {visibleTemplates.length > 0 && (
              <View style={[styles.section, { marginTop: tokens.space[6] }]}>
                <View style={styles.sectionHeader}>
                  <View style={styles.inspirationLabel}>
                    <Ionicons name="bulb" size={14} color={tokens.text.mid} />
                    <Text style={styles.sectionTitle}>Inspiration</Text>
                  </View>
                  <Text style={styles.sectionMeta}>tap to add</Text>
                </View>
                <View style={styles.list}>
                  {visibleTemplates.map((t) => (
                    <TemplateCard
                      key={t.id}
                      template={t}
                      onAdd={() => handleAddTemplate(t)}
                      isAdding={addingTemplateId === t.id}
                    />
                  ))}
                </View>
              </View>
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
                  {banked.data!.map((b) => {
                    const cat = b.reward_category
                      ? REWARD_CATEGORY_META[b.reward_category]
                      : null;
                    return (
                      <View key={b.id} style={styles.bankCard}>
                        <View
                          style={[
                            styles.bankIconWrap,
                            cat
                              ? { backgroundColor: cat.bg }
                              : { backgroundColor: 'rgba(255,255,255,0.05)' },
                          ]}
                        >
                          <Ionicons
                            name={b.reward_icon as never}
                            size={20}
                            color={cat ? cat.color : tokens.text.mid}
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
                              {timeAgo(b.redeemed_at)}
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
                            <Text style={styles.useBtnText}>Use</Text>
                          )}
                        </Pressable>
                      </View>
                    );
                  })}
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
                  {used.data!.map((r) => {
                    const cat = r.reward_category
                      ? REWARD_CATEGORY_META[r.reward_category]
                      : null;
                    return (
                      <View key={r.id} style={styles.historyRow}>
                        <View
                          style={[
                            styles.historyIconWrap,
                            cat
                              ? { backgroundColor: cat.bg }
                              : { backgroundColor: 'rgba(255,255,255,0.05)' },
                          ]}
                        >
                          <Ionicons
                            name={r.reward_icon as never}
                            size={14}
                            color={cat ? cat.color : tokens.text.mid}
                          />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.historyTitle} numberOfLines={1}>
                            {r.reward_title}
                          </Text>
                          <Text style={styles.historyMeta}>
                            {r.used_at ? timeAgo(r.used_at) : ''}
                          </Text>
                        </View>
                        <View style={styles.historyCost}>
                          <CoinIcon size={11} />
                          <Text style={styles.historyCostText}>
                            −{r.cost_paid.toLocaleString()}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
      </ScreenBackground>

      <TrackPickerSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        rewards={rewards.data ?? []}
        coins={coins}
        currentTrackedId={trackedId.data ?? null}
        onPick={handleTrack}
      />
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
    paddingTop: tokens.space[3],
    paddingBottom: tokens.space[4],
    gap: tokens.space[2],
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
  },
  balanceValue: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 56,
    lineHeight: 56,
    color: tokens.semantic.coin,
    letterSpacing: -1,
  },
  headline: {
    ...tokens.type.body,
    color: tokens.text.mid,
    fontFamily: 'Manrope_600SemiBold',
    textAlign: 'center',
    marginTop: 2,
    paddingHorizontal: tokens.space[4],
  },
  viewToggle: {
    marginBottom: tokens.space[5],
  },
  chipsRow: {
    flexDirection: 'row',
    gap: tokens.space[2],
    marginBottom: tokens.space[5],
  },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: tokens.space[3],
    paddingHorizontal: tokens.space[2],
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.border.base,
    backgroundColor: tokens.bg.surface,
  },
  chipMuted: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: tokens.border.base,
    opacity: 0.7,
  },
  chipText: {
    ...tokens.type.caption,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 0.3,
  },
  section: {
    marginBottom: tokens.space[5],
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

  // BANK — clean rows with category-tinted tile + green USE pill
  bankList: {
    gap: tokens.space[2],
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
    borderColor: tokens.border.base,
  },
  bankIconWrap: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.md,
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
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[2],
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.semantic.xp,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  useBtnText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 12,
    color: '#062416',
    letterSpacing: 0.4,
  },

  // USED history — leanest possible row, same visual language as bank
  historyList: {
    gap: tokens.space[1],
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    paddingHorizontal: tokens.space[3],
    paddingVertical: tokens.space[2],
    borderRadius: tokens.radius.md,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  historyIconWrap: {
    width: 28,
    height: 28,
    borderRadius: tokens.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyTitle: {
    ...tokens.type.body,
    color: tokens.text.base,
    fontFamily: 'Manrope_600SemiBold',
  },
  historyMeta: {
    ...tokens.type.caption,
    color: tokens.text.dim,
    fontSize: 11,
    marginTop: 1,
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
    marginTop: tokens.space[2],
  },

  // Tracked reward block
  trackedWrap: {
    marginBottom: tokens.space[4],
  },
  trackCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[3],
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.border.base,
    borderStyle: 'dashed',
    backgroundColor: tokens.bg.surface,
    marginBottom: tokens.space[4],
  },
  trackCtaIcon: {
    width: 38,
    height: 38,
    borderRadius: tokens.radius.md,
    backgroundColor: 'rgba(155, 130, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackCtaTitle: {
    ...tokens.type.bodyLg,
    color: tokens.text.hi,
    fontFamily: 'Manrope_700Bold',
  },
  trackCtaSub: {
    ...tokens.type.caption,
    color: tokens.text.mid,
    marginTop: 2,
  },
});
