// ============================================================================
// POST /api/agency/api-keys/test
//
// Makes a real test completion call to verify a provider's API key works.
// Returns { ok: true, model, latencyMs } or { ok: false, error }
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { DEFAULT_MODEL_ID } from '@/lib/agency/ai-models';

const VALID_PROVIDERS = ['anthropic', 'openai', 'google', 'openrouter'] as const;
type Provider = typeof VALID_PROVIDERS[number];

const TEST_PROMPT = 'Reply with only the word: CONNECTED';

// ── Test functions per provider ───────────────────────────────────────────────

async function testAnthropic(apiKey: string, modelId: string): Promise<{ ok: boolean; model?: string; error?: string }> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: modelId,
      max_tokens: 10,
      messages: [{ role: 'user', content: TEST_PROMPT }],
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { ok: false, error: data?.error?.message || `HTTP ${res.status}` };
  }

  return { ok: true, model: modelId };
}

async function testOpenAI(apiKey: string, modelId: string): Promise<{ ok: boolean; model?: string; error?: string }> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelId,
      max_tokens: 10,
      messages: [{ role: 'user', content: TEST_PROMPT }],
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { ok: false, error: data?.error?.message || `HTTP ${res.status}` };
  }

  return { ok: true, model: modelId };
}

async function testOpenRouter(apiKey: string, modelId: string): Promise<{ ok: boolean; model?: string; error?: string }> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://kyra.conversionsystem.com',
      'X-Title': 'Kyra',
    },
    body: JSON.stringify({
      model: modelId,
      max_tokens: 10,
      messages: [{ role: 'user', content: TEST_PROMPT }],
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { ok: false, error: data?.error?.message || `HTTP ${res.status}` };
  }

  return { ok: true, model: modelId };
}

async function testGoogle(apiKey: string, modelId: string): Promise<{ ok: boolean; model?: string; error?: string }> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: TEST_PROMPT }] }],
        generationConfig: { maxOutputTokens: 10 },
      }),
      signal: AbortSignal.timeout(15_000),
    }
  );

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { ok: false, error: data?.error?.message || `HTTP ${res.status}` };
  }

  return { ok: true, model: modelId };
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: member } = await supabase
    .from('agency_members')
    .select('agency_id')
    .eq('user_id', user.id)
    .single();

  if (!member) return NextResponse.json({ error: 'No agency found' }, { status: 404 });

  let body: { provider?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const provider = body.provider as Provider;
  if (!provider || !VALID_PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
  }

  // Fetch the actual API key from Supabase (never expose to client)
  const serviceClient = createServiceClientWithoutCookies();
  const { data: agency } = await serviceClient
    .from('agencies')
    .select('api_keys')
    .eq('id', member.agency_id)
    .single();

  const apiKeys = (agency?.api_keys as Record<string, unknown>) || {};
  const apiKey = apiKeys[provider] as string | undefined;
  const selectedModels = (apiKeys.selected_models as Record<string, string>) || {};
  const modelId = selectedModels[provider] || DEFAULT_MODEL_ID[provider] || 'gpt-4o-mini';

  if (!apiKey) {
    return NextResponse.json({ ok: false, error: 'No key saved for this provider' });
  }

  const start = Date.now();

  let result: { ok: boolean; model?: string; error?: string };
  try {
    switch (provider) {
      case 'anthropic':
        result = await testAnthropic(apiKey, modelId);
        break;
      case 'openai':
        result = await testOpenAI(apiKey, modelId);
        break;
      case 'openrouter':
        result = await testOpenRouter(apiKey, modelId);
        break;
      case 'google':
        result = await testGoogle(apiKey, modelId);
        break;
      default:
        result = { ok: false, error: 'Unknown provider' };
    }
  } catch (err) {
    result = {
      ok: false,
      error: err instanceof Error
        ? (err.name === 'TimeoutError' ? 'Request timed out (15s)' : err.message)
        : 'Unknown error',
    };
  }

  const latencyMs = Date.now() - start;

  return NextResponse.json({ ...result, latencyMs });
}
