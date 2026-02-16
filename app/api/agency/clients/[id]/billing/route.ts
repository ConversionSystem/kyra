import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  createClientSubscription,
  cancelClientSubscription,
  updateClientBillingAmount,
} from '@/lib/stripe/connect';

/**
 * POST /api/agency/clients/[id]/billing
 * Create a subscription for a client, or update/cancel billing.
 *
 * Body:
 *   { action: 'activate', amount_cents?: number, client_email?: string }
 *   { action: 'cancel' }
 *   { action: 'update_price', amount_cents: number }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;

    // Auth check
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get agency membership
    const { data: membership } = await supabase
      .from('agency_members')
      .select('agency_id, role')
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'No agency found' }, { status: 403 });
    }

    if (membership.role !== 'owner' && membership.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Verify client belongs to this agency
    const { data: client } = await supabase
      .from('agency_clients')
      .select('id, name, agency_id, billing_amount_cents, stripe_subscription_id')
      .eq('id', clientId)
      .eq('agency_id', membership.agency_id)
      .single();

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const clientRow = client as {
      id: string;
      name: string;
      agency_id: string;
      billing_amount_cents: number;
      stripe_subscription_id: string | null;
    };

    const body = (await request.json()) as {
      action: 'activate' | 'cancel' | 'update_price';
      amount_cents?: number;
      client_email?: string;
    };

    switch (body.action) {
      case 'activate': {
        if (clientRow.stripe_subscription_id) {
          return NextResponse.json(
            { error: 'Client already has an active subscription' },
            { status: 400 }
          );
        }

        const amountCents = body.amount_cents ?? clientRow.billing_amount_cents;
        if (!amountCents || amountCents < 100) {
          return NextResponse.json(
            { error: 'Billing amount must be at least $1.00' },
            { status: 400 }
          );
        }

        const result = await createClientSubscription(
          membership.agency_id,
          clientId,
          amountCents,
          clientRow.name,
          body.client_email
        );

        return NextResponse.json({
          success: true,
          subscription_id: result.subscriptionId,
          customer_id: result.customerId,
        });
      }

      case 'cancel': {
        await cancelClientSubscription(membership.agency_id, clientId);
        return NextResponse.json({ success: true });
      }

      case 'update_price': {
        if (!body.amount_cents || body.amount_cents < 100) {
          return NextResponse.json(
            { error: 'Billing amount must be at least $1.00' },
            { status: 400 }
          );
        }

        await updateClientBillingAmount(
          membership.agency_id,
          clientId,
          body.amount_cents
        );

        return NextResponse.json({ success: true, amount_cents: body.amount_cents });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be: activate, cancel, or update_price' },
          { status: 400 }
        );
    }
  } catch (err) {
    console.error('[agency/clients/billing] Error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
