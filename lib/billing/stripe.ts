import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set');
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16' as any,
      httpClient: Stripe.createFetchHttpClient(),
    });
  }
  return stripeInstance;
}

/**
 * Stripe Price IDs for each plan.
 * Set these in env vars after creating products in Stripe Dashboard.
 *
 * Plans: free (no Stripe needed), starter ($97), pro ($247), scale ($497)
 */
export const STRIPE_PRICE_IDS: Record<string, string | undefined> = {
  starter: process.env.STRIPE_PRICE_STARTER,
  pro: process.env.STRIPE_PRICE_PRO,
  scale: process.env.STRIPE_PRICE_SCALE,
};

/**
 * Create a Stripe Checkout session for plan upgrade
 */
export async function createCheckoutSession(opts: {
  userId: string;
  email: string;
  plan: 'starter' | 'pro' | 'scale';
  successUrl: string;
  cancelUrl: string;
  customerId?: string;
}): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();
  const priceId = STRIPE_PRICE_IDS[opts.plan];

  if (!priceId) {
    throw new Error(`No Stripe price configured for plan: ${opts.plan}`);
  }

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    client_reference_id: opts.userId,
    metadata: {
      userId: opts.userId,
      plan: opts.plan,
    },
  };

  // Use existing customer or create by email
  if (opts.customerId) {
    sessionParams.customer = opts.customerId;
  } else {
    sessionParams.customer_email = opts.email;
  }

  return stripe.checkout.sessions.create(sessionParams);
}

/**
 * Create a Stripe Customer Portal session for managing subscription
 */
export async function createPortalSession(opts: {
  customerId: string;
  returnUrl: string;
}): Promise<Stripe.BillingPortal.Session> {
  const stripe = getStripe();
  return stripe.billingPortal.sessions.create({
    customer: opts.customerId,
    return_url: opts.returnUrl,
  });
}

/**
 * Get subscription details for a customer
 */
export async function getSubscription(subscriptionId: string): Promise<Stripe.Subscription | null> {
  try {
    const stripe = getStripe();
    return await stripe.subscriptions.retrieve(subscriptionId);
  } catch {
    return null;
  }
}

/**
 * Map Stripe price ID back to our plan name
 */
export function priceIdToPlan(priceId: string): string | null {
  for (const [plan, id] of Object.entries(STRIPE_PRICE_IDS)) {
    if (id === priceId) return plan;
  }
  return null;
}
