// VAPI voice AI adapter
// Docs: https://docs.vapi.ai
// Pricing: $0.05/min platform + voice/LLM/STT costs (~$0.13-0.20/min all-in)

import type {
  VoiceProviderClient, VoiceAssistantConfig, VoiceProviderConfig,
  PhoneNumber, CallRecord, OutboundCallRequest,
} from './types';

const VAPI_BASE = 'https://api.vapi.ai';

async function vapiRequest(apiKey: string, method: string, path: string, body?: unknown) {
  const res = await fetch(`${VAPI_BASE}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`VAPI ${method} ${path} → ${res.status}: ${err}`);
  }
  return res.status === 204 ? null : res.json();
}

function buildVapiAssistant(config: VoiceAssistantConfig, webhookBase: string, clientId: string) {
  return {
    name: config.name,
    firstMessage: config.firstMessage,
    model: {
      provider: 'openai',
      model: 'gpt-4o-mini',    // fast + cheap for voice; agencies can override with their key
      messages: [{ role: 'system', content: config.systemPrompt }],
      temperature: 0.7,
    },
    voice: {
      provider: 'cartesia',     // Cartesia is fastest for voice; fallback: 11labs
      voiceId: config.voiceId ?? '156fb8d2-335b-4950-9cb3-a2d33befec77', // warm female (Cartesia "Friendly Sidekick")
    },
    transcriber: {
      provider: 'deepgram',
      model: 'nova-2',
      language: config.language ?? 'en',
    },
    maxDurationSeconds: config.maxDurationSeconds ?? 600,
    silenceTimeoutSeconds: config.silenceTimeoutSeconds ?? 30,
    endCallMessage: config.endCallMessage ?? 'Thank you for calling! Have a great day.',
    endCallPhrases: ['goodbye', 'bye', 'talk later', 'thank you bye'],
    // Server URL for real-time tool execution and end-of-call reports
    serverUrl: `${webhookBase}/api/voice/webhook?provider=vapi&clientId=${clientId}`,
    serverUrlSecret: process.env.VOICE_WEBHOOK_SECRET ?? 'kyra-voice-secret-2026',
    ...(config.tools?.length ? { tools: config.tools } : {}),
    // Analysis — get a structured summary after every call
    analysisPlan: {
      summaryPrompt: 'Summarize the key points of the conversation in 2-3 sentences. Include any actions taken (e.g. appointment booked, information provided) and the overall outcome.',
      structuredDataPrompt: 'Extract: customer_name, customer_phone, intent, outcome, action_taken, follow_up_needed',
      structuredDataSchema: {
        type: 'object',
        properties: {
          customer_name: { type: 'string' },
          customer_phone: { type: 'string' },
          intent: { type: 'string' },
          outcome: { type: 'string', enum: ['booked', 'qualified', 'information_provided', 'callback_requested', 'not_interested', 'escalated'] },
          action_taken: { type: 'string' },
          follow_up_needed: { type: 'boolean' },
        },
      },
    },
  };
}

export class VapiClient implements VoiceProviderClient {
  constructor(private apiKey: string) {}

  async syncAssistant(clientId: string, config: VoiceAssistantConfig): Promise<{ assistantId: string }> {
    const webhookBase = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kyra.conversionsystem.com';
    const payload = buildVapiAssistant(config, webhookBase, clientId);

    // Check if assistant already exists (stored in client settings)
    // Try to create; if 409, update existing
    try {
      const result = await vapiRequest(this.apiKey, 'POST', '/assistant', payload);
      return { assistantId: result.id };
    } catch (err) {
      throw new Error(`Failed to create VAPI assistant: ${err}`);
    }
  }

  async updateAssistant(assistantId: string, clientId: string, config: VoiceAssistantConfig): Promise<void> {
    const webhookBase = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kyra.conversionsystem.com';
    const payload = buildVapiAssistant(config, webhookBase, clientId);
    await vapiRequest(this.apiKey, 'PATCH', `/assistant/${assistantId}`, payload);
  }

  async provisionPhoneNumber(assistantId: string, areaCode?: string): Promise<PhoneNumber> {
    const result = await vapiRequest(this.apiKey, 'POST', '/phone-number', {
      provider: 'twilio',   // VAPI provisions via Twilio under the hood
      assistantId,
      numberDesiredAreaCode: areaCode ?? '415',
      name: 'Kyra AI Phone',
    });
    return {
      id: result.id,
      number: result.number,
      name: result.name,
      assistantId: result.assistantId,
      provider: 'vapi',
    };
  }

  async listPhoneNumbers(): Promise<PhoneNumber[]> {
    const results = await vapiRequest(this.apiKey, 'GET', '/phone-number');
    return (results ?? []).map((n: Record<string, string>) => ({
      id: n.id,
      number: n.number,
      name: n.name,
      assistantId: n.assistantId,
      provider: 'vapi' as const,
    }));
  }

  async startOutboundCall(req: OutboundCallRequest, config: VoiceProviderConfig, assistantConfig: VoiceAssistantConfig): Promise<{ callId: string }> {
    if (!config.phoneNumberId) throw new Error('phoneNumberId required for outbound calls');

    const result = await vapiRequest(this.apiKey, 'POST', '/call/phone', {
      phoneNumberId: config.phoneNumberId,
      assistantId: config.assistantId,
      customer: {
        number: req.toNumber,
        name: req.customerName,
      },
      // Inject call context into assistant's first message
      assistantOverrides: req.context ? {
        firstMessage: `Hi${req.customerName ? ` ${req.customerName}` : ''}! ${assistantConfig.firstMessage} — ${req.context}`,
      } : undefined,
    });
    return { callId: result.id };
  }

  parseWebhook(body: unknown): CallRecord | null {
    const b = body as Record<string, unknown>;
    const type = b.type as string;
    const call = b.call as Record<string, unknown> | undefined;
    const message = b.message as Record<string, unknown> | undefined;

    // VAPI sends different event types; we care about end-of-call-report
    if (type !== 'end-of-call-report' && type !== 'call-started' && type !== 'call-ended') {
      return null;
    }

    const callData = call ?? b;
    const analysis = (callData.analysis as Record<string, unknown>) ?? {};

    // Extract clientId from metadata
    const metadata = (callData.metadata as Record<string, string>) ?? {};
    const clientId = metadata.clientId ?? (callData.assistantId as string ?? 'unknown');

    return {
      callId: (callData.id ?? b.callId) as string,
      provider: 'vapi',
      phoneNumber: ((callData.phoneNumber as Record<string, string>)?.number ?? '') as string,
      callerNumber: ((callData.customer as Record<string, string>)?.number) as string | undefined,
      direction: ((callData.type as string) === 'outboundPhoneCall' ? 'outbound' : 'inbound') as 'inbound' | 'outbound',
      status: (callData.status as string === 'ended' ? 'completed' : callData.status as string) as CallRecord['status'],
      startedAt: callData.startedAt as string | undefined,
      endedAt: callData.endedAt as string | undefined,
      durationSeconds: callData.durationSeconds as number | undefined,
      summary: (analysis.summary ?? message?.transcript) as string | undefined,
      transcript: (callData.transcript ?? (message?.transcript)) as string | undefined,
      recordingUrl: callData.recordingUrl as string | undefined,
      endedReason: callData.endedReason as string | undefined,
      clientId,
    };
  }
}
