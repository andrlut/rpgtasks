import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { DimensionId, TaskWithDimensions } from '@/lib/db/types';
import { supabase } from '@/lib/supabase';

import { characterKeys, type CharacterWithProfile } from './character';

export const taskKeys = {
  all: ['tasks'] as const,
  pending: () => [...taskKeys.all, 'pending'] as const,
};

interface TaskRow {
  id: string;
  character_id: string;
  title: string;
  description: string | null;
  difficulty: 1 | 2 | 3 | 4 | 5;
  task_type: 'one_shot' | 'daily' | 'weekly';
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  task_dimension: { dimension_id: DimensionId }[];
}

/**
 * For V0: returns all non-archived tasks that have NOT been completed today.
 * Daily/weekly resets are simplified — we just check completed_at >= start of today.
 */
async function fetchPendingTasks(): Promise<TaskWithDimensions[]> {
  // Get today's start in UTC (good enough for V0)
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const { data: tasks, error: taskErr } = await supabase
    .from('task')
    .select('*, task_dimension(dimension_id)')
    .eq('is_archived', false)
    .order('created_at', { ascending: true });

  if (taskErr) throw taskErr;

  const { data: completionsToday, error: compErr } = await supabase
    .from('task_completion')
    .select('task_id')
    .gte('completed_at', startOfToday.toISOString());

  if (compErr) throw compErr;

  const completedIdsToday = new Set((completionsToday ?? []).map((c) => c.task_id));

  return (tasks ?? [])
    .filter((t: TaskRow) => !completedIdsToday.has(t.id))
    .map((t: TaskRow) => ({
      id: t.id,
      character_id: t.character_id,
      title: t.title,
      description: t.description,
      difficulty: t.difficulty,
      task_type: t.task_type,
      is_archived: t.is_archived,
      created_at: t.created_at,
      updated_at: t.updated_at,
      dimensions: (t.task_dimension ?? []).map((td) => td.dimension_id),
    }));
}

export function useTasks() {
  return useQuery({
    queryKey: taskKeys.pending(),
    queryFn: fetchPendingTasks,
  });
}

export interface CompleteTaskResult {
  xp_granted: number;
  coins_granted: number;
}

/**
 * Calls the complete_task() RPC on Supabase. Optimistically:
 *   - removes the task from the pending list
 *   - bumps total_xp + coins on the character
 * On error, rolls back. On success, invalidates so the truth wins.
 */
export function useCompleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      taskId: string;
      expectedXp: number;
      expectedCoins: number;
      dimensions: DimensionId[];
    }): Promise<CompleteTaskResult> => {
      const { data, error } = await supabase.rpc('complete_task', {
        p_task_id: params.taskId,
      });
      if (error) throw error;
      return data as CompleteTaskResult;
    },

    onMutate: async (params) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: taskKeys.pending() }),
        queryClient.cancelQueries({ queryKey: characterKeys.me() }),
      ]);

      const prevTasks = queryClient.getQueryData<TaskWithDimensions[]>(taskKeys.pending());
      const prevChar = queryClient.getQueryData<CharacterWithProfile>(characterKeys.me());

      if (prevTasks) {
        queryClient.setQueryData<TaskWithDimensions[]>(
          taskKeys.pending(),
          prevTasks.filter((t) => t.id !== params.taskId),
        );
      }

      if (prevChar) {
        queryClient.setQueryData<CharacterWithProfile>(characterKeys.me(), {
          ...prevChar,
          character: {
            ...prevChar.character,
            total_xp: prevChar.character.total_xp + params.expectedXp,
            coins: prevChar.character.coins + params.expectedCoins,
          },
          dimensions: prevChar.dimensions.map((d) =>
            params.dimensions.includes(d.dimension_id)
              ? { ...d, xp: d.xp + params.expectedXp }
              : d,
          ),
        });
      }

      return { prevTasks, prevChar };
    },

    onError: (_err, _params, ctx) => {
      if (ctx?.prevTasks) queryClient.setQueryData(taskKeys.pending(), ctx.prevTasks);
      if (ctx?.prevChar) queryClient.setQueryData(characterKeys.me(), ctx.prevChar);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.pending() });
      queryClient.invalidateQueries({ queryKey: characterKeys.me() });
    },
  });
}
