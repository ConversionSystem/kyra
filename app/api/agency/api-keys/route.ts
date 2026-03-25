// ============================================================================
// GET/POST/DELETE /api/agency/api-keys
//
// GET    → Returns which providers are configured, active provider + model
// POST   → Saves API keys + selected models for the agency
// DELETE → Removes a specific provider key
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { updateContainerApiKey, updateContainerTier } from '@/lib/ovh/provisioner';
import { resolveModelLabel, DEFAULT_MODEL_ID } from '@/lib/agency/ai-models';

const VALID_PROVIDERS = ['anthropic', 'openai', 'google', 'openrouter'] as const;
type Provider = typeof VALID_PROVIDERS[number];

// Priority order — first match wins
const PROVIDER_PRIORITY: Provider[] = ['anthropic', 'openrouter', 'openai', 'google'];

function resolveActiveProvider(
  keys: Record<string, unknown>,
  selectedModels: Record<string, string>,
): { provider: Provider; model: string; modelId: string } | null {
  for (const p of PROVIDER_PRIORITY) {
    if (keys[p]) {
      const modelId = selectedModels[p] || DEFAULT_MODEL_ID[p] || '';
      return {
        provider: p,
        model: resolveModelLabel(p, modelId),
        modelId,
      };
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

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET() {
  const auth = await getAuthenticatedAgency();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const serviceClient = createServiceClientWithoutCookies();
  const { data: agency } = await serviceClient
    .from('agencies')
    .select('api_keys')
    .eq('id', auth.member.agency_id)
    .single();

  const apiKeys = (agency?.api_keys as Record<string, unknown>) || {};
  const selectedModels = (apiKeys.selected_models as Record<string, string>) || {};

  const configured: Record<string, boolean> = {};
  for (const p of VALID_PROVIDERS) {
    configured[p] = !!apiKeys[p];
  }

  const active = resolveActiveProvider(apiKeys, selectedModels);

  return NextResponse.json({ configured, selectedModels, active });
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedAgency();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (auth.member.role !== 'owner' && auth.member.role !== 'admin') {
    return NextResponse.json({ error: 'Only owners and admins can manage API keys' }, { status: 403 });
  }

  let body: { keys?: Record<string, string>; selectedModels?: Record<string, string> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const newKeys = body.keys || {};
  const newSelectedModels = body.selectedModels || {};

  // Validate provider names for keys
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

  const existingKeys = (agency?.api_keys as Record<string, unknown>) || {};
  const existingSelectedModels = (existingKeys.selected_models as Record<string, string>) || {};

  // Merge keys
  const mergedKeys: Record<string, unknown> = { ...existingKeys };
  for (const [provider, value] of Object.entries(newKeys)) {
    if (value && value.trim()) {
      mergedKeys[provider] = value.trim();
    }
  }

  // Remove empty keys
  for (const p of VALID_PROVIDERS) {
    if (mergedKeys[p] === '') delete mergedKeys[p];
  }

  // Merge selected models
  const mergedSelectedModels = { ...existingSelectedModels, ...newSelectedModels };
  // Remove model selections for providers that no longer have keys
  for (const p of Object.keys(mergedSelectedModels)) {
    if (!mergedKeys[p]) delete mergedSelectedModels[p];
  }
  mergedKeys.selected_models = mergedSelectedModels;

  const { error } = await serviceClient
    .from('agencies')
    .update({ api_keys: mergedKeys, updated_at: new Date().toISOString() })
    .eq('id', auth.member.agency_id);

  if (error) {
    console.error('[api-keys] Save failed:', error);
    return NextResponse.json({ error: 'Failed to save API keys' }, { status: 500 });
  }

  // Fire-and-forget propagation
  void propagateToContainers(auth.member.agency_id, mergedKeys, serviceClient);

  const active = resolveActiveProvider(mergedKeys, mergedSelectedModels);
  const configured = Object.fromEntries(VALID_PROVIDERS.map((p) => [p, !!mergedKeys[p]]));

  return NextResponse.json({ success: true, configured, selectedModels: mergedSelectedModels, active });
}

// ── DELETE ────────────────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  const auth = await getAuthenticatedAgency();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

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

  const existingKeys = (agency?.api_keys as Record<string, unknown>) || {};
  delete existingKeys[provider];

  // Also remove model selection for that provider
  const selectedModels = (existingKeys.selected_models as Record<string, string>) || {};
  delete selectedModels[provider];
  existingKeys.selected_models = selectedModels;

  const { error } = await serviceClient
    .from('agencies')
    .update({ api_keys: existingKeys, updated_at: new Date().toISOString() })
    .eq('id', auth.member.agency_id);

  if (error) return NextResponse.json({ error: 'Failed to remove key' }, { status: 500 });

  // Check if any BYOK keys remain after deletion
  const remainingByok = VALID_PROVIDERS.filter(p => !!existingKeys[p]);
  if (remainingByok.length === 0) {
    // Last BYOK key removed → switch all containers back to platform credit routing
    void clearByokFromContainers(auth.member.agency_id, serviceClient);
  } else {
    // Still has keys → propagate remaining keys to containers
    void propagateToContainers(auth.member.agency_id, existingKeys, serviceClient);
  }

  const active = resolveActiveProvider(existingKeys, selectedModels);
  const configured = Object.fromEntries(VALID_PROVIDERS.map((p) => [p, !!existingKeys[p]]));

  return NextResponse.json({ success: true, configured, selectedModels, active });
}

// ── Switch all containers from BYOK back to platform credit billing ───────────

async function clearByokFromContainers(
  agencyId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serviceClient: any,
) {
  try {
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

    console.log(`[api-keys] Clearing BYOK from ${containerIds.length} containers → platform routing`);

    for (const cId of containerIds) {
      const result = await updateContainerTier(cId, 2, 'openrouter/anthropic/claude-haiku-4.5', true /* clearByok */);
      if (!result.ok) {
        console.warn(`[api-keys] clearByok failed for container ${cId}:`, result.error);
      }
      await new Promise((r) => setTimeout(r, 3000));
    }
  } catch (err) {
    console.error('[api-keys] clearByok error:', err);
  }
}

// ── Shared: propagate to containers ──────────────────────────────────────────

async function propagateToContainers(
  agencyId: string,
  keys: Record<string, unknown>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serviceClient: any,
) {
  try {
    const keysToPropagate: Record<string, string> = {};
    for (const p of VALID_PROVIDERS) {
      if (keys[p]) keysToPropagate[p] = keys[p] as string;
    }
    // Pass selected_models through so provisioner can pick the right model
    if (keys.selected_models) {
      (keysToPropagate as Record<string, unknown>).selected_models = keys.selected_models;
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

    console.log(`[api-keys] Propagating to ${containerIds.length} containers`);

    for (const cId of containerIds) {
      // Only call updateContainerApiKey when there are keys to propagate
      // (empty = handled separately by clearByokFromContainers)
      if (Object.keys(keysToPropagate).filter(k => k !== 'selected_models').length > 0) {
        const result = await updateContainerApiKey(cId, keysToPropagate);
        if (!result.ok) {
          console.warn(`[api-keys] Failed container ${cId}:`, (result as { ok: false; error: string }).error);
        }
      }
      await new Promise((r) => setTimeout(r, 3000));
    }
  } catch (err) {
    console.error('[api-keys] Propagation error:', err);
  }
}
