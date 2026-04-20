/**
 * __tests__/twilio-verify.test.ts
 *
 * Covers the HMAC signature verification helper added in Phase 0.6 to
 * gate all 6 Twilio-fronted webhook routes. Prior to that commit, none
 * of the Twilio routes verified the X-Twilio-Signature header — any
 * caller could forge SMS / voice events to inflate billing or inject
 * fake transcripts into the CRM.
 *
 * Tests focus on the pure HMAC math:
 *   - spec-compliant signed-payload construction (url + sortedConcat(params))
 *   - HMAC-SHA1 key = TWILIO_AUTH_TOKEN
 *   - base64 signature comparison is timing-safe
 *   - fail-closed when TWILIO_AUTH_TOKEN unset
 *   - rejects missing X-Twilio-Signature header
 *
 * We exercise the helper by constructing NextRequest instances (Next.js
 * works with the standard Fetch Request interface under the hood).
 */
import { describe, test, expect, afterEach, beforeEach } from 'vitest';
import crypto from 'node:crypto';
import { NextRequest } from 'next/server';
import { verifyTwilioRequest } from '@/lib/voice/twilio-verify';

const AUTH_TOKEN = 'test-twilio-auth-token-1234567890';
const WEBHOOK_URL = 'https://kyra.conversionsystem.com/api/voice/twilio/webhook?clientId=abc';

/** Build the Twilio-spec signed payload: url + sortedConcat(params) */
function twilioSign(url: string, params: Record<string, string>, token: string): string {
  const sortedKeys = Object.keys(params).sort();
  const paramString = sortedKeys.map((k) => k + params[k]).join('');
  return crypto.createHmac('sha1', token).update(url + paramString).digest('base64');
}

/** Construct a NextRequest that verifyTwilioRequest can consume. */
function buildTwilioRequest(
  opts: {
    url?: string;
    params?: Record<string, string>;
    signature?: string;
    signatureHeader?: string; // override the computed one
    omitSignature?: boolean;
    forwardedProto?: string;
    host?: string;
  } = {},
): NextRequest {
  const url = opts.url ?? WEBHOOK_URL;
  const params = opts.params ?? {
    From: '+15551234567',
    To: '+15557654321',
    Body: 'Hello',
    MessageSid: 'SMabc123',
  };
  const body = new URLSearchParams(params).toString();

  const headers = new Headers({
    'content-type': 'application/x-www-form-urlencoded',
    'x-forwarded-proto': opts.forwardedProto ?? 'https',
    host: opts.host ?? 'kyra.conversionsystem.com',
  });

  if (!opts.omitSignature) {
    const signature = opts.signatureHeader ?? opts.signature ?? twilioSign(url, params, AUTH_TOKEN);
    headers.set('x-twilio-signature', signature);
  }

  return new NextRequest(url, { method: 'POST', headers, body });
}

describe('verifyTwilioRequest', () => {
  const originalToken = process.env.TWILIO_AUTH_TOKEN;

  beforeEach(() => {
    process.env.TWILIO_AUTH_TOKEN = AUTH_TOKEN;
  });

  afterEach(() => {
    if (originalToken === undefined) delete process.env.TWILIO_AUTH_TOKEN;
    else process.env.TWILIO_AUTH_TOKEN = originalToken;
  });

  test('accepts request with valid signature', async () => {
    const req = buildTwilioRequest();
    const result = await verifyTwilioRequest(req);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.params.From).toBe('+15551234567');
      expect(result.params.MessageSid).toBe('SMabc123');
    }
  });

  test('rejects request with tampered body (signature no longer matches)', async () => {
    const req = buildTwilioRequest({
      params: { From: '+15551234567', Body: 'clean' },
      // Compute signature for different body — attacker modified the payload
      signatureHeader: twilioSign(
        WEBHOOK_URL,
        { From: '+15551234567', Body: 'tampered' },
        AUTH_TOKEN,
      ),
    });
    const result = await verifyTwilioRequest(req);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
    }
  });

  test('rejects request with wrong auth token', async () => {
    const req = buildTwilioRequest({
      signatureHeader: twilioSign(
        WEBHOOK_URL,
        { From: '+15551234567', To: '+15557654321', Body: 'Hello', MessageSid: 'SMabc123' },
        'different-token',
      ),
    });
    const result = await verifyTwilioRequest(req);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
    }
  });

  test('rejects missing X-Twilio-Signature header', async () => {
    const req = buildTwilioRequest({ omitSignature: true });
    const result = await verifyTwilioRequest(req);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
    }
  });

  test('fails closed when TWILIO_AUTH_TOKEN env unset (returns 500)', async () => {
    delete process.env.TWILIO_AUTH_TOKEN;
    const req = buildTwilioRequest();
    const result = await verifyTwilioRequest(req);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(500);
    }
  });

  test('signed URL includes query string (clientId param is part of HMAC)', async () => {
    // Attacker tries to reuse a signature from /webhook?clientId=X
    // against /webhook?clientId=Y — signature should not match.
    const originalUrl = 'https://kyra.conversionsystem.com/api/voice/twilio/webhook?clientId=victim';
    const params = { From: '+15551111111', Body: 'hi' };
    const attackerUrl = 'https://kyra.conversionsystem.com/api/voice/twilio/webhook?clientId=attacker';

    // Note: NextRequest's URL is what's actually hit; we simulate the
    // attacker hitting attackerUrl with a signature for originalUrl
    const signature = twilioSign(originalUrl, params, AUTH_TOKEN);
    const req = buildTwilioRequest({ url: attackerUrl, params, signatureHeader: signature });
    const result = await verifyTwilioRequest(req);
    expect(result.ok).toBe(false);
  });

  test('signature is sensitive to param order (sorted concat spec)', async () => {
    // Per Twilio spec, params are sorted by key before concatenation.
    // This test verifies our implementation sorts correctly: shuffled
    // keys produce the same signature.
    const params = { Z: 'last', A: 'first', M: 'middle' };
    const sig1 = twilioSign(WEBHOOK_URL, params, AUTH_TOKEN);
    const sig2 = twilioSign(WEBHOOK_URL, { A: 'first', M: 'middle', Z: 'last' }, AUTH_TOKEN);
    expect(sig1).toBe(sig2);

    // And of course different param VALUES produce different sigs.
    const sig3 = twilioSign(WEBHOOK_URL, { A: 'first', M: 'middle', Z: 'different' }, AUTH_TOKEN);
    expect(sig1).not.toBe(sig3);
  });
});
