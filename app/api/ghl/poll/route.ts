// ============================================================================
// GET /api/ghl/poll — Message Polling Endpoint
//
// Replaces webhook dependency. Polls GHL Conversations API for new inbound
// messages and processes them through AI. Called by Vercel Cron every minute.
//
// No webhooks needed. No GHL workflow needed. No marketplace approval needed.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Vercel cron config — run every minute
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60s for processing

const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const GHL_API_VERSION = '2021-04-15';

// ── GHL Contact Context ───────────────────────────────────────────────────────
// Fetches the contact's CRM profile so the AI knows who it's talking to.

interface GHLContactContext {
  fullName: string;
  email?: string;
  tags: string[];
  notes: string;
  pipelineStage?: string;
  source?: string;
  customContext: string; // formatted string ready for injection
}

async function fetchGHLContactContext(
  contactId: string,
  token: string,
): Promise<GHLContactContext | null> {
  try {
    const res = await fetch(`${GHL_API_BASE}/contacts/${contactId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Version: GHL_API_VERSION,
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;

    const { contact } = await res.json();
    if (!contact) return null;

    const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(' ') || 'Unknown';
    const email = contact.email || undefined;
    const tags: string[] = contact.tags || [];
    const source = contact.source || undefined;

    // Pull notes (may be a string or array)
    let notes = '';
    if (contact.notes) {
      if (Array.isArray(contact.notes)) {
        notes = contact.notes
          .slice(0, 3)
          .map((n: any) => (typeof n === 'string' ? n : n.body || n.text || ''))
          .filter(Boolean)
          .join('; ');
      } else if (typeof contact.notes === 'string') {
        notes = contact.notes.slice(0, 300);
      }
    }

    // Pipeline stage from opportunities (if present)
    let pipelineStage: string | undefined;
    if (contact.opportunities?.length) {
      pipelineStage = contact.opportunities[0]?.pipelineStage || contact.opportunities[0]?.status;
    }

    // Build the formatted context string
    const lines: string[] = [];
    lines.push(`--- CRM Context ---`);
    lines.push(`Contact: ${fullName}`);
    if (email) lines.push(`Email: ${email}`);
    if (tags.length) lines.push(`Tags: ${tags.join(', ')}`);
    if (pipelineStage) lines.push(`Pipeline: ${pipelineStage}`);
    if (source) lines.push(`Source: ${source}`);
    if (notes) lines.push(`Notes: ${notes}`);
    lines.push(`-------------------`);

    return {
      fullName,
      email,
      tags,
      notes,
      pipelineStage,
      source,
      customContext: lines.join('\n'),
    };
  } catch {
    return null;
  }
}

function getSupabase() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const log: string[] = [];
  const addLog = (msg: string) => { log.push(`[${Date.now() - startTime}ms] ${msg}`); console.log(`[ghl/poll] ${msg}`); };

  // ── Auth ─────────────────────────────────────────────────────────────
  const authHeader = request.headers.get('authorization');
  const bearerToken = authHeader?.replace('Bearer ', '');
  const isAuthorized =
    (bearerToken && process.env.KYRA_API_SECRET && bearerToken === process.env.KYRA_API_SECRET) ||
    (bearerToken && process.env.CRON_SECRET && bearerToken === process.env.CRON_SECRET);

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  addLog('Authorized. Starting poll...');

  try {
    // Step 1: Get clients
    addLog('Querying Supabase for GHL-connected clients...');
    const supabase = getSupabase();
    const { data: clients, error: dbError } = await supabase
      .from('agency_clients')
      .select('id, name, status, ghl_location_id, ghl_private_token, ghl_access_token, agency_id, container_config')
      .in('status', ['active', 'setup'])
      .or('ghl_access_token.not.is.null,ghl_private_token.not.is.null');

    if (dbError || !clients?.length) {
      addLog(`No clients found (error: ${dbError?.message || 'none'})`);
      return NextResponse.json({ ok: true, log, clients: 0 });
    }
    addLog(`Found ${clients.length} clients`);

    let totalProcessed = 0;
    const errors: string[] = [];

    for (const client of clients) {
      // Time guard
      if (Date.now() - startTime > 45_000) {
        addLog('Time budget hit — stopping');
        break;
      }

      const token = client.ghl_private_token || client.ghl_access_token;
      if (!token || !client.ghl_location_id) {
        addLog(`Skipping "${client.name}": missing token or location`);
        continue;
      }

      addLog(`Processing "${client.name}" (location: ${client.ghl_location_id})...`);

      // Step 2: Search GHL for unread inbound
      let conversations: any[];
      try {
        const ghlRes = await fetch(
          `${GHL_API_BASE}/conversations/search?locationId=${client.ghl_location_id}&limit=10`,
          {
            headers: { Authorization: `Bearer ${token}`, Version: GHL_API_VERSION },
            signal: AbortSignal.timeout(10_000),
          }
        );
        if (!ghlRes.ok) {
          addLog(`  GHL search failed: ${ghlRes.status}`);
          errors.push(`${client.name}: GHL ${ghlRes.status}`);
          continue;
        }
        const ghlData = await ghlRes.json();
        conversations = (ghlData.conversations || []).filter(
          (c: any) => c.lastMessageDirection === 'inbound' && (c.unreadCount || 0) > 0
        );
        addLog(`  ${conversations.length} unread inbound conversations`);
      } catch (err: any) {
        addLog(`  GHL search error: ${err.message}`);
        errors.push(`${client.name}: ${err.message}`);
        continue;
      }

      // Step 3: Resolve the client's own gateway (OVH per-client isolation)
      const { data: clientGw } = await supabase
        .from('agency_clients')
        .select('gateway_url, gateway_token, gateway_status')
        .eq('id', client.id)
        .single();

      const gatewayUrl = clientGw?.gateway_url;
      const gateway = clientGw;
      if (!gatewayUrl || !['running', 'starting'].includes(clientGw?.gateway_status || '')) {
        addLog(`  No gateway for client ${client.id}`);
        continue;
      }

      // Step 4: Process up to 3 unread conversations per client
      const MAX_CONVS = 3;
      const toProcess = conversations.slice(0, MAX_CONVS);
      if (!toProcess.length) continue;

      for (const conv of toProcess) {
        // Time guard per conversation
        if (Date.now() - startTime > 45_000) {
          addLog(`  ⏱️ Time budget hit — stopping`);
          break;
        }

        addLog(`  Processing conv with ${conv.contactName || conv.phone || 'unknown'}...`);

        // Get messages
        let latestInbound: any = null;
        let hasReply = false;
        let isFirstContact = false;
        try {
          const msgRes = await fetch(
            `${GHL_API_BASE}/conversations/${conv.id}/messages?limit=5`,
            {
              headers: { Authorization: `Bearer ${token}`, Version: GHL_API_VERSION },
              signal: AbortSignal.timeout(10_000),
            }
          );
          if (!msgRes.ok) {
            addLog(`    Get messages failed: ${msgRes.status}`);
            continue;
          }
          const msgData = await msgRes.json();
          const messages = msgData.messages?.messages || [];

          latestInbound = messages.find((m: any) => m.direction === 'inbound');
          if (!latestInbound?.body?.trim()) {
            addLog(`    No inbound message body found, skipping`);
            continue;
          }

          const inboundTime = new Date(latestInbound.dateAdded).getTime();
          hasReply = messages.some(
            (m: any) => m.direction === 'outbound' && new Date(m.dateAdded).getTime() > inboundTime
          );

          // True first contact = no outbound messages at all in this conversation
          isFirstContact = !messages.some((m: any) => m.direction === 'outbound');
        } catch (err: any) {
          addLog(`    Messages error: ${err.message}`);
          continue;
        }

        if (hasReply) {
          addLog(`    Already replied, skipping`);
          continue;
        }

        addLog(`    Inbound: "${latestInbound.body.slice(0, 60)}" — sending to gateway...`);

        // Fetch GHL contact context — gives AI CRM awareness (tags, pipeline, notes)
        const ghlToken = client.ghl_private_token || client.ghl_access_token;
        const contactCtx = ghlToken
          ? await fetchGHLContactContext(conv.contactId, ghlToken)
          : null;

        if (contactCtx) {
          addLog(`    CRM: ${contactCtx.fullName} | tags=[${contactCtx.tags.join(', ')}] | pipeline=${contactCtx.pipelineStage || 'none'}`);
        }

      // Step 5: Call gateway
      try {
        // Use clean session key with daily rotation to prevent session bloat
        const today = new Date().toISOString().slice(0, 10);
        const clientShort = client.id.slice(0, 8);
        // Hash contact ID to avoid any pattern matching issues with gateway session store
        let contactHash = 0;
        for (let i = 0; i < conv.contactId.length; i++) {
          contactHash = ((contactHash << 5) - contactHash + conv.contactId.charCodeAt(i)) | 0;
        }
        const contactKey = Math.abs(contactHash).toString(36);
        const sessionKey = `ghl:${clientShort}:${contactKey}:${today}`;

        // The AI's core identity (persona + instructions) lives in the container's SOUL.md.
        // Here we inject only the per-conversation context that SOUL.md doesn't know:
        // who the customer is, that this is SMS, and any greeting for first-time contacts.
        const cfg = (client.container_config as Record<string, unknown>) ?? {};
        const persona = (cfg.persona as string) || `AI assistant for ${client.name}`;
        const greeting = (cfg.greeting as string) || '';

        const systemContext = [
          `You are ${persona}. You are responding via SMS — keep replies concise (1-3 sentences max).`,
          greeting && isFirstContact
            ? `This is the customer's FIRST message. Open your reply with this exact greeting: "${greeting}"`
            : '',
          // CRM context — inject what we know about this contact from GHL
          contactCtx
            ? contactCtx.customContext
            : `Customer name: ${conv.contactName || conv.phone || 'Unknown'}.`,
          contactCtx?.tags?.length
            ? `Use the tags to personalise your response (e.g. if tagged 'hot-lead', be more proactive about next steps).`
            : '',
          `Respond naturally and helpfully. Do not mention you are an AI unless directly asked.`,
        ].filter(Boolean).join('\n');

        // Build OpenAI-compatible messages for /v1/chat/completions
        const chatMessages: Array<{ role: string; content: string }> = [];
        if (systemContext) {
          chatMessages.push({ role: 'system', content: systemContext });
        }
        chatMessages.push({ role: 'user', content: latestInbound.body });

        const chatRes = await fetch(`${gatewayUrl}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${gateway?.gateway_token || ''}`,
          },
          body: JSON.stringify({
            model: 'openai/gpt-4o-mini',
            messages: chatMessages,
            stream: false,
          }),
          signal: AbortSignal.timeout(30_000),
        });

        if (!chatRes.ok) {
          const errText = await chatRes.text().catch(() => '');
          addLog(`  Gateway error: ${chatRes.status} ${errText.slice(0, 100)}`);
          continue;
        }

        // Parse OpenAI-compatible response (stream: false → standard JSON)
        let aiResponse = '';
        try {
          const chatData = await chatRes.json();
          // Standard OpenAI format: choices[0].message.content
          aiResponse = chatData?.choices?.[0]?.message?.content || '';
          // Legacy bridge.js fallbacks (in case old containers still respond)
          if (!aiResponse) aiResponse = chatData?.response || chatData?.fullResponse || '';
        } catch (err: any) {
          addLog(`  Failed to parse gateway JSON: ${err.message}`);
          continue;
        }

        if (!aiResponse.trim()) {
          addLog(`  Empty AI response from gateway`);
          continue;
        }
        addLog(`  AI: "${aiResponse.slice(0, 80)}..."`);

        // Step 6: Send reply via GHL
        // Map GHL message types to valid Send Message API types
        const GHL_TYPE_MAP: Record<string, string> = {
          'TYPE_SMS': 'SMS',
          'TYPE_EMAIL': 'Email',
          'TYPE_WHATSAPP': 'WhatsApp',
          'TYPE_FB_MESSENGER': 'FB',
          'TYPE_INSTAGRAM': 'IG',
          'TYPE_LIVE_CHAT': 'Live_Chat',
          'TYPE_WEBCHAT': 'Live_Chat',
          'TYPE_GMB': 'GMB',
          'TYPE_CALL': 'SMS', // fallback for missed calls
        };
        const rawType = latestInbound.messageType || conv.lastMessageType || 'TYPE_SMS';
        const sendType = GHL_TYPE_MAP[rawType] || 'SMS';

        const sendRes = await fetch(`${GHL_API_BASE}/conversations/messages`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            Version: GHL_API_VERSION,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: sendType,
            contactId: conv.contactId,
            message: aiResponse,
          }),
          signal: AbortSignal.timeout(10_000),
        });

        if (sendRes.ok) {
          addLog(`  ✅ Reply sent to ${conv.contactName || conv.phone}`);
          totalProcessed++;

          // Log to client_conversations so Kyra dashboard shows the exchange
          const contactLabel = conv.contactName || conv.phone || 'Unknown';
          void supabase.from('client_conversations').insert({
            client_id: client.id,
            agency_id: client.agency_id,
            channel: `ghl_sms`,
            user_message: `[${contactLabel}] ${latestInbound.body}`,
            ai_response: aiResponse,
          }).then(({ error: logErr }) => {
            if (logErr) addLog(`  ⚠️ Conversation log failed: ${logErr.message}`);
          });

          // Increment usage_this_month so Overview/Heartbeat stats reflect GHL activity
          void supabase
            .rpc('increment_client_usage', { client_id: client.id })
            .then(({ error: usageErr }) => {
              if (usageErr) {
                // Fallback: manual increment if RPC not available
                void supabase
                  .from('agency_clients')
                  .select('usage_this_month')
                  .eq('id', client.id)
                  .single()
                  .then(({ data: cur }) => {
                    if (cur) {
                      supabase
                        .from('agency_clients')
                        .update({ usage_this_month: (cur.usage_this_month || 0) + 1 })
                        .eq('id', client.id);
                    }
                  });
              }
            });
        } else {
          const errText = await sendRes.text().catch(() => '');
          addLog(`  Send failed: ${sendRes.status} ${errText.slice(0, 100)}`);
          errors.push(`Send failed for ${client.name}: ${sendRes.status}`);
        }
      } catch (err: any) {
        addLog(`    Gateway/send error: ${err.message}`);
        errors.push(`${client.name}: ${err.message}`);
      }
      } // end for conv of toProcess
    }

    addLog(`Done. Processed: ${totalProcessed}, Errors: ${errors.length}`);

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      messagesProcessed: totalProcessed,
      errors,
      log,
    });
  } catch (err: any) {
    addLog(`Fatal: ${err.message}`);
    return NextResponse.json(
      { error: 'Poll failed', message: err.message, durationMs: Date.now() - startTime, log },
      { status: 500 },
    );
  }
}
