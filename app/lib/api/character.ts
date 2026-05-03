import { useQuery } from '@tanstack/react-query';

import type {
  Character,
  CharacterDimension,
  CharacterSub,
  Profile,
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
