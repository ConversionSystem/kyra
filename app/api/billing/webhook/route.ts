/**
 * DEPRECATED — Legacy Stripe webhook handler (user-table era)
 *
 * This endpoint was the original webhook handler before the platform migrated
 * to agency-based billing (agencies table, agency_credits, credit-engine).
 *
 * It is DISABLED to prevent ghost credit grants or plan updates on the wrong table.
 * The canonical webhook endpoints are:
 *   - /api/webhooks/stripe   ← subscription plan sync + monthly credit renewal
 *   - /api/stripe/webhooks   ← billing records + Connect + checkout activation
 *   - /api/stripe/credits/webhook ← one-time credit pack purchases
 *
 * Do NOT re-enable this file. Remove it once we confirm Stripe no longer points here.
 */
import { NextResponse } from 'next/server';

export async function POST() {
  // Return 200 so Stripe doesn't retry, but do nothing.
  console.warn('[billing/webhook] DEPRECATED endpoint called — no-op');
  return NextResponse.json({ received: true, deprecated: true });
}
