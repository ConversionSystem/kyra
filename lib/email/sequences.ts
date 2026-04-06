// ============================================================================
// DEPRECATED — Kyra onboarding sequence emails
//
// These templates have been merged into the unified nurture sequence in
// lib/email/nurture-sequence.ts (7 emails over 21 days via email_nurture_queue).
//
// The send logic in /api/cron/email-sequence now uses only the nurture queue.
// This file is kept as a stub to avoid breaking any stale imports.
// ============================================================================

export type SequenceDay = 1 | 3 | 5 | 7;
export const SEQUENCE_DAYS: SequenceDay[] = [];

/** @deprecated Use getNurtureEmail from lib/email/nurture-sequence instead */
export function getSequenceEmail(_day: SequenceDay, _agency: unknown): null {
  return null;
}

/** @deprecated Nurture queue in /api/cron/email-sequence handles all sending */
export async function sendSequenceEmail(
  _agency: unknown,
  _day: SequenceDay,
): Promise<{ ok: boolean; skipped: string }> {
  return { ok: false, skipped: 'Deprecated — use nurture queue' };
}
