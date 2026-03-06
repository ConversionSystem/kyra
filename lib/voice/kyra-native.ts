/**
 * Kyra Native voice provider — Deepgram STT + OpenClaw TTS + Twilio phone numbers
 * No separate API key required — billed through Kyra credits (~3/min).
 */
import type {
  VoiceProviderClient, VoiceAssistantConfig, VoiceProviderConfig,
  OutboundCallRequest, CallRecord, PhoneNumber,
} from './types';
import { hasTwilioCredentials, searchAvailableNumbers, purchasePhoneNumber, makeOutboundCall } from './twilio-phone';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kyra.conversionsystem.com';

export class KyraNativeClient implements VoiceProviderClient {
  constructor() {}

  async syncAssistant(clientId: string, _config: VoiceAssistantConfig): Promise<{ assistantId: string }> {
    // No external assistant to sync — config stored in Supabase/container_config
    return { assistantId: `kyra_${clientId}` };
  }

  async provisionPhoneNumber(assistantId: string, areaCode?: string): Promise<PhoneNumber> {
    // assistantId format: 'kyra_{clientId}'
    const clientId = assistantId.replace('kyra_', '');

    if (!hasTwilioCredentials()) {
      // Graceful fallback if Twilio not configured
      console.warn('[KyraNative] Twilio credentials missing — phone number not provisioned');
      return { id: 'pending', number: 'pending', provider: 'openclaw' };
    }

    const webhookUrl = `${APP_URL}/api/voice/twilio/webhook?clientId=${clientId}`;

    // Search for an available number
    const available = await searchAvailableNumbers(areaCode);
    if (!available) {
      throw new Error('No phone numbers available for this area code. Try a different area code.');
    }

    // Purchase it
    const purchased = await purchasePhoneNumber(available, webhookUrl);
    return {
      id: purchased.sid,
      number: purchased.phoneNumber,
      provider: 'openclaw',
    };
  }

  async listPhoneNumbers(): Promise<PhoneNumber[]> {
    return [];
  }

  async startOutboundCall(
    req: OutboundCallRequest,
    config: VoiceProviderConfig,
    _assistantConfig: VoiceAssistantConfig
  ): Promise<{ callId: string }> {
    if (!hasTwilioCredentials()) throw new Error('Twilio credentials not configured');
    if (!config.phoneNumber || config.phoneNumber === 'pending') {
      throw new Error('No phone number provisioned yet');
    }

    const clientId = config.phoneNumberId?.replace('kyra_', '') ?? '';
    const twimlUrl = `${APP_URL}/api/voice/twilio/outbound-twiml?clientId=${clientId}`;

    const { callSid } = await makeOutboundCall({
      to: req.toNumber,
      from: config.phoneNumber,
      twimlUrl,
    });
    return { callId: callSid };
  }

  parseWebhook(_body: unknown, _headers: Record<string, string>): CallRecord | null {
    // Kyra Native webhooks handled by /api/voice/twilio/webhook
    return null;
  }

  async deleteAssistant(_assistantId: string): Promise<void> {
    // No-op
  }
}
