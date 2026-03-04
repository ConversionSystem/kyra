import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyAdmin } from '@/lib/agency/middleware';
import { createClient } from '@/lib/supabase/server';
import { getPremiumTemplate } from '@/lib/billing/premium-templates';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // ── Auth — same pattern as /api/agency/clients ────────────────────────
  const authResult = await requireAgencyAdmin();
  if (authResult.error) {
    return NextResponse.json(
      { error: authResult.error.message },
      { status: authResult.error.status },
    );
  }

  const { agency } = authResult.data;
  const supabase = await createClient();

  // ── Parse body ────────────────────────────────────────────────────────
  const body = await request.json();
  const { templateId, clientId } = body;

  if (!templateId || !clientId) {
    return NextResponse.json({ error: 'Missing templateId or clientId' }, { status: 400 });
  }

  // ── Validate template ─────────────────────────────────────────────────
  const template = getPremiumTemplate(templateId);
  if (!template) {
    return NextResponse.json({ error: `Unknown template: ${templateId}` }, { status: 400 });
  }

  // ── Fetch client — same query as /api/agency/clients GET ─────────────
  const { data: allClients, error: listErr } = await supabase
    .from('agency_clients')
    .select('id, name, settings')
    .eq('agency_id', agency.id);

  if (listErr) {
    console.error('[premium-template] agency_clients list failed:', listErr);
    return NextResponse.json({ error: `DB error: ${listErr.message}` }, { status: 500 });
  }

  console.log(`[premium-template] agency ${agency.id} has ${allClients?.length ?? 0} clients. Looking for: ${clientId}`);
  console.log('[premium-template] IDs available:', allClients?.map(c => c.id));

  const clientRow = allClients?.find(c => c.id === clientId);
  if (!clientRow) {
    return NextResponse.json(
      { error: `Client not found. Available IDs: ${allClients?.map(c => c.id).join(', ')}` },
      { status: 404 },
    );
  }

  const clientSettings = (clientRow.settings as Record<string, unknown>) ?? {};

  // ── Already activated? ────────────────────────────────────────────────
  if (clientSettings.premium_template === templateId) {
    return NextResponse.json({ error: 'Client already has this premium template' }, { status: 400 });
  }

  // ── Activate ──────────────────────────────────────────────────────────
  const priceId = process.env.STRIPE_PREMIUM_VET_SEO_PRICE_ID;

  if (!priceId) {
    // Beta mode — activate without Stripe
    const newSettings: Record<string, unknown> = {
      ...clientSettings,
      premium_template: templateId,
      premium_template_activated_at: new Date().toISOString(),
      premium_template_setup: body.setupData || {},
      premium_template_status: 'active',
    };

    const { error: updateErr } = await supabase
      .from('agency_clients')
      .update({ settings: newSettings })
      .eq('id', clientId)
      .eq('agency_id', agency.id);

    if (updateErr) {
      console.error('[premium-template] Update failed:', updateErr);
      return NextResponse.json(
        { error: `Update failed: ${updateErr.message}` },
        { status: 500 },
      );
    }

    console.log(`[premium-template] ✅ ${templateId} activated for "${clientRow.name}" (${clientId})`);

    return NextResponse.json({
      ok: true,
      mode: 'beta',
      templateId,
      clientId,
      clientName: clientRow.name,
      redirectUrl: `/agency/clients/${clientId}?tab=seo&activated=true`,
    });
  }

  // ── Stripe checkout ───────────────────────────────────────────────────
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
      client_reference_id: agency.id,
      metadata: {
        agency_id: agency.id,
        client_id: clientId,
        template_id: templateId,
      },
    });

    return NextResponse.json({ ok: true, checkoutUrl: session.url });
  } catch (err) {
    console.error('[premium-template] Stripe checkout failed:', err);
    return NextResponse.json({ error: 'Payment setup failed' }, { status: 500 });
  }
}
