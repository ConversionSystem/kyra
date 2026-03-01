import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  createPaymentLink,
  createPaymentRequest,
  getPaymentStats,
  buildPaymentMessage,
} from '@/lib/payments/payment-collection';

export const dynamic = 'force-dynamic';

// GET — Payment stats
export async function GET(req: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: membership } = await sb
    .from('agency_members')
    .select('agency_id')
    .eq('user_id', user.id)
    .single();

  if (!membership) return NextResponse.json({ error: 'No agency' }, { status: 404 });

  const clientId = req.nextUrl.searchParams.get('clientId');
  const stats = await getPaymentStats(membership.agency_id, clientId ?? undefined);

  return NextResponse.json({ stats });
}

// POST — Create payment request and send to customer
export async function POST(req: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { contactId, contactName, contactPhone, contactEmail, amount, description, service } = body;

  if (!contactName || !amount || !description) {
    return NextResponse.json({ error: 'contactName, amount, and description required' }, { status: 400 });
  }

  const { data: membership } = await sb
    .from('agency_members')
    .select('agency_id')
    .eq('user_id', user.id)
    .single();

  if (!membership) return NextResponse.json({ error: 'No agency' }, { status: 404 });

  const { data: agency } = await sb
    .from('agencies')
    .select('name')
    .eq('id', membership.agency_id)
    .single();

  const { data: clients } = await sb
    .from('agency_clients')
    .select('id')
    .eq('agency_id', membership.agency_id)
    .limit(1);

  const entityId = clients?.[0]?.id ?? membership.agency_id;

  // Create Stripe payment link
  const amountCents = Math.round(amount * 100);
  const paymentLink = await createPaymentLink({
    amount: amountCents,
    description,
    customerEmail: contactEmail,
    customerName: contactName,
    metadata: {
      agency_id: membership.agency_id,
      client_id: entityId,
      contact_id: contactId || 'manual',
    },
  });

  // Create DB record
  const requestId = await createPaymentRequest({
    agencyId: membership.agency_id,
    clientId: entityId,
    contactId: contactId || `manual-${Date.now()}`,
    contactName,
    contactPhone,
    contactEmail,
    amount: amountCents,
    currency: 'usd',
    description,
    service,
    status: paymentLink ? 'sent' : 'pending',
    paymentUrl: paymentLink?.url ?? undefined,
    sentAt: new Date().toISOString(),
  });

  // Build the message
  const message = buildPaymentMessage(
    agency?.name ?? 'our business',
    contactName,
    amountCents,
    description,
    paymentLink?.url ?? '[Payment link will be generated]',
  );

  return NextResponse.json({
    requestId,
    paymentUrl: paymentLink?.url ?? null,
    message,
    amount: amountCents,
    stripeConfigured: !!process.env.STRIPE_SECRET_KEY,
  });
}
