/**
 * Referral Activation — fires immediately on signup (no email gate)
 *
 * Design decision: credits granted the moment a referred friend creates their account.
 * Email confirmation gate was blocking all referral conversions in practice.
 *
 * Flow:
 *   1. Friend clicks referral link → cookie set
 *   2. Friend signs up → solo-signup calls activateReferral() immediately
 *   3. Referrer gets 100/150 credits (early bird), friend gets 100 credits
 *   4. status set to 'activated' right away
 *
 * checkAndActivateReferral() kept for the email callback as a safety net
 * (catches edge cases where signup route failed but email was confirmed).
 */

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { addCredits } from '@/lib/billing/credit-engine';

const FRIEND_CREDITS = 100;

/**
 * Activate a referral immediately after signup.
 * Called directly from solo-signup route — no email confirmation required.
 */
export async function activateReferral(referralRowId: string, referrerId: string, referredId: string, isEarlyBird: boolean): Promise<void> {
  const db = createServiceClientWithoutCookies();
  const referrerCredits = isEarlyBird ? 150 : 100;

  // Atomic status update — guard against double-activation
  const { error: updateErr, data: updated } = await db
    .from('agency_referrals')
    .update({
      status: 'activated',
      referrer_credits_granted: referrerCredits,
      friend_credits_granted: FRIEND_CREDITS,
      paid_out_at: new Date().toISOString(),
    })
    .eq('id', referralRowId)
    .eq('status', 'signed_up') // idempotent — only if still pending
    .select('id')
    .single();

  if (updateErr || !updated) {
    // Already activated or row gone — skip silently
    return;
  }

  // Grant referrer credits
  await addCredits(
    referrerId,
    referrerCredits,
    'bonus',
    isEarlyBird
      ? 'Early Bird referral! Your friend just joined Kyra 🚀 (+50 early bird bonus)'
      : 'Referral reward! Your friend just joined Kyra 🎉',
  ).catch(e => console.warn('[referral-activation] Referrer credit grant failed:', e));

  // Grant friend credits (they may have already received welcome credits separately,
  // but these are the referral bonus credits)
  await addCredits(
    referredId,
    FRIEND_CREDITS,
    'bonus',
    'Referral bonus! You joined via a friend\'s link 🎁',
  ).catch(e => console.warn('[referral-activation] Friend credit grant failed:', e));

  // Streak bonus — 3 activations in 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3_600_000).toISOString();
  const { count: weeklyActivated } = await db
    .from('agency_referrals')
    .select('id', { count: 'exact', head: true })
    .eq('referrer_id', referrerId)
    .in('status', ['activated', 'converted'])
    .gte('paid_out_at', sevenDaysAgo);

  if (weeklyActivated === 3) {
    await addCredits(
      referrerId,
      50,
      'bonus',
      'Streak bonus 🔥 — 3 referrals in 7 days!',
    ).catch(e => console.warn('[referral-activation] Streak bonus failed:', e));
  }

  console.log(`[referral-activation] ✅ Activated referral ${referralRowId}: referrer +${referrerCredits}, friend +${FRIEND_CREDITS}`);
}

/**
 * Safety net: fires from /api/auth/callback on email confirmation.
 * Catches any referrals still stuck at 'signed_up' (e.g. if signup route failed).
 */
export async function checkAndActivateReferral(referredUserId: string): Promise<void> {
  const db = createServiceClientWithoutCookies();

  const { data: member } = await db
    .from('agency_members')
    .select('agency_id')
    .eq('user_id', referredUserId)
    .limit(1)
    .single();

  if (!member) return;

  const { data: referral } = await db
    .from('agency_referrals')
    .select('id, referrer_id, early_bird')
    .eq('referred_id', member.agency_id)
    .eq('status', 'signed_up') // Only act on stuck ones
    .limit(1)
    .single();

  if (!referral) return;

  // Use activateReferral as the single source of truth
  await activateReferral(referral.id, referral.referrer_id, member.agency_id, referral.early_bird ?? false);
}
