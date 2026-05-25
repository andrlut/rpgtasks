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
import { useBottomNavClearance } from '@/components/BottomNavBar';
import { CoinIcon } from '@/components/CoinIcon';
import { EmptyHero } from '@/components/EmptyHero';
import { RewardActionSheet } from '@/components/RewardActionSheet';
import { RewardCard } from '@/components/RewardCard';
import { ScreenBackground } from '@/components/ScreenBackground';
import { TemplateCard } from '@/components/TemplateCard';
import { TrackedRewardCard } from '@/components/TrackedRewardCard';
import { TrackPickerSheet } from '@/components/TrackPickerSheet';
import { VaultBankCard } from '@/components/VaultBankCard';
import { VaultHero } from '@/components/VaultHero';
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
import { useT } from '@/lib/i18n';
import { timeAgo } from '@/lib/time';
import { confirmAction, showInfo } from '@/lib/util/confirm';
import { tokens } from '@/theme';
import { REWARD_CATEGORY_META, REWARD_CATEGORY_ORDER } from '@/theme/rewards';

type RewardView = 'shop' | 'bank' | 'used';

/** Rewards with a deficit ≤ this go to "Almost there"; the rest, to "Big goals". */
const ALMOST_THRESHOLD = 800;

export default function RewardsScreen() {
  const router = useRouter();
  const { t } = useT();
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
  // Additive category filter. Empty set = no filter active (everything
  // shows). Tapping a chip adds it to the filter; tapping it again
  // removes it. When the user empties the set back out, they're "back to
  // showing everything" — same state as the initial render.
  // Chips render in 3 states: rest (no filter active), selected (in
  // filter), and ghosted (filter active but this chip not selected).
  const [selectedCategories, setSelectedCategories] = useState<Set<RewardCategory>>(
    () => new Set(),
  );
  const filterActive = selectedCategories.size > 0;
  const [view, setView] = useState<RewardView>('shop');
  const [pickerOpen, setPickerOpen] = useState(false);
  // Long-press → open this reward's action sheet. Single source of truth
  // for the sheet so it stays bound to one reward across re-renders.
  const [actionSheetReward, setActionSheetReward] = useState<Reward | null>(null);
  const bottomClearance = useBottomNavClearance();

  const coins = character.data?.character.coins ?? 0;
  const bankCount = banked.data?.length ?? 0;
  const trackedReward = useMemo(
    () =>
      trackedId.data
        ? (rewards.data ?? []).find((r) => r.id === trackedId.data) ?? null
        : null,
    [trackedId.data, rewards.data],
  );

  // Reward set after applying the category filter, with the tracked
  // reward removed (it gets its own hero card so we don't duplicate).
  // Empty filter set = no filter (everything passes the category gate).
  const filteredRewards = useMemo(() => {
    return (rewards.data ?? []).filter(
      (r) =>
        (!filterActive || selectedCategories.has(r.category)) &&
        r.id !== trackedId.data,
    );
  }, [rewards.data, selectedCategories, filterActive, trackedId.data]);

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
  // by the same selected-categories set. Empty set = no filter.
  const visibleTemplates = useMemo(() => {
    const owned = new Set(
      (rewards.data ?? []).map((r) => r.title.trim().toLowerCase()),
    );
    return (templates.data ?? []).filter(
      (tmpl) =>
        (!filterActive || selectedCategories.has(tmpl.category)) &&
        !owned.has(tmpl.title.trim().toLowerCase()),
    );
  }, [templates.data, rewards.data, selectedCategories, filterActive]);

  // Headline for the hero. The deficit number deliberately lives ONLY in
  // the TrackedRewardCard below — repeating it here read as duplication.
  // The hero phrase stays short and identity-focused.
  const headline = useMemo(() => {
    if (trackedReward) {
      const deficit = Math.max(0, trackedReward.cost - coins);
      return deficit > 0
        ? t('rewards.vault.heroStatusTrackable', { title: trackedReward.title })
        : t('rewards.vault.heroStatusReady', { title: trackedReward.title });
    }
    return t('rewards.vault.heroStatusIdle');
  }, [trackedReward, coins, t]);

  const toggleCategory = (cat: RewardCategory) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        // Removing the last chip lands us back in "no filter active",
        // which is the same visual as "haven't picked anything yet".
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
    Haptics.selectionAsync().catch(() => {});
  };

  const openActionSheet = (reward: Reward) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setActionSheetReward(reward);
  };

  const handleEditReward = (reward: Reward) => {
    router.push({ pathname: '/reward-form', params: { id: reward.id } });
  };

  const handleArchiveReward = async (reward: Reward) => {
    const ok = await confirmAction(
      t('reward.shop.archiveTitle', { title: reward.title }),
      t('reward.shop.archiveBody'),
      {
        okText: t('reward.shop.archiveOk'),
        cancelText: t('reward.common.cancel'),
        destructive: true,
      },
    );
    if (!ok) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    try {
      await archiveReward.mutateAsync(reward.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      showInfo(t('reward.shop.archiveFail'), msg);
    }
  };

  const handleBuy = async (reward: Reward) => {
    if (coins < reward.cost) {
      showInfo(
        t('reward.shop.notEnoughTitle'),
        t('reward.shop.notEnoughBody', { deficit: reward.cost - coins }),
      );
      return;
    }
    const ok = await confirmAction(
      t('reward.shop.buyTitle', { title: reward.title }),
      t('reward.shop.buyBody', { cost: reward.cost }),
      { okText: t('reward.shop.buyOk'), cancelText: t('reward.common.cancel') },
    );
    if (!ok) return;
    setRedeemingId(reward.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    try {
      await redeem.mutateAsync({ rewardId: reward.id, cost: reward.cost });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      showInfo(t('reward.shop.buyFail'), msg);
    } finally {
      setRedeemingId(null);
    }
  };

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
            onEdit={() => handleEditReward(reward)}
            onLongPress={() => openActionSheet(reward)}
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
        contentContainerStyle={[styles.content, { paddingBottom: bottomClearance }]}
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
        <VaultHero
          balanceLabel={coins.toLocaleString()}
          status={
            view === 'shop'
              ? headline
              : view === 'bank'
                ? bankCount > 0
                  ? t('rewards.vault.itemsCount', { count: bankCount })
                  : t('rewards.vault.heroStatusIdle')
                : t('rewards.vault.itemsCount', { count: (used.data ?? []).length })
          }
        />

        {/* Bank CTA — only when there's actually stuff to retrieve and
            the user isn't already on the bank tab. A second route to
            the Bank that's contextual and dismisses itself. */}
        {bankCount > 0 && view !== 'bank' && (
          <Pressable
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              setView('bank');
            }}
            style={({ pressed }) => [
              styles.bankCta,
              pressed && { opacity: 0.85 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('rewards.bankCta.title', { count: bankCount })}
          >
            <View style={styles.bankCtaIcon}>
              <Ionicons name="wallet" size={18} color="#FFC83D" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.bankCtaTitle} numberOfLines={1}>
                {t('rewards.bankCta.title', { count: bankCount })}
              </Text>
              <Text style={styles.bankCtaSub}>{t('rewards.bankCta.sub')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#FFE3A6" />
          </Pressable>
        )}

        <View style={styles.tabRow}>
          {(
            [
              { value: 'shop', label: t('rewards.vault.tabs.shop') },
              {
                value: 'bank',
                label: t('rewards.vault.tabs.bank', { count: bankCount }),
              },
              { value: 'used', label: t('rewards.vault.tabs.used') },
            ] as { value: RewardView; label: string }[]
          ).map((tab) => {
            const active = view === tab.value;
            return (
              <Pressable
                key={tab.value}
                onPress={() => {
                  if (!active) Haptics.selectionAsync().catch(() => {});
                  setView(tab.value);
                }}
                style={({ pressed }) => [
                  styles.tabBtn,
                  active && styles.tabBtnActive,
                  pressed && { opacity: 0.85 },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    active ? styles.tabLabelActive : styles.tabLabelInactive,
                  ]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
          <View style={{ flex: 1 }} />
          <Pressable
            onPress={() => router.push('/rewards-manage')}
            style={({ pressed }) => [
              styles.manageBtn,
              pressed && { opacity: 0.6 },
            ]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('rewards.manage.title')}
          >
            <Ionicons name="settings-outline" size={18} color={tokens.text.mid} />
          </Pressable>
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
                  onLongPress={() => openActionSheet(trackedReward)}
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
                const selected = selectedCategories.has(cat);
                // Three states: 'rest' (no filter active), 'selected'
                // (in active filter) or 'ghosted' (filter active but
                // this chip not in it). 'rest' renders mid-key so the
                // user reads "tap to filter"; 'selected' goes full
                // category color; 'ghosted' fades to make the filter
                // state legible at a glance.
                const variant: 'rest' | 'selected' | 'ghosted' = !filterActive
                  ? 'rest'
                  : selected
                    ? 'selected'
                    : 'ghosted';
                const iconColor =
                  variant === 'selected'
                    ? m.color
                    : variant === 'ghosted'
                      ? tokens.text.faint
                      : m.color;
                const textColor =
                  variant === 'selected'
                    ? m.color
                    : variant === 'ghosted'
                      ? tokens.text.faint
                      : tokens.text.mid;
                return (
                  <Pressable
                    key={cat}
                    onPress={() => toggleCategory(cat)}
                    style={[
                      styles.chip,
                      variant === 'selected' && {
                        backgroundColor: `${m.color}1A`,
                        borderTopColor: `${m.color}80`,
                        borderColor: `${m.color}70`,
                      },
                      variant === 'ghosted' && styles.chipGhosted,
                      variant === 'rest' && styles.chipRest,
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <Ionicons
                      name={m.icon as never}
                      size={14}
                      color={iconColor}
                    />
                    <Text style={[styles.chipText, { color: textColor }]}>
                      {t(`rewards.categories.${cat}` as const)}
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
                      <Text
                        style={[styles.sectionTitle, { color: '#FFC83D' }]}
                      >
                        {t('rewards.vault.sections.available')}
                      </Text>
                      <Text style={styles.sectionMeta}>
                        {t('rewards.vault.itemsCount', {
                          count: sections.available.length,
                        })}
                      </Text>
                    </View>
                    {renderRewardGrid(sections.available)}
                  </View>
                )}

                {sections.almost.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Text
                        style={[styles.sectionTitle, { color: '#FF9F43' }]}
                      >
                        {t('rewards.vault.sections.almost')}
                      </Text>
                      <Text style={styles.sectionMeta}>
                        {t('rewards.vault.itemsCount', {
                          count: sections.almost.length,
                        })}
                      </Text>
                    </View>
                    {renderRewardGrid(sections.almost)}
                  </View>
                )}

                {sections.bigGoals.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Text
                        style={[styles.sectionTitle, { color: '#9B82FF' }]}
                      >
                        {t('rewards.vault.sections.big')}
                      </Text>
                      <Text style={styles.sectionMeta}>
                        {t('rewards.vault.itemsCount', {
                          count: sections.bigGoals.length,
                        })}
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
                  {visibleTemplates.map((tmpl) => (
                    <TemplateCard
                      key={tmpl.id}
                      template={tmpl}
                      onAdd={() => handleAddTemplate(tmpl)}
                      isAdding={addingTemplateId === tmpl.id}
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
                  <Text style={[styles.sectionTitle, { color: '#FFC83D' }]}>
                    {t('rewards.vault.sections.available')}
                  </Text>
                  <Text style={styles.sectionMeta}>
                    {t('rewards.vault.itemsCount', {
                      count: banked.data!.length,
                    })}
                  </Text>
                </View>
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
                    />
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
                  <Text style={styles.sectionTitle}>
                    {t('rewards.title')}
                  </Text>
                  <Text style={styles.sectionMeta}>
                    {t('rewards.vault.itemsCount', {
                      count: used.data!.length,
                    })}
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

      <RewardActionSheet
        visible={!!actionSheetReward}
        rewardTitle={actionSheetReward?.title ?? ''}
        onCancel={() => setActionSheetReward(null)}
        onEdit={() => {
          const r = actionSheetReward;
          setActionSheetReward(null);
          if (r) handleEditReward(r);
        }}
        onArchive={() => {
          const r = actionSheetReward;
          setActionSheetReward(null);
          if (r) handleArchiveReward(r);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.bg.deep },
  content: {
    padding: tokens.space[4],
  },
  // Underline view tabs (Loja / Banco · N / Histórico)
  tabRow: {
    flexDirection: 'row',
    gap: 18,
    paddingHorizontal: 0,
    marginTop: tokens.space[3],
    marginBottom: tokens.space[5],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.border.base,
  },
  tabBtn: {
    paddingTop: tokens.space[2],
    paddingBottom: tokens.space[3],
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    // Negative margin lifts the bottom border under the row border so the
    // active gold underline reads as continuous with the divider.
    marginBottom: -StyleSheet.hairlineWidth,
  },
  tabBtnActive: {
    borderBottomColor: '#FFC83D',
  },
  tabLabel: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  manageBtn: {
    paddingTop: tokens.space[2],
    paddingBottom: tokens.space[3],
    paddingHorizontal: 4,
    // Match tabBtn vertical rhythm so the icon's baseline sits on the
    // divider, not floating above it.
    marginBottom: -StyleSheet.hairlineWidth,
  },
  tabLabelActive: {
    color: tokens.text.hi,
  },
  tabLabelInactive: {
    color: tokens.text.mid,
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
    paddingVertical: 10,
    paddingHorizontal: tokens.space[2],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tokens.border.base,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  // Initial state — no filter active. Mid-key so it reads as "tap to filter".
  chipRest: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderColor: tokens.border.base,
  },
  // Filter is active and this chip is NOT in it. Faded so the active
  // chips visually dominate; user can see at a glance which ones are on.
  chipGhosted: {
    backgroundColor: 'rgba(255,255,255,0.01)',
    borderColor: tokens.border.base,
    opacity: 0.4,
  },
  chipText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
    letterSpacing: 0.4,
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

  // BANK — list spacing only; the row is VaultBankCard
  bankList: {
    gap: tokens.space[2],
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

  // Bank CTA — gold-tinted pill sitting between the hero and the tab
  // row, only when bankCount > 0 and the user isn't already on the
  // Bank tab. Communicates "you have stuff to enjoy" without making
  // the user hunt for it.
  bankCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    marginTop: tokens.space[3],
    marginBottom: tokens.space[1],
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[3],
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 200, 61, 0.35)',
    backgroundColor: 'rgba(255, 200, 61, 0.08)',
  },
  bankCtaIcon: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.md,
    backgroundColor: 'rgba(255, 200, 61, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankCtaTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: '#FFE3A6',
  },
  bankCtaSub: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    color: tokens.text.mid,
    marginTop: 2,
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
