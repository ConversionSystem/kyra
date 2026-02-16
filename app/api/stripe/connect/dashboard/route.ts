import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createExpressDashboardLink } from '@/lib/stripe/connect';

/**
 * POST /api/stripe/connect/dashboard
 * Returns a Stripe Express Dashboard login link for the agency.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: membership } = await supabase
      .from('agency_members')
      .select('agency_id, role')
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'No agency found' }, { status: 403 });
    }

    if (membership.role !== 'owner' && membership.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const url = await createExpressDashboardLink(membership.agency_id);
    return NextResponse.json({ url });
  } catch (err) {
    console.error('[stripe/connect/dashboard] Error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
