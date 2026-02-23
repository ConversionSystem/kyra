// POST /api/stripe/credits/webhook — Fulfill credits after payment

import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe/config';
import { addCredits } from '@/lib/billing/credit-engine';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_CREDITS_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: 'Missing signature or secret' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error('[stripe/credits/webhook] Signature verification failed:', err);
    return NextResponse.json({ error: 'Webhook signature invalid' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const meta = session.metadata || {};

    const agencyId = meta.agency_id;
    const credits = parseInt(meta.credits || '0', 10);
    const packName = meta.pack_name || meta.pack_id || 'Credit Pack';
    const paymentIntentId = typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id || null;

    if (!agencyId || credits <= 0) {
      console.warn('[stripe/credits/webhook] Missing metadata:', meta);
      return NextResponse.json({ ok: false });
    }

    try {
      const newBalance = await addCredits(
        agencyId,
        credits,
        'purchase',
        `${packName} pack — ${credits.toLocaleString()} credits`,
        paymentIntentId ?? undefined,
      );
      console.log(`[stripe/credits/webhook] ✅ Added ${credits} credits to agency ${agencyId} | new balance: ${newBalance}`);
    } catch (err) {
      console.error('[stripe/credits/webhook] Failed to add credits:', err);
      return NextResponse.json({ error: 'Failed to add credits' }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
