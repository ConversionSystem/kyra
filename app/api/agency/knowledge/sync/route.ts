// ============================================================================
// POST /api/agency/knowledge/sync
//
// Syncs knowledge documents to the gateway.
// Sends all enabled docs as a system event that gets written to MEMORY.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { getGatewayByClientId, getGatewayByAgencyId } from '@/lib/ovh/gateway-resolver';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const result = await requireAgencyMember();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  const { agency } = result.data;

  // Accept optional clientId — if provided, sync only to that client's gateway.
  // Otherwise, fall back to the first active client gateway in the agency.
  const body = await request.json().catch(() => ({}));
  const clientId = body.clientId || request.nextUrl.searchParams.get('clientId');

  const gateway = clientId
    ? await getGatewayByClientId(clientId)
    : await getGatewayByAgencyId(agency.id);

  if (!gateway) {
    return NextResponse.json({ error: 'Gateway not provisioned. Deploy a client AI first.' }, { status: 400 });
  }

  const supabase = createServiceClientWithoutCookies();

  // Get all enabled knowledge documents
  const { data: documents } = await supabase
    .from('knowledge_documents')
    .select('id, title, content, client_id, source_type, source_url, char_count')
    .eq('agency_id', agency.id)
    .eq('enabled', true)
    .order('created_at', { ascending: true });

  if (!documents?.length) {
    return NextResponse.json({ synced: 0, message: 'No documents to sync' });
  }

  // Get client names
  const { data: clients } = await supabase
    .from('agency_clients')
    .select('id, name')
    .eq('agency_id', agency.id);
  const clientMap = Object.fromEntries((clients || []).map(c => [c.id, c.name]));

  // Build knowledge base content for the gateway
  const sections: string[] = [
    '# Knowledge Base',
    `Last synced: ${new Date().toISOString()}`,
    '',
  ];

  // Group by client
  const agencyDocs = documents.filter(d => !d.client_id);
  const clientDocs = new Map<string, typeof documents>();
  for (const doc of documents.filter(d => d.client_id)) {
    const existing = clientDocs.get(doc.client_id!) || [];
    existing.push(doc);
    clientDocs.set(doc.client_id!, existing);
  }

  if (agencyDocs.length > 0) {
    sections.push('## Agency-Wide Knowledge\n');
    for (const doc of agencyDocs) {
      sections.push(`### ${doc.title}`);
      if (doc.source_url) sections.push(`Source: ${doc.source_url}`);
      sections.push(doc.content);
      sections.push('');
    }
  }

  for (const [clientId, docs] of clientDocs) {
    const clientName = clientMap[clientId] || clientId;
    sections.push(`## Knowledge for: ${clientName}\n`);
    for (const doc of docs) {
      sections.push(`### ${doc.title}`);
      if (doc.source_url) sections.push(`Source: ${doc.source_url}`);
      sections.push(doc.content);
      sections.push('');
    }
  }

  const knowledgeContent = sections.join('\n');

  // Send to gateway via HTTP API as a file write
  try {
    const writeRes = await fetch(`${gateway.url}/api/files`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${gateway.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: 'KNOWLEDGE_BASE.md',
        content: knowledgeContent,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    // Also try sending as a system event to the main session
    // This ensures the AI reads it on next interaction
    try {
      await fetch(`${gateway.url}/api/cron`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${gateway.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'wake',
          text: `[System] Knowledge base updated with ${documents.length} documents (${Math.round(knowledgeContent.length / 1024)}KB). Read KNOWLEDGE_BASE.md for the latest business knowledge.`,
        }),
        signal: AbortSignal.timeout(5_000),
      });
    } catch {
      // Wake is best-effort
    }

    // Mark documents as synced
    const now = new Date().toISOString();
    await supabase
      .from('knowledge_documents')
      .update({ synced_at: now })
      .in('id', documents.map(d => d.id));

    return NextResponse.json({
      synced: documents.length,
      totalChars: knowledgeContent.length,
      gatewayWriteOk: writeRes.ok,
    });
  } catch (err: any) {
    console.error('[knowledge/sync] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
