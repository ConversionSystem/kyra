/**
 * Gateway HTTP Client — Translates Kyra chat requests to OpenClaw's
 * /v1/chat/completions (OpenAI-compatible) HTTP API.
 *
 * The OpenClaw gateway does NOT have a /chat HTTP endpoint.
 * It exposes /v1/chat/completions when gateway.http.endpoints.chatCompletions.enabled = true.
 *
 * Usage:
 *   import { gatewayChat, gatewayChatStream } from '@/lib/ovh/gateway-client';
 */

// ── Types ─────────────────────────────────────────────────────────────────────

interface GatewayChatOptions {
  /** Gateway HTTPS URL (e.g. https://xxx.gw.kyra.conversionsystem.com) */
  gatewayUrl: string;
  /** Gateway auth token */
  token: string;
  /** User message */
  message: string;
  /** System context/prompt (optional) */
  systemContext?: string;
  /** Session key for conversation continuity (passed as X-Session-Key header) */
  sessionKey?: string;
  /** Model override (defaults to gateway's configured model) */
  model?: string;
  /** API key override for BYOK */
  apiKey?: string;
  /** Timeout in ms (default 120s) */
  timeoutMs?: number;
  /** Stream response (default false) */
  stream?: boolean;
}

interface ChatCompletionMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// ── Non-streaming chat ────────────────────────────────────────────────────────

/**
 * Send a chat message to an OpenClaw gateway via /v1/chat/completions.
 * Returns the full response text.
 */
export async function gatewayChat(opts: GatewayChatOptions): Promise<string> {
  const messages: ChatCompletionMessage[] = [];

  if (opts.systemContext) {
    messages.push({ role: 'system', content: opts.systemContext });
  }
  messages.push({ role: 'user', content: opts.message });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${opts.token}`,
  };

  // Pass session key as custom header if provided
  if (opts.sessionKey) {
    headers['X-Session-Key'] = opts.sessionKey;
  }

  const res = await fetch(`${opts.gatewayUrl}/v1/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: opts.model || 'openrouter/anthropic/claude-haiku-4.5',
      messages,
      stream: false,
    }),
    signal: AbortSignal.timeout(opts.timeoutMs || 120_000),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`Gateway returned ${res.status}: ${errBody}`);
  }

  const data = await res.json();

  // OpenAI format: data.choices[0].message.content
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Empty response from gateway');
  }

  return content;
}

// ── Streaming chat ────────────────────────────────────────────────────────────

/**
 * Send a chat message to an OpenClaw gateway with streaming.
 * Returns the raw Response object for SSE streaming.
 */
export async function gatewayChatStream(opts: GatewayChatOptions): Promise<Response> {
  const messages: ChatCompletionMessage[] = [];

  if (opts.systemContext) {
    messages.push({ role: 'system', content: opts.systemContext });
  }
  messages.push({ role: 'user', content: opts.message });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${opts.token}`,
  };

  if (opts.sessionKey) {
    headers['X-Session-Key'] = opts.sessionKey;
  }

  const res = await fetch(`${opts.gatewayUrl}/v1/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: opts.model || 'openrouter/anthropic/claude-haiku-4.5',
      messages,
      stream: true,
    }),
    signal: AbortSignal.timeout(opts.timeoutMs || 120_000),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`Gateway returned ${res.status}: ${errBody}`);
  }

  return res;
}

/**
 * Parse a streaming response from gatewayChatStream into full text.
 * Useful when you need the complete response but the gateway only streams.
 */
export async function parseStreamToText(response: Response): Promise<string> {
  const body = await response.text();
  const chunks: string[] = [];

  for (const line of body.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) continue;

    const jsonStr = trimmed.slice(5).trim();
    if (!jsonStr || jsonStr === '[DONE]') continue;

    try {
      const event = JSON.parse(jsonStr);
      const delta = event.choices?.[0]?.delta?.content;
      if (delta) chunks.push(delta);
    } catch {
      // Skip malformed lines
    }
  }

  return chunks.join('');
}
