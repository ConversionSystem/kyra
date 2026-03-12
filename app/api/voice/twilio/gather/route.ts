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
import { deductCredits, requireCredits } from '@/lib/billing/credit-engine';

// Cache client config per clientId — avoids repeated Supabase queries mid-call
// TTL 5 min — fast enough to pick up config changes without DB hit every turn
const clientConfigCache = new Map<string, { ts: number; data: ClientVoiceConfig }>();
const CONFIG_TTL_MS = 5 * 60 * 1000;

interface ClientVoiceConfig {
  name: string;
  agency_id: string;
  persona: string;
  voiceCfg: Record<string, unknown>;
  llmKey: string;
  llmUrl: string;
  llmModel: string;
}

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// Map voiceId to AWS Polly Neural voice name for Twilio
const POLLY_VOICE_MAP: Record<string, string> = {
  default: 'Polly.Matthew-Neural',    // Male, American
  alex:    'Polly.Matthew-Neural',    // Male, American (warm, professional)
  sarah:   'Polly.Joanna-Neural',     // Female, American (friendly)
  james:   'Polly.Brian-Neural',      // Male, British (polished)
  emma:    'Polly.Emma-Neural',       // Female, British (elegant)
  liam:    'Polly.Russell-Neural',    // Male, Australian (casual)
  sofia:   'Polly.Lupe-Neural',       // Female, Spanish-bilingual (energetic)
};

function getPollyVoice(voiceId?: string): string {
  return POLLY_VOICE_MAP[voiceId?.toLowerCase() ?? 'default'] ?? 'Polly.Matthew-Neural';
}

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

/** Get current month string in YYYY-MM format */
function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
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
        <Say voice="Polly.Matthew-Neural">Sorry, I didn't catch that. Could you repeat?</Say>
      </Gather>
      <Hangup/>
    `);
  }

  // Load client config — use cache to avoid Supabase query on every turn
  const supabase = createServiceClientWithoutCookies();
  let vcfg = clientConfigCache.get(clientId);

  if (!vcfg || Date.now() - vcfg.ts > CONFIG_TTL_MS) {
    // Cache miss — fetch from DB
    let name = '', agency_id = '', persona = '';
    let voiceCfg: Record<string, unknown> = {};
    let cfg: Record<string, unknown> = {};

    const { data: clientRow, error: clientErr } = await supabase
      .from('agency_clients')
      .select('id, name, container_config, agency_id')
      .eq('id', clientId).maybeSingle();

    console.log(`[voice/gather] clientId=${clientId} clientRow=${JSON.stringify(clientRow)} clientErr=${clientErr?.message ?? clientErr?.code ?? 'none'}`);

    if (clientRow) {
      cfg = (clientRow.container_config as Record<string, unknown>) ?? {};
      voiceCfg = (cfg.voice_config as Record<string, unknown>) ?? {};
      name = clientRow.name;
      agency_id = clientRow.agency_id;
      // Get agency API keys
      const { data: agRow } = await supabase
        .from('agencies').select('api_keys').eq('id', agency_id).single();
      const agKeys = (agRow?.api_keys as Record<string, string>) ?? {};
      const llmKey = process.env.OPENROUTER_API_KEY || agKeys.openrouter || agKeys.openai || '';
      const llmUrl = (process.env.OPENROUTER_API_KEY || agKeys.openrouter) ? OPENROUTER_URL : 'https://api.openai.com/v1/chat/completions';
      const llmModel = llmUrl.includes('openrouter') ? 'openai/gpt-4o-mini' : 'gpt-4o-mini';
      persona = (cfg.persona as string) ?? '';
      vcfg = { ts: Date.now(), data: { name, agency_id, persona, voiceCfg, llmKey, llmUrl, llmModel } };
      clientConfigCache.set(clientId, vcfg);
    } else {
      // Fallback: agency-level voice
      const { data: agencyRow, error: agencyErr } = await supabase
        .from('agencies').select('id, name, settings, api_keys').eq('id', clientId).maybeSingle();
      console.log(`[voice/gather] agency fallback clientId=${clientId} agencyRow=${JSON.stringify(agencyRow)} agencyErr=${agencyErr?.message ?? agencyErr?.code ?? 'none'}`);
      if (!agencyRow) {
        console.error(`[voice/gather] No client or agency found for clientId=${clientId}`);
        return twiml('<Say>Sorry, this service is not configured yet. Please contact support.</Say><Hangup/>');
      }
      const agKeys = (agencyRow.api_keys as Record<string, string>) ?? {};
      const s = (agencyRow.settings as Record<string, unknown>) ?? {};
      voiceCfg = (s.voice_config as Record<string, unknown>) ?? {};
      const llmKey = process.env.OPENROUTER_API_KEY || agKeys.openrouter || agKeys.openai || '';
      const llmUrl = (process.env.OPENROUTER_API_KEY || agKeys.openrouter) ? OPENROUTER_URL : 'https://api.openai.com/v1/chat/completions';
      const llmModel = llmUrl.includes('openrouter') ? 'openai/gpt-4o-mini' : 'gpt-4o-mini';
      vcfg = { ts: Date.now(), data: { name: agencyRow.name, agency_id: agencyRow.id, persona: '', voiceCfg, llmKey, llmUrl, llmModel } };
      clientConfigCache.set(clientId, vcfg);
    }
  }

  const { name: clientName, agency_id, voiceCfg, persona, llmKey, llmUrl, llmModel } = vcfg.data;
  const pollyVoice = getPollyVoice(voiceCfg.voiceId as string | undefined);
  const aiName = (voiceCfg.aiName as string) ?? 'Alex';
  const language = (voiceCfg.language as string) ?? 'en-US';

  // ── Minute Cap Enforcement ──────────────────────────────────────────────
  const { data: usageRow } = await supabase
    .from('voice_usage')
    .select('minutes_used, minute_limit')
    .eq('agency_id', agency_id)
    .eq('month', currentMonth())
    .single();

  const minutesUsed = Number(usageRow?.minutes_used ?? 0);
  const minuteLimit = Number(usageRow?.minute_limit ?? 300);

  if (minutesUsed >= minuteLimit) {
    return twiml(
      `<Say voice="${pollyVoice}">Your voice minutes have been used for this month. Please upgrade your plan or wait until next month. Goodbye!</Say><Hangup/>`
    );
  }

  const systemPrompt = `${persona || `You are ${aiName}, an AI assistant for ${clientName}.`}

IMPORTANT VOICE RULES:
- You are on a PHONE CALL. Keep responses SHORT — 1-2 sentences max.
- No bullet points, no markdown. Speak naturally and conversationally.
- Caller's phone: ${callerNumber}`.trim();

  // ── Load conversation history from Supabase ─────────────────────────────
  const { data: historyRows } = await supabase
    .from('voice_call_history')
    .select('role, content')
    .eq('call_sid', callSid)
    .order('created_at', { ascending: true })
    .limit(6);

  const history: Array<{ role: string; content: string }> = (historyRows ?? []).map(r => ({
    role: r.role,
    content: r.content,
  }));

  // Add current user message
  history.push({ role: 'user', content: speechResult });

  // Credit check
  const creditCheck = await requireCredits(agency_id, 'channel.voice_call');
  if (!creditCheck.allowed) {
    return twiml(`<Say voice="${pollyVoice}">I'm sorry, service is temporarily unavailable. Please call back later. Goodbye!</Say><Hangup/>`);
  }

  // Call LLM directly — skip VPS gateway hop for lower latency
  let aiResponse = '';
  try {
    if (!llmKey) throw new Error('No LLM key configured');
    const aiRes = await fetch(llmUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${llmKey}`,
        ...(llmUrl.includes('openrouter') ? { 'HTTP-Referer': 'https://kyra.conversionsystem.com', 'X-Title': 'Kyra Voice' } : {}),
      },
      body: JSON.stringify({
        model: llmModel,
        messages: [
          { role: 'system', content: systemPrompt },
          ...history.slice(-6),
        ],
        temperature: 0.6,
        max_tokens: 80,  // shorter = faster TTS + lower latency
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (aiRes.ok) {
      const data = await aiRes.json();
      aiResponse = data.choices?.[0]?.message?.content?.trim() ?? '';
    } else {
      console.error('[voice/gather] LLM error:', aiRes.status, await aiRes.text().catch(() => ''));
    }
  } catch (err) {
    console.error('[voice/twilio/gather] AI error:', err);
  }

  if (!aiResponse) {
    aiResponse = `I'm sorry, I'm having trouble right now. Please try again or call back shortly.`;
  }

  // ── Persist conversation history to Supabase ────────────────────────────
  void supabase.from('voice_call_history').insert([
    { call_sid: callSid, role: 'user', content: speechResult },
    { call_sid: callSid, role: 'assistant', content: aiResponse },
  ]);

  // Deduct credits
  void deductCredits(agency_id, 'channel.voice_call');

  // Increment voice minutes (~0.5 min per turn approximation)
  void supabase.rpc('increment_voice_minutes', { p_agency_id: agency_id, p_minutes: 0.5 });

  // Log conversation to Supabase (store both client_id and agency_id for flexible querying)
  void supabase.from('voice_call_logs').upsert({
    client_id: clientId,
    agency_id: agency_id,
    call_sid: callSid,
    caller_number: callerNumber,
    turns: Math.ceil(history.length / 2),
    last_user_message: speechResult,
    last_ai_response: aiResponse,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'call_sid' });

  const safeResponse = sanitizeForTwiml(aiResponse);

  // Detect goodbye to hang up gracefully
  if (isGoodbyeIntent(aiResponse) || isGoodbyeIntent(speechResult)) {
    return twiml(`<Say voice="${pollyVoice}">${safeResponse}</Say><Hangup/>`);
  }

  const gatherUrl = `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, '')}/api/voice/twilio/gather?clientId=${clientId}`;
  const lang = language.includes('-') ? language : `${language}-US`;

  // Respond and listen for next turn
  return twiml(`
    <Say voice="${pollyVoice}">${safeResponse}</Say>
    <Gather input="speech" timeout="4" speechTimeout="auto" action="${gatherUrl}" method="POST" language="${lang}">
    </Gather>
    <Hangup/>
  `);
}
