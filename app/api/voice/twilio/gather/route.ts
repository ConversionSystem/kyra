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
import { getKnowledgeContext } from '@/lib/knowledge/rag';
import { logConversationToCrm } from '@/lib/crm/conversation-logger';
import { GHL_TOOL_DEFINITIONS, executeTool } from '@/lib/ghl/ghl-tools';
import { getValidToken } from '@/lib/ghl/api';
import { resolveGHLConfig } from '@/lib/ghl/resolve-ghl-config';

// Cache client config per clientId — avoids repeated Supabase queries mid-call
// TTL 5 min — fast enough to pick up config changes without DB hit every turn
const clientConfigCache = new Map<string, { ts: number; data: ClientVoiceConfig }>();
const CONFIG_TTL_MS = 5 * 60 * 1000;

// Cache knowledge per clientId — fetched once per call, not every turn
const knowledgeCache = new Map<string, { ts: number; text: string }>();
const KNOWLEDGE_TTL_MS = 10 * 60 * 1000; // 10 min

interface ClientVoiceConfig {
  name: string;
  businessName: string;   // cfg.business_name || clientRow.name — matches widget chat pattern
  clientId: string;
  agency_id: string;
  persona: string;
  businessHours: string;
  businessPhone: string;
  businessAddress: string;
  calendarUrl: string;
  services: string;
  industry: string;
  voiceCfg: Record<string, unknown>;
  llmKey: string;
  llmUrl: string;
  llmModel: string;
}

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// Google Neural2 voices — much more natural than Polly
const VOICE_MAP: Record<string, string> = {
  default: 'Google.en-US-Neural2-D',    // Male, American (warm, natural)
  alex:    'Google.en-US-Neural2-D',    // Male, American
  sarah:   'Google.en-US-Neural2-F',    // Female, American
  james:   'Google.en-GB-Neural2-B',    // Male, British
  emma:    'Google.en-GB-Neural2-A',    // Female, British
  liam:    'Google.en-AU-Neural2-B',    // Male, Australian
  sofia:   'Google.es-US-Neural2-A',    // Female, Spanish
};

const MAX_TURNS = 20; // 20 turns = ~10 exchanges = ~5-8 min conversation

function getVoice(voiceId?: string): string {
  return VOICE_MAP[voiceId?.toLowerCase() ?? 'default'] ?? 'Google.en-US-Neural2-D';
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
      const llmModel = llmUrl.includes('openrouter') ? 'openrouter/anthropic/claude-haiku-4.5' : 'openrouter/anthropic/claude-haiku-4.5';
      persona = (cfg.persona as string) ?? '';
      vcfg = { ts: Date.now(), data: {
        name, clientId, agency_id, persona, voiceCfg, llmKey, llmUrl, llmModel,
        businessName: (cfg.business_name as string) || name,  // prefer config, fallback to DB name
        businessHours: (cfg.business_hours as string) ?? '',
        businessPhone: (cfg.business_phone as string) ?? '',
        businessAddress: (cfg.business_address as string) ?? '',
        calendarUrl: (cfg.calendar_url as string) || ((cfg.booking_url as string) ?? ''),  // templates use booking_url → stored as calendar_url, check both
        services: (cfg.services as string) ?? '',
        industry: (cfg.industry as string) ?? '',
      }};
      clientConfigCache.set(clientId, vcfg);
    } else {
      // Fallback: agency-level voice
      const { data: agencyRow, error: agencyErr } = await supabase
        .from('agencies').select('id, name, settings, api_keys').eq('id', clientId).maybeSingle();

      if (!agencyRow) {
        console.error(`[voice/gather] No client or agency found for clientId=${clientId}`);
        return twiml('<Say>Sorry, this service is not configured yet. Please contact support.</Say><Hangup/>');
      }
      const agKeys = (agencyRow.api_keys as Record<string, string>) ?? {};
      const s = (agencyRow.settings as Record<string, unknown>) ?? {};
      voiceCfg = (s.voice_config as Record<string, unknown>) ?? {};
      const llmKey = process.env.OPENROUTER_API_KEY || agKeys.openrouter || agKeys.openai || '';
      const llmUrl = (process.env.OPENROUTER_API_KEY || agKeys.openrouter) ? OPENROUTER_URL : 'https://api.openai.com/v1/chat/completions';
      const llmModel = llmUrl.includes('openrouter') ? 'openrouter/anthropic/claude-haiku-4.5' : 'openrouter/anthropic/claude-haiku-4.5';
      const agSettings = (agencyRow.settings as Record<string, unknown>) ?? {};
      vcfg = { ts: Date.now(), data: {
        name: agencyRow.name, clientId, agency_id: agencyRow.id, persona: '', voiceCfg, llmKey, llmUrl, llmModel,
        businessName: (agSettings.business_name as string) || agencyRow.name,
        businessHours: (agSettings.business_hours as string) ?? '',
        businessPhone: (agSettings.business_phone as string) ?? '',
        businessAddress: (agSettings.business_address as string) ?? '',
        calendarUrl: (agSettings.calendar_url as string) || ((agSettings.booking_url as string) ?? ''),
        services: (agSettings.services as string) ?? '',
        industry: (agSettings.industry as string) ?? '',
      }};
      clientConfigCache.set(clientId, vcfg);
    }
  }

  const {
    name: clientName, businessName, clientId: resolvedClientId, agency_id, voiceCfg, persona, llmKey, llmUrl, llmModel,
    businessHours, businessPhone, businessAddress, calendarUrl, services, industry,
  } = vcfg.data;
  const ttsVoice = getVoice(voiceCfg.voiceId as string | undefined);
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
      `<Say voice="${ttsVoice}">Your voice minutes have been used for this month. Please upgrade your plan or wait until next month. Goodbye!</Say><Hangup/>`
    );
  }

  // ── Load conversation history from Supabase ─────────────────────────────
  const { data: historyRows } = await supabase
    .from('voice_call_history')
    .select('role, content')
    .eq('call_sid', callSid)
    .order('created_at', { ascending: true })
    .limit(6);

  const turnCount = historyRows?.length ?? 0;

  // ── Turn limit — prevent infinite loops ─────────────────────────────────
  if (turnCount >= MAX_TURNS) {
    return twiml(
      `<Say voice="${ttsVoice}">Thank you for the conversation! I need to wrap up now. Feel free to call back anytime. Goodbye!</Say><Hangup/>`
    );
  }

  // ── Fetch knowledge base (cached per client) ─────────────────────────────
  let knowledgeSection = '';
  const knowledgeCacheKey = resolvedClientId || clientId;
  const cachedKnowledge = knowledgeCache.get(knowledgeCacheKey);
  if (cachedKnowledge && Date.now() - cachedKnowledge.ts < KNOWLEDGE_TTL_MS) {
    knowledgeSection = cachedKnowledge.text;
  } else {
    try {
      const knowledge = await getKnowledgeContext(agency_id, resolvedClientId || clientId, speechResult);
      if (knowledge.text) {
        knowledgeSection = knowledge.text;
        knowledgeCache.set(knowledgeCacheKey, { ts: Date.now(), text: knowledge.text });
      }
    } catch (err) {
      console.error('[voice/gather] Knowledge RAG error:', err);
    }
  }

  // ── FIX 3: Inject CRM relationship memory for this caller ────────────────
  let crmMemorySection = '';
  try {
    const { getMemories, buildMemoryContext } = await import('@/lib/crm/relationship-memory');
    // Find CRM contact by phone
    const { data: crmContact } = await supabase
      .from('crm_contacts')
      .select('id, first_name, last_name, score_label, stage, ai_summary, ai_next_action')
      .eq('agency_id', agency_id)
      .eq('phone', callerNumber)
      .maybeSingle();

    if (crmContact) {
      const memories = await getMemories(agency_id, crmContact.id);
      if (memories.length > 0) {
        const memCtx = buildMemoryContext(memories);
        const contactName = [crmContact.first_name, crmContact.last_name].filter(Boolean).join(' ');
        crmMemorySection = [
          `CALLER CONTEXT (from CRM):`,
          contactName ? `- Name: ${contactName}` : '',
          `- Relationship stage: ${crmContact.stage}`,
          crmContact.score_label ? `- Lead score: ${crmContact.score_label}` : '',
          crmContact.ai_summary ? `- Summary: ${crmContact.ai_summary}` : '',
          crmContact.ai_next_action ? `- Pending action: ${crmContact.ai_next_action}` : '',
          memCtx ? `\nRELATIONSHIP NOTES:\n${memCtx}` : '',
        ].filter(Boolean).join('\n');
      }
    }
  } catch (err) {
    console.error('[voice/gather] CRM memory error:', err);
  }

  // ── Build system prompt — same brain as text/widget chat ────────────────
  const systemPrompt = [
    persona || `You are ${aiName}, a friendly AI assistant for ${clientName}.`,
    '',
    'CRITICAL VOICE RULES:',
    '- You are on a LIVE PHONE CALL. Keep responses to 1-2 SHORT sentences.',
    '- Sound natural and warm — like a real person, not a robot.',
    '- Never use bullet points, lists, markdown, or technical language.',
    '- If you don\'t know something, say "Let me have someone follow up on that."',
    '',
    // Business context — same fields as widget chat
    industry ? `Industry: ${industry}` : '',
    services ? `Services offered: ${services}` : '',
    businessHours ? `Business hours: ${businessHours}` : '',
    businessPhone ? `Business phone: ${businessPhone}` : '',
    businessAddress ? `Location: ${businessAddress}` : '',
    calendarUrl ? `When someone wants to book an appointment, tell them to visit: ${calendarUrl}` : '',
    '',
    // Knowledge base — docs, website content, FAQs
    knowledgeSection ? `\nKNOWLEDGE BASE — Use this to answer questions accurately:\n${knowledgeSection}` : '',
    crmMemorySection ? `\n${crmMemorySection}` : '',
    '',
    `Caller's phone: ${callerNumber}`,
  ].filter(Boolean).join('\n').trim();

  const history: Array<{ role: string; content: string }> = (historyRows ?? []).map(r => ({
    role: r.role,
    content: r.content,
  }));

  // Add current user message
  history.push({ role: 'user', content: speechResult });

  // Credit check
  const creditCheck = await requireCredits(agency_id, 'channel.voice_call');
  if (!creditCheck.allowed) {
    return twiml(`<Say voice="${ttsVoice}">I'm sorry, service is temporarily unavailable. Please call back later. Goodbye!</Say><Hangup/>`);
  }

  // ── FIX 2: Load GHL token for tool execution ──────────────────────────────
  // Fetch GHL credentials so the voice AI can book appointments, tag contacts etc.
  let ghlToken: string | null = null;
  let ghlLocationId: string | null = null;
  let ghlContactId: string | null = null;
  try {
    const { data: clientGhl } = await supabase
      .from('agency_clients')
      .select('ghl_private_token, ghl_access_token, ghl_location_id')
      .eq('id', clientId)
      .single();
    if (clientGhl) {
      ghlToken = await getValidToken(clientId).catch(() => null);
      ghlLocationId = clientGhl.ghl_location_id ?? null;
    }
    // Find GHL contact by caller phone number
    if (ghlToken && ghlLocationId && callerNumber) {
      const searchRes = await executeTool('search_contacts', { query: callerNumber }, {
        token: ghlToken, contactId: '', locationId: ghlLocationId, clientId,
      });
      if (searchRes.success && Array.isArray((searchRes.data as Record<string,unknown>)?.contacts)) {
        const contacts = (searchRes.data as Record<string, unknown[]>).contacts as Array<{id: string}>;
        if (contacts.length > 0) ghlContactId = contacts[0].id;
      }
    }
  } catch (err) {
    console.error('[voice/gather] GHL token fetch error:', err);
  }

  // Resolve calendar/pipeline IDs and inject into system prompt
  const voiceGhlCfg = await resolveGHLConfig(agency_id, null);
  let enrichedSystemPrompt = systemPrompt;
  if (ghlToken && voiceGhlCfg.calendarId) {
    enrichedSystemPrompt += `\n\nCALENDAR CONFIG:\nDefault calendar_id: ${voiceGhlCfg.calendarId}\nWhen booking appointments, always use this calendar_id.`;
  }

  // Conditionally attach GHL tools if we have a valid token
  const voiceTools = ghlToken ? [
    // Subset of tools that make sense for voice calls
    ...GHL_TOOL_DEFINITIONS.filter(t => [
      'book_appointment', 'get_available_slots', 'get_calendars', 'confirm_appointment',
      'reschedule_appointment', 'add_contact_tags', 'add_contact_note',
      'create_contact', 'escalate_to_human',
    ].includes(t.function.name)),
  ] : [];

  // Call LLM directly — skip VPS gateway hop for lower latency
  let aiResponse = '';
  try {
    if (!llmKey) throw new Error('No LLM key configured');
    const messages: Array<{role: string; content: string}> = [
      { role: 'system', content: enrichedSystemPrompt },
      ...history.slice(-6),
      { role: 'user', content: speechResult },
    ];

    const requestBody: Record<string, unknown> = {
      model: llmModel,
      messages,
      temperature: 0.7,
      max_tokens: 120,
    };
    if (voiceTools.length > 0) {
      requestBody.tools = voiceTools;
      requestBody.tool_choice = 'auto';
    }

    const aiRes = await fetch(llmUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${llmKey}`,
        ...(llmUrl.includes('openrouter') ? { 'HTTP-Referer': 'https://kyra.conversionsystem.com', 'X-Title': 'Kyra Voice' } : {}),
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(8000),
    });

    if (aiRes.ok) {
      const data = await aiRes.json();
      const choice = data.choices?.[0];

      // Handle tool calls (e.g., book_appointment)
      if (choice?.finish_reason === 'tool_calls' && choice?.message?.tool_calls && ghlToken && ghlLocationId) {
        const toolCall = choice.message.tool_calls[0];
        const toolName = toolCall.function.name;
        let toolArgs: Record<string, unknown> = {};
        try { toolArgs = JSON.parse(toolCall.function.arguments); } catch {}

        // Reuse voiceGhlCfg resolved above (same agency, no need to query again)
        const toolResult = await executeTool(toolName, toolArgs, {
          token: ghlToken,
          contactId: ghlContactId || '',
          locationId: ghlLocationId,
          clientId,
          calendarId: (toolArgs.calendar_id as string) || voiceGhlCfg.calendarId || '',
        });

        // Feed tool result back for natural language response
        const followUpRes = await fetch(llmUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${llmKey}`,
            ...(llmUrl.includes('openrouter') ? { 'HTTP-Referer': 'https://kyra.conversionsystem.com', 'X-Title': 'Kyra Voice' } : {}),
          },
          body: JSON.stringify({
            model: llmModel,
            messages: [
              ...messages,
              { role: 'assistant', content: null, tool_calls: choice.message.tool_calls },
              { role: 'tool', tool_call_id: toolCall.id, content: JSON.stringify(toolResult.data || toolResult.error || 'done') },
            ],
            temperature: 0.7,
            max_tokens: 80,
          }),
          signal: AbortSignal.timeout(6000),
        });
        if (followUpRes.ok) {
          const followUpData = await followUpRes.json();
          aiResponse = followUpData.choices?.[0]?.message?.content?.trim() ?? '';
        }
      } else {
        aiResponse = choice?.message?.content?.trim() ?? '';
      }
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

  // ── FIX 1: Log voice conversation to CRM activity timeline ───────────────
  // This makes every call turn visible in the contact's CRM timeline.
  void logConversationToCrm(agency_id, {
    type: 'InboundMessage',
    phone: callerNumber,
    body: speechResult,
    messageType: 'voice',
    direction: 'inbound',
  }).catch(err => console.error('[voice/gather] CRM log error:', err));

  // Log AI response turn too
  void logConversationToCrm(agency_id, {
    type: 'OutboundMessage',
    phone: callerNumber,
    body: aiResponse,
    messageType: 'voice',
    direction: 'outbound',
  }).catch(() => {});

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
    return twiml(`<Say voice="${ttsVoice}">${safeResponse}</Say><Hangup/>`);
  }

  const gatherUrl = `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, '')}/api/voice/twilio/gather?clientId=${clientId}`;
  const lang = language.includes('-') ? language : `${language}-US`;

  // Respond and listen for next turn
  return twiml(`
    <Say voice="${ttsVoice}">${safeResponse}</Say>
    <Gather input="speech" timeout="4" speechTimeout="auto" action="${gatherUrl}" method="POST" language="${lang}">
    </Gather>
    <Hangup/>
  `);
}
