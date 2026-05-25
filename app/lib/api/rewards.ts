import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Reward, RewardCategory, RewardTemplate } from '@/lib/db/types';
import { getCurrentLocale } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';

import { characterKeys, useCharacter, type CharacterWithProfile } from './character';

export const rewardKeys = {
  all: ['rewards'] as const,
  active: () => [...rewardKeys.all, 'active'] as const,
  archived: () => [...rewardKeys.all, 'archived'] as const,
  detail: (id: string) => [...rewardKeys.all, 'detail', id] as const,
  templates: () => [...rewardKeys.all, 'templates'] as const,
  bank: () => [...rewardKeys.all, 'bank'] as const,
  used: () => [...rewardKeys.all, 'used'] as const,
  tracked: () => [...rewardKeys.all, 'tracked'] as const,
};

export interface RedemptionEntry {
  id: string;
  reward_id: string;
  redeemed_at: string;
  used_at: string | null;
  cost_paid: number;
  reward_title: string;
  reward_icon: string;
  reward_category: RewardCategory | null;
}

interface RedemptionRow {
  id: string;
  reward_id: string;
  redeemed_at: string;
  used_at: string | null;
  cost_paid: number;
  reward:
    | { title: string; icon: string; category: RewardCategory | null }
    | { title: string; icon: string; category: RewardCategory | null }[]
    | null;
}

function mapRedemption(r: RedemptionRow): RedemptionEntry {
  const reward = Array.isArray(r.reward) ? r.reward[0] : r.reward;
  return {
    id: r.id,
    reward_id: r.reward_id,
    redeemed_at: r.redeemed_at,
    used_at: r.used_at,
    cost_paid: r.cost_paid,
    reward_title: reward?.title ?? '(removed reward)',
    reward_icon: reward?.icon ?? 'gift',
    reward_category: reward?.category ?? null,
  };
}

/** Bought-but-not-yet-used. The "bank". Newest first. */
export function useBankedRewards() {
  return useQuery({
    queryKey: rewardKeys.bank(),
    queryFn: async (): Promise<RedemptionEntry[]> => {
      const { data, error } = await supabase
        .from('reward_redemption')
        .select('id, reward_id, redeemed_at, used_at, cost_paid, reward:reward_id ( title, icon, category )')
        .is('used_at', null)
        .order('redeemed_at', { ascending: false });
      if (error) throw error;
      return ((data ?? []) as RedemptionRow[]).map(mapRedemption);
    },
  });
}

/** Already-used redemptions. The "history". Newest first, capped. */
export function useUsedRewards(limit: number = 50) {
  return useQuery({
    queryKey: rewardKeys.used(),
    queryFn: async (): Promise<RedemptionEntry[]> => {
      const { data, error } = await supabase
        .from('reward_redemption')
        .select('id, reward_id, redeemed_at, used_at, cost_paid, reward:reward_id ( title, icon, category )')
        .not('used_at', 'is', null)
        .order('used_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return ((data ?? []) as RedemptionRow[]).map(mapRedemption);
    },
  });
}

export interface RewardFormInput {
  title: string;
  description: string | null;
  cost: number;
  icon: string;
  category: RewardCategory;
}

async function fetchActiveRewards(): Promise<Reward[]> {
  const { data, error } = await supabase
    .from('reward')
    .select('*')
    .eq('is_archived', false)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Reward[];
}

export function useRewards() {
  return useQuery({
    queryKey: rewardKeys.active(),
    queryFn: fetchActiveRewards,
  });
}

/**
 * Archived rewards — the bin behind the Manage screen. Newest archive
 * first so a just-arquivada reward sits at the top for an obvious undo.
 */
export function useArchivedRewards() {
  return useQuery({
    queryKey: rewardKeys.archived(),
    queryFn: async (): Promise<Reward[]> => {
      const { data, error } = await supabase
        .from('reward')
        .select('*')
        .eq('is_archived', true)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Reward[];
    },
  });
}

export function useReward(id: string | null | undefined) {
  return useQuery({
    queryKey: id ? rewardKeys.detail(id) : ['rewards', 'detail', 'none'],
    enabled: !!id,
    queryFn: async (): Promise<Reward | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('reward')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Reward;
    },
  });
}

export function useCreateReward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: RewardFormInput): Promise<string> => {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const userId = userData.user?.id;
      if (!userId) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('reward')
        .insert({
          character_id: userId,
          title: input.title,
          description: input.description,
          cost: input.cost,
          icon: input.icon,
          category: input.category,
        })
        .select('id')
        .single();
      if (error) throw error;
      return (data as { id: string }).id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rewardKeys.active() });
    },
  });
}

export function useUpdateReward(rewardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: RewardFormInput) => {
      const { error } = await supabase
        .from('reward')
        .update({
          title: input.title,
          description: input.description,
          cost: input.cost,
          icon: input.icon,
          category: input.category,
        })
        .eq('id', rewardId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rewardKeys.active() });
      queryClient.invalidateQueries({ queryKey: rewardKeys.detail(rewardId) });
    },
  });
}

export function useArchiveReward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (rewardId: string) => {
      const { error } = await supabase
        .from('reward')
        .update({ is_archived: true, updated_at: new Date().toISOString() })
        .eq('id', rewardId);
      if (error) throw error;
    },
    onSuccess: (_data, rewardId) => {
      queryClient.invalidateQueries({ queryKey: rewardKeys.active() });
      queryClient.invalidateQueries({ queryKey: rewardKeys.archived() });
      queryClient.invalidateQueries({ queryKey: rewardKeys.detail(rewardId) });
      // Tracked row may have pointed at this reward; clearing UX is the
      // caller's job but we re-fetch so the tracked card disappears.
      queryClient.invalidateQueries({ queryKey: rewardKeys.tracked() });
    },
  });
}

/**
 * Move an archived reward back to the active set. Bumps updated_at so
 * the Archived list re-sorts on the next fetch.
 */
export function useRestoreReward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (rewardId: string) => {
      const { error } = await supabase
        .from('reward')
        .update({ is_archived: false, updated_at: new Date().toISOString() })
        .eq('id', rewardId);
      if (error) throw error;
    },
    onSuccess: (_data, rewardId) => {
      queryClient.invalidateQueries({ queryKey: rewardKeys.active() });
      queryClient.invalidateQueries({ queryKey: rewardKeys.archived() });
      queryClient.invalidateQueries({ queryKey: rewardKeys.detail(rewardId) });
    },
  });
}

/**
 * Hard delete via RPC. Server-side gates block adopted-from-template
 * rewards and any reward with redemption history (caller should surface
 * the error message — it's safe to display verbatim, it's English-only
 * for now since the gates are intentional dead-ends, not edge cases).
 */
export function useDeleteReward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (rewardId: string) => {
      const { error } = await supabase.rpc('delete_reward', {
        p_reward_id: rewardId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rewardKeys.active() });
      queryClient.invalidateQueries({ queryKey: rewardKeys.archived() });
    },
  });
}

/**
 * Batch reorder the active rewards. Pass the full active list in the
 * order the user wants — sort_order is rewritten 1..N server-side.
 * Optimistic: we update the cached active list immediately so the drag
 * feels weightless, then reconcile on settle.
 */
export function useReorderRewards() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const { error } = await supabase.rpc('reorder_rewards', {
        p_ids: orderedIds,
      });
      if (error) throw error;
    },
    onMutate: async (orderedIds) => {
      await queryClient.cancelQueries({ queryKey: rewardKeys.active() });
      const prev = queryClient.getQueryData<Reward[]>(rewardKeys.active());
      if (prev) {
        // Rebuild the array in the new order. Any id not found is dropped
        // (shouldn't happen — caller built the list from the same cache).
        const byId = new Map(prev.map((r) => [r.id, r]));
        const next = orderedIds
          .map((id) => byId.get(id))
          .filter((r): r is Reward => !!r);
        queryClient.setQueryData<Reward[]>(rewardKeys.active(), next);
      }
      return { prev };
    },
    onError: (_err, _ids, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(rewardKeys.active(), ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: rewardKeys.active() });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Templates: public catalog users browse to add to their own shop
// ─────────────────────────────────────────────────────────────────────────────

export function useRewardTemplates() {
  return useQuery({
    queryKey: rewardKeys.templates(),
    queryFn: async (): Promise<RewardTemplate[]> => {
      const { data, error } = await supabase
        .from('reward_template')
        .select('*')
        .order('category', { ascending: true })
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as RewardTemplate[];
    },
  });
}

export function useAddTemplateToShop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (template: RewardTemplate): Promise<string> => {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const userId = userData.user?.id;
      if (!userId) throw new Error('Not authenticated');

      // Snapshot the catalog text in the user's current locale at adopt
      // time. Once it lives on `reward`, the user can rename it freely; we
      // don't keep it bilingual past the catalog boundary.
      const locale = getCurrentLocale();
      const title = locale === 'pt' && template.title_pt ? template.title_pt : template.title;
      const description =
        locale === 'pt' && template.description_pt
          ? template.description_pt
          : template.description;

      const { data, error } = await supabase
        .from('reward')
        .insert({
          character_id: userId,
          title,
          description,
          cost: template.cost,
          icon: template.icon,
          category: template.category,
        })
        .select('id')
        .single();
      if (error) throw error;
      return (data as { id: string }).id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rewardKeys.active() });
    },
  });
}

export interface RedeemResult {
  cost_paid: number;
}

/**
 * Calls redeem_reward() RPC. Optimistically deducts coins from the cached
 * character; rolls back on error. Single-unit only — for multi-buy use
 * useRedeemRewardN.
 */
export function useRedeemReward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { rewardId: string; cost: number }): Promise<RedeemResult> => {
      const { data, error } = await supabase.rpc('redeem_reward', {
        p_reward_id: params.rewardId,
      });
      if (error) throw error;
      return data as RedeemResult;
    },
    onMutate: async (params) => {
      await queryClient.cancelQueries({ queryKey: characterKeys.me() });
      const prevChar = queryClient.getQueryData<CharacterWithProfile>(characterKeys.me());
      if (prevChar) {
        queryClient.setQueryData<CharacterWithProfile>(characterKeys.me(), {
          ...prevChar,
          character: {
            ...prevChar.character,
            // Allow optimistic balance to go negative — mirrors server behaviour
            // since migration 0011 removed the >= 0 clamp on coins.
            coins: prevChar.character.coins - params.cost,
          },
        });
      }
      return { prevChar };
    },
    onError: (_err, _params, ctx) => {
      if (ctx?.prevChar) queryClient.setQueryData(characterKeys.me(), ctx.prevChar);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: characterKeys.me() });
      queryClient.invalidateQueries({ queryKey: rewardKeys.bank() });
    },
  });
}

export interface RedeemBatchResult {
  qty: number;
  unit_cost: number;
  total_paid: number;
}

/**
 * Multi-buy via the redeem_reward_n() RPC. Atomic — either all qty
 * units land in the bank or nothing does. Optimistic coin debit
 * mirrors the single-buy hook: drops balance by qty * cost up-front,
 * rolls back on error.
 */
export function useRedeemRewardN() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      rewardId: string;
      cost: number;
      qty: number;
    }): Promise<RedeemBatchResult> => {
      const { data, error } = await supabase.rpc('redeem_reward_n', {
        p_reward_id: params.rewardId,
        p_qty: params.qty,
      });
      if (error) throw error;
      return data as RedeemBatchResult;
    },
    onMutate: async (params) => {
      await queryClient.cancelQueries({ queryKey: characterKeys.me() });
      const prevChar = queryClient.getQueryData<CharacterWithProfile>(characterKeys.me());
      if (prevChar) {
        queryClient.setQueryData<CharacterWithProfile>(characterKeys.me(), {
          ...prevChar,
          character: {
            ...prevChar.character,
            coins: prevChar.character.coins - params.cost * params.qty,
          },
        });
      }
      return { prevChar };
    },
    onError: (_err, _params, ctx) => {
      if (ctx?.prevChar) queryClient.setQueryData(characterKeys.me(), ctx.prevChar);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: characterKeys.me() });
      queryClient.invalidateQueries({ queryKey: rewardKeys.bank() });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Tracking: pin one reward to keep close. Used by the wide goal card on Shop.
// Single row per character (PK on character_id), enforced server-side.
// ─────────────────────────────────────────────────────────────────────────────

/** The id of the reward currently being tracked, or null if none. */
export function useTrackedRewardId() {
  return useQuery({
    queryKey: rewardKeys.tracked(),
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase
        .from('reward_tracking')
        .select('reward_id')
        .maybeSingle();
      if (error) throw error;
      return (data?.reward_id as string | undefined) ?? null;
    },
  });
}

/**
 * Set the tracked reward. Pass `null` to clear.
 * Upsert pattern: character_id is the PK, so re-tracking another reward
 * overwrites the previous row in one round-trip.
 */
export function useSetTrackedReward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (rewardId: string | null) => {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const userId = userData.user?.id;
      if (!userId) throw new Error('Not authenticated');

      if (rewardId === null) {
        const { error } = await supabase
          .from('reward_tracking')
          .delete()
          .eq('character_id', userId);
        if (error) throw error;
        return null;
      }

      const { error } = await supabase
        .from('reward_tracking')
        .upsert(
          { character_id: userId, reward_id: rewardId, tracked_at: new Date().toISOString() },
          { onConflict: 'character_id' },
        );
      if (error) throw error;
      return rewardId;
    },
    onMutate: async (rewardId) => {
      await queryClient.cancelQueries({ queryKey: rewardKeys.tracked() });
      const prev = queryClient.getQueryData<string | null>(rewardKeys.tracked());
      queryClient.setQueryData<string | null>(rewardKeys.tracked(), rewardId);
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx) queryClient.setQueryData(rewardKeys.tracked(), ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: rewardKeys.tracked() });
    },
  });
}

/**
 * Composite view of the user's currently-tracked reward: name + progress
 * (coins vs. cost) + icon. Returns `null` when no reward is pinned, when
 * the pinned reward was archived, or while character/rewards are loading.
 *
 * Built from the two existing hooks (`useTrackedRewardId`, `useRewards`)
 * plus `useCharacter` for coin balance — the Home header binds to this
 * to render the row 2 progress bar without coupling to the rewards screen.
 */
export function useTrackedReward(): {
  name: string;
  currentCoins: number;
  totalCoins: number;
  icon: string;
} | null {
  const trackedId = useTrackedRewardId();
  const rewards = useRewards();
  const character = useCharacter();
  if (!trackedId.data) return null;
  const reward = (rewards.data ?? []).find((r) => r.id === trackedId.data);
  if (!reward) return null;
  const coins = character.data?.character.coins ?? 0;
  return {
    name: reward.title,
    currentCoins: Math.min(coins, reward.cost),
    totalCoins: reward.cost,
    icon: reward.icon,
  };
}

/** Mark a banked redemption as used (consumed). */
export function useUseReward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (redemptionId: string) => {
      const { data, error } = await supabase.rpc('use_reward', {
        p_redemption_id: redemptionId,
      });
      if (error) throw error;
      return data as { used_at: string };
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: rewardKeys.bank() });
      queryClient.invalidateQueries({ queryKey: rewardKeys.used() });
    },
  });
}

/**
 * Sell a banked redemption back for a full coin refund. The redemption
 * row is deleted; consumed (used_at != null) ones are rejected by the
 * RPC. Optimistically removes the row from the bank cache and bumps
 * coins; rolls back the cache on error.
 */
export function useSellReward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      redemptionId: string;
      refund: number;
    }): Promise<{ refund: number }> => {
      const { data, error } = await supabase.rpc('sell_reward', {
        p_redemption_id: params.redemptionId,
      });
      if (error) throw error;
      return data as { refund: number };
    },
    onMutate: async (params) => {
      await queryClient.cancelQueries({ queryKey: rewardKeys.bank() });
      await queryClient.cancelQueries({ queryKey: characterKeys.me() });
      const prevBank = queryClient.getQueryData<RedemptionEntry[]>(
        rewardKeys.bank(),
      );
      const prevChar = queryClient.getQueryData<CharacterWithProfile>(
        characterKeys.me(),
      );
      if (prevBank) {
        queryClient.setQueryData<RedemptionEntry[]>(
          rewardKeys.bank(),
          prevBank.filter((b) => b.id !== params.redemptionId),
        );
      }
      if (prevChar) {
        queryClient.setQueryData<CharacterWithProfile>(characterKeys.me(), {
          ...prevChar,
          character: {
            ...prevChar.character,
            coins: prevChar.character.coins + params.refund,
          },
        });
      }
      return { prevBank, prevChar };
    },
    onError: (_err, _params, ctx) => {
      if (ctx?.prevBank) queryClient.setQueryData(rewardKeys.bank(), ctx.prevBank);
      if (ctx?.prevChar) queryClient.setQueryData(characterKeys.me(), ctx.prevChar);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: rewardKeys.bank() });
      queryClient.invalidateQueries({ queryKey: characterKeys.me() });
    },
  });
}
