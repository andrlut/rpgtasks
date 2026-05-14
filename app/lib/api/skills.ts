import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Skill, SkillLog, SkillState, SkillTier, TierName } from '@/lib/db/types';
import { supabase } from '@/lib/supabase';

export const skillKeys = {
  all: ['skills'] as const,
  states: () => [...skillKeys.all, 'states'] as const,
  log: (skillId: string) => [...skillKeys.all, 'log', skillId] as const,
};

export const TIER_ORDER: TierName[] = ['beginner', 'bronze', 'silver', 'gold', 'master'];

/**
 * Find the tier whose threshold <= value (highest match), and the next one above.
 */
export function tierForValue(
  tiers: SkillTier[],
  value: number,
): { current: SkillTier; next: SkillTier | null } {
  // tiers ordered ascending by sort_order
  const sorted = [...tiers].sort((a, b) => a.sort_order - b.sort_order);
  let current = sorted[0];
  let next: SkillTier | null = null;
  for (let i = 0; i < sorted.length; i++) {
    const t = sorted[i];
    if (t === undefined) continue;
    if (value >= t.threshold) {
      current = t;
      next = sorted[i + 1] ?? null;
    } else {
      if (next === null) next = t;
      break;
    }
  }
  return { current, next };
}

/**
 * Fetches catalog (skill + skill_tier), per-user logs, and computes state per skill.
 */
export function useSkillStates() {
  return useQuery({
    queryKey: skillKeys.states(),
    queryFn: async (): Promise<SkillState[]> => {
      const [{ data: skills, error: sErr }, { data: tiers, error: tErr }, { data: logs, error: lErr }] =
        await Promise.all([
          supabase.from('skill').select('*').order('sort_order'),
          supabase.from('skill_tier').select('*').order('sort_order'),
          supabase.from('skill_log').select('*').order('logged_at', { ascending: false }),
        ]);
      if (sErr) throw sErr;
      if (tErr) throw tErr;
      if (lErr) throw lErr;

      const tiersBySkill = new Map<string, SkillTier[]>();
      for (const t of (tiers ?? []) as SkillTier[]) {
        const arr = tiersBySkill.get(t.skill_id) ?? [];
        arr.push(t);
        tiersBySkill.set(t.skill_id, arr);
      }

      // current PR (max value) and last logged per skill
      const prBySkill = new Map<string, { pr: number; last: string }>();
      for (const log of (logs ?? []) as SkillLog[]) {
        const cur = prBySkill.get(log.skill_id);
        if (!cur || log.value > cur.pr) {
          prBySkill.set(log.skill_id, { pr: log.value, last: log.logged_at });
        }
      }

      return ((skills ?? []) as Skill[]).map((s) => {
        const skillTiers = tiersBySkill.get(s.id) ?? [];
        const pr = prBySkill.get(s.id);
        const currentPr = pr?.pr ?? 0;
        const { current, next } = tierForValue(skillTiers, currentPr);
        return {
          skill: s,
          tiers: skillTiers,
          currentPr,
          lastLoggedAt: pr?.last ?? null,
          currentTier: current,
          nextTier: next,
        };
      });
    },
  });
}

export function useSkillLogHistory(skillId: string | null | undefined) {
  return useQuery({
    queryKey: skillId ? skillKeys.log(skillId) : ['skills', 'log', 'none'],
    enabled: !!skillId,
    queryFn: async (): Promise<SkillLog[]> => {
      if (!skillId) return [];
      const { data, error } = await supabase
        .from('skill_log')
        .select('*')
        .eq('skill_id', skillId)
        .order('logged_at', { ascending: false })
        .limit(60);
      if (error) throw error;
      return (data ?? []) as SkillLog[];
    },
  });
}

export interface LogPRResult {
  newTier: TierName | null;
  previousTier: TierName;
  isPR: boolean;
}

// ─── Custom skill creation ──────────────────────────────────────────────────

export interface CustomSkillTierInput {
  tier_name: TierName;
  threshold: number;
  description?: string | null;
  percentile?: number | null;
}

export interface CustomSkillInput {
  display_name: string;
  unit: string;
  dimension_id: string;
  /** Optional sub the skill belongs to (e.g. "sleep", "strength"). The RPC
   *  cross-checks that the sub parents the claimed dimension. */
  sub_id?: string | null;
  icon?: string;
  description?: string | null;
  /** Must be exactly 5 entries: beginner / bronze / silver / gold / master. */
  tiers: CustomSkillTierInput[];
}

/**
 * Atomically creates a user-owned skill with its 5-tier ladder via the
 * `create_custom_skill` RPC. Returns the new skill id (custom_<uuid>).
 */
export function useCreateCustomSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CustomSkillInput): Promise<string> => {
      const { data, error } = await supabase.rpc('create_custom_skill', {
        p_payload: payload,
      });
      if (error) throw error;
      if (typeof data !== 'string') {
        throw new Error('create_custom_skill returned no skill id');
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: skillKeys.states() });
    },
  });
}

/**
 * Deletes a user-owned skill. RLS guarantees only the owner's row is
 * affected; skill_tier and skill_log cascade-delete via FK. Catalog skills
 * (character_id IS NULL) cannot be deleted from the client and the policy
 * will silently no-op if a caller tries.
 */
export function useDeleteCustomSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (skillId: string): Promise<void> => {
      const { error } = await supabase
        .from('skill')
        .delete()
        .eq('id', skillId);
      if (error) throw error;
    },
    onSuccess: (_data, skillId) => {
      queryClient.invalidateQueries({ queryKey: skillKeys.states() });
      queryClient.invalidateQueries({ queryKey: skillKeys.log(skillId) });
    },
  });
}

/**
 * Inserts a new skill_log row. Returns whether this crossed a tier threshold
 * (so caller can show a tier-up animation).
 */
export function useLogSkillPR() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      skillId: string;
      value: number;
      tiers: SkillTier[];
      previousPr: number;
    }): Promise<LogPRResult> => {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const userId = userData.user?.id;
      if (!userId) throw new Error('Not authenticated');

      const { error } = await supabase.from('skill_log').insert({
        character_id: userId,
        skill_id: params.skillId,
        value: params.value,
      });
      if (error) throw error;

      const before = tierForValue(params.tiers, params.previousPr).current;
      const after = tierForValue(params.tiers, Math.max(params.value, params.previousPr)).current;
      return {
        previousTier: before.tier_name,
        newTier: after.tier_name !== before.tier_name ? after.tier_name : null,
        isPR: params.value > params.previousPr,
      };
    },
    onSuccess: (_data, params) => {
      queryClient.invalidateQueries({ queryKey: skillKeys.states() });
      queryClient.invalidateQueries({ queryKey: skillKeys.log(params.skillId) });
    },
  });
}
