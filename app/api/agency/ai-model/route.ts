import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser } from '@/lib/agency/queries';
import { MODELS } from '@/lib/billing/model-credits';
import { updateContainerTier } from '@/lib/ovh/provisioner';

/** Extract container UUID from gateway URL: https://{uuid}.gw.kyra... */
function extractContainerId(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/\/\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\./);
  return m?.[1] ?? null;
}

// GET — return current model for the agency
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await getAgencyForUser(user.id);
  if (!result) return NextResponse.json({ error: 'Agency not found' }, { status: 404 });

  const settings = (result.agency.settings as Record<string, unknown>) ?? {};
  const model = (settings.ai_model as string) ?? 'openrouter/anthropic/claude-haiku-4.5';

  return NextResponse.json({ model });
}

// PATCH — update model, persist to agency.settings + container if available
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await getAgencyForUser(user.id);
  if (!result) return NextResponse.json({ error: 'Agency not found' }, { status: 404 });

  const { model: modelId } = await req.json();
  const modelDef = MODELS.find(m => m.id === modelId);
  if (!modelDef) return NextResponse.json({ error: 'Invalid model' }, { status: 400 });

  const { agency } = result;
  const settings = (agency.settings as Record<string, unknown>) ?? {};

  // 1. Persist model to agency.settings.ai_model
  await supabase
    .from('agencies')
    .update({ settings: { ...settings, ai_model: modelId } })
    .eq('id', agency.id);

  // 2. Resolve container ID: solo_client_id → first agency_client → gateway URL
  let containerId = (settings.solo_client_id as string | undefined) ?? null;

  if (!containerId) {
    const { data: firstClient } = await supabase
      .from('agency_clients')
      .select('id')
      .eq('agency_id', agency.id)
      .limit(1)
      .maybeSingle();
    containerId = firstClient?.id ?? null;
  }

  if (!containerId) {
    // Last resort: extract from agency gateway URL
    const { data: agencyRow } = await supabase
      .from('agencies')
      .select('gateway_url')
      .eq('id', agency.id)
      .single();
    containerId = extractContainerId(agencyRow?.gateway_url as string | null);
  }

  // 3. Update container model (non-fatal if it fails)
  if (containerId) {
    // Also sync to agency_clients if a row exists
    await supabase
      .from('agency_clients')
      .update({ ai_model: modelId })
      .eq('id', containerId);

    try {
      await updateContainerTier(containerId, modelDef.routerMaxTier, modelId);
    } catch {
      // Non-fatal — DB preference saved, applies on next provision
    }
  }

  return NextResponse.json({ ok: true, model: modelId });
}
