import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { stripe, STRIPE_PRICES, type StripePlan } from '@/lib/stripe/config';

const VALID_PLANS: StripePlan[] = ['solo_pro', 'starter', 'pro', 'scale'];

type CheckoutBody = {
  plan?: string;
  billing?: 'monthly' | 'annual';
  addon?: 'voice';
};

/**
 * POST /api/stripe/checkout
 * Creates a Stripe Checkout Session for agency subscription or add-on.
 *
 * Body variants:
 *   { plan: 'solo_pro' | 'starter' | 'pro' | 'scale', billing?: 'monthly' | 'annual' }
 *   { addon: 'voice', billing?: 'monthly' | 'annual' }
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

    const body = (await request.json()) as CheckoutBody;
    const billing = body.billing ?? 'monthly';
    const isAnnual = billing === 'annual';

    const serviceClient = await createServiceClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001';

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

    // ── Voice Add-on checkout ──────────────────────────────────────────────
    if (body.addon === 'voice') {
      const priceKey = isAnnual ? 'voice_addon_annual' : 'voice_addon';
      const priceId = STRIPE_PRICES[priceKey].priceId;
      if (!priceId) {
        return NextResponse.json(
          { error: 'Voice add-on price not configured. Contact support.' },
          { status: 500 }
        );
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${appUrl}/agency/billing?voice=success`,
        cancel_url: `${appUrl}/agency/billing?voice=cancelled`,
        metadata: { agency_id: agencyData.id, addon: 'voice', billing },
      });

      return NextResponse.json({ url: session.url });
    }

    // ── Plan checkout ──────────────────────────────────────────────────────
    const plan = body.plan as StripePlan;

    if (!plan || !VALID_PLANS.includes(plan)) {
      return NextResponse.json(
        { error: `Invalid plan. Must be one of: ${VALID_PLANS.join(', ')}` },
        { status: 400 }
      );
    }

    const priceKey = isAnnual ? `${plan}_annual` as keyof typeof STRIPE_PRICES : plan;
    const priceId = STRIPE_PRICES[priceKey]?.priceId;

    if (!priceId) {
      // Fall back to monthly if annual price not configured yet
      const fallbackId = STRIPE_PRICES[plan]?.priceId;
      if (!fallbackId) {
        return NextResponse.json(
          { error: `Price ID not configured for plan: ${plan}` },
          { status: 500 }
        );
      }
      console.warn(`[stripe/checkout] Annual price not configured for ${plan}, falling back to monthly`);

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: [{ price: fallbackId, quantity: 1 }],
        success_url: `${appUrl}/agency/billing?checkout=success`,
        cancel_url: `${appUrl}/agency/billing?checkout=cancelled`,
        metadata: { agency_id: agencyData.id, plan, billing: 'monthly' },
        subscription_data: {
          trial_period_days: 7,
          metadata: { agency_id: agencyData.id },
        },
      });

      return NextResponse.json({ url: session.url });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/agency/billing?checkout=success`,
      cancel_url: `${appUrl}/agency/billing?checkout=cancelled`,
      metadata: { agency_id: agencyData.id, plan, billing },
      subscription_data: {
        // Annual plans don't get trial (they've already committed)
        trial_period_days: isAnnual ? undefined : 7,
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
