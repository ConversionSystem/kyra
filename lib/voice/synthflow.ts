// Synthflow voice AI adapter
// Docs: https://docs.synthflow.ai
// Agency plan: $1,400/mo — unlimited subaccounts, 6,000 min, white-label
// Best for agencies wanting white-label + predictable pricing

import type {
  VoiceProviderClient, VoiceAssistantConfig, VoiceProviderConfig,
  PhoneNumber, CallRecord, OutboundCallRequest,
} from './types';

const SYNTHFLOW_BASE = 'https://api.synthflow.ai/v2';

async function sfRequest(apiKey: string, method: string, path: string, body?: unknown) {
  const res = await fetch(`${SYNTHFLOW_BASE}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Synthflow ${method} ${path} → ${res.status}: ${err}`);
  }
  return res.status === 204 ? null : res.json();
}

export class SynthflowClient implements VoiceProviderClient {
  constructor(private apiKey: string) {}

  async syncAssistant(clientId: string, config: VoiceAssistantConfig): Promise<{ assistantId: string }> {
    const webhookBase = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kyra.conversionsystem.com';

    const payload = {
      name: config.name,
      agent: {
        greeting_message: config.firstMessage,
        prompt: config.systemPrompt,
        language: config.language ?? 'ENG',
        voice_id: config.voiceId ?? 'azure-en-US-AriaNeural',  // natural female voice
        max_duration_minutes: Math.floor((config.maxDurationSeconds ?? 600) / 60),
      },
      webhook: {
        url: `${webhookBase}/api/voice/webhook?provider=synthflow&clientId=${clientId}`,
        events: ['call_completed', 'call_started', 'call_failed'],
      },
    };

    const result = await sfRequest(this.apiKey, 'POST', '/agents', payload);
    return { assistantId: result.agent_id ?? result.id };
  }

  async provisionPhoneNumber(assistantId: string, areaCode?: string): Promise<PhoneNumber> {
    // Synthflow provisions numbers via Twilio internally
    const result = await sfRequest(this.apiKey, 'POST', '/phone-numbers/provision', {
      agent_id: assistantId,
      area_code: areaCode ?? '415',
      country: 'US',
    });

    return {
      id: result.phone_number_id ?? result.id,
      number: result.phone_number ?? result.number,
      assistantId,
      provider: 'synthflow',
    };
  }

  async listPhoneNumbers(): Promise<PhoneNumber[]> {
    const result = await sfRequest(this.apiKey, 'GET', '/phone-numbers');
    const items = result.data ?? result ?? [];
    return items.map((n: Record<string, string>) => ({
      id: n.phone_number_id ?? n.id,
      number: n.phone_number ?? n.number,
      assistantId: n.agent_id,
      provider: 'synthflow' as const,
    }));
  }

  async startOutboundCall(req: OutboundCallRequest, config: VoiceProviderConfig): Promise<{ callId: string }> {
    if (!config.assistantId) throw new Error('assistantId required for Synthflow outbound calls');

    const result = await sfRequest(this.apiKey, 'POST', '/calls/outbound', {
      agent_id: config.assistantId,
      phone_number: req.toNumber,
      contact_name: req.customerName,
      metadata: { clientId: req.clientId, context: req.context },
    });
    return { callId: result.call_id ?? result.id };
  }

  parseWebhook(body: unknown): CallRecord | null {
    const b = body as Record<string, unknown>;
    const event = b.event as string;

    if (!event?.startsWith('call_')) return null;

    const metadata = (b.metadata as Record<string, string>) ?? {};
    const clientId = metadata.clientId ?? (b.agent_id as string ?? 'unknown');

    return {
      callId: b.call_id as string,
      provider: 'synthflow',
      phoneNumber: b.to_number as string ?? '',
      callerNumber: b.from_number as string | undefined,
      direction: (b.direction as string === 'outbound' ? 'outbound' : 'inbound') as 'inbound' | 'outbound',
      status: event === 'call_completed' ? 'completed' : event === 'call_failed' ? 'failed' : 'in-progress',
      startedAt: b.started_at as string | undefined,
      endedAt: b.ended_at as string | undefined,
      durationSeconds: b.duration_seconds as number | undefined,
      summary: b.summary as string | undefined,
      transcript: b.transcript as string | undefined,
      recordingUrl: b.recording_url as string | undefined,
      endedReason: b.end_reason as string | undefined,
      clientId,
    };
  }
}
