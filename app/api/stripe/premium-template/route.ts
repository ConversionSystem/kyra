import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser } from '@/lib/agency/queries';
import { getPremiumTemplate } from '@/lib/billing/premium-templates';

export const dynamic = 'force-dynamic';

/**
 * POST /api/stripe/premium-template
 *
 * Creates a Stripe Checkout session for a premium template subscription.
 * The subscription is tied to a specific client_id.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await getAgencyForUser(user.id);
  if (!result) return NextResponse.json({ error: 'No agency' }, { status: 403 });

  const body = await request.json();
  const { templateId, clientId } = body;

  if (!templateId || !clientId) {
    return NextResponse.json({ error: 'Missing templateId or clientId' }, { status: 400 });
  }

  // Validate template exists
  const template = getPremiumTemplate(templateId);
  if (!template) {
    return NextResponse.json({ error: 'Unknown template' }, { status: 400 });
  }

  // Validate client belongs to this agency
  const { data: client } = await supabase
    .from('agency_clients')
    .select('id, name')
    .eq('id', clientId)
    .eq('agency_id', result.agency.id)
    .single();

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  // Check if client already has this premium template
  const { data: existing } = await supabase
    .from('agency_clients')
    .select('settings')
    .eq('id', clientId)
    .single();

  const clientSettings = (existing?.settings as Record<string, unknown>) ?? {};
  if (clientSettings.premium_template === templateId) {
    return NextResponse.json({ error: 'Client already has this premium template' }, { status: 400 });
  }

  // For now: activate the premium template directly (Stripe integration comes in Phase 4)
  // TODO: Create actual Stripe checkout session when STRIPE_PREMIUM_VET_SEO_PRICE_ID is set
  const priceId = process.env.STRIPE_PREMIUM_VET_SEO_PRICE_ID;

  if (!priceId) {
    // Beta mode: activate without Stripe payment
    // Store template config and setup data on the client
    await supabase
      .from('agency_clients')
      .update({
        settings: {
          ...clientSettings,
          premium_template: templateId,
          premium_template_activated_at: new Date().toISOString(),
          premium_template_setup: body.setupData || {},
          premium_template_status: 'active',
        },
      })
      .eq('id', clientId);

    console.log(
      `[premium-template] Activated ${templateId} for client ${client.name} (${clientId}) — beta mode (no Stripe)`,
    );

    return NextResponse.json({
      ok: true,
      mode: 'beta',
      templateId,
      clientId,
      message: 'Premium template activated (beta — no payment required)',
    });
  }

  // Production mode: create Stripe checkout
  try {
    const stripe = (await import('stripe')).default;
    const stripeClient = new stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2023-10-16' as never,
    });

    const session = await stripeClient.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/agency/clients/${clientId}?tab=seo&activated=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/agency/clients/${clientId}?tab=settings`,
      client_reference_id: user.id,
      metadata: {
        agency_id: result.agency.id,
        client_id: clientId,
        template_id: templateId,
        user_id: user.id,
      },
    });

    return NextResponse.json({ ok: true, checkoutUrl: session.url });
  } catch (err) {
    console.error('[premium-template] Stripe checkout failed:', err);
    return NextResponse.json(
      { error: 'Payment setup failed' },
      { status: 500 },
    );
  }
}
