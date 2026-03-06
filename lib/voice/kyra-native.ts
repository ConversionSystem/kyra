/**
 * Kyra Native voice provider — Deepgram STT + OpenClaw TTS
 * No external API key required. Billed through Kyra credits (~3/min).
 *
 * Unlike VAPI/Synthflow/Retell, there's no third-party "assistant ID" to create.
 * The OpenClaw gateway handles call routing natively. This client stores config
 * in container_config and returns a synthetic assistantId.
 */
import type {
  VoiceProviderClient, VoiceAssistantConfig, VoiceProviderConfig,
  OutboundCallRequest, CallRecord, PhoneNumber,
} from './types';

export class KyraNativeClient implements VoiceProviderClient {
  // No external service — config stored locally in Supabase / container_config
  constructor() {}

  async syncAssistant(clientId: string, config: VoiceAssistantConfig): Promise<{ assistantId: string }> {
    // Kyra Native stores assistant config locally — no external API call needed
    return { assistantId: `kyra_${clientId}` };
  }

  async provisionPhoneNumber(_assistantId: string, _areaCode?: string): Promise<PhoneNumber> {
    // Phone number provisioning via Deepgram SIP — not yet implemented.
    // Return a placeholder so the flow completes; real number set up separately.
    return { id: 'pending', number: 'pending', provider: 'openclaw' };
  }

  async listPhoneNumbers(): Promise<PhoneNumber[]> {
    return [];
  }

  async startOutboundCall(
    _req: OutboundCallRequest,
    _config: VoiceProviderConfig,
    _assistantConfig: VoiceAssistantConfig
  ): Promise<{ callId: string }> {
    throw new Error('Kyra Native outbound calls not yet implemented');
  }

  parseWebhook(_body: unknown, _headers: Record<string, string>): CallRecord | null {
    return null;
  }

  async deleteAssistant(_assistantId: string): Promise<void> {
    // No-op — nothing to delete externally
  }
}
