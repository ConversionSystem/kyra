/**
 * Direct LLM calls for function calling (tools).
 * 
 * OpenClaw's /v1/chat/completions proxy doesn't forward the `tools` parameter
 * to the underlying LLM, so tool-enabled conversations must call OpenAI directly.
 * 
 * This module resolves the API key for a client (BYOK or platform default)
 * and makes direct OpenAI-compatible calls with function calling support.
 */

import { resolveAgencyApiKey } from '@/lib/billing/byok';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

interface LLMMessage {
  role: string;
  content: string | Array<{ type: string; text: string; cache_control?: { type: string } }>;
  tool_call_id?: string;
  name?: string;
  tool_calls?: Array<{ id: string; type: string; function: { name: string; arguments: string } }>;
}

interface ToolDefinition {
  type: string;
  function: {
    name: string;
    description: string;
    parameters: unknown;
  };
}

interface ToolCall {
  name: string;
  args: Record<string, unknown>;
  id?: string;
}

export interface DirectLLMResult {
  reply: string;
  toolCalls?: ToolCall[];
  error?: string;
}

/**
 * Resolve API key + base URL for a client.
 * Priority: BYOK agency key → platform OpenAI key → OpenRouter key
 */
async function resolveApiConfig(
  agencyId: string,
  overrideApiKey?: string,
): Promise<{ apiKey: string; baseUrl: string; model: string } | null> {
  // If caller provides an API key directly
  if (overrideApiKey) {
    if (overrideApiKey.startsWith('sk-or-')) {
      return { apiKey: overrideApiKey, baseUrl: OPENROUTER_API_URL, model: 'openai/gpt-4o-mini' };
    }
    return { apiKey: overrideApiKey, baseUrl: OPENAI_API_URL, model: 'gpt-4o-mini' };
  }

  // Try BYOK
  try {
    const byok = await resolveAgencyApiKey(agencyId);
    if (byok?.apiKey) {
      if (byok.apiKey.startsWith('sk-or-')) {
        return { apiKey: byok.apiKey, baseUrl: OPENROUTER_API_URL, model: byok.model || 'openai/gpt-4o-mini' };
      }
      return { apiKey: byok.apiKey, baseUrl: OPENAI_API_URL, model: byok.model || 'gpt-4o-mini' };
    }
  } catch { /* no BYOK */ }

  // Platform keys
  if (process.env.OPENAI_API_KEY) {
    return { apiKey: process.env.OPENAI_API_KEY, baseUrl: OPENAI_API_URL, model: 'gpt-4o-mini' };
  }

  if (process.env.OPENROUTER_API_KEY) {
    return { apiKey: process.env.OPENROUTER_API_KEY, baseUrl: OPENROUTER_API_URL, model: 'openai/gpt-4o-mini' };
  }

  return null;
}

/**
 * Call LLM directly with function calling (tools) support.
 * Bypasses OpenClaw gateway because it doesn't forward tools parameter.
 */
export async function callLLMWithTools(options: {
  agencyId: string;
  messages: LLMMessage[];
  tools: ToolDefinition[];
  model?: string;
  apiKey?: string;
}): Promise<DirectLLMResult> {
  const config = await resolveApiConfig(options.agencyId, options.apiKey);
  if (!config) {
    return { reply: '', error: 'No API key available' };
  }

  const model = options.model || config.model;

  const requestBody: Record<string, unknown> = {
    model,
    messages: options.messages,
    stream: false,
  };

  if (options.tools.length > 0) {
    requestBody.tools = options.tools;
    requestBody.tool_choice = 'auto';
  }

  try {
    const res = await fetch(config.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }));
      return { reply: '', error: err?.error?.message || `LLM returned ${res.status}` };
    }

    const data = await res.json();
    const choice = data?.choices?.[0];
    const reply = choice?.message?.content || '';

    // Extract tool calls
    const toolCalls = choice?.message?.tool_calls;
    if (toolCalls && toolCalls.length > 0) {
      const calls: ToolCall[] = toolCalls.map((tc: { id: string; function: { name: string; arguments: string } }) => ({
        name: tc.function.name,
        args: JSON.parse(tc.function.arguments || '{}'),
        id: tc.id,
      }));
      return { reply, toolCalls: calls };
    }

    return { reply };
  } catch (err) {
    return { reply: '', error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
