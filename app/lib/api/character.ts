import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  AssessmentSource,
  Character,
  CharacterDimension,
  CharacterSubScore,
  Profile,
  SubId,
} from '@/lib/db/types';
import { supabase } from '@/lib/supabase';

export interface CharacterWithProfile {
  profile: Profile;
  character: Character;
  dimensions: CharacterDimension[];
  /** All character_sub_score rows across both sources. */
  subScores: CharacterSubScore[];
}

export const characterKeys = {
  all: ['character'] as const,
  me: () => [...characterKeys.all, 'me'] as const,
};

async function fetchCharacter(): Promise<CharacterWithProfile> {
  const { data: profile, error: profileErr } = await supabase
    .from('profile')
    .select('*')
    .single();
  if (profileErr) throw profileErr;

  const { data: character, error: charErr } = await supabase
    .from('character')
    .select('*')
    .single();
  if (charErr) throw charErr;

  const { data: dimensions, error: dimErr } = await supabase
    .from('character_dimension')
    .select('*');
  if (dimErr) throw dimErr;

  const { data: subScores, error: subErr } = await supabase
    .from('character_sub_score')
    .select('*');
  if (subErr) throw subErr;

  return {
    profile: profile as Profile,
    character: character as Character,
    dimensions: (dimensions ?? []) as CharacterDimension[],
    subScores: (subScores ?? []) as CharacterSubScore[],
  };
}

export function useCharacter() {
  return useQuery({
    queryKey: characterKeys.me(),
    queryFn: fetchCharacter,
  });
}

/** Pick out scores for a given source, returning a Map<SubId, score>. */
export function pickSubScores(
  rows: CharacterSubScore[],
  source: AssessmentSource,
): Map<SubId, number> {
  const map = new Map<SubId, number>();
  for (const r of rows) {
    if (r.source === source) map.set(r.sub_id, r.score);
  }
  return map;
}

/**
 * Atomically upsert a sub score AND append to the assessment_log via the
 * set_sub_score RPC. Optimistic update keeps the hex chart reactive.
 */
export function useSetSubScore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      source: AssessmentSource;
      subId: SubId;
      score: number;
    }) => {
      const { error } = await supabase.rpc('set_sub_score', {
        p_source: params.source,
        p_sub_id: params.subId,
        p_score: params.score,
      });
      if (error) throw error;
    },
    onMutate: async (params) => {
      await qc.cancelQueries({ queryKey: characterKeys.me() });
      const prev = qc.getQueryData<CharacterWithProfile>(characterKeys.me());
      if (prev) {
        const idx = prev.subScores.findIndex(
          (r) => r.source === params.source && r.sub_id === params.subId,
        );
        const nowIso = new Date().toISOString();
        const nextSubScores: CharacterSubScore[] =
          idx >= 0
            ? prev.subScores.map((r, i) =>
                i === idx ? { ...r, score: params.score, updated_at: nowIso } : r,
              )
            : [
                ...prev.subScores,
                {
                  character_id: prev.character.id,
                  source: params.source,
                  sub_id: params.subId,
                  score: params.score,
                  updated_at: nowIso,
                },
              ];
        qc.setQueryData<CharacterWithProfile>(characterKeys.me(), {
          ...prev,
          subScores: nextSubScores,
        });
      }
      return { prev };
    },
    onError: (_err, _params, ctx) => {
      if (ctx?.prev) qc.setQueryData(characterKeys.me(), ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: characterKeys.me() });
      // assessment_log gets a new row on every set_sub_score; nudge the
      // questionnaire-side hooks so sparklines and history views refresh.
      // Prefix-match avoids a circular import on questionnaireKeys.
      qc.invalidateQueries({ queryKey: ['questionnaire'] });
    },
  });
}
