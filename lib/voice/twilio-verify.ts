/**
 * lib/voice/twilio-verify.ts
 *
 * Verifies that an inbound request actually came from Twilio.
 *
 * Twilio signs every webhook with HMAC-SHA1, base64-encoded, sent in the
 * `X-Twilio-Signature` header. Signed payload:
 *
 *   url + sortedConcat(params)
 *
 * where `url` is the FULL request URL (scheme://host/path?query) and
 * `sortedConcat(params)` is every POST form parameter, sorted alphabetically
 * by key, concatenated as key + value + key2 + value2 + ...
 *
 * For JSON-body webhooks (a minority; Twilio mostly uses form bodies), the
 * signature covers url + body string.
 *
 * Docs: https://www.twilio.com/docs/usage/webhooks/webhooks-security
 *
 * Usage:
 *
 *   import { verifyTwilioRequest } from '@/lib/voice/twilio-verify';
 *
 *   export async function POST(req: NextRequest) {
 *     const v = await verifyTwilioRequest(req);
 *     if (!v.ok) return v.response;
 *     // ...continue; v.params is the parsed form data (or v.body for JSON)
 *   }
 */

import crypto from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';

export type TwilioVerifySuccess = {
  ok: true;
  /** Parsed form params if Content-Type was form-encoded. */
  params: Record<string, string>;
  /** Raw body string (useful for JSON-mode verification or logging). */
  rawBody: string;
};

export type TwilioVerifyFailure = {
  ok: false;
  response: NextResponse;
};

export type TwilioVerifyResult = TwilioVerifySuccess | TwilioVerifyFailure;

function computeExpectedSignature(url: string, params: Record<string, string>, authToken: string): string {
  // Twilio spec: sort params alphabetically, concat key+value as one string
  const sortedKeys = Object.keys(params).sort();
  const paramString = sortedKeys.map((k) => k + params[k]).join('');
  const data = url + paramString;
  return crypto.createHmac('sha1', authToken).update(data).digest('base64');
}

/**
 * Reconstruct the URL Twilio used when signing. Next.js behind Vercel gives
 * us the right scheme via x-forwarded-proto; host from Host header. Query
 * string MUST be included.
 */
function reconstructUrl(req: NextRequest): string {
  const forwardedProto = req.headers.get('x-forwarded-proto');
  const host = req.headers.get('host') ?? new URL(req.url).host;
  const proto = forwardedProto ?? 'https';
  const pathWithQuery = req.nextUrl.pathname + req.nextUrl.search;
  return `${proto}://${host}${pathWithQuery}`;
}

export async function verifyTwilioRequest(req: NextRequest): Promise<TwilioVerifyResult> {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    console.error('[twilio-verify] TWILIO_AUTH_TOKEN not configured — fail-closed');
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Twilio webhook verification is not configured' },
        { status: 500 },
      ),
    };
  }

  const receivedSignature = req.headers.get('x-twilio-signature');
  if (!receivedSignature) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Missing X-Twilio-Signature header' }, { status: 401 }),
    };
  }

  const rawBody = await req.text();
  const url = reconstructUrl(req);

  // Parse body as form-urlencoded (Twilio default)
  const params: Record<string, string> = {};
  const contentType = req.headers.get('content-type') ?? '';

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const parsed = new URLSearchParams(rawBody);
    for (const [k, v] of parsed.entries()) {
      params[k] = v;
    }
  }
  // For JSON bodies, params stays empty — signed payload is just `url + rawBody`.

  const expected = computeExpectedSignature(url, params, authToken);

  // Timing-safe base64 comparison
  const expectedBuf = Buffer.from(expected, 'base64');
  const receivedBuf = Buffer.from(receivedSignature, 'base64');
  let ok = false;
  if (expectedBuf.length === receivedBuf.length) {
    try {
      ok = crypto.timingSafeEqual(expectedBuf, receivedBuf);
    } catch {
      ok = false;
    }
  }

  // Retry with JSON-body mode if form-mode fails (Twilio Studio sometimes posts JSON)
  if (!ok && !contentType.includes('application/x-www-form-urlencoded')) {
    const jsonSig = crypto.createHmac('sha1', authToken).update(url + rawBody).digest('base64');
    const jsonBuf = Buffer.from(jsonSig, 'base64');
    if (jsonBuf.length === receivedBuf.length) {
      try {
        ok = crypto.timingSafeEqual(jsonBuf, receivedBuf);
      } catch {
        ok = false;
      }
    }
  }

  if (!ok) {
    console.warn('[twilio-verify] Signature mismatch', {
      urlSigned: url,
      paramCount: Object.keys(params).length,
    });
    return {
      ok: false,
      response: NextResponse.json({ error: 'Invalid Twilio signature' }, { status: 401 }),
    };
  }

  return { ok: true, params, rawBody };
}
