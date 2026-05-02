import type { Recurrence } from '@/lib/db/types';

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Is the task due on the given local date?
 *
 * Note: this only answers the *schedule* question. Whether the user has
 * already met the day's target is a separate concern (compute completion
 * counts and compare to `target_count`).
 */
export function isDueOn(rec: Recurrence, date: Date): boolean {
  switch (rec.type) {
    case 'one_shot':
      // one_shot is "due" on every date until first completed; the caller
      // applies the "any past completion exists?" check on top.
      return true;
    case 'daily':
      return true;
    case 'weekly':
      return rec.days.includes(date.getDay());
    case 'monthly':
      return date.getDate() === rec.day;
  }
}

/**
 * Human-readable summary used by cards and forms.
 *   one_shot      → "One-shot"
 *   daily         → "Every day"
 *   daily, n=3    → "3× every day"
 *   weekly [0,3]  → "Sun, Wed"
 *   monthly day=15→ "Day 15 each month"
 */
export function describeRecurrence(rec: Recurrence, targetCount = 1): string {
  const prefix = targetCount > 1 ? `${targetCount}× ` : '';
  switch (rec.type) {
    case 'one_shot':
      return 'One-shot';
    case 'daily':
      return `${prefix}every day`;
    case 'weekly': {
      if (rec.days.length === 0) return 'Weekly (no days picked)';
      if (rec.days.length === 7) return `${prefix}every day`;
      const sorted = [...rec.days].sort((a, b) => a - b);
      const labels = sorted.map((d) => WEEKDAY_NAMES[d]).filter(Boolean);
      return `${prefix}${labels.join(', ')}`;
    }
    case 'monthly':
      return `Day ${rec.day} each month`;
  }
}

/** Parse a recurrence value coming from the DB; defaults to daily on garbage. */
export function parseRecurrence(raw: unknown): Recurrence {
  if (raw && typeof raw === 'object' && 'type' in raw) {
    const r = raw as { type: string; days?: number[]; day?: number };
    if (r.type === 'one_shot') return { type: 'one_shot' };
    if (r.type === 'daily') return { type: 'daily' };
    if (r.type === 'weekly' && Array.isArray(r.days)) {
      return { type: 'weekly', days: r.days.filter((d) => d >= 0 && d <= 6) };
    }
    if (r.type === 'monthly' && typeof r.day === 'number' && r.day >= 1 && r.day <= 31) {
      return { type: 'monthly', day: r.day };
    }
  }
  return { type: 'daily' };
}
