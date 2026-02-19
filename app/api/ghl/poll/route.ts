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

      // Step 3: Resolve gateway
      const { data: agencyData } = await supabase
        .from('agencies')
        .select('gateway_url')
        .eq('id', client.agency_id)
        .single();

      const gatewayUrl = agencyData?.gateway_url;
      if (!gatewayUrl) {
        addLog(`  No gateway for agency ${client.agency_id}`);
        continue;
      }

      // Step 4: Process first unread conversation only (time safety)
      const conv = conversations[0];
      if (!conv) continue;

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
          addLog(`  Get messages failed: ${msgRes.status}`);
          continue;
        }
        const msgData = await msgRes.json();
        const messages = msgData.messages?.messages || [];

        latestInbound = messages.find((m: any) => m.direction === 'inbound');
        if (!latestInbound?.body?.trim()) {
          addLog(`  No inbound message body found`);
          continue;
        }

        const inboundTime = new Date(latestInbound.dateAdded).getTime();
        hasReply = messages.some(
          (m: any) => m.direction === 'outbound' && new Date(m.dateAdded).getTime() > inboundTime
        );
      } catch (err: any) {
        addLog(`  Messages error: ${err.message}`);
        continue;
      }

      if (hasReply) {
        addLog(`  Already replied, skipping`);
        continue;
      }

      addLog(`  Inbound: "${latestInbound.body.slice(0, 60)}" — sending to gateway...`);

      // Step 5: Call gateway
      try {
        const sessionKey = `agent:client:${client.id}:contact:${conv.contactId}`;
        const persona = (client.container_config as any)?.persona || '';
        const instructions = (client.container_config as any)?.instructions || '';
        const systemContext = [
          persona ? `You are ${persona}.` : `You are an AI assistant for "${client.name}".`,
          instructions || 'Be helpful, professional, and concise.',
          `You are responding to a customer via SMS. Keep responses brief.`,
          `Customer: ${conv.contactName || conv.phone || 'Unknown'}`,
        ].join('\n');

        const chatRes = await fetch(`${gatewayUrl}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: latestInbound.body, sessionKey, systemContext }),
          signal: AbortSignal.timeout(30_000),
        });

        if (!chatRes.ok) {
          addLog(`  Gateway error: ${chatRes.status}`);
          continue;
        }

        // Read SSE stream manually to get the full AI response
        let aiResponse = '';
        const reader = chatRes.body?.getReader();
        if (!reader) {
          addLog(`  No response body reader`);
          continue;
        }
        const decoder = new TextDecoder();
        let sseBuffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          sseBuffer += decoder.decode(value, { stream: true });
        }
        // Parse SSE to get the full response
        addLog(`  SSE buffer (${sseBuffer.length} chars): ${sseBuffer.slice(0, 300).replace(/\n/g, '\\n')}`);
        for (const line of sseBuffer.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'done' && parsed.fullResponse) {
              aiResponse = parsed.fullResponse;
            } else if (parsed.response) {
              // Some gateway versions return { response: "..." } instead of SSE events
              aiResponse = parsed.response;
            } else if (parsed.fullResponse) {
              aiResponse = parsed.fullResponse;
            }
          } catch { /* ignore */ }
        }
        // Fallback: if no SSE-style response, try parsing the whole buffer as JSON
        if (!aiResponse && sseBuffer.trim()) {
          try {
            const directJson = JSON.parse(sseBuffer.trim());
            if (directJson.response) aiResponse = directJson.response;
            else if (directJson.fullResponse) aiResponse = directJson.fullResponse;
          } catch { /* not JSON */ }
        }

        if (!aiResponse.trim()) {
          addLog(`  Empty AI response`);
          continue;
        }
        addLog(`  AI: "${aiResponse.slice(0, 80)}..."`);

        // Step 6: Send reply via GHL
        const messageType = (latestInbound.messageType || 'TYPE_SMS') as string;
        const sendType = messageType.replace('TYPE_', '');

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
        addLog(`  Gateway/send error: ${err.message}`);
        errors.push(`${client.name}: ${err.message}`);
      }
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
