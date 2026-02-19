// ============================================================================
// GHL Message Poller — Replaces webhook dependency entirely
//
// Polls the GHL Conversations API for new inbound messages.
// No webhooks needed. Works with draft marketplace apps.
//
// Logic:
// 1. Get all active agency_clients with GHL tokens
// 2. For each client, search conversations with inbound unread messages
// 3. For each conversation, get messages and find new inbound ones
// 4. Skip if we already replied (outbound message is newer than latest inbound)
// 5. Process through REAL OpenClaw Gateway (via Kyra Bridge on Fly.io)
//
// Architecture:
//   Poller → HTTP POST /chat → Kyra Bridge → OpenClaw Gateway (real AI)
//   The bridge runs alongside a real `openclaw gateway` instance.
//   All responses come from OpenClaw with full skills, memory, and tools.
// ============================================================================

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { getSessionKeyForClient } from '@/lib/agency/container';
import { sendGHLMessage, getValidToken, refreshGHLToken } from './api';
import { getClientPermissions, buildPermissionPrompt } from '@/lib/agency/permissions';
import { getGatewayByAgencyId } from '@/lib/openclaw/gateway-resolver';
import type { AgencyClient, AgencyTemplate } from '@/lib/agency/types';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const GHL_API_VERSION = '2021-04-15';

// ── BYOK: Agency API key resolution ───────────────────────────────────────────

interface ResolvedApiKey {
  apiKey: string;
  provider: 'anthropic' | 'openai' | 'google' | 'openrouter';
  model?: string; // override model when using non-Anthropic provider
}

/**
 * Look up the agency's BYOK API keys from Supabase.
 * Priority: anthropic → openrouter → openai → google → fallback to env var.
 */
async function resolveAgencyApiKey(agencyId: string): Promise<ResolvedApiKey | null> {
  const supabase = createServiceClientWithoutCookies();
  const { data: agency } = await supabase
    .from('agencies')
    .select('api_keys')
    .eq('id', agencyId)
    .single();

  const keys = (agency?.api_keys as Record<string, string>) || {};

  // Prefer Anthropic (native bridge support)
  if (keys.anthropic) {
    return { apiKey: keys.anthropic, provider: 'anthropic' };
  }
  // OpenRouter can route to Claude models via OpenAI-compatible API
  if (keys.openrouter) {
    return {
      apiKey: keys.openrouter,
      provider: 'openrouter',
      model: 'anthropic/claude-sonnet-4-20250514',
    };
  }
  // OpenAI native
  if (keys.openai) {
    return { apiKey: keys.openai, provider: 'openai', model: 'gpt-4o' };
  }
  // Google AI — not yet supported in bridge, skip for now
  // if (keys.google) { ... }

  return null; // No BYOK keys — caller should fall back to env var
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface GHLConversationSearchItem {
  id: string;
  locationId: string;
  contactId: string;
  lastMessageBody: string;
  lastMessageDate: number;
  lastMessageType: string;
  lastMessageDirection: 'inbound' | 'outbound';
  unreadCount: number;
  fullName?: string;
  contactName?: string;
  phone?: string;
  email?: string;
}

interface GHLMessageItem {
  id: string;
  direction: 'inbound' | 'outbound';
  body: string;
  contactId: string;
  conversationId: string;
  locationId: string;
  dateAdded: string;
  messageType: string;
  from?: string;
  to?: string;
  status?: string;
}

interface PollResult {
  clientId: string;
  clientName: string;
  conversationsChecked: number;
  messagesProcessed: number;
  errors: string[];
}

// ── Main Poll Function ────────────────────────────────────────────────────────

export async function pollAllClients(): Promise<PollResult[]> {
  const functionStart = Date.now();
  const TIME_BUDGET_MS = 50_000; // Stop processing at 50s to leave headroom for Vercel's 60s limit

  const supabase = createServiceClientWithoutCookies();

  // Get all clients with GHL tokens (OAuth or Private Integration)
  const { data: clients, error } = await supabase
    .from('agency_clients')
    .select('*, agency_templates(*)')
    .in('status', ['active', 'setup'])
    .or('ghl_access_token.not.is.null,ghl_private_token.not.is.null');

  if (error || !clients || clients.length === 0) {
    console.log('[ghl/poller] No active GHL-connected clients found');
    return [];
  }

  const results: PollResult[] = [];

  // Pre-resolve BYOK keys per agency (batch — multiple clients may share an agency)
  const agencyKeyCache = new Map<string, ResolvedApiKey | null>();

  for (const client of clients) {
    // Time budget check — stop before Vercel kills us
    const elapsed = Date.now() - functionStart;
    if (elapsed > TIME_BUDGET_MS) {
      console.warn(`[ghl/poller] ⏱️ Time budget exceeded (${elapsed}ms) — skipping remaining ${clients.length - results.length} clients`);
      break;
    }

    // Resolve BYOK key for this client's agency (cached)
    const agencyId = (client as AgencyClient).agency_id;
    if (agencyId && !agencyKeyCache.has(agencyId)) {
      agencyKeyCache.set(agencyId, await resolveAgencyApiKey(agencyId).catch(() => null));
    }
    const byokKey = agencyId ? agencyKeyCache.get(agencyId) ?? null : null;

    const result = await pollClient(
      client as AgencyClient & { agency_templates?: AgencyTemplate | null },
      byokKey,
    ).catch((err) => ({
      clientId: client.id,
      clientName: client.name,
      conversationsChecked: 0,
      messagesProcessed: 0,
      errors: [String(err)],
    }));
    results.push(result);
  }

  return results;
}

// ── Per-Client Polling ────────────────────────────────────────────────────────

async function pollClient(
  client: AgencyClient & { agency_templates?: AgencyTemplate | null },
  byokKey: ResolvedApiKey | null,
): Promise<PollResult> {
  const result: PollResult = {
    clientId: client.id,
    clientName: client.name,
    conversationsChecked: 0,
    messagesProcessed: 0,
    errors: [],
  };

  const isPrivateToken = !!client.ghl_private_token;

  let accessToken: string;
  try {
    accessToken = await getValidToken(client.id);
  } catch (err) {
    result.errors.push(`Token error: ${err}`);
    return result;
  }

  // Search for conversations with unread inbound messages
  let conversations: GHLConversationSearchItem[];
  try {
    conversations = await searchInboundConversations(accessToken, client.ghl_location_id!);
  } catch (err: unknown) {
    // If 401 and using OAuth tokens, try refreshing once
    // Private Integration tokens don't expire, so 401 = invalid token (don't retry)
    if (!isPrivateToken && err instanceof Error && err.message.includes('401')) {
      try {
        const supabase = createServiceClientWithoutCookies();
        const { data: clientData } = await supabase
          .from('agency_clients')
          .select('ghl_refresh_token')
          .eq('id', client.id)
          .single();
        if (clientData?.ghl_refresh_token) {
          const tokens = await refreshGHLToken(client.id, clientData.ghl_refresh_token);
          accessToken = tokens.access_token;
          conversations = await searchInboundConversations(accessToken, client.ghl_location_id!);
        } else {
          result.errors.push('No refresh token available');
          return result;
        }
      } catch (refreshErr) {
        result.errors.push(`Token refresh failed: ${refreshErr}`);
        return result;
      }
    } else {
      result.errors.push(`Search error: ${err}`);
      return result;
    }
  }

  result.conversationsChecked = conversations.length;

  // Limit to 3 conversations per client per cycle to stay within time budget
  const MAX_CONVS_PER_CYCLE = 3;
  const toProcess = conversations.slice(0, MAX_CONVS_PER_CYCLE);
  if (conversations.length > MAX_CONVS_PER_CYCLE) {
    console.log(`[ghl/poller] Client "${client.name}": ${conversations.length} unread conversations, processing first ${MAX_CONVS_PER_CYCLE} this cycle`);
  }

  for (const conv of toProcess) {
    try {
      const processed = await processConversation(accessToken, conv, client, byokKey);
      if (processed) {
        result.messagesProcessed++;
      }
    } catch (err) {
      result.errors.push(`Conv ${conv.id}: ${err}`);
    }
  }

  return result;
}

// ── Search Conversations ──────────────────────────────────────────────────────

async function searchInboundConversations(
  token: string,
  locationId: string,
): Promise<GHLConversationSearchItem[]> {
  const res = await fetch(
    `${GHL_API_BASE}/conversations/search?locationId=${locationId}&sortBy=last_message_date&sortOrder=desc&limit=20`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Version: GHL_API_VERSION,
      },
      signal: AbortSignal.timeout(15_000),
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GHL search failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  const allConversations: GHLConversationSearchItem[] = data.conversations || [];

  // Only process conversations where:
  // 1. Last message was inbound (customer sent something)
  // 2. There are unread messages
  // 3. Message type is SMS, WhatsApp, etc. (not calls or no-show)
  return allConversations.filter(
    (c) =>
      c.lastMessageDirection === 'inbound' &&
      c.unreadCount > 0 &&
      c.lastMessageType !== 'TYPE_NO_SHOW' &&
      c.lastMessageType !== 'TYPE_CALL',
  );
}

// ── Process Single Conversation ───────────────────────────────────────────────

async function processConversation(
  token: string,
  conv: GHLConversationSearchItem,
  client: AgencyClient & { agency_templates?: AgencyTemplate | null },
  byokKey: ResolvedApiKey | null,
): Promise<boolean> {
  // Get recent messages to check if we already replied
  const res = await fetch(
    `${GHL_API_BASE}/conversations/${conv.id}/messages?limit=5`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Version: GHL_API_VERSION,
      },
      signal: AbortSignal.timeout(15_000),
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Get messages failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  const messages: GHLMessageItem[] = data.messages?.messages || [];

  if (messages.length === 0) return false;

  // Messages are sorted newest first. Find the latest inbound message.
  const latestInbound = messages.find((m) => m.direction === 'inbound');
  if (!latestInbound || !latestInbound.body?.trim()) return false;

  // Check if there's already an outbound reply AFTER this inbound message
  const latestInboundTime = new Date(latestInbound.dateAdded).getTime();
  const hasReply = messages.some(
    (m) =>
      m.direction === 'outbound' &&
      new Date(m.dateAdded).getTime() > latestInboundTime,
  );

  if (hasReply) {
    // Already replied, skip
    return false;
  }

  // ── Permissions check ─────────────────────────────────────────────────
  const permissions = getClientPermissions(client.container_config as Record<string, unknown>);

  if (permissions.mode === 'readonly') {
    console.log(
      `[ghl/poller] ⏸️ Client "${client.name}" is in READ-ONLY mode — skipping reply to ${conv.contactName || conv.phone}`,
    );
    return false;
  }

  if (!permissions.ghl.sendMessages) {
    console.log(
      `[ghl/poller] ⏸️ Client "${client.name}" does not have sendMessages permission — skipping reply to ${conv.contactName || conv.phone}`,
    );
    return false;
  }

  const permissionPrompt = buildPermissionPrompt(permissions);

  const processingStart = Date.now();
  console.log(
    `[ghl/poller] New inbound from ${conv.contactName || conv.phone}: "${latestInbound.body.substring(0, 80)}"`,
  );

  // ── Enrich context ──────────────────────────────────────────────────
  const contactName = conv.fullName || conv.contactName || conv.phone || conv.email || 'Customer';
  const messageType = (latestInbound.messageType || conv.lastMessageType || 'TYPE_SMS') as
    | 'TYPE_SMS'
    | 'TYPE_EMAIL'
    | 'TYPE_WHATSAPP'
    | 'TYPE_FB_MESSENGER'
    | 'TYPE_INSTAGRAM'
    | 'TYPE_LIVE_CHAT'
    | 'TYPE_CALL';

  // Fetch contact details from GHL for richer context
  const contactInfo = await fetchContactInfo(token, conv.contactId).catch(() => null);

  // Build conversation history string from recent messages
  const conversationHistory = buildConversationHistory(messages);

  // Build enriched system prompt
  const systemContext = buildEnrichedSystemPrompt(
    client,
    client.agency_templates,
    {
      messageType: formatChannelName(messageType),
      contactName,
      contactInfo,
      conversationHistory,
    },
    permissionPrompt,
  );

  const sessionKey = `${getSessionKeyForClient(client.id)}:contact:${conv.contactId}`;

  // Resolve the agency's own gateway (per-agency isolation)
  const agencyGateway = await getGatewayByAgencyId(client.agency_id);
  const bridgeUrl = agencyGateway?.url;
  if (!bridgeUrl) {
    throw new Error(`No isolated gateway provisioned for agency ${client.agency_id}`);
  }

  // Call the agency's own OpenClaw Bridge (isolated per-agency gateway)
  const bridgePayload: Record<string, unknown> = {
    message: latestInbound.body,
    sessionKey,
    systemContext,
  };

  if (byokKey) {
    console.log(`[ghl/poller] Agency has BYOK key (${byokKey.provider}) — gateway uses its own keys for now`);
  }

  const bridgeRes = await fetch(`${bridgeUrl}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bridgePayload),
    signal: AbortSignal.timeout(30_000), // 30s max — must fit within Vercel's 60s function limit
  });

  if (!bridgeRes.ok) {
    const text = await bridgeRes.text().catch(() => '');
    throw new Error(`Bridge error (${bridgeRes.status}): ${text}`);
  }

  const sseBody = await bridgeRes.text();
  const aiResponse = parseSSEResponse(sseBody);

  if (!aiResponse?.trim()) {
    console.warn('[ghl/poller] Empty AI response, skipping');
    return false;
  }

  const processingTimeMs = Date.now() - processingStart;
  console.log(`[ghl/poller] AI response (${aiResponse.length} chars, ${processingTimeMs}ms), sending to ${contactName}`);

  // ── Send reply back through GHL ─────────────────────────────────────
  await sendGHLMessage(client.id, token, conv.contactId, aiResponse, messageType);

  // ── Log the interaction ─────────────────────────────────────────────
  try {
    const supabase = createServiceClientWithoutCookies();
    await supabase.from('ghl_message_log').insert({
      agency_client_id: client.id,
      conversation_id: conv.id,
      contact_id: conv.contactId,
      contact_name: contactName,
      contact_phone: conv.phone || contactInfo?.phone || null,
      contact_email: contactInfo?.email || null,
      inbound_message: latestInbound.body,
      ai_response: aiResponse,
      message_type: formatChannelName(messageType),
      response_time_ms: processingTimeMs,
    });
  } catch (logErr) {
    // Non-fatal — don't let logging failures stop the flow
    console.warn('[ghl/poller] Failed to log message:', logErr);
  }

  console.log(`[ghl/poller] ✅ Reply sent to ${contactName} for "${client.name}" (${processingTimeMs}ms)`);
  return true;
}

// ── SSE Parser (same as webhook-handler) ──────────────────────────────────────

function parseSSEResponse(sseBody: string): string {
  const chunks: string[] = [];

  for (const line of sseBody.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) continue;

    const jsonStr = trimmed.slice(5).trim();
    if (!jsonStr || jsonStr === '[DONE]') continue;

    try {
      const event = JSON.parse(jsonStr);
      if (event.type === 'content' && (event.content || event.text)) {
        chunks.push(event.content || event.text);
      }
      if (event.type === 'done' && event.fullResponse) {
        return event.fullResponse;
      }
      if (event.type === 'done') break;
    } catch {
      // Skip malformed
    }
  }

  return chunks.join('');
}

// ── Contact Enrichment ────────────────────────────────────────────────────────

interface ContactInfo {
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  tags?: string[];
  city?: string;
  state?: string;
  source?: string;
  dateAdded?: string;
  customFields?: Array<{ key: string; value: string }>;
}

/**
 * Fetch contact details from GHL to enrich the AI's context.
 * The AI will know the customer's name, company, tags, location, etc.
 */
async function fetchContactInfo(
  token: string,
  contactId: string,
): Promise<ContactInfo | null> {
  const res = await fetch(
    `${GHL_API_BASE}/contacts/${contactId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Version: GHL_API_VERSION,
      },
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (!res.ok) return null;

  const data = await res.json();
  const contact = data.contact || data;

  return {
    name: contact.name || `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email,
    phone: contact.phone,
    companyName: contact.companyName,
    tags: contact.tags || [],
    city: contact.city,
    state: contact.state,
    source: contact.source,
    dateAdded: contact.dateAdded,
    customFields: (contact.customFields || [])
      .filter((f: { fieldKey?: string; fieldValue?: string }) => f.fieldValue)
      .map((f: { fieldKey: string; fieldValue: string }) => ({
        key: f.fieldKey,
        value: f.fieldValue,
      })),
  };
}

// ── Conversation History Builder ──────────────────────────────────────────────

/**
 * Build a formatted conversation history string from recent messages.
 * This gives the AI context about the conversation so far.
 */
function buildConversationHistory(messages: GHLMessageItem[]): string {
  if (messages.length <= 1) return '';

  // Messages come newest-first, reverse for chronological order
  const chronological = [...messages].reverse();

  const lines: string[] = [];
  for (const msg of chronological) {
    if (!msg.body?.trim()) continue;
    const sender = msg.direction === 'inbound' ? 'Customer' : 'AI';
    const time = new Date(msg.dateAdded).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
    lines.push(`[${time}] ${sender}: ${msg.body}`);
  }

  return lines.length > 0 ? lines.join('\n') : '';
}

// ── Enriched System Prompt ────────────────────────────────────────────────────

interface EnrichedContext {
  messageType: string;
  contactName: string;
  contactInfo: ContactInfo | null;
  conversationHistory: string;
}

/**
 * Build a rich system prompt that includes:
 * - Client/business identity
 * - Contact details (who the customer is)
 * - Recent conversation history
 * - Behavioral instructions
 */
function buildEnrichedSystemPrompt(
  client: AgencyClient & { agency_templates?: AgencyTemplate | null },
  template: AgencyTemplate | null | undefined,
  ctx: EnrichedContext,
  permissionPrompt?: string,
): string {
  const lines: string[] = [];

  // ── Identity
  lines.push(`You are an AI assistant for "${client.name}".`);
  lines.push(`Industry: ${client.industry || 'General'}`);
  lines.push(`You are responding to customer messages via ${ctx.messageType}.`);
  lines.push('');

  // ── Contact context
  if (ctx.contactInfo) {
    lines.push('--- Customer Information ---');
    if (ctx.contactInfo.name && ctx.contactInfo.name !== ctx.contactName) {
      lines.push(`Name: ${ctx.contactInfo.name}`);
    } else {
      lines.push(`Name: ${ctx.contactName}`);
    }
    if (ctx.contactInfo.email) lines.push(`Email: ${ctx.contactInfo.email}`);
    if (ctx.contactInfo.companyName) lines.push(`Company: ${ctx.contactInfo.companyName}`);
    if (ctx.contactInfo.city || ctx.contactInfo.state) {
      lines.push(`Location: ${[ctx.contactInfo.city, ctx.contactInfo.state].filter(Boolean).join(', ')}`);
    }
    if (ctx.contactInfo.tags && ctx.contactInfo.tags.length > 0) {
      lines.push(`Tags: ${ctx.contactInfo.tags.join(', ')}`);
    }
    if (ctx.contactInfo.source) lines.push(`Lead source: ${ctx.contactInfo.source}`);
    if (ctx.contactInfo.customFields && ctx.contactInfo.customFields.length > 0) {
      for (const f of ctx.contactInfo.customFields.slice(0, 5)) {
        lines.push(`${f.key}: ${f.value}`);
      }
    }
    lines.push('');
  } else {
    lines.push(`Customer: ${ctx.contactName}`);
    lines.push('');
  }

  // ── Conversation history
  if (ctx.conversationHistory) {
    lines.push('--- Recent Conversation ---');
    lines.push(ctx.conversationHistory);
    lines.push('');
  }

  // ── Template instructions
  if (template?.soul_template) {
    lines.push('--- Business Instructions ---');
    lines.push(template.soul_template);
    lines.push('');
  }

  // ── Behavioral rules
  lines.push('--- Response Guidelines ---');
  lines.push('- Keep responses helpful, professional, and concise.');
  lines.push('- Use the customer\'s name when you know it.');
  lines.push('- Reference their previous messages when relevant for continuity.');
  lines.push('- When you don\'t know something specific about the business, be honest and offer to connect them with a team member.');
  lines.push('- For SMS: keep responses under 300 characters when possible. Be direct.');
  lines.push('- Never make up specific business details (prices, hours, addresses) unless provided in your instructions.');

  // ── Permission constraints
  if (permissionPrompt) {
    lines.push('');
    lines.push(permissionPrompt);
  }

  return lines.join('\n');
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatChannelName(channel: string): string {
  const map: Record<string, string> = {
    TYPE_SMS: 'SMS',
    TYPE_EMAIL: 'Email',
    TYPE_WHATSAPP: 'WhatsApp',
    TYPE_FB_MESSENGER: 'Facebook Messenger',
    TYPE_INSTAGRAM: 'Instagram DM',
    TYPE_LIVE_CHAT: 'Live Chat',
    TYPE_CALL: 'Phone Call',
  };
  return map[channel] || channel;
}
