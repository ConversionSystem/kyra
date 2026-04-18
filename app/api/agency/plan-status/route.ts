// GET /api/agency/plan-status — Returns current plan for polling after checkout

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    const { data: agency } = await supabase
      .from('agencies')
      .select('plan, updated_at')
      .eq('id', member.agency_id)
      .single();

    if (!agency) return NextResponse.json({ error: 'Agency not found' }, { status: 404 });

    return NextResponse.json(
      { plan: agency.plan, updated_at: agency.updated_at },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    console.error('[plan-status] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
