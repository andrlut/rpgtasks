import type { Recurrence } from '@/lib/db/types';

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Is the task **scheduled** on the given local date?
 *
 * Scheduling = "show in Today as a reminder". For weekly/monthly with no
 * days/day set, this returns false (no schedule hint, only This Week/Month).
 * For one_shot, it returns true (the One-time bucket handles the
 * "completed already?" filter on top).
 */
export function isScheduledOn(rec: Recurrence, date: Date): boolean {
  switch (rec.type) {
    case 'one_shot':
      return true;
    case 'daily':
      return true;
    case 'weekly':
      return Array.isArray(rec.days) && rec.days.includes(date.getDay());
    case 'monthly':
      return typeof rec.day === 'number' && date.getDate() === rec.day;
  }
}

// Backwards-compatible alias — earlier code calls isDueOn. Same semantics
// as isScheduledOn under the new model.
export const isDueOn = isScheduledOn;

/**
 * Human-readable summary used by cards and forms.
 *   one_shot                     → "One-shot"
 *   daily, n=1                   → "Every day"
 *   daily, n=3                   → "3× every day"
 *   weekly, n=3, no days         → "3× per week"
 *   weekly, n=3, days [1,3,5]    → "3× per week · Mon, Wed, Fri"
 *   weekly, n=7, days all        → "Every day"
 *   monthly, n=1, day=15         → "1× per month · day 15"
 *   monthly, n=2, no day         → "2× per month"
 */
export function describeRecurrence(rec: Recurrence, targetCount = 1): string {
  switch (rec.type) {
    case 'one_shot':
      return 'One-shot';
    case 'daily':
      return targetCount > 1 ? `${targetCount}× every day` : 'Every day';
    case 'weekly': {
      const days = rec.days ?? [];
      if (days.length === 7) return 'Every day';
      const base = `${targetCount}× per week`;
      if (days.length === 0) return base;
      const sorted = [...days].sort((a, b) => a - b);
      const labels = sorted.map((d) => WEEKDAY_NAMES[d]).filter(Boolean);
      return `${base} · ${labels.join(', ')}`;
    }
    case 'monthly': {
      const base = targetCount === 1 ? 'Once a month' : `${targetCount}× per month`;
      return rec.day ? `${base} · day ${rec.day}` : base;
    }
  }
}

/** Parse a recurrence value coming from the DB; defaults to daily on garbage. */
export function parseRecurrence(raw: unknown): Recurrence {
  if (raw && typeof raw === 'object' && 'type' in raw) {
    const r = raw as { type: string; days?: number[]; day?: number };
    if (r.type === 'one_shot') return { type: 'one_shot' };
    if (r.type === 'daily') return { type: 'daily' };
    if (r.type === 'weekly') {
      const days = Array.isArray(r.days)
        ? r.days.filter((d) => d >= 0 && d <= 6)
        : undefined;
      // Empty array collapses to "no schedule" semantically.
      return days && days.length > 0 ? { type: 'weekly', days } : { type: 'weekly' };
    }
    if (r.type === 'monthly') {
      const day =
        typeof r.day === 'number' && r.day >= 1 && r.day <= 31 ? r.day : undefined;
      return day ? { type: 'monthly', day } : { type: 'monthly' };
    }
  }
  return { type: 'daily' };
}
