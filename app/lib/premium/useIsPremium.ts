import { useCharacter } from '@/lib/api/character';

/**
 * True when the signed-in user is on the premium tier. Derived from the
 * shared `character/me` query (already cached app-wide via TanStack Query),
 * so it costs no extra fetch and stays in sync when the tier changes.
 *
 * Fails closed: returns `false` while the query is loading or errored, so we
 * never briefly flash premium-only surfaces to a free user.
 */
export function useIsPremium(): boolean {
  const { data } = useCharacter();
  return data?.profile.subscription_tier === 'premium';
}
