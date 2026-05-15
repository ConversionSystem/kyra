// GET /api/agency/credits — Returns balance + recent transactions

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAgencyCredits, getCreditTransactions } from '@/lib/billing/credit-engine';
import { isAdminAgency } from '@/lib/auth/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: member } = await supabase
      .from('agency_members')
      .select('agency_id')
      .eq('user_id', user.id)
      .single();

    if (!member) return NextResponse.json({ error: 'No agency found' }, { status: 404 });

    const [balance, transactions, isAdmin] = await Promise.all([
      getAgencyCredits(member.agency_id),
      getCreditTransactions(member.agency_id, 10),
      isAdminAgency(member.agency_id),
    ]);

    return NextResponse.json({
      ...balance,
      // Admin (platform-owner) agencies bypass billing — surface that flag
      // so the sidebar CreditBadge can show "∞ Admin" instead of a stale
      // balance, and other UI surfaces can hide top-up CTAs.
      isAdminAgency: isAdmin,
      recentTransactions: transactions,
    });
  } catch (err) {
    console.error('[credits GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
