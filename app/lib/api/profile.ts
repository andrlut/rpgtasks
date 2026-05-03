import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

import { characterKeys } from './character';

/**
 * Update the user's display_name. Re-fetches character/me on success so
 * any header / hero card greeting picks up the new name immediately.
 */
export function useUpdateDisplayName() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (displayName: string) => {
      const trimmed = displayName.trim();
      if (trimmed.length < 1) throw new Error('Username cannot be empty');
      if (trimmed.length > 40) throw new Error('Username is too long (max 40 chars)');

      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const userId = userData.user?.id;
      if (!userId) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profile')
        .update({ display_name: trimmed })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: characterKeys.me() });
    },
  });
}
