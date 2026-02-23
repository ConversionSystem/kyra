// ============================================================================
// GET/POST/DELETE /api/agency/api-keys
//
// GET    → Returns which providers have keys configured + which is ACTIVE
// POST   → Saves API keys for the agency (encrypted in Supabase)
// DELETE → Removes a specific provider key
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { updateContainerApiKey } from '@/lib/ovh/provisioner';

const VALID_PROVIDERS = ['anthropic', 'openai', 'google', 'openrouter'] as const;
type Provider = typeof VALID_PROVIDERS[number];

// Priority order — first match wins
const PROVIDER_PRIORITY: Provider[] = ['anthropic', 'openrouter', 'openai', 'google'];

// What model each provider resolves to (mirrors provisioner.ts)
const PROVIDER_MODEL_LABELS: Record<Provider, string> = {
  anthropic: 'Claude Haiku',
  openrouter: 'Claude Sonnet (via OpenRouter)',
  openai: 'GPT-4o mini',
  google: 'Gemini Flash',
};

function resolveActiveProvider(
  keys: Record<string, string>
): { provider: Provider; model: string } | null {
  for (const p of PROVIDER_PRIORITY) {
    if (keys[p]) {
      return { provider: p, model: PROVIDER_MODEL_LABELS[p] };
    }
  }
  return null;
}

// ── Shared: get authenticated agency ─────────────────────────────────────────

async function getAuthenticatedAgency() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized', status: 401 };

  const { data: member } = await supabase
    .from('agency_members')
    .select('agency_id, role')
    .eq('user_id', user.id)
    .single();

  if (!member) return { error: 'No agency found', status: 404 };
  return { member };
}

// ── GET: Check which providers are configured + active provider ───────────────

export async function GET() {
  const auth = await getAuthenticatedAgency();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const serviceClient = createServiceClientWithoutCookies();
  const { data: agency } = await serviceClient
    .from('agencies')
    .select('api_keys')
    .eq('id', auth.member.agency_id)
    .single();

  const apiKeys = (agency?.api_keys as Record<string, string>) || {};

  const configured: Record<string, boolean> = {};
  for (const provider of VALID_PROVIDERS) {
    configured[provider] = !!apiKeys[provider];
  }

  const active = resolveActiveProvider(apiKeys);

  return NextResponse.json({ configured, active });
}

// ── POST: Save API keys ───────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedAgency();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (auth.member.role !== 'owner' && auth.member.role !== 'admin') {
    return NextResponse.json({ error: 'Only owners and admins can manage API keys' }, { status: 403 });
  }

  let body: { keys?: Record<string, string> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const newKeys = body.keys;
  if (!newKeys || typeof newKeys !== 'object') {
    return NextResponse.json({ error: 'Keys object is required' }, { status: 400 });
  }

  for (const provider of Object.keys(newKeys)) {
    if (!VALID_PROVIDERS.includes(provider as Provider)) {
      return NextResponse.json({ error: `Invalid provider: ${provider}` }, { status: 400 });
    }
  }

  const serviceClient = createServiceClientWithoutCookies();
  const { data: agency } = await serviceClient
    .from('agencies')
    .select('api_keys')
    .eq('id', auth.member.agency_id)
    .single();

  const existingKeys = (agency?.api_keys as Record<string, string>) || {};
  const mergedKeys = { ...existingKeys, ...newKeys };

  // Remove empty keys
  for (const [key, value] of Object.entries(mergedKeys)) {
    if (!value || !value.trim()) {
      delete mergedKeys[key];
    }
  }

  const { error } = await serviceClient
    .from('agencies')
    .update({ api_keys: mergedKeys, updated_at: new Date().toISOString() })
    .eq('id', auth.member.agency_id);

  if (error) {
    console.error('[api-keys] Save failed:', error);
    return NextResponse.json({ error: 'Failed to save API keys' }, { status: 500 });
  }

  // Fire-and-forget: propagate to all running containers
  void propagateToContainers(auth.member.agency_id, mergedKeys, serviceClient);

  const active = resolveActiveProvider(mergedKeys);

  return NextResponse.json({
    success: true,
    configured: Object.fromEntries(VALID_PROVIDERS.map((p) => [p, !!mergedKeys[p]])),
    active,
  });
}

// ── DELETE: Remove a specific provider key ────────────────────────────────────

export async function DELETE(request: NextRequest) {
  const auth = await getAuthenticatedAgency();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (auth.member.role !== 'owner' && auth.member.role !== 'admin') {
    return NextResponse.json({ error: 'Only owners and admins can manage API keys' }, { status: 403 });
  }

  let body: { provider?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const provider = body.provider as Provider;
  if (!provider || !VALID_PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
  }

  const serviceClient = createServiceClientWithoutCookies();
  const { data: agency } = await serviceClient
    .from('agencies')
    .select('api_keys')
    .eq('id', auth.member.agency_id)
    .single();

  const existingKeys = (agency?.api_keys as Record<string, string>) || {};
  delete existingKeys[provider];

  const { error } = await serviceClient
    .from('agencies')
    .update({ api_keys: existingKeys, updated_at: new Date().toISOString() })
    .eq('id', auth.member.agency_id);

  if (error) {
    return NextResponse.json({ error: 'Failed to remove key' }, { status: 500 });
  }

  // Propagate removal to containers
  void propagateToContainers(auth.member.agency_id, existingKeys, serviceClient);

  const active = resolveActiveProvider(existingKeys);

  return NextResponse.json({
    success: true,
    configured: Object.fromEntries(VALID_PROVIDERS.map((p) => [p, !!existingKeys[p]])),
    active,
  });
}

// ── Shared: propagate keys to all running containers ─────────────────────────

async function propagateToContainers(
  agencyId: string,
  keys: Record<string, string>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serviceClient: any,
) {
  try {
    const keysToPropagate: Record<string, string> = {};
    for (const p of VALID_PROVIDERS) {
      if (keys[p]) keysToPropagate[p] = keys[p];
    }

    const { data: clients } = await serviceClient
      .from('agency_clients')
      .select('id')
      .eq('agency_id', agencyId)
      .eq('gateway_status', 'running');

    const { data: agencyRow } = await serviceClient
      .from('agencies')
      .select('id, gateway_status')
      .eq('id', agencyId)
      .single();

    const containerIds: string[] = [
      ...(clients?.map((c: { id: string }) => c.id) || []),
      ...(agencyRow?.gateway_status === 'running' ? [agencyRow.id] : []),
    ];

    console.log(`[api-keys] Propagating to ${containerIds.length} containers for agency ${agencyId}`);

    for (const cId of containerIds) {
      const result = Object.keys(keysToPropagate).length > 0
        ? await updateContainerApiKey(cId, keysToPropagate)
        : { ok: true }; // Nothing to push — container will fall back to default

      if (!result.ok) {
        console.warn(`[api-keys] Failed to update container ${cId}:`, (result as { ok: false; error: string }).error);
      }
      await new Promise((r) => setTimeout(r, 3000));
    }

    console.log(`[api-keys] Propagation complete for agency ${agencyId}`);
  } catch (err) {
    console.error('[api-keys] Background propagation error:', err);
  }
}
