import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { getAgencyForUser } from '@/lib/agency/queries';
import { getPremiumTemplate } from '@/lib/billing/premium-templates';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // Auth: verify user owns this agency
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

  // Use service client for all DB writes (bypasses RLS edge cases)
  const admin = createServiceClientWithoutCookies();

  // Validate client belongs to this agency
  const { data: clientRow, error: clientErr } = await admin
    .from('agency_clients')
    .select('id, name, settings')
    .eq('id', clientId)
    .eq('agency_id', result.agency.id)
    .single();

  if (clientErr || !clientRow) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const clientSettings = (clientRow.settings as Record<string, unknown>) ?? {};

  // Already activated?
  if (clientSettings.premium_template === templateId) {
    return NextResponse.json({ error: 'Client already has this premium template' }, { status: 400 });
  }

  const priceId = process.env.STRIPE_PREMIUM_VET_SEO_PRICE_ID;

  if (!priceId) {
    // Beta mode — activate without Stripe payment
    const newSettings = {
      ...clientSettings,
      premium_template: templateId,
      premium_template_activated_at: new Date().toISOString(),
      premium_template_setup: body.setupData || {},
      premium_template_status: 'active',
    };

    const { error: updateErr } = await admin
      .from('agency_clients')
      .update({ settings: newSettings })
      .eq('id', clientId)
      .eq('agency_id', result.agency.id);

    if (updateErr) {
      console.error('[premium-template] Failed to activate:', updateErr);
      return NextResponse.json(
        { error: `Activation failed: ${updateErr.message}` },
        { status: 500 },
      );
    }

    // Verify the update actually persisted
    const { data: verify } = await admin
      .from('agency_clients')
      .select('settings')
      .eq('id', clientId)
      .single();

    const verifiedSettings = verify?.settings as Record<string, unknown> | null;
    if (verifiedSettings?.premium_template !== templateId) {
      console.error('[premium-template] Update did not persist for client', clientId);
      return NextResponse.json(
        { error: 'Activation did not persist — please try again' },
        { status: 500 },
      );
    }

    console.log(
      `[premium-template] ✅ Activated ${templateId} for ${clientRow.name} (${clientId})`,
    );

    return NextResponse.json({
      ok: true,
      mode: 'beta',
      templateId,
      clientId,
      redirectUrl: `/agency/clients/${clientId}?tab=seo&activated=true`,
    });
  }

  // Production mode — Stripe checkout
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
    return NextResponse.json({ error: 'Payment setup failed' }, { status: 500 });
  }
}
