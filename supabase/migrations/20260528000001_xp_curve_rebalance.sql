-- migration: 20260528000001_xp_curve_rebalance.sql
-- purpose: rebalance the per-star XP/coins curve from 5/15/40/100/250
--          (razão 50×) to 10/20/35/55/80 (razão 8×, saltos ~1.5-2×).
--
-- background: the old curve was too exponential — 4★ and 5★ tasks felt
-- unreachable in everyday practice, even though heroic tasks should
-- still pay more. The new curve keeps the ordering intact (every
-- next tier rewards more) while compressing the gap so the highest
-- tier feels achievable.
--
-- scope: ONLY the base table changes. Momentum bonus, streak multiplier,
-- quest reward XP, level curve, and any other modifier stays exactly
-- as-is — they all consume the helper via `base_xp_for_stars`.
--
-- affected:
--   public.base_xp_for_stars(p_stars integer)  — body replaced
--
-- compatibility: existing rows in task_completion_sub are NOT
-- backfilled. xp_granted/coins_granted on past completions were
-- snapshotted at the time of the original RPC call and stay frozen
-- (the user already earned that XP). The character.total_xp and
-- character_dimension.xp totals are similarly preserved. Only NEW
-- completions from this point forward use the rebalanced curve.
--
-- notes:
--   write-once; do not edit after applying
--   no rls / schema changes
--   bilingual: no user-facing strings introduced here

create or replace function public.base_xp_for_stars(p_stars integer)
returns integer
language sql
immutable
as $$
  select case p_stars
    when 1 then 10
    when 2 then 20
    when 3 then 35
    when 4 then 55
    when 5 then 80
    else null
  end;
$$;

-- The GRANT survives a CREATE OR REPLACE — no need to re-grant.

-- end of migration
