import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe/config';

/**
 * POST /api/stripe/portal
 * Creates a Stripe Customer Portal session for managing payment methods,
 * viewing invoices, and cancelling subscriptions.
 */
export async function POST() {
  try {
    // Auth check
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!stripe) {
      return NextResponse.json({ error: 'Stripe is not configured. Contact support.' }, { status: 503 });
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

    // Get agency's Stripe customer
    const { data: agency } = await supabase
      .from('agencies')
      .select('stripe_customer_id')
      .eq('id', membership.agency_id)
      .single();

    if (!agency) {
      return NextResponse.json({ error: 'Agency not found' }, { status: 404 });
    }

    const customerId = (agency as { stripe_customer_id: string | null }).stripe_customer_id;
    if (!customerId) {
      return NextResponse.json(
        { error: 'No billing account. Subscribe to a plan first.' },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001';

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/agency/billing`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    console.error('[stripe/portal] Error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
