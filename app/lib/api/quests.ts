import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  Quest,
  QuestRequirement,
  QuestRequirementWithProgress,
  QuestTemplate,
  QuestWithProgress,
} from '@/lib/db/types';
import { supabase } from '@/lib/supabase';

import { characterKeys, type CharacterWithProfile } from './character';

export const questKeys = {
  all: ['quests'] as const,
  active: () => [...questKeys.all, 'active'] as const,
  templates: () => [...questKeys.all, 'templates'] as const,
};

/**
 * Active + completed-recently quests with computed progress per requirement.
 * Also expires overdue active quests on read (calls expire_overdue_quests RPC
 * once per fetch — server-side; idempotent and cheap).
 */
export function useQuests() {
  return useQuery({
    queryKey: questKeys.active(),
    queryFn: async (): Promise<QuestWithProgress[]> => {
      // 0. Expire overdue ones first (cheap, server-side). Errors are
      //    non-fatal — progress still renders correctly.
      try {
        await supabase.rpc('expire_overdue_quests');
      } catch {
        // ignore
      }

      // 1. Pull all of this user's quests + their requirements in one shot.
      const { data: questRows, error: qErr } = await supabase
        .from('quest')
        .select('*, quest_requirement(*)')
        .order('created_at', { ascending: false });
      if (qErr) throw qErr;

      type QuestRow = Quest & { quest_requirement: QuestRequirement[] };
      const quests = (questRows ?? []) as unknown as QuestRow[];

      // Short-circuit when nothing to count.
      if (quests.length === 0) return [];

      // 2. Compute progress for every requirement. Group by kind so we batch
      //    the DB calls, but keep mapping simple per-quest at the end.
      const progressByReqId = new Map<string, number>();

      // Group requirements by quest so we know each quest's window.
      const allReqs = quests.flatMap((q) =>
        q.quest_requirement.map((r) => ({ quest: q, requirement: r })),
      );

      // 2a. complete_task_n_times — count task_completion rows per (task_id, started_at..deadline)
      const taskReqs = allReqs.filter(
        ({ requirement }) =>
          requirement.kind === 'complete_task_n_times' && requirement.task_id,
      );
      for (const { quest, requirement } of taskReqs) {
        const { count, error } = await supabase
          .from('task_completion')
          .select('id', { count: 'exact', head: true })
          .eq('task_id', requirement.task_id!)
          .gte('completed_at', quest.started_at)
          .lte('completed_at', quest.deadline);
        if (!error) progressByReqId.set(requirement.id, count ?? 0);
      }

      // 2b. complete_any_in_dim — count completions on tasks under any sub
      // belonging to the given dim. Resolved via task → dimension_sub.
      const dimReqs = allReqs.filter(
        ({ requirement }) =>
          requirement.kind === 'complete_any_in_dim' && requirement.dimension_id,
      );
      for (const { quest, requirement } of dimReqs) {
        // Tasks whose sub belongs to this dim.
        const { data: linkedTasks, error: ltErr } = await supabase
          .from('task')
          .select('id, dimension_sub!inner(dimension_id)')
          .eq('dimension_sub.dimension_id', requirement.dimension_id!);
        if (ltErr) continue;
        const taskIds = (linkedTasks ?? []).map((r) => (r as { id: string }).id);
        if (taskIds.length === 0) {
          progressByReqId.set(requirement.id, 0);
          continue;
        }
        const { count, error: cErr } = await supabase
          .from('task_completion')
          .select('id', { count: 'exact', head: true })
          .in('task_id', taskIds)
          .gte('completed_at', quest.started_at)
          .lte('completed_at', quest.deadline);
        if (!cErr) progressByReqId.set(requirement.id, count ?? 0);
      }

      // 2c. reach_skill_value — max skill_log.value within window
      const skillReqs = allReqs.filter(
        ({ requirement }) =>
          requirement.kind === 'reach_skill_value' && requirement.skill_id,
      );
      for (const { quest, requirement } of skillReqs) {
        const { data: logs, error: lErr } = await supabase
          .from('skill_log')
          .select('value')
          .eq('skill_id', requirement.skill_id!)
          .gte('logged_at', quest.started_at)
          .lte('logged_at', quest.deadline)
          .order('value', { ascending: false })
          .limit(1);
        if (!lErr) {
          const max = logs && logs.length > 0 ? Number(logs[0]!.value) : 0;
          progressByReqId.set(requirement.id, max);
        }
      }

      // 3. Stitch into QuestWithProgress.
      return quests.map<QuestWithProgress>((q) => {
        const requirements: QuestRequirementWithProgress[] = q.quest_requirement
          .slice()
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((r) => {
            const count = progressByReqId.get(r.id) ?? 0;
            const target =
              r.kind === 'reach_skill_value'
                ? Number(r.min_value ?? 0)
                : Number(r.target_count ?? 0);
            const isMet = count >= target;
            return {
              requirement: r,
              currentCount: count,
              isMet,
            };
          });
        const isComplete =
          q.status === 'active' &&
          requirements.length > 0 &&
          requirements.every((rr) => rr.isMet);
        return {
          quest: q,
          requirements,
          isComplete,
        };
      });
    },
  });
}

export function useQuestTemplates() {
  return useQuery({
    queryKey: questKeys.templates(),
    queryFn: async (): Promise<QuestTemplate[]> => {
      const { data, error } = await supabase
        .from('quest_template')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as QuestTemplate[];
    },
  });
}

export function useStartQuestFromTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (templateId: string): Promise<string> => {
      const { data, error } = await supabase.rpc('start_quest_from_template', {
        p_template_id: templateId,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: questKeys.active() });
    },
  });
}

export interface CustomQuestPayload {
  title: string;
  description?: string | null;
  deadline: string; // ISO
  reward_xp: number;
  reward_coins: number;
  allow_partial: boolean;
  requirements: {
    kind: 'complete_task_n_times' | 'complete_any_in_dim' | 'reach_skill_value';
    task_id?: string | null;
    dimension_id?: string | null;
    skill_id?: string | null;
    target_count?: number;
    min_value?: number;
  }[];
}

export function useStartCustomQuest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CustomQuestPayload): Promise<string> => {
      const { data, error } = await supabase.rpc('start_custom_quest', {
        p_payload: payload,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: questKeys.active() });
    },
  });
}

export interface CompleteQuestResult {
  reward_xp: number;
  reward_coins: number;
}

export function useCompleteQuest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (questId: string): Promise<CompleteQuestResult> => {
      const { data, error } = await supabase.rpc('complete_quest', {
        p_quest_id: questId,
      });
      if (error) throw error;
      return data as CompleteQuestResult;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: questKeys.active() });
      queryClient.invalidateQueries({ queryKey: characterKeys.me() });

      // Optimistic char bump so the reward feels instant.
      const prev = queryClient.getQueryData<CharacterWithProfile>(characterKeys.me());
      if (prev) {
        queryClient.setQueryData<CharacterWithProfile>(characterKeys.me(), {
          ...prev,
          character: {
            ...prev.character,
            total_xp: prev.character.total_xp + result.reward_xp,
            coins: prev.character.coins + result.reward_coins,
          },
        });
      }
    },
  });
}

export function useAbandonQuest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (questId: string): Promise<void> => {
      const { error } = await supabase
        .from('quest')
        .update({ status: 'abandoned' })
        .eq('id', questId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: questKeys.active() });
    },
  });
}
