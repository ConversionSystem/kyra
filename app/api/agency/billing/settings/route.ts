import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

/**
 * GET /api/agency/billing/settings
 * Returns the agency's billing settings (default pricing, connect status).
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: membership } = await supabase
      .from('agency_members')
      .select('agency_id')
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'No agency found' }, { status: 403 });
    }

    const { data: agency } = await supabase
      .from('agencies')
      .select('default_client_price_cents, stripe_connect_account_id, stripe_onboarding_complete, plan')
      .eq('id', membership.agency_id)
      .single();

    if (!agency) {
      return NextResponse.json({ error: 'Agency not found' }, { status: 404 });
    }

    return NextResponse.json(agency);
  } catch (err) {
    console.error('[agency/billing/settings] GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/agency/billing/settings
 * Update agency billing settings (default per-client price).
 * Body: { default_client_price_cents: number }
 */
export async function PUT(request: NextRequest) {
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

    const body = (await request.json()) as { default_client_price_cents?: number };

    if (!body.default_client_price_cents || body.default_client_price_cents < 100) {
      return NextResponse.json(
        { error: 'Default price must be at least $1.00' },
        { status: 400 }
      );
    }

    const serviceClient = await createServiceClient();

    await serviceClient
      .from('agencies')
      .update({ default_client_price_cents: body.default_client_price_cents })
      .eq('id', membership.agency_id);

    return NextResponse.json({ success: true, default_client_price_cents: body.default_client_price_cents });
  } catch (err) {
    console.error('[agency/billing/settings] PUT error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
