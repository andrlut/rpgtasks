import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { streakMultiplier } from '@/lib/xp';

export const streakKeys = {
  all: ['streak'] as const,
  me: () => [...streakKeys.all, 'me'] as const,
};

export interface StreakState {
  /** Number of consecutive days (going back from today) with at least one daily-task completion. */
  currentStreak: number;
  /** True if the user has completed at least one daily task today. */
  hasCompletionToday: boolean;
  /** XP/coin multiplier earned from the current streak. 1.0 = no bonus. */
  multiplier: number;
}

interface CompletionRow {
  completed_at: string;
  task: { task_type: 'one_shot' | 'daily' | 'weekly' } | { task_type: 'one_shot' | 'daily' | 'weekly' }[] | null;
}

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export function useStreak() {
  return useQuery({
    queryKey: streakKeys.me(),
    queryFn: async (): Promise<StreakState> => {
      // pull last 60 days of completions joined with task type
      const since = new Date();
      since.setDate(since.getDate() - 60);
      const { data, error } = await supabase
        .from('task_completion')
        .select('completed_at, task:task_id ( task_type )')
        .gte('completed_at', since.toISOString())
        .order('completed_at', { ascending: false });
      if (error) throw error;

      // collect set of local-date keys that have at least one daily-task completion
      const dailyDays = new Set<string>();
      for (const row of (data ?? []) as CompletionRow[]) {
        const tt = Array.isArray(row.task) ? row.task[0]?.task_type : row.task?.task_type;
        if (tt !== 'daily') continue;
        const dt = new Date(row.completed_at);
        dailyDays.add(localDateKey(dt));
      }

      const today = new Date();
      const todayKey = localDateKey(today);
      const hasToday = dailyDays.has(todayKey);

      // count back from today (or yesterday if today has nothing yet)
      let streak = 0;
      const cursor = new Date(today);
      if (!hasToday) {
        cursor.setDate(cursor.getDate() - 1);
      }
      while (dailyDays.has(localDateKey(cursor))) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
      }

      return {
        currentStreak: streak,
        hasCompletionToday: hasToday,
        multiplier: streakMultiplier(streak),
      };
    },
  });
}
