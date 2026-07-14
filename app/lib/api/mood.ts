import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { MoodLog } from '@/lib/db/types';
import { supabase } from '@/lib/supabase';

import { dateKeyFromLocal } from './history';

export const moodKeys = {
  all: ['mood'] as const,
  today: (dateKey: string) => [...moodKeys.all, 'today', dateKey] as const,
  recent: (days: number) => [...moodKeys.all, 'recent', days] as const,
};

/** Device-local YYYY-MM-DD for "today" — the day a mood entry belongs to. */
export function todayDateKey(): string {
  return dateKeyFromLocal(new Date());
}

/**
 * Today's mood entry, or null if not logged yet. RLS scopes the row to the
 * current character, so no explicit character filter is needed (mirrors the
 * psych/session hooks).
 */
export function useTodayMood() {
  const dateKey = todayDateKey();
  return useQuery({
    queryKey: moodKeys.today(dateKey),
    queryFn: async (): Promise<MoodLog | null> => {
      const { data, error } = await supabase
        .from('mood_log')
        .select('*')
        .eq('logged_for', dateKey)
        .limit(1);
      if (error) throw error;
      return (data?.[0] as MoodLog) ?? null;
    },
  });
}

/**
 * The last `days` of mood entries, oldest → newest — used for the Eu-tab
 * sparkline. Sparse by nature (missed days are simply absent).
 */
export function useRecentMoods(days = 30) {
  return useQuery({
    queryKey: moodKeys.recent(days),
    queryFn: async (): Promise<MoodLog[]> => {
      const since = new Date();
      since.setDate(since.getDate() - (days - 1));
      const { data, error } = await supabase
        .from('mood_log')
        .select('*')
        .gte('logged_for', dateKeyFromLocal(since))
        .order('logged_for', { ascending: true });
      if (error) throw error;
      return (data ?? []) as MoodLog[];
    },
  });
}

/**
 * Log (or revise) today's mood via the log_mood RPC. Upserts server-side, so
 * calling it again the same day overwrites the day's entry. Invalidates every
 * mood query so the card + prompt + screen all refresh.
 */
export function useLogMood() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      mood: number;
      note?: string | null;
      loggedFor?: string;
    }): Promise<MoodLog> => {
      const { data, error } = await supabase.rpc('log_mood', {
        p_mood: params.mood,
        p_note: params.note ?? null,
        p_logged_for: params.loggedFor ?? todayDateKey(),
      });
      if (error) throw error;
      return data as MoodLog;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: moodKeys.all });
    },
  });
}
