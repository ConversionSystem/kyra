/**
 * Payment Collection — Close the revenue loop
 * 
 * After service completion:
 * 1. AI generates a Stripe payment link with amount + description
 * 2. Sends to customer via SMS/chat: "Your total is $275. Pay here: [link]"
 * 3. If unpaid after 24h → gentle reminder
 * 4. If unpaid after 72h → escalate to owner
 * 5. Payment received → auto-confirmation + receipt
 * 
 * Uses Stripe Payment Links (no Stripe Connect onboarding needed for basic flow)
 * or Stripe Connect for agency pass-through billing.
 */

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

export interface PaymentRequest {
  id?: string;
  agencyId: string;
  clientId: string;
  contactId: string;
  contactName: string;
  contactPhone?: string;
  contactEmail?: string;
  amount: number;             // in cents
  currency: string;           // 'usd', 'eur', etc.
  description: string;        // "Pipe repair - 142 Oak St"
  service?: string;
  status: 'pending' | 'sent' | 'paid' | 'overdue' | 'reminded' | 'escalated' | 'cancelled';
  paymentUrl?: string;
  stripePaymentIntentId?: string;
  sentAt?: string;
  paidAt?: string;
  createdAt?: string;
}

/**
 * Create a Stripe payment link for a service.
 */
export async function createPaymentLink(options: {
  amount: number;           // in cents
  currency?: string;
  description: string;
  customerEmail?: string;
  customerName?: string;
  metadata?: Record<string, string>;
}): Promise<{ url: string; paymentIntentId?: string } | null> {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    console.error('[payments] No STRIPE_SECRET_KEY configured');
    return null;
  }

  try {
    // Use Stripe Payment Links API
    const response = await fetch('https://api.stripe.com/v1/payment_links', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'line_items[0][price_data][currency]': options.currency || 'usd',
        'line_items[0][price_data][product_data][name]': options.description,
        'line_items[0][price_data][unit_amount]': options.amount.toString(),
        'line_items[0][quantity]': '1',
        ...(options.metadata ? Object.fromEntries(
          Object.entries(options.metadata).map(([k, v]) => [`metadata[${k}]`, v])
        ) : {}),
      }).toString(),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('[payments] Stripe error:', err);
      return null;
    }

    const data = await response.json();
    return { url: data.url };
  } catch (err) {
    console.error('[payments] Failed to create payment link:', err);
    return null;
  }
}

/**
 * Create a payment request record in the database.
 */
export async function createPaymentRequest(request: PaymentRequest): Promise<string | null> {
  const supabase = createServiceClientWithoutCookies();

  const { data, error } = await supabase
    .from('payment_requests')
    .insert({
      agency_id: request.agencyId,
      client_id: request.clientId,
      contact_id: request.contactId,
      contact_name: request.contactName,
      contact_phone: request.contactPhone ?? null,
      contact_email: request.contactEmail ?? null,
      amount: request.amount,
      currency: request.currency,
      description: request.description,
      service: request.service ?? null,
      status: request.status,
      payment_url: request.paymentUrl ?? null,
      stripe_payment_intent_id: request.stripePaymentIntentId ?? null,
      sent_at: request.sentAt ?? null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[payments] Failed to create payment request:', error.message);
    return null;
  }
  return data?.id ?? null;
}

/**
 * Update payment request status.
 */
export async function updatePaymentRequest(
  id: string,
  update: Partial<Pick<PaymentRequest, 'status' | 'paidAt' | 'paymentUrl'>>,
): Promise<void> {
  const supabase = createServiceClientWithoutCookies();

  await supabase
    .from('payment_requests')
    .update({
      ...(update.status && { status: update.status }),
      ...(update.paidAt && { paid_at: update.paidAt }),
      ...(update.paymentUrl && { payment_url: update.paymentUrl }),
    })
    .eq('id', id);
}

/**
 * Get payment stats for a business.
 */
export async function getPaymentStats(agencyId: string, clientId?: string): Promise<{
  totalSent: number;
  totalPaid: number;
  totalOverdue: number;
  amountCollected: number;
  amountPending: number;
  collectionRate: number;
}> {
  const supabase = createServiceClientWithoutCookies();
  const entityId = clientId ?? agencyId;

  const { data } = await supabase
    .from('payment_requests')
    .select('status, amount')
    .eq('client_id', entityId);

  const requests = data ?? [];
  const totalSent = requests.length;
  const totalPaid = requests.filter(r => r.status === 'paid').length;
  const totalOverdue = requests.filter(r => ['overdue', 'reminded', 'escalated'].includes(r.status)).length;
  const amountCollected = requests.filter(r => r.status === 'paid').reduce((s, r) => s + (r.amount || 0), 0);
  const amountPending = requests.filter(r => r.status !== 'paid' && r.status !== 'cancelled').reduce((s, r) => s + (r.amount || 0), 0);

  return {
    totalSent,
    totalPaid,
    totalOverdue,
    amountCollected,
    amountPending,
    collectionRate: totalSent > 0 ? Math.round((totalPaid / totalSent) * 100) : 0,
  };
}

// ── Message Templates ─────────────────────────────────────────────────────────

/**
 * Build payment request message.
 */
export function buildPaymentMessage(
  businessName: string,
  contactName: string,
  amount: number,        // in cents
  description: string,
  paymentUrl: string,
): string {
  const firstName = contactName.split(' ')[0] || 'there';
  const formatted = `$${(amount / 100).toFixed(2)}`;

  return [
    `Hi ${firstName}! 👋`,
    '',
    `Thanks for choosing ${businessName}!`,
    '',
    `Your total for ${description}: **${formatted}**`,
    '',
    `Pay securely here: ${paymentUrl}`,
    '',
    `Thank you! 🙏`,
  ].join('\n');
}

/**
 * Build gentle payment reminder (24h).
 */
export function buildPaymentReminder(
  contactName: string,
  amount: number,
  description: string,
  paymentUrl: string,
): string {
  const firstName = contactName.split(' ')[0] || 'there';
  const formatted = `$${(amount / 100).toFixed(2)}`;

  return [
    `Hi ${firstName}, just a friendly reminder! 😊`,
    '',
    `Your ${description} payment of ${formatted} is still pending.`,
    '',
    `Pay here: ${paymentUrl}`,
    '',
    `No rush — just didn't want it to slip through the cracks!`,
  ].join('\n');
}

/**
 * Build payment confirmation.
 */
export function buildPaymentConfirmation(
  contactName: string,
  amount: number,
  description: string,
): string {
  const firstName = contactName.split(' ')[0] || 'there';
  const formatted = `$${(amount / 100).toFixed(2)}`;

  return [
    `Payment received! ✅`,
    '',
    `${firstName}, your ${formatted} payment for ${description} is confirmed.`,
    '',
    `A receipt has been sent to your email. Thank you for your business! 🎉`,
  ].join('\n');
}
