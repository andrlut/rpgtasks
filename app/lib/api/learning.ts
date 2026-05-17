import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  LearningMaterial,
  LearningMaterialCard,
  LearningMaterialSub,
  MarkMaterialReadResult,
  SubId,
} from '@/lib/db/types';
import { supabase } from '@/lib/supabase';

import { characterKeys } from './character';

export const learningKeys = {
  all: ['learning'] as const,
  feed: () => [...learningKeys.all, 'feed'] as const,
  detail: (slug: string) => [...learningKeys.all, 'detail', slug] as const,
  views: () => [...learningKeys.all, 'views'] as const,
  myFeedback: (slug: string) => [...learningKeys.all, 'myFeedback', slug] as const,
};

/**
 * A feed card hydrated with the subs it touches. Body fields are NOT loaded
 * here — kept light so the feed scrolls fast even with long materials.
 */
export interface LearningFeedCard extends LearningMaterialCard {
  subs: SubId[];
}

interface FeedRow extends LearningMaterialCard {
  learning_material_sub: { sub_id: SubId }[] | null;
}

/** Newest-first feed of all non-archived materials, with their sub tags. */
export function useLearningFeed() {
  return useQuery({
    queryKey: learningKeys.feed(),
    queryFn: async (): Promise<LearningFeedCard[]> => {
      const { data, error } = await supabase
        .from('learning_material')
        .select(
          `id, slug, type, dimension_id, topic, reading_minutes,
           title_pt, title_en, summary_pt, summary_en,
           hero_image_url, source_url, source_label_pt, source_label_en,
           cta_action, released_at, version, is_archived,
           created_at, updated_at,
           learning_material_sub ( sub_id )`,
        )
        .eq('is_archived', false)
        .order('released_at', { ascending: false });
      if (error) throw error;
      return ((data ?? []) as FeedRow[]).map((row) => {
        const { learning_material_sub, ...card } = row;
        return {
          ...card,
          subs: (learning_material_sub ?? []).map((s) => s.sub_id),
        };
      });
    },
  });
}

interface DetailRow extends LearningMaterial {
  learning_material_sub: { sub_id: SubId }[] | null;
}

export interface LearningMaterialDetail extends LearningMaterial {
  subs: SubId[];
}

export function useLearningMaterial(slug: string | null | undefined) {
  return useQuery({
    queryKey: slug ? learningKeys.detail(slug) : ['learning', 'detail', 'none'],
    enabled: !!slug,
    queryFn: async (): Promise<LearningMaterialDetail | null> => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from('learning_material')
        .select(
          `*, learning_material_sub ( sub_id )`,
        )
        .eq('slug', slug)
        .eq('is_archived', false)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const row = data as DetailRow;
      const { learning_material_sub, ...material } = row;
      return {
        ...material,
        subs: (learning_material_sub ?? []).map((s) => s.sub_id),
      };
    },
  });
}

/** Set of material_ids the user has already read. */
export function useReadMaterialIds() {
  return useQuery({
    queryKey: learningKeys.views(),
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await supabase
        .from('learning_view')
        .select('material_id');
      if (error) throw error;
      return new Set((data ?? []).map((r: { material_id: string }) => r.material_id));
    },
  });
}

interface MarkReadInput {
  slug: string;
  materialId: string;
}

/** The current user's rating on a single material (null if none yet). */
export function useMyMaterialFeedback(slug: string | null | undefined) {
  return useQuery({
    queryKey: slug ? learningKeys.myFeedback(slug) : ['learning', 'myFeedback', 'none'],
    enabled: !!slug,
    queryFn: async (): Promise<{ rating: -1 | 1; comment: string | null } | null> => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from('learning_material_feedback')
        .select('rating, comment, material:material_id(slug)')
        .order('updated_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      // Filter client-side by slug — feedback table is small per-user.
      type Row = {
        rating: -1 | 1;
        comment: string | null;
        material: { slug: string } | { slug: string }[] | null;
      };
      const rows = (data ?? []) as Row[];
      for (const row of rows) {
        const mat = Array.isArray(row.material) ? row.material[0] : row.material;
        if (mat?.slug === slug) {
          return { rating: row.rating, comment: row.comment };
        }
      }
      return null;
    },
  });
}

interface RateInput {
  slug: string;
  rating: -1 | 1;
  comment?: string;
}

/** 👍/👎 a material. Tapping the same rating twice clears it. */
export function useRateMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: RateInput): Promise<{ action: string; rating: -1 | 1 }> => {
      const { data, error } = await supabase.rpc('rate_material', {
        p_slug: input.slug,
        p_rating: input.rating,
        p_comment: input.comment ?? null,
      });
      if (error) throw error;
      return data as { action: string; rating: -1 | 1 };
    },
    onSuccess: (_result, input) => {
      queryClient.invalidateQueries({ queryKey: learningKeys.myFeedback(input.slug) });
    },
  });
}

/**
 * Marks the material as read (idempotent). On the first read awards
 * 5 base + 5 per related sub XP and matching coins.
 */
export function useMarkMaterialRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: MarkReadInput): Promise<MarkMaterialReadResult> => {
      const { data, error } = await supabase.rpc('mark_material_read', {
        p_slug: input.slug,
      });
      if (error) throw error;
      return data as MarkMaterialReadResult;
    },
    onSuccess: (_result, input) => {
      // Refresh user state — character (XP/coins), views set, dim XP.
      queryClient.invalidateQueries({ queryKey: characterKeys.me() });
      queryClient.invalidateQueries({ queryKey: learningKeys.views() });
      queryClient.invalidateQueries({ queryKey: learningKeys.detail(input.slug) });
    },
  });
}
