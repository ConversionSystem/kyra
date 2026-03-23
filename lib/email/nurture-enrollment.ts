// ============================================================================
// Nurture Sequence Enrollment
//
// Creates 7 rows in email_nurture_queue with staggered send_at timestamps.
// Idempotent — skips if agency already has nurture rows.
// ============================================================================

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

/** Day offsets for each nurture step */
const STEP_DAYS: Record<number, number> = {
  1: 0,   // Immediate
  2: 2,   // Day 2
  3: 4,   // Day 4
  4: 7,   // Day 7
  5: 10,  // Day 10
  6: 14,  // Day 14
  7: 21,  // Day 21
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
