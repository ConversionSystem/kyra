/**
 * OpenClaw Gateway Client
 * 
 * Communicates with the OpenClaw Gateway via HTTP API.
 * Each user gets an isolated session via sessions_spawn/sessions_send.
 */

const OPENCLAW_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:18789';
const OPENCLAW_API_KEY = process.env.OPENCLAW_API_KEY || '';

export interface OpenClawMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface OpenClawResponse {
  success: boolean;
  content?: string;
  error?: string;
}

/**
 * Send a message to a user's OpenClaw session
 */
export async function sendMessage(
  userId: string,
  message: string,
  context?: string
): Promise<OpenClawResponse> {
  const sessionKey = `kyra-user-${userId}`;
  
  try {
    const response = await fetch(`${OPENCLAW_URL}/api/openclaw/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': OPENCLAW_API_KEY,
      },
      body: JSON.stringify({
        sessionKey,
        message: context ? `${context}\n\n${message}` : message,
        timeoutSeconds: 120,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    const data = await response.json() as any;
    return { success: true, content: data.response || data.content };
  } catch (error) {
    console.error('OpenClaw send error:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Spawn a new isolated session for a task
 */
export async function spawnSession(
  userId: string,
  task: string,
  options?: {
    model?: string;
    timeoutSeconds?: number;
  }
): Promise<OpenClawResponse> {
  const label = `kyra-user-${userId}-task-${Date.now()}`;
  
  try {
    const response = await fetch(`${OPENCLAW_URL}/api/openclaw/spawn`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': OPENCLAW_API_KEY,
      },
      body: JSON.stringify({
        label,
        task,
        model: options?.model,
        runTimeoutSeconds: options?.timeoutSeconds || 60,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    const data = await response.json() as any;
    return { success: true, content: data.response };
  } catch (error) {
    console.error('OpenClaw spawn error:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Stream a message response from OpenClaw
 * Returns an async generator for SSE streaming
 */
export async function* streamMessage(
  userId: string,
  message: string,
  context?: string
): AsyncGenerator<{ type: 'delta' | 'complete' | 'error'; content: string }> {
  const sessionKey = `kyra-user-${userId}`;
  
  try {
    const response = await fetch(`${OPENCLAW_URL}/api/openclaw/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': OPENCLAW_API_KEY,
      },
      body: JSON.stringify({
        sessionKey,
        message: context ? `${context}\n\n${message}` : message,
      }),
    });

    if (!response.ok) {
      yield { type: 'error', content: await response.text() };
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      yield { type: 'error', content: 'No response body' };
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            yield { type: 'complete', content: '' };
            return;
          }
          try {
            const parsed = JSON.parse(data);
            yield { type: 'delta', content: parsed.content || parsed.delta || '' };
          } catch {
            // Skip malformed JSON
          }
        }
      }
    }

    yield { type: 'complete', content: '' };
  } catch (error) {
    yield { type: 'error', content: String(error) };
  }
}

/**
 * Check if OpenClaw Gateway is healthy
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetch(`${OPENCLAW_URL}/health`, {
      headers: { 'x-api-key': OPENCLAW_API_KEY },
    });
    return response.ok;
  } catch {
    return false;
  }
}
