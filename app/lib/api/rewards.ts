import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Reward, RewardCategory, RewardTemplate } from '@/lib/db/types';
import { supabase } from '@/lib/supabase';

import { characterKeys, type CharacterWithProfile } from './character';

export const rewardKeys = {
  all: ['rewards'] as const,
  active: () => [...rewardKeys.all, 'active'] as const,
  detail: (id: string) => [...rewardKeys.all, 'detail', id] as const,
  templates: () => [...rewardKeys.all, 'templates'] as const,
  redemptions: () => [...rewardKeys.all, 'redemptions'] as const,
};

export interface RedemptionHistoryEntry {
  id: string;
  reward_id: string;
  redeemed_at: string;
  cost_paid: number;
  reward_title: string;
  reward_icon: string;
  reward_category: RewardCategory | null;
}

interface RedemptionRow {
  id: string;
  reward_id: string;
  redeemed_at: string;
  cost_paid: number;
  reward:
    | { title: string; icon: string; category: RewardCategory | null }
    | { title: string; icon: string; category: RewardCategory | null }[]
    | null;
}

export function useRedemptionHistory(limit: number = 50) {
  return useQuery({
    queryKey: rewardKeys.redemptions(),
    queryFn: async (): Promise<RedemptionHistoryEntry[]> => {
      const { data, error } = await supabase
        .from('reward_redemption')
        .select('id, reward_id, redeemed_at, cost_paid, reward:reward_id ( title, icon, category )')
        .order('redeemed_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return ((data ?? []) as RedemptionRow[]).map((r) => {
        const reward = Array.isArray(r.reward) ? r.reward[0] : r.reward;
        return {
          id: r.id,
          reward_id: r.reward_id,
          redeemed_at: r.redeemed_at,
          cost_paid: r.cost_paid,
          reward_title: reward?.title ?? '(removed reward)',
          reward_icon: reward?.icon ?? 'gift',
          reward_category: reward?.category ?? null,
        };
      });
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
    .order('cost', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Reward[];
}

export function useRewards() {
  return useQuery({
    queryKey: rewardKeys.active(),
    queryFn: fetchActiveRewards,
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
        .update({ is_archived: true })
        .eq('id', rewardId);
      if (error) throw error;
    },
    onSuccess: (_data, rewardId) => {
      queryClient.invalidateQueries({ queryKey: rewardKeys.active() });
      queryClient.invalidateQueries({ queryKey: rewardKeys.detail(rewardId) });
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

      const { data, error } = await supabase
        .from('reward')
        .insert({
          character_id: userId,
          title: template.title,
          description: template.description,
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
 * character; rolls back on error.
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
      queryClient.invalidateQueries({ queryKey: rewardKeys.redemptions() });
    },
  });
}
