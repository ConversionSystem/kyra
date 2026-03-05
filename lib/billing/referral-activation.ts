/**
 * Referral Activation Gate
 *
 * Referrer credits are NOT granted on signup — only when the referred user
 * sends their first real AI message. This prevents fake email abuse.
 *
 * Flow:
 *   1. Referred user signs up → status = 'signed_up', referrer gets 0 credits
 *   2. Referred user's first AI message fires → checkAndActivateReferral()
 *   3. If pending referral found → grant referrer credits, set status = 'activated'
 *
 * Call from: /api/widget/chat and any other chat completion routes (fire-and-forget).
 */

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { addCredits } from '@/lib/billing/credit-engine';

export async function checkAndActivateReferral(referredAgencyId: string): Promise<void> {
  const db = createServiceClientWithoutCookies();

  // Find a pending referral for this agency (signed_up but not yet activated)
  const { data: referral } = await db
    .from('agency_referrals')
    .select('id, referrer_id, early_bird, referrer_credits_granted')
    .eq('referred_id', referredAgencyId)
    .eq('status', 'signed_up')
    .limit(1)
    .single();

  if (!referral) return; // No pending referral — nothing to do

  // Verify this really is their first conversation (double-check against gaming)
  const { count } = await db
    .from('client_conversations')
    .select('id', { count: 'exact', head: true })
    .eq('agency_id', referredAgencyId);

  // Only activate on first message (count = 1 means this is it)
  if ((count ?? 0) > 1) return;

  const referrerCredits = referral.early_bird ? 150 : 100;

  // Mark as activated immediately (prevent double-grant race condition)
  const { error: updateErr } = await db
    .from('agency_referrals')
    .update({
      status: 'activated',
      referrer_credits_granted: referrerCredits,
      paid_out_at: new Date().toISOString(),
    })
    .eq('id', referral.id)
    .eq('status', 'signed_up'); // Only update if still signed_up (atomic guard)

  if (updateErr) {
    console.warn('[referral-activation] Update failed (possible race):', updateErr.message);
    return;
  }

  // Grant referrer their credits
  try {
    await addCredits(
      referral.referrer_id,
      referrerCredits,
      'bonus',
      referral.early_bird
        ? `Early Bird referral activated 🚀 — your friend sent their first AI message (+50 early bird bonus)`
        : `Referral activated 🎉 — your friend sent their first AI message`,
    );
    console.log(`[referral-activation] Granted ${referrerCredits} credits to ${referral.referrer_id} — referral ${referral.id} activated`);
  } catch (e) {
    console.error('[referral-activation] Credit grant failed:', e);
    // Roll back status so it can retry next message
    await db
      .from('agency_referrals')
      .update({ status: 'signed_up', referrer_credits_granted: 0, paid_out_at: null })
      .eq('id', referral.id);
    return;
  }

  // Streak bonus check (same as before — based on activated referrals now)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3_600_000).toISOString();
  const { count: weeklyActivated } = await db
    .from('agency_referrals')
    .select('id', { count: 'exact', head: true })
    .eq('referrer_id', referral.referrer_id)
    .eq('status', 'activated')
    .gte('paid_out_at', sevenDaysAgo);

  if (weeklyActivated === 3) {
    await addCredits(
      referral.referrer_id,
      50,
      'bonus',
      'Streak bonus 🔥 — 3 referrals activated in 7 days!',
    ).catch(e => console.warn('[referral-activation] Streak bonus failed:', e));
  }
}
