import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { createOnfleetClient } from '@/lib/onfleet/client';
import type { ClientDispatchConfig } from '@/lib/onfleet/types';

/**
 * OnFleet Webhook Management
 *
 * GET  — List currently registered webhooks
 * POST — Auto-register all required webhooks in OnFleet
 */

// OnFleet trigger IDs for each event type we need
// See: https://docs.onfleet.com/reference/webhooks
const REQUIRED_TRIGGERS: Array<{ trigger: number; name: string }> = [
  { trigger: 6,  name: 'Task assigned' },
  { trigger: 1,  name: 'Task started' },
  { trigger: 2,  name: 'Task ETA / driver arriving' },
  { trigger: 3,  name: 'Task completed' },
  { trigger: 4,  name: 'Task failed' },
  { trigger: 12, name: 'New task created' },
];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: clientId } = await params;

  const auth = await requireAgencyMember();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  const { agency } = auth.data;
  const supabase = createServiceClientWithoutCookies();

  const { data, error } = await supabase
    .from('agency_clients')
    .select('settings')
    .eq('id', clientId)
    .eq('agency_id', agency.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const settings = (data.settings || {}) as Record<string, unknown>;
  const dispatch = settings.dispatch as ClientDispatchConfig | undefined;

  if (!dispatch?.onfleetApiKey) {
    return NextResponse.json({ error: 'OnFleet API key not configured' }, { status: 400 });
  }

  try {
    const client = createOnfleetClient(dispatch.onfleetApiKey);
    const webhooks = await client.listWebhooks();
    return NextResponse.json({ webhooks });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to list webhooks' },
      { status: 502 },
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: clientId } = await params;

  const auth = await requireAgencyMember();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  const { agency } = auth.data;
  const supabase = createServiceClientWithoutCookies();

  const { data, error } = await supabase
    .from('agency_clients')
    .select('settings')
    .eq('id', clientId)
    .eq('agency_id', agency.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const settings = (data.settings || {}) as Record<string, unknown>;
  const dispatch = settings.dispatch as ClientDispatchConfig | undefined;

  if (!dispatch?.onfleetApiKey) {
    return NextResponse.json({ error: 'OnFleet API key not configured' }, { status: 400 });
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://kyra.conversionsystem.com';
  const webhookUrl = `${origin}/api/webhooks/onfleet?clientId=${clientId}`;

  const client = createOnfleetClient(dispatch.onfleetApiKey);

  // List existing webhooks to avoid duplicates
  let existing: Array<{ id: string; url: string; trigger: number }> = [];
  try {
    existing = await client.listWebhooks();
  } catch {
    // If we can't list, proceed anyway — duplicates will error individually
  }

  const results: Array<{ trigger: number; name: string; status: string; error?: string }> = [];

  for (const { trigger, name } of REQUIRED_TRIGGERS) {
    // Skip if a webhook with this trigger already exists for our URL
    const alreadyExists = existing.some(
      (w) => w.trigger === trigger && w.url.includes(`clientId=${clientId}`),
    );

    if (alreadyExists) {
      results.push({ trigger, name, status: 'exists' });
      continue;
    }

    try {
      await client.createWebhook(webhookUrl, trigger);
      results.push({ trigger, name, status: 'created' });
    } catch (err) {
      results.push({
        trigger,
        name,
        status: 'failed',
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  const created = results.filter((r) => r.status === 'created').length;
  const failed = results.filter((r) => r.status === 'failed').length;
  const existed = results.filter((r) => r.status === 'exists').length;

  return NextResponse.json({
    success: failed === 0,
    created,
    failed,
    existed,
    results,
  });
}
