/**
 * AI Closer — OpenClaw-Powered Autonomous Sales Agent
 *
 * This is the engine that makes Kyra's AI pipeline truly autonomous.
 * When a lead replies to outreach, the AI Closer:
 *
 * 1. Routes to the CORRECT OpenClaw container (matched by GHL location, not random)
 * 2. The container has campaign context in SOUL.md + CAMPAIGN.md (injected at launch)
 * 3. OpenClaw's persistent memory means the agent REMEMBERS prior conversations
 * 4. Falls back to direct LLM call if no container available
 * 5. Sends the AI response back to the lead via GHL
 * 6. Analyzes the conversation to auto-update pipeline stage
 *
 * WHY OpenClaw matters here (and nowhere else in the pipeline):
 * - SOUL.md: Agent knows WHO it is, WHAT it's selling, and HOW to close
 * - CAMPAIGN.md: Agent knows every lead's profile, enrichment, and outreach sent
 * - MEMORY: Agent remembers "I talked to Marcus about pricing on Tuesday"
 * - TOOLS: Agent can check calendars, look up info, take notes between conversations
 * - 24/7: Agent is always running in an isolated container — no cold starts
 *
 * This is the difference between a chatbot and an AI employee.
 */

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { resolveCloserContainer } from '@/lib/pipeline/soul-injector';
import { getGhlIntegration } from '@/lib/pipeline/crm-sync';
import { logAndFire } from '@/lib/pipeline/webhooks';
import { syncLeadToCrm } from '@/lib/pipeline/crm-sync';
import { requireCredits, deductCredits } from '@/lib/billing/credit-engine';
import { resolveAgencyApiKey } from '@/lib/billing/byok';
import {
  GHL_TOOL_DEFINITIONS,
  executeTool,
  type ToolContext,
  type ToolResult,
} from '@/lib/ghl/ghl-tools';
import {
  getConversationHistory,
  saveConversationTurn,
} from '@/lib/ghl/conversation-memory';

const GHL_API = 'https://services.leadconnectorhq.com';
const GHL_VERSION = '2021-04-15';

// Maximum tool-call rounds to prevent infinite loops
const MAX_TOOL_ROUNDS = 5;

// ---- Types ---------------------------------------------------------------

interface CloserContext {
  lead: LeadRecord;
  campaign: CampaignRecord;
  conversationHistory: ConversationMessage[];
  enrichment: Record<string, unknown>;
  inboundMessage: string;
  inboundChannel: string;
  toolContext: ToolContext | null;
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
  containerId?: string;
  escalation?: { reason: string; urgency: string };
  error?: string;
}

// ---- Main Entry Point ----------------------------------------------------

/**
 * Handle an inbound reply from a pipeline lead.
 * This is the full autonomous closer loop:
 * 1. Build context -> 2. Route to correct container -> 3. Generate response
 * -> 4. Send via GHL -> 5. Update stage -> 6. Save to memory -> 7. Log everything
 */
export async function handleCloserReply(
  leadId: string,
  inboundMessage: string,
  inboundChannel: string = 'SMS',
): Promise<CloserResult> {
  const responseStart = Date.now();
  const svc = createServiceClientWithoutCookies();

  // -- 1. Load full context -------------------------------------------------

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

  // -- 2. Fetch conversation history ----------------------------------------
  // Try Supabase first (fast, reliable), fall back to GHL API

  let conversationHistory: ConversationMessage[] = [];
  const ghlIntegration = await getGhlIntegration(lead.agency_id);

  // Look up agency_client ID for conversation memory (client linked to this agency's GHL location)
  let agencyClientId: string | null = null;
  if (ghlIntegration?.location_id) {
    const { data: agClient } = await svc
      .from('agency_clients')
      .select('id')
      .eq('ghl_location_id', ghlIntegration.location_id)
      .limit(1)
      .single();
    agencyClientId = agClient?.id ?? null;
  }

  // If no client found by location, fall back to any client for this agency
  if (!agencyClientId) {
    const { data: agClient } = await svc
      .from('agency_clients')
      .select('id')
      .eq('agency_id', lead.agency_id)
      .limit(1)
      .single();
    agencyClientId = agClient?.id ?? null;
  }

  // Try Supabase conversation memory first
  if (agencyClientId && lead.ghl_contact_id) {
    try {
      const supabaseTurns = await getConversationHistory(agencyClientId, lead.ghl_contact_id, 10);
      if (supabaseTurns.length > 0) {
        conversationHistory = supabaseTurns.map(t => ({
          direction: t.role === 'user' ? 'inbound' as const : 'outbound' as const,
          body: t.content,
          dateAdded: t.timestamp,
          type: inboundChannel,
        }));
      }
    } catch (err) {
      console.warn('[ai-closer] Supabase conversation memory failed, trying GHL API:', err);
    }
  }

  // Fall back to GHL API if no Supabase history
  if (conversationHistory.length === 0 && ghlIntegration?.access_token && lead.ghl_contact_id) {
    conversationHistory = await fetchGhlConversation(
      ghlIntegration.access_token,
      ghlIntegration.location_id!,
      lead.ghl_contact_id,
    );
  }

  // Build tool context for function calling
  const ghlConfig = ghlIntegration?.config as Record<string, unknown> | undefined;
  const toolContext: ToolContext | null =
    ghlIntegration?.access_token && lead.ghl_contact_id && ghlIntegration.location_id
      ? {
          token: ghlIntegration.access_token,
          contactId: lead.ghl_contact_id,
          locationId: ghlIntegration.location_id,
          clientId: agencyClientId || lead.agency_id,
          calendarId: (ghlConfig?.calendar_id as string | undefined) || undefined,
          pipelineId: (ghlConfig?.pipeline_id as string | undefined) || undefined,
        }
      : null;

  const context: CloserContext = {
    lead: lead as LeadRecord,
    campaign,
    conversationHistory,
    enrichment,
    inboundMessage,
    inboundChannel,
    toolContext,
  };

  // -- Credit check before generating response (skip if BYOK) ---------------
  const resolved = await resolveAgencyApiKey(lead.agency_id);
  const isByok = resolved.isByok;
  if (!isByok) {
    const creditCheck = await requireCredits(lead.agency_id, 'pipeline.closer_response');
    if (!creditCheck.allowed) {
      console.warn(`[ai-closer] Insufficient credits for agency ${lead.agency_id} (${creditCheck.balance} remaining)`);
      return { response: '', sentViaGhl: false, stageUpdate: null, poweredBy: 'direct-llm', error: 'Insufficient credits' };
    }
  }

  // -- 3. Route to correct OpenClaw container -------------------------------
  //
  // resolveCloserContainer() finds the RIGHT container:
  //   1st: Container matching the agency's GHL location (from pipeline_integrations)
  //   2nd: First running container for the agency (fallback)
  //
  // The container already has SOUL.md + CAMPAIGN.md injected at launch time
  // via injectCampaignContext() in soul-injector.ts.

  let aiResponse: string;
  let poweredBy: 'openclaw' | 'direct-llm';
  let containerId: string | undefined;
  let escalation: { reason: string; urgency: string } | undefined;

  const gateway = await resolveCloserContainer(lead.agency_id);

  if (gateway) {
    try {
      const result = await routeThroughOpenClaw(gateway, context);
      aiResponse = result;
      poweredBy = 'openclaw';
      containerId = gateway.clientId;
      console.log(
        `[ai-closer] Routed through OpenClaw container ${gateway.clientId} ` +
        `(${gateway.clientName}) for lead ${lead.full_name || lead.id}`,
      );
    } catch (err) {
      console.error('[ai-closer] OpenClaw container failed, falling back to direct LLM:', err);
      const result = await directLlmResponse(context);
      aiResponse = result.text;
      escalation = result.escalation;
      poweredBy = 'direct-llm';
    }
  } else {
    console.warn(`[ai-closer] No OpenClaw container for agency ${lead.agency_id} -- using direct LLM`);
    const result = await directLlmResponse(context);
    aiResponse = result.text;
    escalation = result.escalation;
    poweredBy = 'direct-llm';
  }

  if (!aiResponse.trim()) {
    return { response: '', sentViaGhl: false, stageUpdate: null, poweredBy, containerId, error: 'Empty AI response' };
  }

  // -- 4. Send response via GHL --------------------------------------------

  let sentViaGhl = false;
  if (ghlIntegration?.access_token && lead.ghl_contact_id) {
    sentViaGhl = await sendGhlResponse(
      ghlIntegration.access_token,
      lead.ghl_contact_id,
      aiResponse,
      inboundChannel,
    );
  }

  // -- 5. Analyze and update stage ------------------------------------------

  const stageUpdate = await analyzeAndUpdateStage(svc, lead as LeadRecord, campaign, aiResponse, inboundMessage);

  // -- 6. Deduct credit (skip if BYOK) --------------------------------------
  if (!isByok) {
    await deductCredits(lead.agency_id, 'pipeline.closer_response', {
      description: `AI Closer reply to ${lead.full_name || 'lead'} (${lead.company || '?'})`,
    });
  }

  // -- 7. Save conversation to Supabase memory ------------------------------
  const responseTimeMs = Date.now() - responseStart;
  if (agencyClientId && lead.ghl_contact_id) {
    saveConversationTurn({
      clientId: agencyClientId,
      agencyId: lead.agency_id,
      contactId: lead.ghl_contact_id,
      contactName: lead.full_name || lead.company || 'Unknown',
      contactPhone: lead.phone,
      contactEmail: lead.email,
      conversationId: `pipeline-${lead.id}`,
      userMessage: inboundMessage,
      aiResponse,
      channel: inboundChannel,
      responseTimeMs,
    }).catch(err => console.error('[ai-closer] Failed to save conversation turn:', err));
  }

  // -- 8. Log the closer activity -------------------------------------------

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
      container_id: containerId,
      inbound_message: inboundMessage.slice(0, 500),
      ai_response: aiResponse.slice(0, 500),
      sent_via_ghl: sentViaGhl,
      channel: inboundChannel,
      response_time_ms: responseTimeMs,
      escalation: escalation || null,
    },
  }).then(() => {}, () => {});

  // -- 9. Handle escalation (if any) ----------------------------------------
  if (escalation) {
    await svc.from('pipeline_activity_log').insert({
      agency_id: lead.agency_id,
      campaign_id: campaign.id,
      lead_id: lead.id,
      event: 'closer.escalated',
      from_stage: lead.stage,
      to_stage: lead.stage,
      actor: 'ai-closer',
      details: {
        reason: escalation.reason,
        urgency: escalation.urgency,
        powered_by: poweredBy,
      },
    }).then(() => {}, () => {});
  }

  return { response: aiResponse, sentViaGhl, stageUpdate, poweredBy, containerId, escalation };
}

// ---- OpenClaw Container Route --------------------------------------------

/**
 * Route the conversation through the agency's OpenClaw container.
 *
 * The container already has:
 *   - SOUL.md: Closer identity + campaign overview + communication rules
 *   - CAMPAIGN.md: Full lead profiles + enrichment + objection playbook
 *   - Memory: Prior conversations with this lead (if any)
 *
 * We send a LEAN system prompt that tells the agent to use its workspace context,
 * plus the specific lead's context and conversation history for this message.
 * The heavy lifting (identity, rules, playbook) lives in the workspace files.
 */
async function routeThroughOpenClaw(
  gateway: { url: string; token: string },
  context: CloserContext,
): Promise<string> {
  const systemPrompt = buildOpenClawSystemPrompt(context);
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

/**
 * System prompt for OpenClaw container -- LEAN.
 * The heavy context (identity, rules, playbook) is already in SOUL.md + CAMPAIGN.md.
 * This prompt just provides the specific lead context for THIS conversation.
 */
function buildOpenClawSystemPrompt(context: CloserContext): string {
  const { lead, enrichment, toolContext } = context;

  let prompt = `You are responding to an inbound message from a prospect. Your identity, campaign details, communication rules, and objection playbook are in your SOUL.md and CAMPAIGN.md files -- follow them.

## THIS CONVERSATION
- **Prospect:** ${lead.full_name || 'Unknown'} at ${lead.company || 'Unknown Company'}
- **Their role:** ${lead.title || 'Decision-maker'}
- **Channel:** ${context.inboundChannel}
- **Current stage:** ${lead.stage}
${enrichment.likely_pain_points ? `- **Their pain points:** ${enrichment.likely_pain_points}` : ''}
${enrichment.icebreaker ? `- **Icebreaker:** ${enrichment.icebreaker}` : ''}

## WHAT WE SENT THEM
${lead.personalized_subject ? `Subject: ${lead.personalized_subject}` : ''}
${lead.personalized_opener ? `SMS: ${lead.personalized_opener}` : ''}`;

  // Add available CRM actions when tool context exists
  if (toolContext) {
    prompt += `

## CRM ACTIONS AVAILABLE
You can take these actions during the conversation:
- **Book appointment**: When the prospect agrees to a meeting time, confirm and book it
- **Tag contact**: Label them based on their interest level (e.g. "hot-lead", "pricing-requested")
- **Create opportunity**: When they show clear buying intent, create a sales opportunity
- **Escalate to human**: If the prospect is upset, asks a complex question, or explicitly wants a human
The CRM contact ID is: ${toolContext.contactId}
${toolContext.calendarId ? `Calendar ID for booking: ${toolContext.calendarId}` : 'No calendar configured -- offer to send a booking link instead.'}`;
  }

  prompt += `

Reply naturally as a human sales professional. Keep it short. Do NOT include a subject line -- just the message body.`;

  return prompt;
}

// ---- Direct LLM Fallback (with Function Calling) -------------------------

interface DirectLlmResult {
  text: string;
  escalation?: { reason: string; urgency: string };
  toolsUsed: string[];
}

/**
 * Fallback when no OpenClaw container is available.
 * Uses a FULL system prompt since there's no workspace to reference.
 * Supports function calling for GHL tools (book appointments, tag contacts, etc.)
 */
async function directLlmResponse(context: CloserContext): Promise<DirectLlmResult> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    console.error('[ai-closer] No OPENAI_API_KEY');
    return { text: '', toolsUsed: [] };
  }

  const systemPrompt = buildFullSystemPrompt(context);
  const messages: Array<Record<string, unknown>> = buildConversationMessages(context, systemPrompt);

  // Include GHL tools if we have a valid tool context
  const includeTools = !!context.toolContext;

  let escalation: { reason: string; urgency: string } | undefined;
  const toolsUsed: string[] = [];

  // Tool-calling loop: LLM may request multiple tool calls before generating final text
  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const body: Record<string, unknown> = {
      model: 'gpt-4o',
      messages,
      temperature: 0.7,
      max_tokens: 500,
    };

    if (includeTools && round < MAX_TOOL_ROUNDS - 1) {
      // Include tools except on the last round (force a text response)
      body.tools = GHL_TOOL_DEFINITIONS;
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      console.error(`[ai-closer] OpenAI returned ${res.status}`);
      return { text: '', toolsUsed };
    }

    const data = await res.json();
    const choice = data?.choices?.[0];
    const assistantMessage = choice?.message;

    if (!assistantMessage) {
      return { text: '', toolsUsed };
    }

    // If the LLM wants to call tools
    if (assistantMessage.tool_calls?.length && context.toolContext) {
      // Add the assistant's tool_calls message to the conversation
      messages.push({
        role: 'assistant',
        content: assistantMessage.content || null,
        tool_calls: assistantMessage.tool_calls,
      });

      // Execute each tool call and add results
      for (const toolCall of assistantMessage.tool_calls) {
        const fnName = toolCall.function?.name;
        let fnArgs: Record<string, unknown> = {};
        try {
          fnArgs = JSON.parse(toolCall.function?.arguments || '{}');
        } catch {
          fnArgs = {};
        }

        console.log(`[ai-closer] Tool call: ${fnName}(${JSON.stringify(fnArgs).slice(0, 200)})`);
        toolsUsed.push(fnName);

        const toolResult: ToolResult = await executeTool(fnName, fnArgs, context.toolContext);

        // Check for escalation
        if (toolResult.escalate) {
          escalation = toolResult.escalate;
        }

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult),
        });
      }

      // Continue the loop to let the LLM process tool results
      continue;
    }

    // No tool calls -- we have the final text response
    const text = assistantMessage.content || '';

    if (toolsUsed.length > 0) {
      console.log(`[ai-closer] Direct LLM used ${toolsUsed.length} tool(s): ${toolsUsed.join(', ')}`);
    }

    return { text, escalation, toolsUsed };
  }

  // If we exhausted all rounds (shouldn't normally happen)
  console.warn('[ai-closer] Exhausted tool call rounds without final response');
  return { text: '', escalation, toolsUsed };
}

/**
 * Full system prompt for direct LLM fallback -- includes everything
 * since there's no workspace to reference.
 */
function buildFullSystemPrompt(context: CloserContext): string {
  const { lead, campaign, enrichment, toolContext } = context;

  let prompt = `You are a skilled sales closer. Your job is to have a natural, human conversation with a prospect who replied to our outreach. You are NOT a chatbot -- you are a real salesperson having a text/email conversation.

## YOUR MISSION
Turn this reply into a booked demo/meeting. Be conversational, warm, and direct. Don't be pushy.

## THE PROSPECT
- Name: ${lead.full_name || 'Unknown'}
- Title: ${lead.title || 'Decision-maker'}
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
1. Keep responses SHORT (2-4 sentences for SMS, 3-6 for email).
2. Match their energy. If they're casual, be casual. If formal, be professional.
3. Answer their question directly, then pivot to booking a quick call.
4. If they say "not interested" -- acknowledge gracefully, one soft follow-up max.
5. If they ask "who is this?" -- explain briefly and reference the outreach.
6. If they're interested -- suggest 2-3 specific time slots.
7. Never lie, never make up capabilities.
8. Don't use emojis unless they do first.
9. Don't start with "Hey!" or "Hi there!" -- jump into substance.
10. Sign with a first name only, no titles.
11. NEVER reveal you are an AI.`;

  // Add tool usage instructions when tools are available
  if (toolContext) {
    prompt += `

## CRM TOOLS
You have access to CRM tools. Use them proactively:
- **book_appointment**: When the prospect agrees to a time, BOOK IT immediately. Don't just confirm verbally.
- **tag_contact**: Tag based on their intent (e.g. "hot-lead" if eager, "pricing-requested" if asking about cost).
- **create_opportunity**: When they show buying intent, create an opportunity to track the deal.
- **escalate_to_human**: If they're angry, ask for a human, or have a complex issue you can't handle.

The contact ID is: ${toolContext.contactId}
Location ID: ${toolContext.locationId}
${toolContext.calendarId ? `Calendar ID: ${toolContext.calendarId}` : 'No calendar configured -- suggest sending a booking link instead of trying to book directly.'}

Use tools alongside your response. For example: if they say "let's do Tuesday at 10am", book the appointment AND confirm it in your message.`;
  }

  return prompt;
}

// ---- Message Builder -----------------------------------------------------

function buildConversationMessages(
  context: CloserContext,
  systemPrompt: string,
): Array<{ role: string; content: string }> {
  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: systemPrompt },
  ];

  // Add conversation history for context (last 10 messages)
  for (const msg of context.conversationHistory.slice(-10)) {
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

// ---- Stage Analysis ------------------------------------------------------

async function analyzeAndUpdateStage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  svc: any,
  lead: LeadRecord,
  campaign: CampaignRecord,
  aiResponse: string,
  inboundMessage: string,
): Promise<string | null> {
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
    if (newIdx <= currentIdx) newStage = null;
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

      // CRM sync (non-blocking)
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

// ---- GHL Messaging -------------------------------------------------------

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
