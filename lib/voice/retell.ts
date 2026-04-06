/**
 * Retell AI API Client — Pure fetch, no SDK dependency.
 *
 * Retell provides all-in-one AI voice calling:
 * STT + LLM + TTS + telephony in a single API.
 *
 * Env: RETELL_API_KEY
 * Docs: https://docs.retellai.com
 */

const BASE = 'https://api.retellai.com';

function apiKey(): string {
  const key = process.env.RETELL_API_KEY;
  if (!key) throw new Error('RETELL_API_KEY is not configured');
  return key;
}

export function hasRetellKey(): boolean {
  return !!process.env.RETELL_API_KEY;
}

async function retellFetch<T = Record<string, unknown>>(
  path: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
  body?: unknown,
): Promise<T> {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Retell API ${res.status}: ${text.slice(0, 300)}`);
  }

  if (method === 'DELETE') return undefined as unknown as T;
  return res.json() as Promise<T>;
}

// ── Retell LLM (Response Engine) ──────────────────────────────────────────────

export interface CreateRetellLLMParams {
  model?: string;
  general_prompt?: string;
  begin_message?: string | null;
  general_tools?: Array<Record<string, unknown>>;
  knowledge_base_ids?: string[];
}

export interface RetellLLM {
  llm_id: string;
  model: string;
  general_prompt: string;
  [key: string]: unknown;
}

export async function createRetellLLM(params: CreateRetellLLMParams): Promise<RetellLLM> {
  return retellFetch<RetellLLM>('/create-retell-llm', 'POST', {
    model: params.model || 'gpt-4o-mini',
    general_prompt: params.general_prompt || 'You are a helpful AI assistant.',
    begin_message: params.begin_message ?? 'Hi, thanks for calling! How can I help you today?',
    ...(params.general_tools ? { general_tools: params.general_tools } : {}),
    ...(params.knowledge_base_ids?.length ? { knowledge_base_ids: params.knowledge_base_ids } : {}),
  });
}

export async function updateRetellLLM(llmId: string, params: Record<string, unknown>): Promise<RetellLLM> {
  return retellFetch<RetellLLM>(`/update-retell-llm/${llmId}`, 'PATCH', params);
}

export async function deleteRetellLLM(llmId: string): Promise<void> {
  await retellFetch(`/delete-retell-llm/${llmId}`, 'DELETE');
}

// ── Agents ────────────────────────────────────────────────────────────────────

export interface CreateAgentParams {
  agent_name: string;
  voice_id: string;
  response_engine: { type: 'retell-llm'; llm_id: string; version?: number };
  language?: string;
  voice_speed?: number;
  voice_temperature?: number;
  responsiveness?: number;
  interruption_sensitivity?: number;
  enable_backchannel?: boolean;
  ambient_sound?: string | null;
  webhook_url?: string;
  begin_message?: string | null;
}

export interface RetellAgent {
  agent_id: string;
  agent_name: string;
  voice_id: string;
  [key: string]: unknown;
}

export async function createAgent(params: CreateAgentParams): Promise<RetellAgent> {
  return retellFetch<RetellAgent>('/create-agent', 'POST', params);
}

export async function getAgent(agentId: string): Promise<RetellAgent> {
  return retellFetch<RetellAgent>(`/get-agent/${agentId}`);
}

export async function updateAgent(agentId: string, params: Record<string, unknown>): Promise<RetellAgent> {
  return retellFetch<RetellAgent>(`/update-agent/${agentId}`, 'PATCH', params);
}

export async function deleteAgent(agentId: string): Promise<void> {
  await retellFetch(`/delete-agent/${agentId}`, 'DELETE');
}

export async function listAgents(): Promise<RetellAgent[]> {
  return retellFetch<RetellAgent[]>('/list-agents');
}

// ── Phone Numbers ─────────────────────────────────────────────────────────────

export interface RetellPhoneNumber {
  phone_number: string;
  phone_number_id: string;
  agent_id?: string;
  [key: string]: unknown;
}

export async function createPhoneNumber(params: {
  area_code?: number;
  agent_id?: string;
}): Promise<RetellPhoneNumber> {
  return retellFetch<RetellPhoneNumber>('/create-phone-number', 'POST', params);
}

export async function listPhoneNumbers(): Promise<RetellPhoneNumber[]> {
  return retellFetch<RetellPhoneNumber[]>('/list-phone-numbers');
}

export async function getPhoneNumber(phoneNumberId: string): Promise<RetellPhoneNumber> {
  return retellFetch<RetellPhoneNumber>(`/get-phone-number/${phoneNumberId}`);
}

export async function updatePhoneNumber(phoneNumberId: string, params: { agent_id?: string }): Promise<RetellPhoneNumber> {
  return retellFetch<RetellPhoneNumber>(`/update-phone-number/${phoneNumberId}`, 'PATCH', params);
}

export async function deletePhoneNumber(phoneNumberId: string): Promise<void> {
  await retellFetch(`/delete-phone-number/${phoneNumberId}`, 'DELETE');
}

// ── Calls ─────────────────────────────────────────────────────────────────────

export interface RetellCall {
  call_id: string;
  call_status: string;
  start_timestamp?: number;
  end_timestamp?: number;
  transcript?: string;
  recording_url?: string;
  call_analysis?: {
    call_summary?: string;
    user_sentiment?: string;
    call_successful?: boolean;
    custom_analysis_data?: Record<string, unknown>;
  };
  metadata?: Record<string, string>;
  [key: string]: unknown;
}

export async function createPhoneCall(params: {
  from_number: string;
  to_number: string;
  agent_id?: string;
  override_agent_id?: string;
  metadata?: Record<string, string>;
  retell_llm_dynamic_variables?: Record<string, string>;
}): Promise<RetellCall> {
  return retellFetch<RetellCall>('/create-phone-call', 'POST', params);
}

export async function createWebCall(params: {
  agent_id: string;
  metadata?: Record<string, string>;
  retell_llm_dynamic_variables?: Record<string, string>;
}): Promise<{ call_id: string; access_token: string }> {
  return retellFetch('/create-web-call', 'POST', params);
}

export async function getCall(callId: string): Promise<RetellCall> {
  return retellFetch<RetellCall>(`/get-call/${callId}`);
}

export async function listCalls(params?: {
  agent_id?: string;
  limit?: number;
  sort_order?: 'ascending' | 'descending';
  filter_criteria?: Array<Record<string, unknown>>;
}): Promise<RetellCall[]> {
  const query = new URLSearchParams();
  if (params?.agent_id) query.set('agent_id', params.agent_id);
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.sort_order) query.set('sort_order', params.sort_order);
  const qs = query.toString();
  return retellFetch<RetellCall[]>(`/list-calls${qs ? `?${qs}` : ''}`);
}

// ── Knowledge Base ────────────────────────────────────────────────────────────

export interface RetellKnowledgeBase {
  knowledge_base_id: string;
  knowledge_base_name: string;
  [key: string]: unknown;
}

export async function createKnowledgeBase(params: {
  knowledge_base_name: string;
  enable_auto_refresh?: boolean;
}): Promise<RetellKnowledgeBase> {
  return retellFetch<RetellKnowledgeBase>('/create-knowledge-base', 'POST', params);
}

export async function addKnowledgeBaseSources(
  kbId: string,
  sources: Array<{ type: 'text' | 'url'; content?: string; url?: string; title?: string }>,
): Promise<void> {
  await retellFetch(`/add-knowledge-base-sources/${kbId}`, 'POST', sources);
}

export async function getKnowledgeBase(kbId: string): Promise<RetellKnowledgeBase> {
  return retellFetch<RetellKnowledgeBase>(`/get-knowledge-base/${kbId}`);
}

export async function deleteKnowledgeBase(kbId: string): Promise<void> {
  await retellFetch(`/delete-knowledge-base/${kbId}`, 'DELETE');
}

// ── Provisioning Helper ───────────────────────────────────────────────────────
// Creates a complete Retell voice agent setup for a Kyra client.

export interface ProvisionRetellAgentParams {
  clientName: string;
  persona: string;
  instructions: string;
  greeting?: string;
  voiceId?: string;
  language?: string;
  webhookUrl: string;
  knowledgeText?: string;
  metadata?: Record<string, string>;
}

export interface ProvisionRetellAgentResult {
  agentId: string;
  llmId: string;
  knowledgeBaseId?: string;
}

/**
 * Provisions a complete Retell voice agent for a Kyra client:
 * 1. Creates a knowledge base (if knowledge text provided)
 * 2. Creates a Retell LLM with persona + instructions
 * 3. Creates a voice agent with the LLM
 */
export async function provisionRetellAgent(
  params: ProvisionRetellAgentParams,
): Promise<ProvisionRetellAgentResult> {
  // 1. Knowledge base (optional)
  let knowledgeBaseId: string | undefined;
  if (params.knowledgeText && params.knowledgeText.length > 50) {
    const kb = await createKnowledgeBase({
      knowledge_base_name: `${params.clientName} Knowledge`,
    });
    knowledgeBaseId = kb.knowledge_base_id;

    await addKnowledgeBaseSources(knowledgeBaseId, [
      { type: 'text', content: params.knowledgeText, title: `${params.clientName} Business Info` },
    ]);
  }

  // 2. Retell LLM (response engine)
  const systemPrompt = [
    params.persona,
    '',
    'BUSINESS KNOWLEDGE AND RULES:',
    params.instructions,
    '',
    'VOICE CALL RULES:',
    '- Keep responses concise (1-3 sentences). Callers prefer brief answers.',
    '- Sound natural and conversational. Avoid reading out long lists.',
    '- If you cannot help, offer to transfer to the team.',
    '- Never say "as an AI" unless directly asked.',
  ].filter(Boolean).join('\n');

  const llm = await createRetellLLM({
    model: 'gpt-4o-mini',
    general_prompt: systemPrompt,
    begin_message: params.greeting || `Hi, thanks for calling ${params.clientName}! How can I help you?`,
    ...(knowledgeBaseId ? { knowledge_base_ids: [knowledgeBaseId] } : {}),
    general_tools: [
      {
        type: 'end_call',
        name: 'end_call',
        description: 'End the call when the conversation is complete or the caller says goodbye.',
      },
      {
        type: 'transfer_call',
        name: 'transfer_to_human',
        description: 'Transfer the caller to a human team member when they request it or you cannot resolve their issue.',
        number: '', // Will be configured per client
      },
    ],
  });

  // 3. Voice agent
  const agent = await createAgent({
    agent_name: `${params.clientName} AI`,
    voice_id: params.voiceId || 'retell-Cimo',
    response_engine: { type: 'retell-llm', llm_id: llm.llm_id },
    language: params.language || 'en-US',
    voice_speed: 1.0,
    responsiveness: 0.9,
    interruption_sensitivity: 0.8,
    enable_backchannel: true,
    webhook_url: params.webhookUrl,
    begin_message: params.greeting || `Hi, thanks for calling ${params.clientName}! How can I help you?`,
  });

  return {
    agentId: agent.agent_id,
    llmId: llm.llm_id,
    knowledgeBaseId,
  };
}

// ── VoiceProviderClient adapter (for provider.ts compatibility) ─────────────

import type { VoiceProviderClient, VoiceAssistantConfig, PhoneNumber, OutboundCallRequest, VoiceProviderConfig, CallRecord } from './types';

export class RetellClient implements VoiceProviderClient {
  private key: string;

  constructor(apiKey: string) {
    this.key = apiKey;
  }

  async syncAssistant(clientId: string, config: VoiceAssistantConfig): Promise<{ assistantId: string }> {
    // For the class-based interface, we create via the standalone functions
    // The API key is set via env var, not the class key
    const llm = await createRetellLLM({
      model: 'gpt-4o-mini',
      general_prompt: config.systemPrompt,
      begin_message: config.firstMessage,
    });

    const agent = await createAgent({
      agent_name: config.name,
      voice_id: config.voiceId || 'retell-Cimo',
      response_engine: { type: 'retell-llm', llm_id: llm.llm_id },
      language: config.language || 'en-US',
      enable_backchannel: true,
      responsiveness: 0.9,
    });

    return { assistantId: agent.agent_id };
  }

  async provisionPhoneNumber(assistantId: string, areaCode?: string): Promise<PhoneNumber> {
    const num = await createPhoneNumber({ area_code: areaCode ? Number(areaCode) : undefined, agent_id: assistantId });
    return {
      id: num.phone_number_id,
      number: num.phone_number,
      provider: 'retell',
    };
  }

  async listPhoneNumbers(): Promise<PhoneNumber[]> {
    const nums = await listPhoneNumbers();
    return nums.map(n => ({ id: n.phone_number_id, number: n.phone_number, provider: 'retell' as const }));
  }

  async startOutboundCall(req: OutboundCallRequest, config: VoiceProviderConfig): Promise<{ callId: string }> {
    const call = await createPhoneCall({
      from_number: config.phoneNumber || '',
      to_number: req.toNumber,
      override_agent_id: config.assistantId,
    });
    return { callId: call.call_id };
  }

  parseWebhook(body: unknown): CallRecord | null {
    const b = body as Record<string, unknown>;
    const call = b.call as Record<string, unknown> | undefined;
    if (!call) return null;

    const startMs = call.start_timestamp as number | undefined;
    const endMs = call.end_timestamp as number | undefined;

    return {
      callId: call.call_id as string,
      provider: 'retell' as const,
      phoneNumber: (call.from_number as string) || (call.to_number as string) || '',
      callerNumber: (call.from_number as string) || undefined,
      status: (b.event as string) === 'call_ended' ? 'completed' as const : 'in-progress' as const,
      direction: ((call.direction as string) || 'inbound') as 'inbound' | 'outbound',
      clientId: ((call.metadata as Record<string, string>)?.kyra_client_id) || '',
      startedAt: startMs ? new Date(startMs).toISOString() : new Date().toISOString(),
      endedAt: endMs ? new Date(endMs).toISOString() : undefined,
      durationSeconds: startMs && endMs ? Math.round((endMs - startMs) / 1000) : 0,
      transcript: (call.transcript as string) || undefined,
      recordingUrl: (call.recording_url as string) || undefined,
      summary: (call.call_analysis as Record<string, unknown>)?.call_summary as string | undefined,
    };
  }
}
