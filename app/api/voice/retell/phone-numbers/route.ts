/**
 * GET  /api/voice/retell/phone-numbers — List Retell phone numbers
 * POST /api/voice/retell/phone-numbers — Buy a number and assign to client's agent
 *
 * POST body: { clientId, areaCode? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { createPhoneNumber, listPhoneNumbers, updatePhoneNumber, hasRetellKey } from '@/lib/voice/retell';

export const dynamic = 'force-dynamic';

export async function GET() {
  const result = await requireAgencyMember();
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: result.error.status });

  if (!hasRetellKey()) return NextResponse.json({ error: 'Retell AI not configured' }, { status: 503 });

  try {
    const numbers = await listPhoneNumbers();
    return NextResponse.json({ numbers });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const result = await requireAgencyMember();
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: result.error.status });

  if (!hasRetellKey()) return NextResponse.json({ error: 'Retell AI not configured' }, { status: 503 });

  const body = await request.json();
  const { clientId, areaCode } = body;

  if (!clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 });

  const svc = createServiceClientWithoutCookies();
  const { data: client } = await svc
    .from('agency_clients')
    .select('id, name, container_config')
    .eq('id', clientId)
    .single();

  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

  const cfg = (client.container_config as Record<string, unknown>) ?? {};
  const voiceConfig = (cfg.voice_config as Record<string, unknown>) ?? {};
  const agentId = voiceConfig.retell_agent_id as string | undefined;

  if (!agentId) {
    return NextResponse.json({ error: 'Client has no Retell agent. Create one first.' }, { status: 400 });
  }

  try {
    // Buy number
    const number = await createPhoneNumber({ area_code: areaCode || undefined });

    // Assign agent to number
    await updatePhoneNumber(number.phone_number_id, { agent_id: agentId });

    // Save to client config
    const updatedConfig = {
      ...cfg,
      voice_config: {
        ...voiceConfig,
        phone_number: number.phone_number,
        retell_phone_number_id: number.phone_number_id,
      },
    };

    await svc.from('agency_clients').update({ container_config: updatedConfig }).eq('id', clientId);

    return NextResponse.json({
      ok: true,
      phone_number: number.phone_number,
      phone_number_id: number.phone_number_id,
    }, { status: 201 });
  } catch (err) {
    console.error('[retell/phone-numbers POST]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
