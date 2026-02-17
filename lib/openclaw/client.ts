/**
 * OpenClaw Gateway Client
 *
 * Communicates with the Kyra OpenClaw Bridge (HTTP API → real OpenClaw Gateway).
 * The bridge runs on Fly.io alongside a real `openclaw gateway` instance.
 *
 * This is NOT a dumb API proxy. Every message flows through:
 *   - Real OpenClaw agent with 60+ skills
 *   - Persistent memory per session
 *   - Sub-agent spawning
 *   - Full tool system
 *   - Multi-model support
 */

const BRIDGE_URL = process.env.KYRA_WORKER_URL || 'https://kyra-gateway.fly.dev';

export interface OpenClawMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface OpenClawResponse {
  success: boolean;
  content?: string;
  error?: string;
}

export interface OpenClawHealthStatus {
  status: string;
  openClaw: boolean;
  realOpenClaw: boolean;
  gatewayConnected: boolean;
  activeSessions: number;
}

/**
 * Send a message to a client's OpenClaw session via the bridge.
 */
export async function sendMessage(
  sessionKey: string,
  message: string,
  systemContext?: string
): Promise<OpenClawResponse> {
  try {
    const response = await fetch(`${BRIDGE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionKey,
        message,
        systemContext: systemContext || '',
      }),
      signal: AbortSignal.timeout(120_000),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    // Parse SSE response to extract full text
    const sseBody = await response.text();
    const content = parseSSEResponse(sseBody);

    return { success: true, content };
  } catch (error) {
    console.error('[openclaw/client] Send error:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Check if the OpenClaw Gateway is healthy.
 * Returns detailed status including whether it's a REAL OpenClaw instance.
 */
export async function healthCheck(): Promise<OpenClawHealthStatus | null> {
  try {
    const response = await fetch(`${BRIDGE_URL}/health`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;
    return await response.json() as OpenClawHealthStatus;
  } catch {
    return null;
  }
}

/**
 * Check if bridge is reachable and connected to a real OpenClaw Gateway.
 */
export async function isOpenClawAvailable(): Promise<boolean> {
  const status = await healthCheck();
  return status?.gatewayConnected === true;
}

// ── SSE Parser ────────────────────────────────────────────────────────────────

function parseSSEResponse(sseBody: string): string {
  const chunks: string[] = [];

  for (const line of sseBody.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) continue;

    const jsonStr = trimmed.slice(5).trim();
    if (!jsonStr || jsonStr === '[DONE]') continue;

    try {
      const event = JSON.parse(jsonStr);
      if (event.type === 'content' && event.content) {
        chunks.push(event.content);
      }
      if (event.type === 'done' && event.fullResponse) {
        return event.fullResponse;
      }
      if (event.type === 'done') break;
    } catch {
      // Skip malformed
    }
  }

  return chunks.join('');
}
