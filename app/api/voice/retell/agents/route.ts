/**
 * GET  /api/voice/retell/agents — List Retell agents for this agency
 * POST /api/voice/retell/agents — Create a Retell voice agent for a client
 *
 * POST body: { clientId, voiceId?, language? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { provisionRetellAgent, hasRetellKey, listAgents } from '@/lib/voice/retell';

export const dynamic = 'force-dynamic';

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://kyra.conversionsystem.com').replace(/\/$/, '');

export async function GET() {
  const result = await requireAgencyMember();
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: result.error.status });

  if (!hasRetellKey()) {
    return NextResponse.json({ error: 'Retell AI not configured' }, { status: 503 });
  }

  try {
    const agents = await listAgents();
    return NextResponse.json({ agents });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to list agents' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const result = await requireAgencyMember();
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: result.error.status });

  if (!hasRetellKey()) {
    return NextResponse.json({ error: 'Retell AI not configured. Add RETELL_API_KEY to environment.' }, { status: 503 });
  }

  const body = await request.json();
  const { clientId, voiceId, language } = body;

  if (!clientId) {
    return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
  }

  const supabase = await createClient();
  const svc = createServiceClientWithoutCookies();

  // Fetch client data
  const { data: client, error: clientErr } = await svc
    .from('agency_clients')
    .select('id, name, agency_id, container_config, industry')
    .eq('id', clientId)
    .single();

  if (clientErr || !client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const cfg = (client.container_config as Record<string, unknown>) ?? {};
  const persona = (cfg.persona as string) || `AI assistant for ${client.name}`;
  const instructions = (cfg.instructions as string) || '';
  const greeting = (cfg.widget_greeting as string) || `Hi, thanks for calling ${client.name}! How can I help you?`;

  // Check if already provisioned
  const voiceConfig = (cfg.voice_config as Record<string, unknown>) ?? {};
  if (voiceConfig.retell_agent_id) {
    return NextResponse.json({ error: 'Client already has a Retell agent', existing: voiceConfig }, { status: 409 });
  }

  try {
    const result = await provisionRetellAgent({
      clientName: client.name,
      persona,
      instructions,
      greeting,
      voiceId: voiceId || '11labs-Adrian',
      language: language || 'en-US',
      webhookUrl: `${APP_URL}/api/voice/retell/webhook`,
      knowledgeText: instructions.length > 100 ? instructions : undefined,
      metadata: { kyra_client_id: clientId, kyra_agency_id: client.agency_id },
    });

    // Save to container_config
    const updatedConfig = {
      ...cfg,
      voice_config: {
        ...voiceConfig,
        enabled: true,
        provider: 'retell',
        retell_agent_id: result.agentId,
        retell_llm_id: result.llmId,
        retell_knowledge_base_id: result.knowledgeBaseId || null,
        voice_id: voiceId || '11labs-Adrian',
        language: language || 'en-US',
        webhook_url: `${APP_URL}/api/voice/retell/webhook`,
      },
    };

    await svc.from('agency_clients').update({ container_config: updatedConfig }).eq('id', clientId);

    return NextResponse.json({
      ok: true,
      agent_id: result.agentId,
      llm_id: result.llmId,
      knowledge_base_id: result.knowledgeBaseId,
    }, { status: 201 });
  } catch (err) {
    console.error('[retell/agents POST]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to create agent' }, { status: 500 });
  }
}
