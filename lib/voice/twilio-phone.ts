/**
 * Twilio REST API helpers — no SDK, pure fetch.
 * Used by Kyra Native to provision real phone numbers for voice AI.
 *
 * Env vars required:
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 */

const BASE = 'https://api.twilio.com/2010-04-01';

function auth(): string {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) throw new Error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are required');
  return 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64');
}

function accountSid(): string {
  return process.env.TWILIO_ACCOUNT_SID!;
}

async function twilioFetch(path: string, options: RequestInit = {}) {
  const url = path.startsWith('http') ? path : `${BASE}/Accounts/${accountSid()}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: auth(),
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Twilio ${res.status}: ${body}`);
  }
  return res.json();
}

export function hasTwilioCredentials(): boolean {
  return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
}

// ── Phone number search ───────────────────────────────────────────────────────

export async function searchAvailableNumbers(areaCode?: string): Promise<string | null> {
  const params = new URLSearchParams({ Limit: '1' });
  if (areaCode) params.set('AreaCode', areaCode);
  try {
    const data = await twilioFetch(
      `/AvailablePhoneNumbers/US/Local.json?${params}`,
    );
    return data.available_phone_numbers?.[0]?.phone_number ?? null;
  } catch {
    return null;
  }
}

// ── Purchase a phone number ───────────────────────────────────────────────────

export interface PurchasedNumber {
  sid: string;           // Twilio SID (e.g. PN...)
  phoneNumber: string;   // E.164 e.g. +14155551234
}

export async function purchasePhoneNumber(
  phoneNumber: string,
  voiceWebhookUrl: string,
): Promise<PurchasedNumber> {
  const body = new URLSearchParams({
    PhoneNumber: phoneNumber,
    VoiceUrl: voiceWebhookUrl,
    VoiceMethod: 'POST',
  });
  const data = await twilioFetch('/IncomingPhoneNumbers.json', {
    method: 'POST',
    body: body.toString(),
  });
  return { sid: data.sid, phoneNumber: data.phone_number };
}

// ── Release / cancel a number ─────────────────────────────────────────────────

export async function releasePhoneNumber(sid: string): Promise<void> {
  await fetch(`${BASE}/Accounts/${accountSid()}/IncomingPhoneNumbers/${sid}.json`, {
    method: 'DELETE',
    headers: { Authorization: auth() },
  });
}

// ── Outbound call ─────────────────────────────────────────────────────────────

export async function makeOutboundCall(opts: {
  to: string;
  from: string;
  twimlUrl: string;
}): Promise<{ callSid: string }> {
  const body = new URLSearchParams({
    To: opts.to,
    From: opts.from,
    Url: opts.twimlUrl,
    Method: 'POST',
  });
  const data = await twilioFetch('/Calls.json', {
    method: 'POST',
    body: body.toString(),
  });
  return { callSid: data.sid };
}

// ── Update webhook on an existing number ─────────────────────────────────────

export async function updateNumberWebhook(sid: string, voiceWebhookUrl: string): Promise<void> {
  const body = new URLSearchParams({ VoiceUrl: voiceWebhookUrl, VoiceMethod: 'POST' });
  await twilioFetch(`/IncomingPhoneNumbers/${sid}.json`, {
    method: 'POST',
    body: body.toString(),
  });
}
