/**
 * Format a sub/dim score for display. Subjective integer scores stay as
 * integers (`5`); decimal questionnaire scores collapse to a single digit
 * (`5.3`); float-arithmetic noise like `8.129999999999999` rounds cleanly
 * to `8.1`.
 *
 * Rule: round to one decimal, then drop the trailing `.0` if it lands on
 * a whole number — keeps the chart visually tidy when integer + decimal
 * sources coexist on the same screen.
 */
export function formatScore(value: number): string {
  if (!Number.isFinite(value)) return '0';
  const rounded = Math.round(value * 10) / 10;
  if (Number.isInteger(rounded)) return rounded.toString();
  return rounded.toFixed(1);
}
