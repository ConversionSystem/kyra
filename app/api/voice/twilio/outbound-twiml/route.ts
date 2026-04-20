/**
 * POST /api/voice/twilio/outbound-twiml?clientId=XXX
 *
 * Twilio fetches this when Kyra makes an outbound call.
 * Returns TwiML to greet the customer and start the AI conversation.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { verifyTwilioRequest } from '@/lib/voice/twilio-verify';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function twiml(xml: string) {
  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?><Response>${xml}</Response>`,
    { headers: { 'Content-Type': 'text/xml' } },
  );
}

export async function POST(req: NextRequest) {
  const verified = await verifyTwilioRequest(req);
  if (!verified.ok) return verified.response;

  const clientId = req.nextUrl.searchParams.get('clientId');
  if (!clientId) return twiml('<Hangup/>');

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

  return twiml(`
    <Gather input="speech" timeout="4" speechTimeout="auto" action="${gatherUrl}" method="POST" language="en-US">
      <Say voice="Polly.Joanna-Neural">Hi, this is ${aiName} calling from ${businessName}. I'm reaching out to follow up — do you have a moment?</Say>
    </Gather>
    <Say voice="Polly.Joanna-Neural">I'll try calling back at a better time. Goodbye!</Say>
    <Hangup/>
  `);
}

export async function GET(req: NextRequest) {
  return POST(req);
}
