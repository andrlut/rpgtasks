export function timeOfDayGreeting(date: Date = new Date()): string {
  const h = date.getHours();
  if (h < 5) return 'Late night,';
  if (h < 12) return 'Good morning,';
  if (h < 18) return 'Good afternoon,';
  return 'Good evening,';
}

export function formatLongDate(date: Date = new Date()): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}
