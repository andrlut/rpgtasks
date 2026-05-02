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
