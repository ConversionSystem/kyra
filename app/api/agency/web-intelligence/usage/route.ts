/**
 * GET /api/agency/web-intelligence/usage
 *
 * Returns current month Firecrawl web scrape usage for the logged-in agency.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { PLANS } from '@/lib/billing/plans';
import type { Plan } from '@/lib/billing/plans';

export const dynamic = 'force-dynamic';

function getCurrentYearMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getResetDate(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString().split('T')[0];
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Get agency
    const { data: member } = await supabase
      .from('agency_members')
      .select('agency_id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (!member?.agency_id) {
      return NextResponse.json({ error: 'No agency found' }, { status: 404 });
    }

    const agencyId = member.agency_id;

    // Get agency plan
    const { data: agency } = await supabase
      .from('agencies')
      .select('plan')
      .eq('id', agencyId)
      .single();

    const plan = (agency?.plan as Plan) ?? 'free';
    const limit = PLANS[plan]?.monthlyWebScrapes ?? 0;

    // Get current month usage (use service client — firecrawl_usage is service-role only)
    const sb = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const yearMonth = getCurrentYearMonth();
    const { data: usage } = await sb
      .from('firecrawl_usage')
      .select('scrapes_used, last_scrape_at')
      .eq('agency_id', agencyId)
      .eq('year_month', yearMonth)
      .single();

    return NextResponse.json({
      used: usage?.scrapes_used ?? 0,
      limit,
      plan,
      resetDate: getResetDate(),
      lastScrapedAt: usage?.last_scrape_at ?? null,
    });
  } catch (error) {
    console.error('[web-intelligence/usage] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
