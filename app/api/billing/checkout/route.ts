import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { createCheckoutSession, STRIPE_PRICE_IDS } from '@/lib/billing/stripe';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceClient = await createServiceClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { plan } = (await request.json()) as any;

    if (!['starter', 'business', 'max'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    if (!STRIPE_PRICE_IDS[plan]) {
      return NextResponse.json({ error: 'Stripe not configured for this plan' }, { status: 503 });
    }

    // Get user profile for existing Stripe customer ID
    const { data: profile } = await serviceClient
      .from('users')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    const origin = request.headers.get('origin') || 'https://kyra.conversionsystem.com';

    const session = await createCheckoutSession({
      userId: user.id,
      email: user.email!,
      plan: plan as 'starter' | 'business' | 'max',
      successUrl: `${origin}/chat?upgraded=true`,
      cancelUrl: `${origin}/settings?cancelled=true`,
      customerId: profile?.stripe_customer_id || undefined,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
