/**
 * Extract 2-letter initials from a name or first/last pair. Single source
 * of truth. Replaces reimplementations in crm-tab and client-detail-view.
 *
 * Examples:
 *   getInitials('Sam Altman')          → 'SA'
 *   getInitials('Madonna')             → 'MA'
 *   getInitials('Sam', 'Altman')       → 'SA'
 *   getInitials(null)                  → '?'
 *   getInitials('')                    → '?'
 */
export function getInitials(
  first?: string | null,
  last?: string | null,
): string {
  // Overload behavior: if only one arg is passed and it contains a space,
  // split it. Matches the existing inline helper shapes.
  if (first && !last && first.includes(' ')) {
    const [a, b] = first.split(/\s+/);
    return `${(a?.[0] ?? '').toUpperCase()}${(b?.[0] ?? '').toUpperCase()}` || '?';
  }
  const a = (first?.trim()?.[0] ?? '').toUpperCase();
  const b = (last?.trim()?.[0] ?? '').toUpperCase();
  const result = `${a}${b}`;
  if (result) return result;
  // Fallback: first two letters of first
  if (first && first.length >= 2) return first.slice(0, 2).toUpperCase();
  if (first && first.length >= 1) return first[0].toUpperCase();
  return '?';
}
