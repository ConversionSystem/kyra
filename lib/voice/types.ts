// Voice AI provider types — shared across VAPI, Synthflow, and Retell

export type VoiceProvider = 'vapi' | 'synthflow' | 'retell';

export interface VoiceProviderConfig {
  provider: VoiceProvider;
  apiKey: string;
  phoneNumberId?: string;    // assigned phone number ID from provider
  phoneNumber?: string;      // the actual E.164 phone number
  assistantId?: string;      // provider-side assistant/agent ID
  webhookSecret?: string;    // for verifying webhook signatures
}

export interface VoiceAssistantConfig {
  name: string;              // AI employee name (e.g. "Alex")
  firstMessage: string;      // greeting when call starts
  systemPrompt: string;      // full persona + business context
  endCallMessage?: string;   // what to say when hanging up
  voiceId?: string;          // provider voice ID
  language?: string;         // default 'en'
  maxDurationSeconds?: number;  // max call length (default 600 = 10 min)
  silenceTimeoutSeconds?: number; // hang up after silence (default 30)
  hipaaEnabled?: boolean;    // healthcare clients
  tools?: VoiceTool[];       // functions the AI can call
}

export interface VoiceTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, { type: string; description: string }>;
      required?: string[];
    };
  };
  async?: boolean;
  server?: { url: string };  // for server-side tool execution
}

export interface PhoneNumber {
  id: string;
  number: string;       // E.164 e.g. +14155551234
  name?: string;
  assistantId?: string;
  provider: VoiceProvider;
}

export interface CallRecord {
  callId: string;
  provider: VoiceProvider;
  phoneNumber: string;
  callerNumber?: string;
  direction: 'inbound' | 'outbound';
  status: 'queued' | 'ringing' | 'in-progress' | 'completed' | 'failed' | 'busy' | 'no-answer';
  startedAt?: string;
  endedAt?: string;
  durationSeconds?: number;
  summary?: string;
  transcript?: string;
  recordingUrl?: string;
  endedReason?: string;
  clientId: string;
}

export interface OutboundCallRequest {
  clientId: string;
  toNumber: string;           // E.164 number to call
  customerName?: string;
  context?: string;           // why we're calling — injected into system prompt
}

// ── Provider interface ────────────────────────────────────────────────────────

export interface VoiceProviderClient {
  /** Create or update the AI assistant for a client */
  syncAssistant(clientId: string, config: VoiceAssistantConfig): Promise<{ assistantId: string }>;
  /** Provision a new phone number and assign it to an assistant */
  provisionPhoneNumber(assistantId: string, areaCode?: string): Promise<PhoneNumber>;
  /** List available phone numbers for this account */
  listPhoneNumbers(): Promise<PhoneNumber[]>;
  /** Trigger an outbound call */
  startOutboundCall(req: OutboundCallRequest, config: VoiceProviderConfig, assistantConfig: VoiceAssistantConfig): Promise<{ callId: string }>;
  /** Parse a webhook payload into a normalized CallRecord */
  parseWebhook(body: unknown, headers: Record<string, string>): CallRecord | null;
}
