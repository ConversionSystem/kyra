// ============================================================================
// POST /api/agency/credits/reconcile
//
// Reconcile credit usage with actual conversation counts.
// Compares total conversations logged in client_conversations with total
// credits used (lifetime_used). If conversations > credits used, deducts
// the difference.
//
// This catches cases where messages were processed but credits weren't
// deducted (e.g., direct terminal usage, webhook failures).
//
// Called automatically on dashboard page load or manually.
// ============================================================================

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAgencyCredits, deductCredits } from '@/lib/billing/credit-engine';

export const dynamic = 'force-dynamic';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: member } = await supabase
    .from('agency_members')
    .select('agency_id')
    .eq('user_id', user.id)
    .single();

  if (!member) return NextResponse.json({ error: 'No agency found' }, { status: 404 });

  const agencyId = member.agency_id;

  // Count total conversations
  const { count: totalConversations } = await supabase
    .from('client_conversations')
    .select('id', { count: 'exact', head: true })
    .eq('agency_id', agencyId);

  // Get current credit state
  const credits = await getAgencyCredits(agencyId);

  // Check for untracked usage
  const trackedUsage = credits.lifetimeUsed;
  const actualUsage = totalConversations ?? 0;
  const deficit = actualUsage - trackedUsage;

  if (deficit > 0) {
    // There are conversations that weren't charged
    const result = await deductCredits(agencyId, 'chat.message', {
      multiplier: deficit,
      description: `Usage reconciliation: ${deficit} untracked conversation(s)`,
    });

    return NextResponse.json({
      reconciled: true,
      deficit,
      newBalance: result.newBalance,
      totalConversations: actualUsage,
      previouslyTracked: trackedUsage,
    });
  }

  return NextResponse.json({
    reconciled: false,
    deficit: 0,
    balance: credits.balance,
    totalConversations: actualUsage,
    trackedUsage,
    message: 'Credits are in sync',
  });
}
