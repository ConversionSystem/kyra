import { NextRequest, NextResponse } from 'next/server';
import { getStripe, priceIdToPlan } from '@/lib/billing/stripe';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * Stripe Webhook Handler
 * 
 * Handles:
 * - checkout.session.completed → Set plan + Stripe IDs
 * - customer.subscription.updated → Plan changes
 * - customer.subscription.deleted → Downgrade to free
 * - invoice.payment_failed → Flag for follow-up
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
  }

  let event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const serviceClient = await createServiceClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.userId || session.client_reference_id;
        const plan = session.metadata?.plan;

        if (!userId || !plan) {
          console.error('Missing userId or plan in checkout session metadata');
          break;
        }

        const creditsByPlan: Record<string, number> = {
          starter: 500,
          pro: 3000,
          enterprise: 8000,
        };
        const credits = creditsByPlan[plan] ?? 0;

        const { data: updatedRows, error: updateError } = await serviceClient
          .from('users')
          .update({
            plan,
            credits,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)
          .select();

        if (updateError) {
          console.error(`Failed to update user ${userId}:`, updateError);
        } else if (!updatedRows || updatedRows.length === 0) {
          console.warn(`⚠️ No user row found for ${userId} — update affected 0 rows`);
        } else {
          console.log(`✅ User ${userId} upgraded to ${plan} with ${credits} credits`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer as string;

        // Get the price from the first item
        const priceId = subscription.items.data[0]?.price?.id;
        const newPlan = priceId ? priceIdToPlan(priceId) : null;

        if (newPlan) {
          await serviceClient
            .from('users')
            .update({
              plan: newPlan,
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_customer_id', customerId);

          console.log(`✅ Customer ${customerId} plan changed to ${newPlan}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer as string;

        await serviceClient
          .from('users')
          .update({
            plan: 'free',
            stripe_subscription_id: null,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', customerId);

        console.log(`⚠️ Customer ${customerId} subscription cancelled → free`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.error(`❌ Payment failed for customer ${invoice.customer}`);
        // TODO: Send notification to user
        break;
      }

      default:
        // Unhandled event type
        break;
    }
  } catch (error) {
    console.error(`Webhook handler error for ${event.type}:`, error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
