import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { getAgencyForUser } from '@/lib/agency/queries';
import { getPremiumTemplate } from '@/lib/billing/premium-templates';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await getAgencyForUser(user.id);
  if (!result) return NextResponse.json({ error: 'No agency found for this user' }, { status: 403 });

  const agencyId = result.agency.id;

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

  // ── Fetch client (user-scoped — same client as works in the picker) ──
  // NOTE: service role key may be missing in env; user client definitely works
  const { data: clientRow, error: clientErr } = await supabase
    .from('agency_clients')
    .select('id, name, agency_id, settings')
    .eq('id', clientId)
    .single();

  if (clientErr || !clientRow) {
    console.error('[premium-template] Client lookup failed:', {
      clientId,
      agencyId,
      error: clientErr?.message,
      code: clientErr?.code,
    });
    return NextResponse.json(
      { error: `Client not found (id: ${clientId})` },
      { status: 404 },
    );
  }

  // ── Verify ownership ──────────────────────────────────────────────────
  if (clientRow.agency_id !== agencyId) {
    console.error('[premium-template] Agency mismatch:', {
      clientId,
      clientAgencyId: clientRow.agency_id,
      userAgencyId: agencyId,
    });
    return NextResponse.json({ error: 'This client does not belong to your agency' }, { status: 403 });
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
      .eq('id', clientId);

    if (updateErr) {
      console.error('[premium-template] Update failed:', updateErr);
      return NextResponse.json(
        { error: `Database update failed: ${updateErr.message}` },
        { status: 500 },
      );
    }

    // Verify it persisted
    const { data: verify } = await supabase
      .from('agency_clients')
      .select('settings')
      .eq('id', clientId)
      .single();

    const saved = (verify?.settings as Record<string, unknown>)?.premium_template;
    if (saved !== templateId) {
      console.error('[premium-template] Verification failed. Saved:', saved, 'Expected:', templateId);
      return NextResponse.json(
        { error: 'Activation did not persist — try again' },
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
      client_reference_id: user.id,
      metadata: {
        agency_id: agencyId,
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
