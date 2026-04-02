// GHL (GoHighLevel) voice adapter
// GHL owns the call flow entirely — Kyra just receives and logs completed calls.
// No API key required: GHL calls come via the existing webhook at /api/webhooks/ghl.
// Phone numbers live in the GHL sub-account; we surface them from there.

import type {
  VoiceProviderClient, VoiceAssistantConfig, VoiceProviderConfig,
  PhoneNumber, CallRecord, OutboundCallRequest,
} from './types';
import type { GHLCallPayload } from '@/lib/ghl/webhook-types';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const GHL_API_VERSION = '2021-04-15';

export class GHLVoiceClient implements VoiceProviderClient {
  // apiKey here is the GHL access token (or private integration token) for the sub-account.
  // Pass the clientId string as apiKey when you only need parseWebhook (no API calls).
  constructor(private accessToken: string) {}

  /**
   * GHL manages its own AI voice agent — no sync needed.
   * We record a sentinel so callers know GHL is configured.
   */
  async syncAssistant(_clientId: string, _config: VoiceAssistantConfig): Promise<{ assistantId: string }> {
    return { assistantId: 'ghl-managed' };
  }

  /**
   * GHL already owns the phone numbers in each sub-account.
   * Provisioning new numbers happens inside GHL, not from Kyra.
   */
  async provisionPhoneNumber(_assistantId: string, _areaCode?: string): Promise<PhoneNumber> {
    throw new Error(
      'GHL manages phone numbers directly. Add or purchase numbers in your GHL sub-account → Settings → Phone Numbers.',
    );
  }

  /**
   * List phone numbers from the GHL sub-account.
   * Requires a valid location-scoped token; falls back gracefully if unavailable.
   */
  async listPhoneNumbers(): Promise<PhoneNumber[]> {
    if (!this.accessToken || this.accessToken.length < 10) return [];

    try {
      const res = await fetch(`${GHL_API_BASE}/phone-number/`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          Version: GHL_API_VERSION,
        },
      });

      if (!res.ok) return [];

      const data = await res.json() as { phoneNumbers?: Array<Record<string, unknown>> };
      const numbers = data.phoneNumbers ?? [];

      return numbers.map((n) => ({
        id: (n.id ?? n.phoneNumber) as string,
        number: n.phoneNumber as string,
        name: n.name as string | undefined,
        provider: 'ghl' as const,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Outbound calls are initiated from inside GHL — not from Kyra.
   */
  async startOutboundCall(_req: OutboundCallRequest, _config: VoiceProviderConfig, _assistantConfig: VoiceAssistantConfig): Promise<{ callId: string }> {
    throw new Error(
      'GHL handles outbound calls internally. Use GHL workflows or the Calls module to initiate outbound calls.',
    );
  }

  /**
   * Parse a GHL CallCompleted webhook into a normalized CallRecord.
   * Called from app/api/webhooks/ghl/route.ts after a CallCompleted event.
   */
  parseWebhook(body: unknown): CallRecord | null {
    const b = body as GHLCallPayload;

    if (b.type !== 'CallCompleted') return null;

    // Map GHL status to CallRecord status
    const statusMap: Record<string, CallRecord['status']> = {
      completed:  'completed',
      busy:       'busy',
      'no-answer': 'no-answer',
      failed:     'failed',
      canceled:   'failed',
    };

    return {
      callId:          b.callSid ?? `ghl-${b.contactId}-${Date.now()}`,
      provider:        'ghl',
      phoneNumber:     b.to,
      callerNumber:    b.from,
      direction:       b.direction,
      status:          statusMap[b.status] ?? 'completed',
      startedAt:       b.dateAdded,
      endedAt:         b.dateAdded,
      durationSeconds: b.duration,
      transcript:      b.transcription,
      recordingUrl:    b.recordingUrl,
      clientId:        b.locationId, // will be overridden by the caller with the real clientId
    };
  }
}
