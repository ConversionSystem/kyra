/**
 * OpenClaw Gateway Client
 *
 * Communicates with per-agency OpenClaw Gateways via their HTTP bridge.
 * Each agency has its own isolated gateway — use the gateway-resolver
 * to get the correct URL before calling these functions.
 *
 * This is NOT a dumb API proxy. Every message flows through:
 *   - Real OpenClaw agent with 60+ skills
 *   - Persistent memory per session
 *   - Sub-agent spawning
 *   - Full tool system
 *   - Multi-model support
 */

// ⚠️ NO FALLBACK — every function requires an explicit gatewayUrl.
// Passing undefined/null will throw, not silently use a shared gateway.

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
 *
 * @param gatewayUrl - The agency's gateway URL (from gateway-resolver)
 * @param sessionKey - Session key for the conversation
 * @param message - Message to send
 * @param systemContext - Optional system context for the session
 */
export async function sendMessage(
  gatewayUrl: string | undefined,
  sessionKey: string,
  message: string,
  systemContext?: string
): Promise<OpenClawResponse> {
  if (!gatewayUrl) throw new Error('No gateway URL provided — cannot send message without isolated gateway');

  try {
    // Use OpenClaw's /v1/chat/completions (OpenAI-compatible) HTTP API
    const chatMessages: Array<{ role: string; content: string }> = [];
    if (systemContext) {
      chatMessages.push({ role: 'system', content: systemContext });
    }
    chatMessages.push({ role: 'user', content: message });

    const response = await fetch(`${gatewayUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openrouter/anthropic/claude-haiku-4.5',
        messages: chatMessages,
        stream: false,
      }),
      signal: AbortSignal.timeout(120_000),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    // Parse OpenAI-compatible JSON response
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || '';

    return { success: true, content };
  } catch (error) {
    console.error('[openclaw/client] Send error:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Check if an OpenClaw Gateway is healthy.
 *
 * @param gatewayUrl - The agency's gateway URL (from gateway-resolver)
 */
export async function healthCheck(gatewayUrl?: string): Promise<OpenClawHealthStatus | null> {
  if (!gatewayUrl) return null;

  try {
    const response = await fetch(`${gatewayUrl}/health`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;
    return await response.json() as OpenClawHealthStatus;
  } catch {
    return null;
  }
}

/**
 * Check if a gateway is reachable and connected to a real OpenClaw Gateway.
 */
export async function isOpenClawAvailable(gatewayUrl?: string): Promise<boolean> {
  const status = await healthCheck(gatewayUrl);
  return status?.gatewayConnected === true;
}

// ── Tool Invocation ───────────────────────────────────────────────────────────

export interface ToolInvokeResult {
  ok: boolean;
  result?: {
    content: Array<{ type: string; text?: string; [key: string]: unknown }>;
    details?: Record<string, unknown>;
  };
  error?: {
    type: string;
    message: string;
  };
}

/**
 * Invoke any OpenClaw tool directly via the bridge's /tools/invoke endpoint.
 *
 * @param gatewayUrl - The agency's gateway URL (from gateway-resolver)
 */
export async function invokeTool(
  gatewayUrl: string | undefined,
  tool: string,
  args: Record<string, unknown> = {},
  action?: string
): Promise<ToolInvokeResult> {
  if (!gatewayUrl) {
    return { ok: false, error: { type: 'gateway_not_provisioned', message: 'No gateway URL — cannot invoke tool' } };
  }

  try {
    const body: Record<string, unknown> = { tool, args };
    if (action) body.action = action;

    const response = await fetch(`${gatewayUrl}/tools/invoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });

    return await response.json() as ToolInvokeResult;
  } catch (error) {
    return {
      ok: false,
      error: { type: 'network_error', message: String(error) },
    };
  }
}

/**
 * List available OpenClaw tools and their status.
 */
export const OPENCLAW_TOOLS = {
  // Web & Research
  web_search: { name: 'Web Search', icon: '🔍', category: 'research', description: 'Search the web with AI-powered results' },
  web_fetch: { name: 'Web Fetch', icon: '🌐', category: 'research', description: 'Fetch and extract content from any URL' },

  // Browser Automation
  browser: { name: 'Browser Control', icon: '🖥️', category: 'automation', description: 'Automated browser actions, screenshots, scraping' },

  // AI & Memory
  memory_search: { name: 'Memory Search', icon: '🧠', category: 'ai', description: 'Search through persistent AI memory' },
  memory_get: { name: 'Memory Read', icon: '📖', category: 'ai', description: 'Read specific memory entries' },
  sessions_spawn: { name: 'Sub-Agent', icon: '🤖', category: 'ai', description: 'Spawn an autonomous sub-agent for tasks' },

  // Scheduling
  cron: { name: 'Scheduler', icon: '⏰', category: 'automation', description: 'Create scheduled tasks and reminders' },

  // Communication
  tts: { name: 'Text-to-Speech', icon: '🔊', category: 'communication', description: 'Convert text to natural speech audio' },
  message: { name: 'Messaging', icon: '💬', category: 'communication', description: 'Send messages across channels' },

  // Sessions & Management
  sessions_list: { name: 'Sessions', icon: '📋', category: 'management', description: 'List active AI sessions' },
  sessions_history: { name: 'History', icon: '📜', category: 'management', description: 'View conversation history' },
  sessions_send: { name: 'Session Send', icon: '📤', category: 'management', description: 'Send message to another session' },
  agents_list: { name: 'Agents', icon: '👥', category: 'management', description: 'List available AI agents' },
  subagents: { name: 'Sub-Agents', icon: '🔄', category: 'management', description: 'Manage running sub-agents' },

  // Infrastructure
  nodes: { name: 'Nodes', icon: '📱', category: 'infrastructure', description: 'Paired device management' },
  canvas: { name: 'Canvas', icon: '🎨', category: 'infrastructure', description: 'Visual canvas rendering' },
} as const;

export type OpenClawToolName = keyof typeof OPENCLAW_TOOLS;

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
