/**
 * GET  /api/agency/clients/:id/capabilities
 * PATCH /api/agency/clients/:id/capabilities
 *
 * Read and toggle AI tool capabilities for a client's AI worker.
 * Stores enabled tool IDs in agency_clients.settings.capabilities (JSON).
 * On toggle, patches the OpenClaw gateway config via provisioner.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { patchGatewayConfig } from '@/lib/ovh/provisioner';

// Skill IDs that map to openai-compatible skills in OpenClaw config
const SKILL_MAP: Record<string, string[]> = {
  web_search:       ['web_search'],
  web_fetch:        ['web_fetch'],
  image_analysis:   ['image_analysis'],
  file_processing:  ['file_processing'],
  customer_memory:  [],   // handled by Kyra poller, not an OpenClaw skill
  proactive:        [],   // handled by cron, not an OpenClaw skill
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const auth = await requireAgencyMember();
  if (auth.error) return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });

  const supabase = createServiceClientWithoutCookies();
  const { data: client } = await supabase
    .from('agency_clients')
    .select('settings')
    .eq('id', id)
    .single();

  const settings = (client?.settings as Record<string, unknown>) ?? {};
  const capabilities = (settings.capabilities as Record<string, boolean>) ?? {
    web_search: false,
    web_fetch: false,
    image_analysis: false,
    file_processing: false,
    customer_memory: true,   // always on by default
    proactive: false,
  };

  return NextResponse.json({ capabilities });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const auth = await requireAgencyMember();
  if (auth.error) return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });

  const { toolId, enabled } = await req.json();
  if (!toolId || typeof enabled !== 'boolean') {
    return NextResponse.json({ error: 'toolId and enabled are required' }, { status: 400 });
  }

  const supabase = createServiceClientWithoutCookies();

  // Load current settings
  const { data: client } = await supabase
    .from('agency_clients')
    .select('settings, agency_id')
    .eq('id', id)
    .single();

  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

  const settings = (client.settings as Record<string, unknown>) ?? {};
  const capabilities = { ...((settings.capabilities as Record<string, boolean>) ?? {}), [toolId]: enabled };

  // Save to DB
  const { error: dbErr } = await supabase
    .from('agency_clients')
    .update({ settings: { ...settings, capabilities } })
    .eq('id', id);

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  // NOTE: Do NOT write skills.* keys to gateway config — OpenClaw rejects them as invalid.
  // Capabilities are stored in Supabase only (agency_clients.settings.capabilities).
  // The gateway uses tools via its own skill system, not config keys.
  void patchGatewayConfig; // imported but intentionally unused for capabilities

  return NextResponse.json({ ok: true, capabilities });
}
