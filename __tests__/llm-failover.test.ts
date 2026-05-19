/**
 * __tests__/llm-failover.test.ts
 *
 * Covers the OpenRouter→OpenAI auth-error failover added after the
 * 2026-05-18 outage. Pins the contract:
 *
 *   - Happy path: primary returns, no failover, meta says so.
 *   - 401 on OpenRouter: transparently fails over to OpenAI with the
 *     remapped LLM_FALLBACK_MODEL; meta.failedOver=true + reason set.
 *   - "User not found" (the exact production-outage signature) is
 *     classified as openrouter_user_not_found.
 *   - Non-auth errors (timeouts, 5xx, model not found) propagate WITHOUT
 *     a failover attempt — failover would mask the real problem.
 *   - Without OPENROUTER_API_KEY, the primary IS OpenAI; no failover
 *     happens even on auth error (no second key to try).
 *   - Without OPENAI_API_KEY (no fallback configured), an OpenRouter
 *     auth error propagates instead of crashing.
 *   - isAuthError correctly classifies common shapes.
 */
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import OpenAI from 'openai';
import {
  createChatCompletionWithFailover,
  isAuthError,
} from '@/lib/chat/core';

type CreateArgs = { model: string; messages: unknown; stream?: boolean };

function fakeClient(impl: (args: CreateArgs) => unknown): OpenAI {
  // The helper only touches client.chat.completions.create — a minimal
  // duck-typed mock is enough and avoids dragging in the real SDK fetch.
  const create = vi.fn(async (args: CreateArgs) => impl(args));
  return { chat: { completions: { create } } } as unknown as OpenAI;
}

const ORIG_ENV = { ...process.env };

beforeEach(() => {
  process.env.OPENROUTER_API_KEY = 'sk-or-test';
  process.env.OPENAI_API_KEY = 'sk-test';
  // Pin the fallback model so the test doesn't rely on any deployment default.
  process.env.LLM_FALLBACK_MODEL = 'gpt-4o-mini';
});

afterEach(() => {
  process.env = { ...ORIG_ENV };
});

describe('isAuthError', () => {
  test('matches HTTP 401 status', () => {
    expect(isAuthError({ status: 401 })).toBe(true);
  });

  test('matches HTTP 403 status', () => {
    expect(isAuthError({ status: 403 })).toBe(true);
  });

  test('matches OpenRouter "User not found" body', () => {
    expect(isAuthError(new Error('User not found.'))).toBe(true);
  });

  test('matches OpenAI "Incorrect API key" body', () => {
    expect(isAuthError(new Error('Incorrect API key provided: sk-proj-…wA\\n'))).toBe(true);
  });

  test('does NOT match a 429 rate limit', () => {
    expect(isAuthError({ status: 429, message: 'rate limit exceeded' })).toBe(false);
  });

  test('does NOT match a 500', () => {
    expect(isAuthError({ status: 500, message: 'upstream error' })).toBe(false);
  });

  test('does NOT match a timeout', () => {
    const err = Object.assign(new Error('aborted'), { name: 'AbortError' });
    expect(isAuthError(err)).toBe(false);
  });

  test('handles null/undefined gracefully', () => {
    expect(isAuthError(null)).toBe(false);
    expect(isAuthError(undefined)).toBe(false);
    expect(isAuthError('just a string')).toBe(false);
  });
});

describe('createChatCompletionWithFailover — happy path', () => {
  test('returns primary result with provider=openrouter, no failover', async () => {
    const primary = fakeClient(() => ({
      choices: [{ message: { content: 'hi from openrouter' } }],
    }));
    const fallback = fakeClient(() => {
      throw new Error('fallback should not be called');
    });

    const { completion, meta } = await createChatCompletionWithFailover({
      model: 'anthropic/claude-sonnet-4.6',
      messages: [{ role: 'user', content: 'ping' }],
      __primaryClient: primary,
      __fallbackClient: fallback,
    });

    expect(meta.provider).toBe('openrouter');
    expect(meta.failedOver).toBe(false);
    expect(meta.modelUsed).toBe('anthropic/claude-sonnet-4.6');
    expect(meta.failoverReason).toBeUndefined();
    expect((completion as { choices: Array<{ message?: { content?: string } }> }).choices[0].message?.content).toBe('hi from openrouter');
  });
});

describe('createChatCompletionWithFailover — auth-error failover', () => {
  test('OpenRouter 401 → falls back to OpenAI with remapped model', async () => {
    const primary = fakeClient(() => {
      const err = Object.assign(new Error('User not found.'), { status: 401 });
      throw err;
    });
    const fallback = fakeClient((args) => {
      // Assertion lives INSIDE the mock so we catch a wrong model at the
      // boundary — not after the fact when the test could pass spuriously.
      expect(args.model).toBe('gpt-4o-mini'); // remapped from anthropic/...
      return { choices: [{ message: { content: 'recovered' } }] };
    });

    const { completion, meta } = await createChatCompletionWithFailover({
      model: 'anthropic/claude-sonnet-4.6',
      messages: [{ role: 'user', content: 'ping' }],
      __primaryClient: primary,
      __fallbackClient: fallback,
    });

    expect(meta.failedOver).toBe(true);
    expect(meta.provider).toBe('openai');
    expect(meta.modelUsed).toBe('gpt-4o-mini');
    expect(meta.failoverReason).toBe('openrouter_user_not_found');
    expect((completion as { choices: Array<{ message?: { content?: string } }> }).choices[0].message?.content).toBe('recovered');
  });

  test('Non-"User not found" 401 → reason=openrouter_401', async () => {
    const primary = fakeClient(() => {
      throw Object.assign(new Error('Unauthorized'), { status: 401 });
    });
    const fallback = fakeClient(() => ({
      choices: [{ message: { content: 'ok' } }],
    }));

    const { meta } = await createChatCompletionWithFailover({
      model: 'anthropic/claude-sonnet-4.6',
      messages: [{ role: 'user', content: 'ping' }],
      __primaryClient: primary,
      __fallbackClient: fallback,
    });

    expect(meta.failoverReason).toBe('openrouter_401');
  });

  test('LLM_FALLBACK_MODEL env override is respected', async () => {
    process.env.LLM_FALLBACK_MODEL = 'gpt-4o';
    const primary = fakeClient(() => {
      throw Object.assign(new Error('User not found.'), { status: 401 });
    });
    const fallback = fakeClient((args) => {
      expect(args.model).toBe('gpt-4o');
      return { choices: [{ message: { content: 'ok' } }] };
    });

    const { meta } = await createChatCompletionWithFailover({
      model: 'anthropic/claude-sonnet-4.6',
      messages: [{ role: 'user', content: 'ping' }],
      __primaryClient: primary,
      __fallbackClient: fallback,
    });

    expect(meta.modelUsed).toBe('gpt-4o');
  });
});

describe('createChatCompletionWithFailover — non-auth errors do NOT fail over', () => {
  test('Timeout propagates unchanged (no fallback attempt)', async () => {
    const primary = fakeClient(() => {
      throw Object.assign(new Error('aborted'), { name: 'AbortError' });
    });
    const fallback = fakeClient(() => {
      throw new Error('fallback should not be called on timeout');
    });

    await expect(
      createChatCompletionWithFailover({
        model: 'anthropic/claude-sonnet-4.6',
        messages: [{ role: 'user', content: 'ping' }],
        __primaryClient: primary,
        __fallbackClient: fallback,
      }),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });

  test('429 rate limit propagates (no fallback)', async () => {
    const primary = fakeClient(() => {
      throw Object.assign(new Error('rate limit exceeded'), { status: 429 });
    });
    const fallback = fakeClient(() => {
      throw new Error('fallback should not be called on 429');
    });

    await expect(
      createChatCompletionWithFailover({
        model: 'anthropic/claude-sonnet-4.6',
        messages: [{ role: 'user', content: 'ping' }],
        __primaryClient: primary,
        __fallbackClient: fallback,
      }),
    ).rejects.toMatchObject({ status: 429 });
  });

  test('5xx upstream error propagates (no fallback)', async () => {
    const primary = fakeClient(() => {
      throw Object.assign(new Error('upstream error'), { status: 502 });
    });
    const fallback = fakeClient(() => {
      throw new Error('fallback should not be called on 5xx');
    });

    await expect(
      createChatCompletionWithFailover({
        model: 'anthropic/claude-sonnet-4.6',
        messages: [{ role: 'user', content: 'ping' }],
        __primaryClient: primary,
        __fallbackClient: fallback,
      }),
    ).rejects.toMatchObject({ status: 502 });
  });
});

describe('createChatCompletionWithFailover — env-driven primary selection', () => {
  test('No OPENROUTER_API_KEY → primary IS OpenAI; auth error does NOT fail over to itself', async () => {
    delete process.env.OPENROUTER_API_KEY;
    const primary = fakeClient(() => {
      throw Object.assign(new Error('Incorrect API key'), { status: 401 });
    });
    const fallback = fakeClient(() => {
      throw new Error('there is no second provider to try');
    });

    await expect(
      createChatCompletionWithFailover({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'ping' }],
        __primaryClient: primary,
        __fallbackClient: fallback,
      }),
    ).rejects.toMatchObject({ status: 401 });
  });

  test('OpenRouter primary but no OPENAI_API_KEY → auth error propagates (cannot fall back to nothing)', async () => {
    delete process.env.OPENAI_API_KEY;
    const primary = fakeClient(() => {
      throw Object.assign(new Error('User not found.'), { status: 401 });
    });

    await expect(
      createChatCompletionWithFailover({
        model: 'anthropic/claude-sonnet-4.6',
        messages: [{ role: 'user', content: 'ping' }],
        __primaryClient: primary,
      }),
    ).rejects.toMatchObject({ status: 401 });
  });
});
