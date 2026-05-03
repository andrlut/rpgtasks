import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  Character,
  CharacterDimension,
  CharacterSub,
  Profile,
  SubId,
} from '@/lib/db/types';
import { supabase } from '@/lib/supabase';

export interface CharacterWithProfile {
  profile: Profile;
  character: Character;
  dimensions: CharacterDimension[];
  subs: CharacterSub[];
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

  const { data: subs, error: subErr } = await supabase
    .from('character_sub')
    .select('*');
  if (subErr) throw subErr;

  return {
    profile: profile as Profile,
    character: character as Character,
    dimensions: (dimensions ?? []) as CharacterDimension[],
    subs: (subs ?? []) as CharacterSub[],
  };
}

export function useCharacter() {
  return useQuery({
    queryKey: characterKeys.me(),
    queryFn: fetchCharacter,
  });
}

/**
 * Upsert a single character_sub.subjective_score (0-5). Optimistically
 * updates the cached character so the hex chart reacts immediately.
 */
export function useUpdateCharacterSub() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { subId: SubId; score: number }) => {
      const { data: u, error: uErr } = await supabase.auth.getUser();
      if (uErr) throw uErr;
      const userId = u.user?.id;
      if (!userId) throw new Error('Not authenticated');

      const { error } = await supabase.from('character_sub').upsert({
        character_id: userId,
        sub_id: params.subId,
        subjective_score: params.score,
      });
      if (error) throw error;
    },
    onMutate: async (params) => {
      await qc.cancelQueries({ queryKey: characterKeys.me() });
      const prev = qc.getQueryData<CharacterWithProfile>(characterKeys.me());
      if (prev) {
        const has = prev.subs.some((s) => s.sub_id === params.subId);
        const nextSubs: CharacterSub[] = has
          ? prev.subs.map((s) =>
              s.sub_id === params.subId
                ? { ...s, subjective_score: params.score }
                : s,
            )
          : [
              ...prev.subs,
              {
                character_id: prev.character.id,
                sub_id: params.subId,
                subjective_score: params.score,
              },
            ];
        qc.setQueryData<CharacterWithProfile>(characterKeys.me(), {
          ...prev,
          subs: nextSubs,
        });
      }
      return { prev };
    },
    onError: (_err, _params, ctx) => {
      if (ctx?.prev) qc.setQueryData(characterKeys.me(), ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: characterKeys.me() });
    },
  });
}
