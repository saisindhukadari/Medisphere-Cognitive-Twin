/**
 * Small text helpers shared by every screen that renders a stored enum/token.
 *
 * <p>Keeping them in one place guarantees the UI never leaks a raw value such as
 * {@code AI_GENERATED} or {@code PENDING_REVIEW} to the user.</p>
 */

/** Tokens that must stay upper-cased when a snake_case value is humanised. */
const ACRONYMS: Record<string, string> = {
  ai: 'AI',
  fhir: 'FHIR',
  bp: 'BP',
  ecg: 'ECG',
  mrn: 'MRN',
  spo2: 'SpO2',
  id: 'ID',
  o2: 'O2',
};

/**
 * Turn a stored token into display text: `AI_GENERATED` → "AI Generated",
 * `ACKNOWLEDGED` → "Acknowledged".
 *
 * @param value raw value from the backend; never null/undefined in the output
 */
export function humanize(value: string | null | undefined): string {
  const words = String(value ?? '')
    .toLowerCase()
    .split('_')
    .filter(Boolean);
  if (!words.length) return '—';
  return words.map((w) => ACRONYMS[w] ?? w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/** First/last initials for an avatar — always something meaningful, never blank. */
export function initials(name: string | null | undefined): string {
  const parts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
