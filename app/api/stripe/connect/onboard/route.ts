import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createConnectAccount, createConnectOnboardingLink } from '@/lib/stripe/connect';

/**
 * POST /api/stripe/connect/onboard
 * Creates a Stripe Connect account (if needed) and returns an onboarding URL.
 */
export async function POST() {
  try {
    // Auth check
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get agency membership
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

    // Check plan — only pro/scale can use Connect
    const { data: agency } = await supabase
      .from('agencies')
      .select('plan')
      .eq('id', membership.agency_id)
      .single();

    if (!agency) {
      return NextResponse.json({ error: 'Agency not found' }, { status: 404 });
    }

    const agencyPlan = (agency as { plan: string }).plan;
    if (agencyPlan !== 'pro' && agencyPlan !== 'scale') {
      return NextResponse.json(
        { error: 'Stripe Connect is available on Pro and Scale plans only' },
        { status: 403 }
      );
    }

    // Create connect account if needed
    const email = user.email ?? '';
    await createConnectAccount(membership.agency_id, email);

    // Generate onboarding link
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001';
    const returnUrl = `${appUrl}/agency/billing`;

    const url = await createConnectOnboardingLink(membership.agency_id, returnUrl);

    return NextResponse.json({ url });
  } catch (err) {
    console.error('[stripe/connect/onboard] Error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
