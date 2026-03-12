/**
 * POST /api/voice/twilio/webhook?clientId=XXX
 *
 * Twilio calls this URL when a customer dials the Kyra Native phone number.
 * Returns TwiML: greet the caller then start speech gathering.
 *
 * Call flow:
 * 1. Twilio hits this endpoint → TwiML with AI greeting + <Gather>
 * 2. Caller speaks → Twilio sends transcription to /gather
 * 3. /gather runs AI → returns TwiML with <Say response> + <Gather>
 * 4. Loop until caller hangs up or AI says goodbye
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

// Shared voice map — must match gather/route.ts
const POLLY_VOICE_MAP: Record<string, string> = {
  default: 'Polly.Matthew-Neural',
  alex:    'Polly.Matthew-Neural',
  sarah:   'Polly.Joanna-Neural',
  james:   'Polly.Brian-Neural',
  emma:    'Polly.Emma-Neural',
  liam:    'Polly.Russell-Neural',
  sofia:   'Polly.Lupe-Neural',
};
function getPollyVoice(voiceId?: string): string {
  return POLLY_VOICE_MAP[voiceId?.toLowerCase() ?? 'default'] ?? 'Polly.Matthew-Neural';
}

export const dynamic = 'force-dynamic';

function twiml(xml: string) {
  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?><Response>${xml}</Response>`,
    { headers: { 'Content-Type': 'text/xml' } },
  );
}

export async function POST(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get('clientId');
  if (!clientId) return twiml('<Say>Sorry, this number is not configured.</Say><Hangup/>');

  // Load client config to get AI name
  const supabase = createServiceClientWithoutCookies();
  const { data: clientRow } = await supabase
    .from('agency_clients')
    .select('name, container_config')
    .eq('id', clientId)
    .single();

  // Fallback to agencies table for agency-level voice
  let cfg: Record<string, unknown> = (clientRow?.container_config as Record<string, unknown>) ?? {};
  let clientName = clientRow?.name;
  if (!clientRow) {
    const { data: agencyRow } = await supabase
      .from('agencies')
      .select('name, settings')
      .eq('id', clientId)
      .single();
    if (agencyRow) {
      clientName = agencyRow.name;
      cfg = (agencyRow.settings as Record<string, unknown>) ?? {};
    }
  }

  const voiceCfg = (cfg.voice_config as Record<string, unknown>) ?? {};
  const aiName = (voiceCfg.aiName as string) ?? 'Alex';
  const businessName = clientName ?? 'us';
  const pollyVoice = getPollyVoice(voiceCfg.voiceId as string | undefined);
  const language = (voiceCfg.language as string) ?? 'en-US';

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, '') ?? '';
  const gatherUrl = `${appUrl}/api/voice/twilio/gather?clientId=${clientId}`;
  const recordingCallback = `${appUrl}/api/voice/recording-status?clientId=${clientId}`;

  // Greet + start gathering speech + record the full call
  return twiml(`
    <Gather input="speech" timeout="4" speechTimeout="auto" action="${gatherUrl}" method="POST" language="${language}">
      <Say voice="${pollyVoice}">Hi, thanks for calling ${businessName}! This is ${aiName}, your AI assistant. How can I help you today?</Say>
    </Gather>
    <Record maxLength="600" recordingStatusCallback="${recordingCallback}" recordingStatusCallbackMethod="POST" />
    <Say voice="${pollyVoice}">I didn't catch that. Please call back if you need assistance. Goodbye!</Say>
    <Hangup/>
  `);
}

export async function GET(req: NextRequest) {
  // Twilio sometimes sends GET for status callbacks
  return POST(req);
}
