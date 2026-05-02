/**
 * Shape of rows in our public.* tables (mirrors Supabase schema).
 * Hand-maintained for V0; replace with `supabase gen types typescript`
 * once the CLI is happily authed.
 */

export type DimensionId =
  | 'health'
  | 'strength'
  | 'mind'
  | 'wealth'
  | 'social'
  | 'discipline';

export type TaskType = 'one_shot' | 'daily' | 'weekly';

/**
 * Source of truth for when a task is "due". `task_type` is preserved as
 * a legacy hint but `recurrence` is what queries should consult.
 *
 * - one_shot: due once, ever. Disappears from "today" after first completion.
 * - daily: due every day. `target_count > 1` lets a single task be done
 *   multiple times per day (e.g. brush teeth 3x).
 * - weekly: due only on the listed weekdays (0=Sun, 6=Sat).
 * - monthly: due on the given day-of-month (skipped silently in months
 *   without that day, e.g. day=31 in February).
 */
export type Recurrence =
  | { type: 'one_shot' }
  | { type: 'daily' }
  | { type: 'weekly'; days: number[] }
  | { type: 'monthly'; day: number };

export type RecurrenceType = Recurrence['type'];

export interface Dimension {
  id: DimensionId;
  display_name: string;
  color: string;
  icon: string;
  sort_order: number;
}

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Character {
  id: string;
  total_xp: number;
  coins: number;
  created_at: string;
  updated_at: string;
}

export interface CharacterDimension {
  character_id: string;
  dimension_id: DimensionId;
  xp: number;
}

export interface Task {
  id: string;
  character_id: string;
  title: string;
  description: string | null;
  difficulty: 1 | 2 | 3 | 4 | 5;
  task_type: TaskType;
  recurrence: Recurrence;
  target_count: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

/** Task with its linked dimensions (joined via task_dimension). */
export interface TaskWithDimensions extends Task {
  dimensions: DimensionId[];
}

export interface TaskCompletion {
  id: string;
  task_id: string;
  character_id: string;
  completed_at: string;
  xp_granted: number;
  coins_granted: number;
}

export type RewardCategory = 'indulgence' | 'good' | 'experience';

export interface Reward {
  id: string;
  character_id: string;
  title: string;
  description: string | null;
  cost: number;
  icon: string;
  category: RewardCategory;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface RewardTemplate {
  id: string;
  title: string;
  description: string | null;
  cost: number;
  icon: string;
  category: RewardCategory;
  sort_order: number;
}

export interface RewardRedemption {
  id: string;
  reward_id: string;
  character_id: string;
  redeemed_at: string;
  cost_paid: number;
}

export type TierName = 'beginner' | 'bronze' | 'silver' | 'gold' | 'master';

export interface Skill {
  id: string;
  display_name: string;
  unit: string;
  dimension_id: DimensionId;
  icon: string;
  sort_order: number;
}

export interface SkillTier {
  id: string;
  skill_id: string;
  tier_name: TierName;
  threshold: number;
  sort_order: number;
}

export interface SkillLog {
  id: string;
  character_id: string;
  skill_id: string;
  value: number;
  logged_at: string;
}

export interface SkillState {
  skill: Skill;
  tiers: SkillTier[];
  currentPr: number;
  lastLoggedAt: string | null;
  currentTier: SkillTier;
  nextTier: SkillTier | null;
}
