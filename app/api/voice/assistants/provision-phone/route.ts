/**
 * POST /api/voice/assistants/provision-phone
 * Provisions a Twilio phone number for an existing Kyra Native voice config.
 * Used when phone was previously 'pending' (set up before Twilio was configured).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { searchAvailableNumbers, purchasePhoneNumber, hasTwilioCredentials } from '@/lib/voice/twilio-phone';

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://kyra.conversionsystem.com').replace(/\/+$/, '');

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { clientId, areaCode } = await req.json();
  if (!clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 });

  if (!hasTwilioCredentials()) {
    return NextResponse.json({ error: 'Twilio credentials not configured. Add TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN to Vercel environment variables.' }, { status: 503 });
  }

  const svc = createServiceClientWithoutCookies();
  const { data: client } = await svc
    .from('agency_clients')
    .select('id, container_config, agency_id')
    .eq('id', clientId)
    .single();

  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

  // Try agency_clients first, then agencies table
  let isAgencyLevel = false;
  let cfg: Record<string, unknown> = (client.container_config as Record<string, unknown>) ?? {};
  let voiceCfg = (cfg.voice_config as Record<string, unknown>) ?? {};

  if (!client.container_config || Object.keys(voiceCfg).length === 0) {
    // May be agency-level voice
    const { data: agencyRow } = await svc
      .from('agencies').select('settings').eq('id', clientId).single();
    if (agencyRow) {
      isAgencyLevel = true;
      cfg = (agencyRow.settings as Record<string, unknown>) ?? {};
      voiceCfg = (cfg.voice_config as Record<string, unknown>) ?? {};
    }
  }

  // Already has a real number
  if (voiceCfg.phoneNumber && voiceCfg.phoneNumber !== 'pending') {
    return NextResponse.json({ phoneNumber: voiceCfg.phoneNumber, phoneNumberId: voiceCfg.phoneNumberId });
  }

  void isAgencyLevel; // used below

  const webhookUrl = `${APP_URL}/api/voice/twilio/webhook?clientId=${clientId}`;

  const available = await searchAvailableNumbers(areaCode);
  if (!available) {
    return NextResponse.json({ error: 'No phone numbers available for this area code. Try a different area code or leave it blank.' }, { status: 503 });
  }

  const purchased = await purchasePhoneNumber(available, webhookUrl);

  const updatedVoiceCfg = { ...voiceCfg, phoneNumber: purchased.phoneNumber, phoneNumberId: purchased.sid };

  // Update voice config in correct table
  if (isAgencyLevel) {
    await svc.from('agencies')
      .update({ settings: { ...cfg, voice_config: updatedVoiceCfg } })
      .eq('id', clientId);
  } else {
    await svc.from('agency_clients')
      .update({ container_config: { ...cfg, voice_config: updatedVoiceCfg } })
      .eq('id', clientId);
  }

  return NextResponse.json({ ok: true, phoneNumber: purchased.phoneNumber, phoneNumberId: purchased.sid });
}
