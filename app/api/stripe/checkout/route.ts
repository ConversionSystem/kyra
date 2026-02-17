import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { stripe, STRIPE_PRICES, type StripePlan } from '@/lib/stripe/config';

const VALID_PLANS: StripePlan[] = ['starter', 'pro', 'scale'];

/**
 * POST /api/stripe/checkout
 * Creates a Stripe Checkout Session for agency subscription.
 * Body: { plan: 'starter' | 'pro' | 'scale' }
 */
export async function POST(request: NextRequest) {
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

    // Only owners/admins can manage billing
    if (membership.role !== 'owner' && membership.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = (await request.json()) as { plan?: string };
    const plan = body.plan as StripePlan;

    if (!plan || !VALID_PLANS.includes(plan)) {
      return NextResponse.json(
        { error: 'Invalid plan. Must be one of: starter, pro, scale' },
        { status: 400 }
      );
    }

    const priceId = STRIPE_PRICES[plan].priceId;
    if (!priceId) {
      return NextResponse.json(
        { error: `Price ID not configured for plan: ${plan}` },
        { status: 500 }
      );
    }

    const serviceClient = await createServiceClient();

    // Get or create Stripe customer
    const { data: agency } = await serviceClient
      .from('agencies')
      .select('id, name, stripe_customer_id')
      .eq('id', membership.agency_id)
      .single();

    if (!agency) {
      return NextResponse.json({ error: 'Agency not found' }, { status: 404 });
    }

    const agencyData = agency as { id: string; name: string; stripe_customer_id: string | null };
    let customerId = agencyData.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        name: agencyData.name,
        metadata: { agency_id: agencyData.id },
      });
      customerId = customer.id;

      await serviceClient
        .from('agencies')
        .update({ stripe_customer_id: customerId })
        .eq('id', agencyData.id);
    }

    // Create checkout session
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001';

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/agency/billing?checkout=success`,
      cancel_url: `${appUrl}/agency/billing?checkout=cancelled`,
      metadata: { agency_id: agencyData.id, plan },
      subscription_data: {
        trial_period_days: 30,
        metadata: { agency_id: agencyData.id },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[stripe/checkout] Error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
