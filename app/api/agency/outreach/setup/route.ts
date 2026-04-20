/**
 * Outreach Webhook Setup — in-app config (no Vercel env var required)
 *
 * GET  /api/agency/outreach/setup  — return current webhook URL (masked) + status
 * PATCH /api/agency/outreach/setup — save webhook URL to agency settings
 * POST  /api/agency/outreach/setup — test the configured webhook with a sample payload
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyAdmin, requireAgencyMember } from '@/lib/agency/middleware';
import { createClient } from '@/lib/supabase/server';
import { requireMaster } from '@/lib/auth/admin';

function maskUrl(url: string): string {
  try {
    const u = new URL(url);
    // Show scheme + host + first 8 chars of path, then ***
    const path = u.pathname;
    const visible = path.slice(0, 8);
    return `${u.protocol}//${u.host}${visible}***`;
  } catch {
    return '***';
  }
}

/** GET — return current status */
export async function GET() {
  const result = await requireAgencyMember();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  const { agency } = result.data;
  const settings = (agency.settings ?? {}) as Record<string, unknown>;
  const storedUrl = (settings.outreach_webhook_url as string) || '';
  const envUrl = process.env.OUTREACH_WEBHOOK_URL || '';
  const activeUrl = storedUrl || envUrl;

  return NextResponse.json({
    configured: !!activeUrl,
    source: storedUrl ? 'settings' : envUrl ? 'env' : null,
    masked_url: activeUrl ? maskUrl(activeUrl) : null,
  });
}

/** PATCH — save or clear webhook URL */
export async function PATCH(req: NextRequest) {
  const result = await requireAgencyAdmin();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  const { agency } = result.data;

  // Only master account can set this
  const masterAuth = await requireMaster();
  if (!masterAuth.ok) return masterAuth.response;

  const supabase = await createClient();

  const body = await req.json().catch(() => ({}));
  const url: string = (body.url ?? '').trim();

  if (url && !url.startsWith('https://')) {
    return NextResponse.json({ error: 'URL must start with https://' }, { status: 400 });
  }

  const currentSettings = (agency.settings ?? {}) as Record<string, unknown>;

  let updatedSettings: Record<string, unknown>;
  if (!url) {
    // Clear
    const { outreach_webhook_url: _removed, ...rest } = currentSettings;
    updatedSettings = rest;
  } else {
    updatedSettings = { ...currentSettings, outreach_webhook_url: url };
  }

  const { error } = await supabase
    .from('agencies')
    .update({ settings: updatedSettings, updated_at: new Date().toISOString() })
    .eq('id', agency.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, configured: !!url });
}

/** POST — send a test lead payload to the configured webhook */
export async function POST() {
  const result = await requireAgencyMember();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  const { agency } = result.data;

  const masterAuth = await requireMaster();
  if (!masterAuth.ok) return masterAuth.response;

  const settings = (agency.settings ?? {}) as Record<string, unknown>;
  const webhookUrl =
    (settings.outreach_webhook_url as string) ||
    process.env.OUTREACH_WEBHOOK_URL ||
    '';

  if (!webhookUrl) {
    return NextResponse.json({ error: 'No webhook URL configured' }, { status: 400 });
  }

  const testPayload = {
    type: 'outreach_lead',
    lead_id: 'test-lead-kyra',
    full_name: 'Test Agency Owner',
    company_name: 'Demo Agency LLC',
    email: 'demo@example.com',
    source: 'kyra-test',
    tags: ['kyra-outreach', 'warmth-hot', 'niche-dental'],
    niche: 'dental',
    niche_slug: 'dental',
    location: 'Austin, TX',
    client_count: '12',
    ghl_tier: 'Pro',
    warmth: 'hot',
    personalized_opener:
      "Hi {{first_name}}, I saw your dental agency is running GHL — Kyra deploys an AI worker that handles every patient inquiry automatically. Takes 5 minutes to set up.",
    why_fit:
      '12-client dental agency running GHL Pro is the exact ICP for Kyra — strong upsell potential.',
    pitch_url: 'https://kyra.conversionsystem.com/for/dental',
    linkedin_url: '',
    sequence_id: 'dental-cold-sequence',
    bulk_mode: false,
    enrolled_at: new Date().toISOString(),
    _test: true,
  };

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return NextResponse.json(
        { error: `GHL returned ${res.status}: ${body.slice(0, 300)}` },
        { status: 422 },
      );
    }

    return NextResponse.json({ ok: true, message: 'Test lead sent to GHL workflow ✓' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Request failed';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
