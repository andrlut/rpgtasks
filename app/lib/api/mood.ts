import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { MoodLog, MoodTag } from '@/lib/db/types';
import { supabase } from '@/lib/supabase';

import { dateKeyFromLocal } from './history';

export const moodKeys = {
  all: ['mood'] as const,
  today: (dateKey: string) => [...moodKeys.all, 'today', dateKey] as const,
  day: (dateKey: string) => [...moodKeys.all, 'day', dateKey] as const,
  month: (monthKey: string) => [...moodKeys.all, 'month', monthKey] as const,
  recent: (days: number) => [...moodKeys.all, 'recent', days] as const,
  tags: ['mood', 'tags'] as const,
};

/** Device-local YYYY-MM-DD for "today" — the day a mood entry belongs to. */
export function todayDateKey(): string {
  return dateKeyFromLocal(new Date());
}

/**
 * The mood entry for a specific local day, or null. Powers both today's
 * check-in and any retroactive day (history day view). RLS scopes the row.
 */
export function useMoodForDay(dateKey: string) {
  return useQuery({
    queryKey: moodKeys.day(dateKey),
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

/** Today's mood entry, or null if not logged yet. */
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
 * Every mood entry inside the calendar month containing `monthDate`, keyed by
 * local `YYYY-MM-DD`. Drives the mood month heatmap.
 */
export function useMoodMonth(monthDate: Date) {
  const from = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const to = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const fromKey = dateKeyFromLocal(from);
  const toKey = dateKeyFromLocal(to);
  return useQuery({
    queryKey: moodKeys.month(fromKey),
    queryFn: async (): Promise<Map<string, MoodLog>> => {
      const { data, error } = await supabase
        .from('mood_log')
        .select('*')
        .gte('logged_for', fromKey)
        .lte('logged_for', toKey)
        .order('logged_for', { ascending: true });
      if (error) throw error;
      const map = new Map<string, MoodLog>();
      for (const row of (data ?? []) as MoodLog[]) {
        map.set(row.logged_for, row);
      }
      return map;
    },
  });
}

/**
 * Every mood entry in [from, to] keyed by local `YYYY-MM-DD`. Spans any range
 * (unlike useMoodMonth's single calendar month) — used by the correlation
 * explorer, which needs a wide window joined against activity.
 */
export function useMoodRange(from: Date, to: Date) {
  const fromKey = dateKeyFromLocal(from);
  const toKey = dateKeyFromLocal(to);
  return useQuery({
    queryKey: [...moodKeys.all, 'range', fromKey, toKey] as const,
    queryFn: async (): Promise<Map<string, MoodLog>> => {
      const { data, error } = await supabase
        .from('mood_log')
        .select('*')
        .gte('logged_for', fromKey)
        .lte('logged_for', toKey)
        .order('logged_for', { ascending: true });
      if (error) throw error;
      const map = new Map<string, MoodLog>();
      for (const row of (data ?? []) as MoodLog[]) map.set(row.logged_for, row);
      return map;
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

/** System catalog of mood tags (active only, catalog order). Cached long. */
export function useMoodTags() {
  return useQuery({
    queryKey: moodKeys.tags,
    staleTime: 1000 * 60 * 60,
    queryFn: async (): Promise<MoodTag[]> => {
      const { data, error } = await supabase
        .from('mood_tag')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as MoodTag[];
    },
  });
}

/**
 * Log (or revise) a day's mood via the log_mood RPC. Upserts server-side, so
 * calling it again for the same day overwrites the entry. `loggedFor` defaults
 * to today; pass a past day for retroactive logging. Invalidates every mood
 * query so the card + prompt + screen + history all refresh.
 */
export function useLogMood() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      mood: number;
      note?: string | null;
      loggedFor?: string;
      tags?: string[] | null;
    }): Promise<MoodLog> => {
      const { data, error } = await supabase.rpc('log_mood', {
        p_mood: params.mood,
        p_note: params.note ?? null,
        p_logged_for: params.loggedFor ?? todayDateKey(),
        p_tags: params.tags ?? null,
      });
      if (error) throw error;
      return data as MoodLog;
    },
    onSuccess: (data) => {
      // Seed the logged day's caches with the RPC's returned row BEFORE
      // invalidating: the Home strip and the prompt gate on these, and
      // without seeding they'd flash back to "unlogged" (and accept a
      // second tap) for one refetch round-trip after every save.
      qc.setQueryData(moodKeys.day(data.logged_for), data);
      qc.setQueryData(moodKeys.today(data.logged_for), data);
      qc.invalidateQueries({ queryKey: moodKeys.all });
    },
  });
}
