// ────────────────────────────────────────────────────────────────────────────
// SMS Provider Abstraction
// Pluggable: Springbig (primary), Blackleaf (fallback), Mock (testing)
// ────────────────────────────────────────────────────────────────────────────

import type { RenderedMessage, SmsProvider, SmsSendResult } from './types';

// ─── Springbig Provider ────────────────────────────────────────────────────

/**
 * Springbig SMS Provider
 *
 * Springbig API is partner-restricted. Endpoint patterns based on docs:
 *   Base URL: https://{environment}.api.springbig.technology/
 *   Environments: gamma (sandbox), production
 *
 * The exact messaging endpoint is TBD — Purple Lotus must confirm
 * transactional send capability with Springbig before going live.
 *
 * This implementation uses a configurable endpoint URL so we can
 * plug in the correct route once API access is granted.
 */
export class SpringbigProvider implements SmsProvider {
  name = 'springbig' as const;
  private apiUrl: string;
  private apiKey: string;

  constructor(config: { apiUrl: string; apiKey: string }) {
    this.apiUrl = config.apiUrl;
    this.apiKey = config.apiKey;
  }

  async sendMessage(msg: RenderedMessage): Promise<SmsSendResult> {
    const timestamp = new Date().toISOString();

    try {
      const response = await fetch(`${this.apiUrl}/messages/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          to: msg.to,
          body: msg.body,
          metadata: {
            templateId: msg.templateId,
            event: msg.event,
            orderId: msg.orderId,
            source: 'kyra-delivery-sms',
          },
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        return {
          success: false,
          provider: 'springbig',
          error: `Springbig API error ${response.status}: ${errorBody}`,
          timestamp,
        };
      }

      const data = await response.json();

      return {
        success: true,
        messageId: data.id || data.messageId || data.message_id,
        provider: 'springbig',
        timestamp,
      };
    } catch (err) {
      return {
        success: false,
        provider: 'springbig',
        error: `Springbig request failed: ${err instanceof Error ? err.message : String(err)}`,
        timestamp,
      };
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/health`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// ─── Blackleaf Provider (Fallback) ─────────────────────────────────────────

/**
 * Blackleaf SMS Provider
 *
 * Simple REST API for cannabis-compliant SMS.
 * Pricing: $29-199/mo + per-message. Published API docs.
 * Used as fallback if Springbig doesn't support transactional sends.
 */
export class BlackleafProvider implements SmsProvider {
  name = 'blackleaf' as const;
  private apiUrl: string;
  private apiKey: string;

  constructor(config: { apiUrl: string; apiKey: string }) {
    this.apiUrl = config.apiUrl;
    this.apiKey = config.apiKey;
  }

  async sendMessage(msg: RenderedMessage): Promise<SmsSendResult> {
    const timestamp = new Date().toISOString();

    try {
      const response = await fetch(`${this.apiUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
        body: JSON.stringify({
          to: msg.to,
          body: msg.body,
          metadata: {
            templateId: msg.templateId,
            orderId: msg.orderId,
          },
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        return {
          success: false,
          provider: 'blackleaf',
          error: `Blackleaf API error ${response.status}: ${errorBody}`,
          timestamp,
        };
      }

      const data = await response.json();

      return {
        success: true,
        messageId: data.id || data.messageId,
        provider: 'blackleaf',
        timestamp,
      };
    } catch (err) {
      return {
        success: false,
        provider: 'blackleaf',
        error: `Blackleaf request failed: ${err instanceof Error ? err.message : String(err)}`,
        timestamp,
      };
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/v1/health`, {
        headers: { 'X-API-Key': this.apiKey },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// ─── Mock Provider (Testing) ───────────────────────────────────────────────

/**
 * Mock SMS Provider — logs messages instead of sending.
 * Used for development and testing without burning real SMS credits.
 */
export class MockProvider implements SmsProvider {
  name = 'mock' as const;
  public sentMessages: RenderedMessage[] = [];

  async sendMessage(msg: RenderedMessage): Promise<SmsSendResult> {
    this.sentMessages.push(msg);
    console.log(`[MockSMS] → ${msg.to}: ${msg.body}`);

    return {
      success: true,
      messageId: `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      provider: 'mock',
      timestamp: new Date().toISOString(),
    };
  }

  async checkHealth(): Promise<boolean> {
    return true;
  }
}

// ─── Provider Factory ──────────────────────────────────────────────────────

export function createProvider(config: {
  provider: 'springbig' | 'blackleaf' | 'mock';
  apiUrl?: string;
  apiKey?: string;
}): SmsProvider {
  switch (config.provider) {
    case 'springbig':
      if (!config.apiUrl || !config.apiKey) {
        throw new Error('Springbig provider requires apiUrl and apiKey');
      }
      return new SpringbigProvider({ apiUrl: config.apiUrl, apiKey: config.apiKey });

    case 'blackleaf':
      if (!config.apiUrl || !config.apiKey) {
        throw new Error('Blackleaf provider requires apiUrl and apiKey');
      }
      return new BlackleafProvider({ apiUrl: config.apiUrl, apiKey: config.apiKey });

    case 'mock':
      return new MockProvider();

    default:
      throw new Error(`Unknown SMS provider: ${config.provider}`);
  }
}
