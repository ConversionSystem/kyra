/**
 * AI Closer — OpenClaw-Powered Autonomous Sales Agent
 *
 * This is the engine that makes Kyra's AI pipeline truly autonomous.
 * When a lead replies to outreach, the AI Closer:
 *
 * 1. Builds full context (campaign + lead + enrichment + conversation history)
 * 2. Routes through the agency's OpenClaw container (persistent memory, tools, 24/7)
 * 3. Falls back to direct LLM call if no container available
 * 4. Sends the AI response back to the lead via GHL
 * 5. Analyzes the conversation to auto-update pipeline stage
 *
 * WHY OpenClaw matters here:
 * - A direct API call is stateless: it forgets everything between messages
 * - An OpenClaw agent has MEMORY: it remembers the full conversation across sessions
 * - An OpenClaw agent has TOOLS: it can book appointments, check calendars, update CRMs
 * - An OpenClaw agent is AUTONOMOUS: it can proactively follow up, not just respond
 * - An OpenClaw agent is PERSISTENT: it runs 24/7 in an isolated container
 *
 * This is the difference between a chatbot and an AI employee.
 */

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { getGatewayByAgencyId } from '@/lib/ovh/gateway-resolver';
import { getGhlIntegration } from '@/lib/pipeline/crm-sync';
import { logAndFire } from '@/lib/pipeline/webhooks';
import { syncLeadToCrm } from '@/lib/pipeline/crm-sync';

const GHL_API = 'https://services.leadconnectorhq.com';
const GHL_VERSION = '2021-04-15';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CloserContext {
  lead: LeadRecord;
  campaign: CampaignRecord;
  conversationHistory: ConversationMessage[];
  enrichment: Record<string, unknown>;
  inboundMessage: string;
  inboundChannel: string;
}

interface LeadRecord {
  id: string;
  agency_id: string;
  campaign_id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  industry: string | null;
  location: string | null;
  stage: string;
  ghl_contact_id: string | null;
  personalized_subject: string | null;
  personalized_email: string | null;
  personalized_opener: string | null;
  enrichment_data: Record<string, unknown>;
  notes: string | null;
}

interface CampaignRecord {
  id: string;
  name: string;
  target_industry: string | null;
  target_role: string | null;
  target_location: string | null;
  target_pain_points: string | null;
  value_prop: string | null;
}

interface ConversationMessage {
  direction: 'inbound' | 'outbound';
  body: string;
  dateAdded: string;
  type: string;
}

interface CloserResult {
  response: string;
  sentViaGhl: boolean;
  stageUpdate: string | null;
  poweredBy: 'openclaw' | 'direct-llm';
  error?: string;
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

/**
 * Handle an inbound reply from a pipeline lead.
 * This is the full autonomous closer loop:
 * 1. Build context → 2. Generate response → 3. Send via GHL → 4. Update stage
 */
export async function handleCloserReply(
  leadId: string,
  inboundMessage: string,
  inboundChannel: string = 'SMS',
): Promise<CloserResult> {
  const svc = createServiceClientWithoutCookies();

  // ── 1. Load full context ────────────────────────────────────────────────

  const { data: lead } = await svc
    .from('pipeline_leads')
    .select('*, pipeline_campaigns!inner(*)')
    .eq('id', leadId)
    .single();

  if (!lead) {
    return { response: '', sentViaGhl: false, stageUpdate: null, poweredBy: 'direct-llm', error: 'Lead not found' };
  }

  const campaign = (lead as Record<string, unknown>).pipeline_campaigns as CampaignRecord;
  const enrichment = (lead.enrichment_data || {}) as Record<string, unknown>;

  // ── 2. Fetch conversation history from GHL ──────────────────────────────

  let conversationHistory: ConversationMessage[] = [];
  const ghlIntegration = await getGhlIntegration(lead.agency_id);

  if (ghlIntegration?.access_token && lead.ghl_contact_id) {
    conversationHistory = await fetchGhlConversation(
      ghlIntegration.access_token,
      ghlIntegration.location_id!,
      lead.ghl_contact_id,
    );
  }

  const context: CloserContext = {
    lead: lead as LeadRecord,
    campaign,
    conversationHistory,
    enrichment,
    inboundMessage,
    inboundChannel,
  };

  // ── 3. Generate AI response (OpenClaw first, direct LLM fallback) ──────

  let aiResponse: string;
  let poweredBy: 'openclaw' | 'direct-llm';

  // Try OpenClaw container first
  const gateway = await getGatewayByAgencyId(lead.agency_id);
  if (gateway) {
    try {
      const result = await routeThroughOpenClaw(gateway, context);
      aiResponse = result;
      poweredBy = 'openclaw';
    } catch (err) {
      console.error('[ai-closer] OpenClaw container failed, falling back to direct LLM:', err);
      aiResponse = await directLlmResponse(context);
      poweredBy = 'direct-llm';
    }
  } else {
    aiResponse = await directLlmResponse(context);
    poweredBy = 'direct-llm';
  }

  if (!aiResponse.trim()) {
    return { response: '', sentViaGhl: false, stageUpdate: null, poweredBy, error: 'Empty AI response' };
  }

  // ── 4. Send response via GHL ────────────────────────────────────────────

  let sentViaGhl = false;
  if (ghlIntegration?.access_token && lead.ghl_contact_id) {
    sentViaGhl = await sendGhlResponse(
      ghlIntegration.access_token,
      lead.ghl_contact_id,
      aiResponse,
      inboundChannel,
    );
  }

  // ── 5. Analyze and update stage ─────────────────────────────────────────

  const stageUpdate = await analyzeAndUpdateStage(svc, lead as LeadRecord, campaign, aiResponse, inboundMessage);

  // ── 6. Log the closer activity ──────────────────────────────────────────

  await svc.from('pipeline_activity_log').insert({
    agency_id: lead.agency_id,
    campaign_id: campaign.id,
    lead_id: lead.id,
    event: 'closer.responded',
    from_stage: lead.stage,
    to_stage: stageUpdate || lead.stage,
    actor: 'ai-closer',
    details: {
      powered_by: poweredBy,
      inbound_message: inboundMessage.slice(0, 500),
      ai_response: aiResponse.slice(0, 500),
      sent_via_ghl: sentViaGhl,
      channel: inboundChannel,
    },
  }).then(() => {}, () => {});

  return { response: aiResponse, sentViaGhl, stageUpdate, poweredBy };
}

// ─── OpenClaw Container Route ─────────────────────────────────────────────────

async function routeThroughOpenClaw(
  gateway: { url: string; token: string },
  context: CloserContext,
): Promise<string> {
  const systemPrompt = buildCloserSystemPrompt(context);
  const messages = buildConversationMessages(context, systemPrompt);

  const res = await fetch(`${gateway.url}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${gateway.token}`,
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o',
      messages,
      temperature: 0.7,
      max_tokens: 500,
      stream: false,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`OpenClaw returned ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content || '';
}

// ─── Direct LLM Fallback ─────────────────────────────────────────────────────

async function directLlmResponse(context: CloserContext): Promise<string> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    console.error('[ai-closer] No OPENAI_API_KEY');
    return '';
  }

  const systemPrompt = buildCloserSystemPrompt(context);
  const messages = buildConversationMessages(context, systemPrompt);

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages,
      temperature: 0.7,
      max_tokens: 500,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) return '';
  const data = await res.json();
  return data?.choices?.[0]?.message?.content || '';
}

// ─── The Closer's Brain ───────────────────────────────────────────────────────

function buildCloserSystemPrompt(context: CloserContext): string {
  const { lead, campaign, enrichment } = context;

  return `You are a skilled sales closer working for an agency. Your job is to have a natural, human conversation with a prospect who replied to our outreach. You are NOT a chatbot — you are a real salesperson having a text/email conversation.

## YOUR MISSION
Turn this reply into a booked demo/meeting. Be conversational, warm, and direct. Don't be pushy. Don't be salesy. Be genuinely helpful.

## THE PROSPECT
- Name: ${lead.full_name || 'Unknown'}
- Title: ${lead.title || 'Owner/Decision-maker'}
- Company: ${lead.company || 'Unknown'}
- Industry: ${lead.industry || 'Unknown'}
- Location: ${lead.location || 'Unknown'}
- Website: ${lead.website || 'N/A'}
${enrichment.company_context ? `- About them: ${enrichment.company_context}` : ''}
${enrichment.likely_pain_points ? `- Their pain points: ${enrichment.likely_pain_points}` : ''}
${enrichment.icebreaker ? `- Icebreaker: ${enrichment.icebreaker}` : ''}

## WHAT WE'RE SELLING
- Campaign: ${campaign.name}
- Value prop: ${campaign.value_prop || 'AI-powered solutions that save time and increase revenue'}
${campaign.target_pain_points ? `- Pain points we solve: ${campaign.target_pain_points}` : ''}

## OUTREACH THAT WAS SENT
${lead.personalized_subject ? `Subject: ${lead.personalized_subject}` : ''}
${lead.personalized_email ? `Email: ${lead.personalized_email}` : ''}
${lead.personalized_opener ? `SMS: ${lead.personalized_opener}` : ''}

## RULES
1. Keep responses SHORT (2-4 sentences for SMS, 3-6 for email). Nobody reads walls of text.
2. Match their energy. If they're casual, be casual. If formal, be professional.
3. Answer their question directly, then pivot to booking a quick call.
4. If they say "not interested" — acknowledge gracefully, ask if timing is the issue. One soft follow-up max.
5. If they ask "who is this?" — explain briefly and mention the outreach you sent.
6. If they're interested — suggest 2-3 specific time slots. Make it easy.
7. If they want to learn more — offer a quick 15-min call, not more emails.
8. Never lie, never make up capabilities, never promise things you can't deliver.
9. Don't use emojis unless they do first.
10. Don't start with "Hey!" or "Hi there!" — jump into the substance.
11. Sign with a first name only, no titles. Keep it human.
12. NEVER reveal you are an AI. You are a person on the team.`;
}

function buildConversationMessages(
  context: CloserContext,
  systemPrompt: string,
): Array<{ role: string; content: string }> {
  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: systemPrompt },
  ];

  // Add conversation history for context
  for (const msg of context.conversationHistory.slice(-10)) { // Last 10 messages
    messages.push({
      role: msg.direction === 'outbound' ? 'assistant' : 'user',
      content: msg.body,
    });
  }

  // Add the latest inbound message
  messages.push({
    role: 'user',
    content: context.inboundMessage,
  });

  return messages;
}

// ─── Stage Analysis ───────────────────────────────────────────────────────────

async function analyzeAndUpdateStage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  svc: any,
  lead: LeadRecord,
  campaign: CampaignRecord,
  aiResponse: string,
  inboundMessage: string,
): Promise<string | null> {
  // Quick heuristic analysis — determine if stage should change
  const combined = `${inboundMessage} ${aiResponse}`.toLowerCase();

  let newStage: string | null = null;

  // Detect booking intent
  const bookingSignals = [
    'schedule', 'calendar', 'meeting', 'call', 'demo', 'book',
    'available', 'free time', 'let\'s talk', 'sounds good', 'i\'m in',
    'set up a time', 'when works', 'tomorrow', 'this week', 'next week',
  ];
  const bookingScore = bookingSignals.filter(s => combined.includes(s)).length;

  // Detect interest signals
  const interestSignals = [
    'interested', 'tell me more', 'how does', 'what does', 'pricing',
    'how much', 'more info', 'learn more', 'sounds interesting', 'curious',
    'what can', 'capabilities', 'features', 'how it works',
  ];
  const interestScore = interestSignals.filter(s => combined.includes(s)).length;

  // Detect rejection signals
  const rejectionSignals = [
    'not interested', 'no thanks', 'remove me', 'unsubscribe', 'stop',
    'don\'t contact', 'leave me alone', 'not for us', 'pass',
  ];
  const rejectionScore = rejectionSignals.filter(s => inboundMessage.toLowerCase().includes(s)).length;

  if (rejectionScore > 0) {
    newStage = 'skipped';
  } else if (bookingScore >= 2) {
    newStage = 'booked';
  } else if (interestScore >= 1 || bookingScore >= 1) {
    newStage = 'interested';
  }

  // Only move forward, never backward
  const stageOrder = ['found', 'approved', 'researched', 'outreach_approved', 'messaged', 'replied', 'interested', 'booked', 'closed'];
  if (newStage && newStage !== 'skipped') {
    const currentIdx = stageOrder.indexOf(lead.stage);
    const newIdx = stageOrder.indexOf(newStage);
    if (newIdx <= currentIdx) newStage = null; // Don't move backward
  }

  if (newStage) {
    const previousStage = lead.stage;

    await svc.from('pipeline_leads').update({ stage: newStage }).eq('id', lead.id);

    // Map stage to webhook event
    const eventMap: Record<string, string> = {
      interested: 'lead.interested',
      booked: 'lead.booked',
      closed: 'lead.closed',
      skipped: 'lead.skipped',
    };

    const webhookEvent = eventMap[newStage];
    if (webhookEvent) {
      await logAndFire(
        lead.agency_id,
        webhookEvent as 'lead.interested' | 'lead.booked' | 'lead.closed' | 'lead.skipped',
        { id: campaign.id, name: campaign.name },
        {
          id: lead.id, full_name: lead.full_name, company: lead.company,
          email: lead.email, phone: lead.phone, website: lead.website,
          industry: lead.industry, location: lead.location,
          stage: newStage, previous_stage: previousStage,
          ghl_contact_id: lead.ghl_contact_id,
        },
        'ai-closer',
        { trigger: 'conversation_analysis' },
      );

      // CRM sync
      syncLeadToCrm(lead.agency_id, {
        id: lead.id, full_name: lead.full_name, first_name: lead.first_name,
        last_name: lead.last_name, email: lead.email, phone: lead.phone,
        company: lead.company, title: lead.title, website: lead.website,
        industry: lead.industry, location: lead.location,
        stage: newStage, previous_stage: previousStage,
        campaign_id: campaign.id, campaign_name: campaign.name,
        ghl_contact_id: lead.ghl_contact_id,
        enrichment_data: lead.enrichment_data,
      }).catch(err => console.error('[ai-closer] CRM sync error:', err));
    }
  }

  return newStage;
}

// ─── GHL Messaging ────────────────────────────────────────────────────────────

async function sendGhlResponse(
  token: string,
  contactId: string,
  message: string,
  channel: string,
): Promise<boolean> {
  try {
    const messageType = channel.toLowerCase().includes('email') ? 'Email' : 'SMS';

    const res = await fetch(`${GHL_API}/conversations/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Version: GHL_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: messageType,
        contactId,
        message,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      console.error(`[ai-closer] GHL send failed: HTTP ${res.status}`);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[ai-closer] GHL send error:', err);
    return false;
  }
}

async function fetchGhlConversation(
  token: string,
  locationId: string,
  contactId: string,
): Promise<ConversationMessage[]> {
  try {
    // Find conversation
    const searchRes = await fetch(
      `${GHL_API}/conversations/search?contactId=${contactId}&locationId=${locationId}`,
      {
        headers: { Authorization: `Bearer ${token}`, Version: GHL_VERSION },
        signal: AbortSignal.timeout(8_000),
      },
    );
    if (!searchRes.ok) return [];
    const searchData = await searchRes.json();
    const conversations = searchData?.conversations || [];
    if (!conversations.length) return [];

    // Get messages
    const convId = conversations[0].id;
    const msgRes = await fetch(`${GHL_API}/conversations/${convId}/messages`, {
      headers: { Authorization: `Bearer ${token}`, Version: GHL_VERSION },
      signal: AbortSignal.timeout(8_000),
    });
    if (!msgRes.ok) return [];
    const msgData = await msgRes.json();
    const rawMessages = msgData?.messages?.messages || msgData?.messages || [];

    return rawMessages
      .map((m: Record<string, unknown>) => ({
        direction: m.direction as 'inbound' | 'outbound',
        body: (m.body || m.message || '') as string,
        dateAdded: (m.dateAdded || m.createdAt || '') as string,
        type: (m.messageType || m.type || 'SMS') as string,
      }))
      .sort((a: ConversationMessage, b: ConversationMessage) =>
        new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime(),
      );
  } catch {
    return [];
  }
}
