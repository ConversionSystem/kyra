/**
 * Referral Activation Gate — Email Confirmation
 *
 * Referrer credits are granted when the referred user CONFIRMS THEIR EMAIL.
 * This stops disposable/fake emails dead while keeping zero friction for real users.
 *
 * Flow:
 *   1. Friend signs up via referral link → status = 'signed_up', referrer_credits_granted = 0
 *   2. Supabase sends confirmation email
 *   3. Friend clicks confirm → /api/auth/callback fires → calls checkAndActivateReferral()
 *   4. confirmed_at is set → grant referrer 100/150 credits → status = 'activated'
 *
 * Called from: app/api/auth/callback/route.ts (after exchangeCodeForSession)
 */

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { addCredits } from '@/lib/billing/credit-engine';

export async function checkAndActivateReferral(referredUserId: string): Promise<void> {
  const db = createServiceClientWithoutCookies();

  // 1. Verify the user's email is actually confirmed
  const { data: { user }, error: userErr } = await db.auth.admin.getUserById(referredUserId);
  if (userErr || !user?.email_confirmed_at) return; // Not confirmed yet — do nothing

  // 2. Find their agency
  const { data: member } = await db
    .from('agency_members')
    .select('agency_id')
    .eq('user_id', referredUserId)
    .limit(1)
    .single();

  if (!member) return;

  // 3. Find a pending referral for this agency (signed_up but not yet activated)
  const { data: referral } = await db
    .from('agency_referrals')
    .select('id, referrer_id, early_bird')
    .eq('referred_id', member.agency_id)
    .eq('status', 'signed_up')
    .limit(1)
    .single();

  if (!referral) return; // No pending referral — nothing to do

  const referrerCredits = referral.early_bird ? 150 : 100;

  // 4. Atomic update — only fires once (guard against duplicate callbacks)
  const { error: updateErr } = await db
    .from('agency_referrals')
    .update({
      status: 'activated',
      referrer_credits_granted: referrerCredits,
      paid_out_at: new Date().toISOString(),
    })
    .eq('id', referral.id)
    .eq('status', 'signed_up'); // Only update if still pending (prevents double-grant)

  if (updateErr) {
    console.warn('[referral-activation] Update failed (possible race):', updateErr.message);
    return;
  }

  // 5. Grant referrer credits
  try {
    await addCredits(
      referral.referrer_id,
      referrerCredits,
      'bonus',
      referral.early_bird
        ? `Early Bird referral activated 🚀 — your friend confirmed their email! (+50 early bird bonus)`
        : `Referral activated 🎉 — your friend confirmed their email and is ready to go!`,
    );
    console.log(`[referral-activation] Granted ${referrerCredits} credits to ${referral.referrer_id}`);
  } catch (e) {
    console.error('[referral-activation] Credit grant failed:', e);
    // Roll back so it can retry on next callback
    await db
      .from('agency_referrals')
      .update({ status: 'signed_up', referrer_credits_granted: 0, paid_out_at: null })
      .eq('id', referral.id);
    return;
  }

  // 6. Streak bonus — 3 activations in 7 days
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
      'Streak bonus 🔥 — 3 referrals confirmed in 7 days!',
    ).catch(e => console.warn('[referral-activation] Streak bonus failed:', e));
  }
}
