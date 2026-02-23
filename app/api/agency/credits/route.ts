// GET /api/agency/credits — Returns balance + recent transactions

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAgencyCredits, getCreditTransactions } from '@/lib/billing/credit-engine';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: member } = await supabase
    .from('agency_members')
    .select('agency_id')
    .eq('user_id', user.id)
    .single();

  if (!member) return NextResponse.json({ error: 'No agency found' }, { status: 404 });

  const [balance, transactions] = await Promise.all([
    getAgencyCredits(member.agency_id),
    getCreditTransactions(member.agency_id, 10),
  ]);

  return NextResponse.json({ ...balance, recentTransactions: transactions });
}
