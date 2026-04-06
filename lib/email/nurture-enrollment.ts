// ============================================================================
// Nurture Sequence Enrollment
//
// Creates 7 rows in email_nurture_queue with staggered send_at timestamps.
// Idempotent — skips if agency already has nurture rows.
// ============================================================================

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

/** Day offsets for each nurture step (unified sequence) */
const STEP_DAYS: Record<number, number> = {
  1: 0,   // Day 0  — Welcome + deploy first AI worker
  2: 1,   // Day 1  — Did you connect? Check-in
  3: 3,   // Day 3  — Social proof (HVAC case study)
  4: 5,   // Day 5  — Feature spotlight (website builder + Growth Engine)
  5: 7,   // Day 7  — Connect GHL guide
  6: 14,  // Day 14 — Trial recap + upgrade nudge
  7: 21,  // Day 21 — Win-back
};

export async function enrollInNurtureSequence(agencyId: string, email: string): Promise<void> {
  const supabase = createServiceClientWithoutCookies();

  // Idempotent: skip if already enrolled
  const { count } = await supabase
    .from('email_nurture_queue')
    .select('id', { count: 'exact', head: true })
    .eq('agency_id', agencyId);

  if (count && count > 0) {
    console.log(`[nurture] Agency ${agencyId} already enrolled, skipping`);
    return;
  }

  const now = new Date();
  const rows = Object.entries(STEP_DAYS).map(([step, days]) => {
    const sendAt = new Date(now);
    sendAt.setDate(sendAt.getDate() + days);
    return {
      agency_id: agencyId,
      email,
      sequence_step: Number(step),
      send_at: sendAt.toISOString(),
    };
  });

  const { error } = await supabase.from('email_nurture_queue').insert(rows);

  if (error) {
    console.error(`[nurture] Failed to enroll agency ${agencyId}:`, error.message);
    return;
  }

  console.log(`[nurture] ✅ Enrolled agency ${agencyId} (${email}) — 7 emails queued`);
}
