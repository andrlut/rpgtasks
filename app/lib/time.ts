import { getCurrentLocale, translate } from '@/lib/i18n';
import type { LanguageCode } from '@/lib/settings';

const LOCALE_MAP: Record<LanguageCode, string> = {
  en: 'en-US',
  pt: 'pt-BR',
};

function bcp47(locale?: LanguageCode): string {
  return LOCALE_MAP[locale ?? getCurrentLocale()];
}

/**
 * Locale-aware "Good morning," / "Bom dia," etc. The trailing comma is part of
 * the translation so PT and EN agree on the punctuation style.
 */
export function timeOfDayGreeting(date: Date = new Date()): string {
  const h = date.getHours();
  if (h < 5) return translate('home.greeting.night') + ',';
  if (h < 12) return translate('home.greeting.morning') + ',';
  if (h < 18) return translate('home.greeting.afternoon') + ',';
  return translate('home.greeting.evening') + ',';
}

export function formatLongDate(date: Date = new Date(), locale?: LanguageCode): string {
  return date.toLocaleDateString(bcp47(locale), {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

/** Compact uppercase format for dense headers — e.g. "SUN, MAY 3" / "DOM, 3 MAI". */
export function formatCompactDate(date: Date = new Date(), locale?: LanguageCode): string {
  const tag = bcp47(locale);
  const dow = date.toLocaleDateString(tag, { weekday: 'short' }).toUpperCase();
  const md = date.toLocaleDateString(tag, { month: 'short', day: 'numeric' }).toUpperCase();
  return `${dow}, ${md}`;
}

/** Big-headline date for the V3 home — split form so the caller can style
 *  the month/day fragment distinctly.
 *
 *  English: { weekday: "Sunday,", monthDay: "May 24" }
 *  Portuguese: { weekday: "Domingo,", monthDay: "24 de mai" }
 *
 *  Capitalizes the weekday (Portuguese `toLocaleDateString` returns it
 *  lowercase) and strips the trailing period that pt-BR adds to the
 *  abbreviated month (e.g. "mai." → "mai") — looks weird in a big
 *  headline.
 */
export function formatHeroDate(
  date: Date = new Date(),
  locale?: LanguageCode,
): { weekday: string; monthDay: string } {
  const tag = bcp47(locale);
  const weekday = date.toLocaleDateString(tag, { weekday: 'long' });
  const cap = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  const monthDay = date
    .toLocaleDateString(tag, { month: 'short', day: 'numeric' })
    .replace(/\.$/, '');
  return { weekday: `${cap},`, monthDay };
}

/**
 * Friendly relative time for past timestamps.
 *
 * "just now" / "agora" → "5m ago" / "5min" → "2h ago" / "2h" → "3d ago" / "3d" →
 * full short date if older than a week. Keeps strings short to fit in dense
 * lists.
 */
export function timeAgo(input: Date | string, now: Date = new Date(), locale?: LanguageCode): string {
  const past = typeof input === 'string' ? new Date(input) : input;
  const diffSec = Math.max(0, Math.floor((now.getTime() - past.getTime()) / 1000));
  const lang = locale ?? getCurrentLocale();
  if (diffSec < 45) return lang === 'pt' ? 'agora' : 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return lang === 'pt' ? `${diffMin}min` : `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return lang === 'pt' ? `${diffHr}h` : `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return lang === 'pt' ? `${diffDay}d` : `${diffDay}d ago`;
  return past.toLocaleDateString(bcp47(locale), { month: 'short', day: 'numeric' });
}

/**
 * Format a number with locale-appropriate thousands/decimal separators. Used
 * for XP, coin counts, skill values etc.
 */
export function formatNumber(value: number, locale?: LanguageCode): string {
  return new Intl.NumberFormat(bcp47(locale)).format(value);
}
