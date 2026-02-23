// ============================================================================
// GET /api/agency/clients/:id/export
//
// Export client data as Obsidian-friendly Markdown.
// Supports: ?format=md&type=conversations|summary|all&range=7d|30d|all
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { createClient } from '@/lib/supabase/server';

type RouteContext = { params: Promise<{ id: string }> };

type ExportType = 'conversations' | 'summary' | 'all';
type ExportRange = '7d' | '30d' | 'all';

interface MessageRow {
  id: string;
  conversation_id: string;
  contact_id: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  inbound_message: string;
  ai_response: string;
  message_type: string | null;
  response_time_ms: number | null;
  created_at: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function getRangeStart(range: ExportRange): string | null {
  if (range === 'all') return null;
  const now = new Date();
  const days = range === '7d' ? 7 : 30;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatPeriod(range: ExportRange, rangeStart: string | null): string {
  const now = new Date();
  if (range === 'all') return 'All time';
  const start = rangeStart ? formatDate(rangeStart) : 'Start';
  const end = formatDate(now.toISOString());
  return `${start} – ${end}`;
}

// ── Markdown Generators ────────────────────────────────────────────────────

function generateSummaryMarkdown(
  clientName: string,
  messages: MessageRow[],
  range: ExportRange,
  rangeStart: string | null,
): string {
  const totalMessages = messages.length;

  // Average response time
  const responseTimes = messages
    .map((m) => m.response_time_ms)
    .filter((t): t is number => t !== null && t > 0);
  const avgResponseTimeMs =
    responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0;
  const avgResponseTimeSec = Math.round(avgResponseTimeMs / 100) / 10;

  // Channel breakdown
  const channelCounts: Record<string, number> = {};
  for (const msg of messages) {
    const ch = msg.message_type || 'Unknown';
    channelCounts[ch] = (channelCounts[ch] || 0) + 1;
  }
  const channelStr = Object.entries(channelCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([ch, count]) => `${ch} (${count})`)
    .join(', ');

  // Estimated credits (token-based estimate: 1 token ≈ 4 chars)
  let estimatedTokens = 0;
  for (const msg of messages) {
    estimatedTokens += Math.ceil((msg.inbound_message?.length || 0) / 4) + 500;
    estimatedTokens += Math.ceil((msg.ai_response?.length || 0) / 4);
  }

  // Top contacts
  const contactCounts: Record<string, { name: string; count: number }> = {};
  for (const msg of messages) {
    const key = msg.contact_id;
    if (!contactCounts[key]) {
      contactCounts[key] = { name: msg.contact_name || msg.contact_phone || msg.contact_email || 'Unknown', count: 0 };
    }
    contactCounts[key].count++;
  }
  const topContacts = Object.values(contactCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const lines: string[] = [
    `## Summary`,
    ``,
    `- **Period:** ${formatPeriod(range, rangeStart)}`,
    `- **Total Messages:** ${totalMessages.toLocaleString()}`,
    `- **Avg Response Time:** ${avgResponseTimeSec}s`,
    `- **Channels:** ${channelStr || 'None'}`,
    `- **Estimated Tokens Used:** ${estimatedTokens.toLocaleString()}`,
    ``,
  ];

  if (topContacts.length > 0) {
    lines.push(`### Top Contacts`);
    lines.push(``);
    for (const c of topContacts) {
      lines.push(`- **${c.name}** — ${c.count} message${c.count !== 1 ? 's' : ''}`);
    }
    lines.push(``);
  }

  return lines.join('\n');
}

function generateConversationsMarkdown(messages: MessageRow[]): string {
  if (messages.length === 0) {
    return `## Conversations\n\n*No conversations found for this period.*\n`;
  }

  // Group messages by contact_id, ordered by time
  const grouped: Record<string, MessageRow[]> = {};
  const contactOrder: string[] = [];
  for (const msg of messages) {
    const key = msg.contact_id;
    if (!grouped[key]) {
      grouped[key] = [];
      contactOrder.push(key);
    }
    grouped[key].push(msg);
  }

  const lines: string[] = [`## Conversations`, ``];

  for (const contactId of contactOrder) {
    const contactMessages = grouped[contactId];
    const first = contactMessages[0];
    const contactName = first.contact_name || first.contact_phone || first.contact_email || 'Unknown Contact';
    const channel = first.message_type || 'Unknown';

    // Date range for this contact
    const firstDate = formatDate(contactMessages[contactMessages.length - 1].created_at);
    const lastDate = formatDate(contactMessages[0].created_at);
    const dateStr = firstDate === lastDate ? firstDate : `${firstDate} – ${lastDate}`;

    lines.push(`### Contact: ${contactName}`);
    lines.push(`**Channel:** ${channel} | **Messages:** ${contactMessages.length} | **Date:** ${dateStr}`);
    lines.push(``);

    // Print messages in chronological order (oldest first)
    const chronological = [...contactMessages].reverse();
    for (const msg of chronological) {
      const time = formatDateShort(msg.created_at);
      const responseTime = msg.response_time_ms ? ` _(${Math.round(msg.response_time_ms / 100) / 10}s)_` : '';

      lines.push(`> **${contactName} (inbound):** ${msg.inbound_message}`);
      lines.push(`>`);
      lines.push(`> **AI (outbound)${responseTime}:** ${msg.ai_response}`);
      lines.push(`> _${time}_`);
      lines.push(``);
    }

    lines.push(`---`);
    lines.push(``);
  }

  return lines.join('\n');
}

// ── Route Handler ──────────────────────────────────────────────────────────

export async function GET(request: NextRequest, context: RouteContext) {
  const { id: clientId } = await context.params;

  // Auth
  const result = await requireAgencyMember();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  const { agency } = result.data;
  const supabase = await createClient();

  // Validate client belongs to this agency
  const { data: client, error: clientError } = await supabase
    .from('agency_clients')
    .select('id, name, slug, industry, status')
    .eq('id', clientId)
    .eq('agency_id', agency.id)
    .single();

  if (clientError || !client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  // Parse params
  const { searchParams } = new URL(request.url);
  const exportType = (searchParams.get('type') || 'all') as ExportType;
  const range = (searchParams.get('range') || 'all') as ExportRange;

  if (!['conversations', 'summary', 'all'].includes(exportType)) {
    return NextResponse.json({ error: 'Invalid type. Use: conversations, summary, all' }, { status: 400 });
  }
  if (!['7d', '30d', 'all'].includes(range)) {
    return NextResponse.json({ error: 'Invalid range. Use: 7d, 30d, all' }, { status: 400 });
  }

  // Fetch messages
  const rangeStart = getRangeStart(range);
  let query = supabase
    .from('ghl_message_log')
    .select('*')
    .eq('agency_client_id', clientId)
    .order('created_at', { ascending: false });

  if (rangeStart) {
    query = query.gte('created_at', rangeStart);
  }

  const { data: messages, error: msgError } = await query;

  if (msgError) {
    console.error('[export] Error fetching messages:', msgError);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }

  const allMessages = (messages || []) as MessageRow[];
  const today = new Date().toISOString().split('T')[0];
  const format = searchParams.get('format') || 'md';

  // ── HTML Report ────────────────────────────────────────────────────────────
  if (format === 'html') {
    const totalMessages = allMessages.length;
    const responseTimes = allMessages.map((m) => m.response_time_ms).filter((t): t is number => t !== null && t > 0);
    const avgMs = responseTimes.length > 0 ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : 0;
    const avgSec = (avgMs / 1000).toFixed(1);
    const period = rangeStart ? `${formatDate(rangeStart)} – ${formatDate(new Date().toISOString())}` : 'All time';

    const conversationRows = allMessages.slice(0, 200).map((msg) => `
      <div class="conv">
        <div class="conv-meta">
          <span class="contact">${msg.contact_name || msg.contact_phone || 'Unknown'}</span>
          <span class="date">${formatDateShort(msg.created_at)}</span>
          <span class="channel">${msg.message_type || 'SMS'}</span>
        </div>
        <div class="bubble user">${msg.inbound_message?.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>') || ''}</div>
        <div class="bubble ai">${msg.ai_response?.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>') || ''}</div>
      </div>`).join('\n');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${client.name} — AI Report — ${today}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111; background: #fff; padding: 32px; max-width: 900px; margin: 0 auto; }
  h1 { font-size: 24px; font-weight: 800; color: #1e1b4b; margin-bottom: 4px; }
  .subtitle { font-size: 13px; color: #6b7280; margin-bottom: 32px; }
  .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 32px; }
  .stat { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; text-align: center; }
  .stat-value { font-size: 28px; font-weight: 900; color: #4f46e5; }
  .stat-label { font-size: 11px; color: #9ca3af; margin-top: 2px; }
  h2 { font-size: 16px; font-weight: 700; color: #111; margin: 24px 0 16px; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb; }
  .conv { margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid #f3f4f6; }
  .conv-meta { display: flex; gap: 12px; align-items: center; margin-bottom: 10px; }
  .contact { font-weight: 600; font-size: 13px; color: #1f2937; }
  .date { font-size: 11px; color: #9ca3af; }
  .channel { font-size: 10px; background: #ede9fe; color: #5b21b6; padding: 2px 8px; border-radius: 99px; font-weight: 600; }
  .bubble { padding: 10px 14px; border-radius: 12px; font-size: 13px; line-height: 1.6; max-width: 80%; margin-bottom: 6px; }
  .bubble.user { background: #f3f4f6; color: #374151; border-radius: 12px 12px 12px 2px; }
  .bubble.ai { background: #ede9fe; color: #1e1b4b; margin-left: auto; border-radius: 12px 12px 2px 12px; }
  footer { margin-top: 48px; font-size: 11px; color: #d1d5db; text-align: center; }
  @media print {
    body { padding: 16px; }
    .bubble { break-inside: avoid; }
    .conv { break-inside: avoid; page-break-inside: avoid; }
  }
</style>
</head>
<body>
<h1>${client.name}</h1>
<p class="subtitle">AI Conversation Report &mdash; ${period} &mdash; Generated ${today} by Kyra</p>
<div class="stats">
  <div class="stat"><div class="stat-value">${totalMessages.toLocaleString()}</div><div class="stat-label">Total conversations</div></div>
  <div class="stat"><div class="stat-value">${avgSec}s</div><div class="stat-label">Avg AI response time</div></div>
  <div class="stat"><div class="stat-value">${client.industry || '—'}</div><div class="stat-label">Industry</div></div>
</div>
<h2>Conversations${allMessages.length > 200 ? ' (most recent 200)' : ''}</h2>
${conversationRows || '<p style="color:#9ca3af;font-size:13px">No conversations in this period.</p>'}
<footer>Powered by Kyra AI &bull; kyra.conversionsystem.com</footer>
</body>
</html>`;

    const filename = `${client.slug || client.name.toLowerCase().replace(/\s+/g, '-')}-report-${today}.html`;
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  }

  // ── Build Markdown (default) ───────────────────────────────────────────────
  const mdLines: string[] = [
    `# ${client.name} — AI Assistant Report`,
    `> Exported from Kyra on ${today}`,
    ``,
  ];

  if (exportType === 'summary' || exportType === 'all') {
    mdLines.push(generateSummaryMarkdown(client.name, allMessages, range, rangeStart));
  }

  if (exportType === 'conversations' || exportType === 'all') {
    mdLines.push(generateConversationsMarkdown(allMessages));
  }

  const markdown = mdLines.join('\n');
  const filename = `${client.slug || client.name.toLowerCase().replace(/\s+/g, '-')}-export-${today}.md`;

  return new NextResponse(markdown, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
