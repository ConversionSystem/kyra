import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe/config';

const MASTER_EMAILS = ['hello@conversionsystem.com', 'angel@conversionsystem.com'];
const CORRECT_WEBHOOK_PATH = '/api/webhooks/stripe';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user || !MASTER_EMAILS.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Check if the correct webhook endpoint is registered and enabled in Stripe
  let stripeWebhookRegistered = false;
  if (stripe && process.env.STRIPE_SECRET_KEY) {
    try {
      const webhooks = await stripe.webhookEndpoints.list({ limit: 20 });
      stripeWebhookRegistered = webhooks.data.some(
        wh => wh.status === 'enabled' && wh.url.includes(CORRECT_WEBHOOK_PATH)
      );
    } catch {
      // Stripe key invalid or network error — leave as false
    }
  }

  return NextResponse.json({
    STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: !!process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_LITE_PRICE_ID: !!(process.env.STRIPE_STARTER_PRICE_ID || process.env.STRIPE_LITE_PRICE_ID),
    STRIPE_PRO_PRICE_ID: !!process.env.STRIPE_PRO_PRICE_ID,
    STRIPE_SCALE_PRICE_ID: !!process.env.STRIPE_SCALE_PRICE_ID,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    STRIPE_WEBHOOK_REGISTERED: stripeWebhookRegistered,
  });
}
