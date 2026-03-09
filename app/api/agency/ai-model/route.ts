import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser } from '@/lib/agency/queries';
import { MODELS } from '@/lib/billing/model-credits';
import { updateContainerTier } from '@/lib/ovh/provisioner';

// GET — return current model for the agency
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await getAgencyForUser(user.id);
  if (!result) return NextResponse.json({ error: 'Agency not found' }, { status: 404 });

  const settings = (result.agency.settings as Record<string, unknown>) ?? {};
  const model = (settings.ai_model as string) ?? 'gpt-4o-mini';

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

  // 2. If solo client exists — update agency_clients.ai_model too
  const soloClientId = settings.solo_client_id as string | undefined;
  if (soloClientId) {
    await supabase
      .from('agency_clients')
      .update({ ai_model: modelId })
      .eq('id', soloClientId);

    // 3. Update container tier (non-fatal if it fails)
    try {
      await updateContainerTier(soloClientId, modelDef.routerMaxTier, modelId);
    } catch {
      // Container update failed — model preference still saved, will apply on next provision
    }
  } else {
    // Fallback: try first client for this agency
    const { data: firstClient } = await supabase
      .from('agency_clients')
      .select('id')
      .eq('agency_id', agency.id)
      .limit(1)
      .maybeSingle();

    if (firstClient) {
      await supabase
        .from('agency_clients')
        .update({ ai_model: modelId })
        .eq('id', firstClient.id);
      try {
        await updateContainerTier(firstClient.id, modelDef.routerMaxTier, modelId);
      } catch { /* non-fatal */ }
    }
  }

  return NextResponse.json({ ok: true, model: modelId });
}
