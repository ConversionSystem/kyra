// Retell AI voice adapter
// Docs: https://docs.retellai.com
// Pricing: pay-as-you-go $0.07+/min platform fee
// Best for high-volume / enterprise with custom LLM configs

import type {
  VoiceProviderClient, VoiceAssistantConfig, VoiceProviderConfig,
  PhoneNumber, CallRecord, OutboundCallRequest,
} from './types';

const RETELL_BASE = 'https://api.retellai.com';

async function retellRequest(apiKey: string, method: string, path: string, body?: unknown) {
  const res = await fetch(`${RETELL_BASE}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Retell ${method} ${path} → ${res.status}: ${err}`);
  }
  return res.status === 204 ? null : res.json();
}

export class RetellClient implements VoiceProviderClient {
  constructor(private apiKey: string) {}

  async syncAssistant(clientId: string, config: VoiceAssistantConfig): Promise<{ assistantId: string }> {
    const webhookBase = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kyra.conversionsystem.com';

    // Retell uses "LLM" + "Agent" pattern (separate objects)
    // Step 1: Create LLM with system prompt
    const llm = await retellRequest(this.apiKey, 'POST', '/create-retell-llm', {
      model: 'gpt-4o-mini',
      general_prompt: config.systemPrompt,
      general_tools: config.tools?.map(t => ({
        type: 'end_call',  // Retell has built-in tools
        name: t.function.name,
        description: t.function.description,
      })),
      begin_message: config.firstMessage,
    });

    // Step 2: Create agent using the LLM
    const agent = await retellRequest(this.apiKey, 'POST', '/create-agent', {
      llm_websocket_url: llm.llm_websocket_url,
      agent_name: config.name,
      voice_id: config.voiceId ?? 'elevenlabs-rachel',  // warm natural voice
      language: config.language ?? 'en-US',
      end_call_after_silence_ms: (config.silenceTimeoutSeconds ?? 30) * 1000,
      max_call_duration_ms: (config.maxDurationSeconds ?? 600) * 1000,
      responsiveness: 1,   // 0-1, higher = faster responses
      interruption_sensitivity: 1,  // natural conversation flow
      webhook_url: `${webhookBase}/api/voice/webhook?provider=retell&clientId=${clientId}`,
      metadata: { clientId, kyraManaged: true },
    });

    return { assistantId: agent.agent_id };
  }

  async provisionPhoneNumber(assistantId: string, areaCode?: string): Promise<PhoneNumber> {
    const result = await retellRequest(this.apiKey, 'POST', '/create-phone-number', {
      agent_id: assistantId,
      area_code: parseInt(areaCode ?? '415', 10),
    });

    return {
      id: result.phone_number,  // Retell uses the number itself as the ID
      number: result.phone_number,
      assistantId,
      provider: 'retell',
    };
  }

  async listPhoneNumbers(): Promise<PhoneNumber[]> {
    const result = await retellRequest(this.apiKey, 'GET', '/list-phone-numbers');
    return (result ?? []).map((n: Record<string, string>) => ({
      id: n.phone_number,
      number: n.phone_number,
      assistantId: n.agent_id,
      name: n.nickname,
      provider: 'retell' as const,
    }));
  }

  async startOutboundCall(req: OutboundCallRequest, config: VoiceProviderConfig): Promise<{ callId: string }> {
    if (!config.phoneNumber) throw new Error('phoneNumber required for Retell outbound calls');

    const result = await retellRequest(this.apiKey, 'POST', '/create-phone-call', {
      from_number: config.phoneNumber,
      to_number: req.toNumber,
      agent_id: config.assistantId,
      metadata: { clientId: req.clientId, customerName: req.customerName, context: req.context },
    });
    return { callId: result.call_id };
  }

  parseWebhook(body: unknown): CallRecord | null {
    const b = body as Record<string, unknown>;
    const eventType = b.event as string;

    // Retell sends: call_started, call_analyzed, call_ended
    if (!['call_analyzed', 'call_ended', 'call_started'].includes(eventType)) return null;

    const call = (b.call ?? b) as Record<string, unknown>;
    const analysis = (call.call_analysis as Record<string, unknown>) ?? {};
    const metadata = (call.metadata as Record<string, string>) ?? {};
    const clientId = metadata.clientId ?? 'unknown';

    return {
      callId: call.call_id as string,
      provider: 'retell',
      phoneNumber: call.to_number as string ?? '',
      callerNumber: call.from_number as string | undefined,
      direction: (call.direction as string === 'outbound' ? 'outbound' : 'inbound') as 'inbound' | 'outbound',
      status: call.call_status === 'ended' ? 'completed' : call.call_status as CallRecord['status'],
      startedAt: call.start_timestamp ? new Date(call.start_timestamp as number).toISOString() : undefined,
      endedAt: call.end_timestamp ? new Date(call.end_timestamp as number).toISOString() : undefined,
      durationSeconds: call.end_timestamp && call.start_timestamp
        ? Math.round(((call.end_timestamp as number) - (call.start_timestamp as number)) / 1000)
        : undefined,
      summary: analysis.call_summary as string | undefined,
      transcript: call.transcript as string | undefined,
      recordingUrl: call.recording_url as string | undefined,
      endedReason: analysis.call_successful === false ? 'failed' : call.disconnection_reason as string | undefined,
      clientId,
    };
  }
}
