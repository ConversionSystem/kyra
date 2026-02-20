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
        } catch (err: any) {
          addLog(`    Messages error: ${err.message}`);
          continue;
        }

        if (hasReply) {
          addLog(`    Already replied, skipping`);
          continue;
        }

        addLog(`    Inbound: "${latestInbound.body.slice(0, 60)}" — sending to gateway...`);

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
        const persona = (client.container_config as any)?.persona || '';
        const instructions = (client.container_config as any)?.instructions || '';
        const systemContext = [
          persona ? `You are ${persona}.` : `You are an AI assistant for "${client.name}".`,
          instructions || 'Be helpful, professional, and concise.',
          `You are responding to a customer via SMS. Keep responses brief.`,
          `Customer: ${conv.contactName || conv.phone || 'Unknown'}`,
        ].join('\n');

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
