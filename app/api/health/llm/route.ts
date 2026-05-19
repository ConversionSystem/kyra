// ============================================================================
// GET /api/health/llm
//
// Admin-only LLM provider health check. Pings each configured provider
// (OpenRouter, OpenAI) with a minimal completion and reports back ok/latency/
// error so an operator can spot a dead key without grepping Vercel logs.
//
// Why this exists: the 2026-05-18 widget outage was caused by both LLM keys
// failing silently in production — OpenRouter returned 401 "User not found"
// (account/key revoked) and the OpenAI fallback had a literal `\n` glued to
// it by `echo "value" | vercel env add`. Neither failure surfaced anywhere
// the operator looked; the only symptom was a polite canned reply on the
// widget that looked like a normal "we'll get back to you" message.
//
// This endpoint is the cheapest possible "are my keys working" probe. Hit it
// once after rotating credentials, or wire a cron alert against it (response
// shape is stable, `summary.ok=false` flags a failure with `firstError`).
//
// Auth: requireAdmin — the response includes provider error messages that
// can leak account state; only ADMIN_EMAILS (which includes MASTER_EMAILS)
// can call it. Never exposes the API keys themselves.
// ============================================================================

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin';
import { pingProvider, type ProviderHealth } from '@/lib/chat/core';

export const dynamic = 'force-dynamic';
// Allow up to 20s — two 8s provider timeouts in parallel plus margin.
export const maxDuration = 20;

interface LLMHealthResponse {
  openrouter: ProviderHealth;
  openai: ProviderHealth;
  summary: {
    ok: boolean;
    configuredCount: number;
    healthyCount: number;
    /** First error message encountered, surfaced so a cron alert can route on it. */
    firstError: string | null;
  };
  checkedAt: string;
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  // Run both pings in parallel — neither blocks the other, and one bad key
  // shouldn't double the total response time. pingProvider never throws.
  const [openrouter, openai] = await Promise.all([
    pingProvider('openrouter'),
    pingProvider('openai'),
  ]);

  const providers: ProviderHealth[] = [openrouter, openai];
  const configured = providers.filter(p => p.configured);
  const healthy = configured.filter(p => p.ok);
  const firstFailure = configured.find(p => !p.ok);

  const body: LLMHealthResponse = {
    openrouter,
    openai,
    summary: {
      // ok=true only when AT LEAST one configured provider is healthy. Zero
      // providers configured is NOT ok (the widget would have nothing to
      // call); both configured but one down is OK (failover covers it).
      ok: healthy.length > 0,
      configuredCount: configured.length,
      healthyCount: healthy.length,
      firstError: firstFailure?.error ?? null,
    },
    checkedAt: new Date().toISOString(),
  };

  // Return 200 even on partial failure so a cron parser can read the body;
  // surface 503 only when EVERY configured provider is down (no path for
  // chat to complete). Lets simple `curl --fail` checks alert correctly.
  const status = body.summary.ok ? 200 : 503;
  return NextResponse.json(body, { status });
}
