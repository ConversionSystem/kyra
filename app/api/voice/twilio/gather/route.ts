/**
 * POST /api/voice/twilio/gather?clientId=XXX&turn=N
 *
 * Receives Twilio speech transcription, runs it through the client's AI worker,
 * and returns TwiML with the AI's spoken response + another <Gather> for the next turn.
 *
 * Twilio sends: SpeechResult (transcribed speech), CallSid, From, etc.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { resolveClientGateway } from '@/lib/ovh/provisioner';
import { deductCredits, requireCredits } from '@/lib/billing/credit-engine';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// In-memory call history (keyed by CallSid). Resets on cold start — acceptable for voice.
const callHistory = new Map<string, Array<{ role: 'user' | 'assistant'; content: string }>>();

function twiml(xml: string) {
  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?><Response>${xml}</Response>`,
    { headers: { 'Content-Type': 'text/xml' } },
  );
}

function sanitizeForTwiml(text: string): string {
  // Remove markdown, emoji chains, and XML-unsafe chars from AI responses
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/#{1,6}\s/g, '')
    .trim()
    .slice(0, 500); // keep responses concise for voice
}

function isGoodbyeIntent(text: string): boolean {
  const lower = text.toLowerCase();
  return /\b(goodbye|bye|that'?s all|no more|hang up|nothing else|i'?m done|thank you goodbye)\b/.test(lower);
}

export async function POST(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get('clientId');
  if (!clientId) return twiml('<Say>Configuration error.</Say><Hangup/>');

  // Parse Twilio form body
  const body = await req.formData();
  const speechResult = body.get('SpeechResult')?.toString() ?? '';
  const callSid = body.get('CallSid')?.toString() ?? 'unknown';
  const callerNumber = body.get('From')?.toString() ?? 'unknown';

  if (!speechResult.trim()) {
    // No speech detected — prompt again
    const gatherUrl = `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, '')}/api/voice/twilio/gather?clientId=${clientId}`;
    return twiml(`
      <Gather input="speech" timeout="4" speechTimeout="auto" action="${gatherUrl}" method="POST" language="en-US">
        <Say voice="Polly.Joanna-Neural">Sorry, I didn't catch that. Could you repeat?</Say>
      </Gather>
      <Hangup/>
    `);
  }

  // Load client
  const supabase = createServiceClientWithoutCookies();
  const { data: client } = await supabase
    .from('agency_clients')
    .select('id, name, container_config, agency_id')
    .eq('id', clientId)
    .single();

  if (!client) return twiml('<Say>Sorry, service not found.</Say><Hangup/>');

  const cfg = (client.container_config as Record<string, unknown>) ?? {};
  const voiceCfg = (cfg.voice_config as Record<string, unknown>) ?? {};
  const aiName = (voiceCfg.aiName as string) ?? 'Alex';
  const persona = (cfg.persona as string) ?? `You are ${aiName}, an AI assistant for ${client.name}.`;
  const language = (voiceCfg.language as string) ?? 'en-US';

  // Build system prompt for voice context
  const systemPrompt = `${persona}

IMPORTANT VOICE RULES:
- You are on a PHONE CALL. Keep responses short — max 2 sentences.
- No bullet points, no markdown, no lists. Speak naturally.
- If you need to share a URL or number, say it digit by digit or spell it out.
- End naturally; don't say "Is there anything else?" every turn — only ask once.
- Caller's phone: ${callerNumber}
- Business: ${client.name}

${cfg.services ? `Services: ${cfg.services}` : ''}
${cfg.hours ? `Hours: ${cfg.hours}` : ''}
${cfg.booking_url ? `Booking: ${cfg.booking_url}` : ''}`.trim();

  // Retrieve or initialize call history
  const history = callHistory.get(callSid) ?? [];
  history.push({ role: 'user', content: speechResult });

  // Credit check
  const creditCheck = await requireCredits(client.agency_id, 'channel.voice_call');
  if (!creditCheck.allowed) {
    return twiml('<Say voice="Polly.Joanna-Neural">I\'m sorry, service is temporarily unavailable. Please call back later. Goodbye!</Say><Hangup/>');
  }

  // Call AI via OpenClaw gateway
  let aiResponse = '';
  try {
    const gateway = await resolveClientGateway(clientId);
    if (!gateway) throw new Error('Gateway unavailable');

    const aiRes = await fetch(`${gateway.url}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${gateway.token}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...history.slice(-8), // last 8 turns for context
        ],
        temperature: 0.7,
        max_tokens: 120,
      }),
    });

    if (aiRes.ok) {
      const data = await aiRes.json();
      aiResponse = data.choices?.[0]?.message?.content ?? '';
    }
  } catch (err) {
    console.error('[voice/twilio/gather] AI error:', err);
  }

  if (!aiResponse) {
    aiResponse = `I'm sorry, I'm having trouble right now. Please try again or call back shortly.`;
  }

  // Update history
  history.push({ role: 'assistant', content: aiResponse });
  callHistory.set(callSid, history.slice(-20)); // keep last 20 turns in memory

  // Deduct credits
  void deductCredits(client.agency_id, 'channel.voice_call');

  // Log conversation to Supabase
  supabase.from('voice_call_logs').upsert({
    client_id: clientId,
    call_sid: callSid,
    caller_number: callerNumber,
    turns: history.length / 2,
    last_user_message: speechResult,
    last_ai_response: aiResponse,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'call_sid' });

  const safeResponse = sanitizeForTwiml(aiResponse);

  // Detect goodbye to hang up gracefully
  if (isGoodbyeIntent(aiResponse) || isGoodbyeIntent(speechResult)) {
    callHistory.delete(callSid);
    return twiml(`<Say voice="Polly.Joanna-Neural">${safeResponse}</Say><Hangup/>`);
  }

  const gatherUrl = `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, '')}/api/voice/twilio/gather?clientId=${clientId}`;

  // Respond and listen for next turn
  return twiml(`
    <Say voice="Polly.Joanna-Neural">${safeResponse}</Say>
    <Gather input="speech" timeout="4" speechTimeout="auto" action="${gatherUrl}" method="POST" language="${language}">
    </Gather>
    <Hangup/>
  `);
}
