// ============================================================================
// POST /api/agency/clients/[id]/ghl/test-connection
//
// Tests the GHL connection by making a lightweight API call to verify the
// stored token is still valid and has the required scopes.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const GHL_API_VERSION = '2021-07-28';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: clientId } = await params;

  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify user has access to this client
  const { data: agencyClient } = await supabase
    .from('agency_clients')
    .select('id, agency_id, ghl_location_id, ghl_private_token, ghl_access_token')
    .eq('id', clientId)
    .single();

  if (!agencyClient) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const { data: agencyMember } = await supabase
    .from('agency_members')
    .select('id')
    .eq('agency_id', agencyClient.agency_id)
    .eq('user_id', user.id)
    .single();

  if (!agencyMember) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Get token (prefer private token over OAuth)
  const db = createServiceClientWithoutCookies();
  const { data: clientData } = await db
    .from('agency_clients')
    .select('ghl_private_token, ghl_access_token, ghl_location_id, container_config')
    .eq('id', clientId)
    .single();

  const token = clientData?.ghl_private_token || clientData?.ghl_access_token;
  const locationId = clientData?.ghl_location_id;

  if (!token || !locationId) {
    return NextResponse.json({
      ok: false,
      error: 'No GHL token or Location ID found. Please reconnect.',
    }, { status: 400 });
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    Version: GHL_API_VERSION,
  };
  const timeout = AbortSignal.timeout(10_000);

  // --- Fatal check: contacts (proves token is valid) ---
  try {
    const contactsRes = await fetch(
      `${GHL_API_BASE}/contacts/?locationId=${locationId}&limit=1`,
      { headers, signal: timeout },
    );

    if (contactsRes.status === 401) {
      return NextResponse.json({
        ok: false,
        error: 'Token is invalid or expired. Please reconnect with a new token.',
      });
    }

    if (contactsRes.status === 403) {
      return NextResponse.json({
        ok: false,
        error: 'Token lacks required permissions. Please regenerate with Contacts scope enabled.',
      });
    }

    if (!contactsRes.ok) {
      return NextResponse.json({
        ok: false,
        error: `GHL API returned ${contactsRes.status}. The connection may need to be refreshed.`,
      });
    }
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: `Connection test failed: ${err instanceof Error ? err.message : 'Network error'}. Check your connection and try again.`,
    });
  }

  // --- Non-fatal scope checks (run in parallel) ---
  const scopeChecks = await Promise.allSettled([
    fetch(`${GHL_API_BASE}/conversations/search?locationId=${locationId}&limit=1`, {
      headers, signal: AbortSignal.timeout(8_000),
    }),
    fetch(`${GHL_API_BASE}/voice-ai/agents?locationId=${locationId}`, {
      headers, signal: AbortSignal.timeout(8_000),
    }),
    fetch(`${GHL_API_BASE}/conversation-ai/agents?locationId=${locationId}`, {
      headers, signal: AbortSignal.timeout(8_000),
    }),
    fetch(`${GHL_API_BASE}/knowledge-base/?locationId=${locationId}`, {
      headers, signal: AbortSignal.timeout(8_000),
    }),
    fetch(`${GHL_API_BASE}/phone-number/?locationId=${locationId}`, {
      headers, signal: AbortSignal.timeout(8_000),
    }),
  ]);

  const [convResult, voiceResult, convAiResult, kbResult, phoneResult] = scopeChecks;

  const scopes: string[] = ['contacts'];
  if (convResult.status === 'fulfilled' && convResult.value.ok) scopes.push('conversations');
  if (voiceResult.status === 'fulfilled' && voiceResult.value.ok) scopes.push('voice_ai');
  if (convAiResult.status === 'fulfilled' && convAiResult.value.ok) scopes.push('conversation_ai');
  if (kbResult.status === 'fulfilled' && kbResult.value.ok) scopes.push('knowledge_base');
  if (phoneResult.status === 'fulfilled' && phoneResult.value.ok) scopes.push('phone_numbers');

  // Persist detected scopes to container_config for use in permissions UI
  const currentConfig = ((clientData?.container_config as Record<string, unknown>) ?? {});
  await db
    .from('agency_clients')
    .update({
      container_config: { ...currentConfig, ghl_detected_scopes: scopes },
      updated_at: new Date().toISOString(),
    })
    .eq('id', clientId);

  return NextResponse.json({
    ok: true,
    locationId,
    scopes,
    message: `Connection verified. Active scopes: ${scopes.join(', ')}.`,
  });
}
