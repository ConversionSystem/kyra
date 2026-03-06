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
  const { data: client } = await supabase
    .from('agency_clients')
    .select('name, container_config')
    .eq('id', clientId)
    .single();

  const cfg = (client?.container_config as Record<string, unknown>) ?? {};
  const voiceCfg = (cfg.voice_config as Record<string, unknown>) ?? {};
  const aiName = (voiceCfg.aiName as string) ?? 'Alex';
  const businessName = client?.name ?? 'us';

  const gatherUrl = `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, '')}/api/voice/twilio/gather?clientId=${clientId}`;

  // Greet + start gathering speech
  return twiml(`
    <Gather input="speech" timeout="4" speechTimeout="auto" action="${gatherUrl}" method="POST" language="en-US">
      <Say voice="Polly.Joanna-Neural">Hi, thanks for calling ${businessName}! This is ${aiName}, your AI assistant. How can I help you today?</Say>
    </Gather>
    <Say voice="Polly.Joanna-Neural">I didn't catch that. Please call back if you need assistance. Goodbye!</Say>
    <Hangup/>
  `);
}

export async function GET(req: NextRequest) {
  // Twilio sometimes sends GET for status callbacks
  return POST(req);
}
