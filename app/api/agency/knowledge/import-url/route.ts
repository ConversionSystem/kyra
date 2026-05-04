// ============================================================================
// POST /api/agency/knowledge/import-url
//
// Import knowledge from a URL — fetches the page content and saves as a doc.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { getGatewayByAgencyId, getGatewayByClientId } from '@/lib/ovh/gateway-resolver';
import {
  loadKnowledgeForAgency,
  loadKnowledgeForClient,
  pushKnowledgeToGateway,
  markSynced,
} from '@/lib/knowledge/sync-to-gateway';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const result = await requireAgencyMember();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  const { agency } = result.data;
  const body = await request.json();

  if (!body.url) {
    return NextResponse.json({ error: 'Missing URL' }, { status: 400 });
  }

  try {
    // Fetch the URL content
    const pageRes = await fetch(body.url, {
      headers: { 'User-Agent': 'Kyra/1.0 (Knowledge Importer)' },
      signal: AbortSignal.timeout(15_000),
      redirect: 'follow',
    });

    if (!pageRes.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL: ${pageRes.status} ${pageRes.statusText}` },
        { status: 400 },
      );
    }

    const html = await pageRes.text();

    // Basic HTML → text extraction (strip tags, decode entities)
    const text = html
      // Remove script/style blocks
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      // Remove nav, header, footer
      .replace(/<(nav|header|footer)[\s\S]*?<\/\1>/gi, '')
      // Convert common block elements to newlines
      .replace(/<\/(p|div|h[1-6]|li|tr|br\s*\/?)>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      // Strip remaining tags
      .replace(/<[^>]+>/g, ' ')
      // Decode common entities
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      // Clean up whitespace
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (text.length < 50) {
      return NextResponse.json(
        { error: 'Page content too short — might be a login wall or empty page' },
        { status: 400 },
      );
    }

    // Truncate to 50KB
    const content = text.length > 50_000 ? text.substring(0, 50_000) + '\n\n[Truncated]' : text;

    // Extract title from HTML
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = body.title || titleMatch?.[1]?.trim() || new URL(body.url).hostname;

    const supabase = createServiceClientWithoutCookies();

    // Dedupe: if a doc for this exact URL already exists in the same scope
    // (agency-wide or this client), refresh its content + title instead of
    // inserting a fresh row. Customer 2026-05-04 had 7+ identical
    // plpcsanjose.com rows from re-adding the same URL through the
    // dashboard — this single-source-of-truth check fixes that.
    const targetClientId = (body.clientId as string | undefined) || null;
    const existingQuery = supabase
      .from('knowledge_documents')
      .select('id')
      .eq('agency_id', agency.id)
      .eq('source_url', body.url);
    const existing = targetClientId
      ? await existingQuery.eq('client_id', targetClientId).maybeSingle()
      : await existingQuery.is('client_id', null).maybeSingle();

    let data: Record<string, unknown> | null = null;
    if (existing.data?.id) {
      const upd = await supabase
        .from('knowledge_documents')
        .update({
          title,
          content,
          char_count: content.length,
          enabled: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.data.id)
        .select()
        .single();
      data = upd.data;
      if (upd.error) {
        return NextResponse.json({ error: upd.error.message }, { status: 500 });
      }
    } else {
      const doc = {
        agency_id: agency.id,
        client_id: targetClientId,
        title,
        content,
        source_type: 'url' as const,
        source_url: body.url,
        char_count: content.length,
        enabled: true,
      };
      const ins = await supabase
        .from('knowledge_documents')
        .insert(doc)
        .select()
        .single();
      data = ins.data;
      if (ins.error) {
        return NextResponse.json({ error: ins.error.message }, { status: 500 });
      }
    }

    // Auto-sync to the OpenClaw gateway so the new URL content reaches the
    // autonomous runtime (not just the embedded widget RAG which reads the
    // DB directly). Fire-and-forget — don't block the dashboard's response.
    setImmediate(async () => {
      try {
        const supabase2 = createServiceClientWithoutCookies();
        const targetClientId = body.clientId || null;
        const gateway = targetClientId
          ? await getGatewayByClientId(targetClientId)
          : await getGatewayByAgencyId(agency.id);
        if (!gateway) return;
        const bundle = targetClientId
          ? await loadKnowledgeForClient(supabase2, agency.id, targetClientId)
          : await loadKnowledgeForAgency(supabase2, agency.id);
        const push = await pushKnowledgeToGateway(gateway, bundle, { wakeAi: false });
        if (push.ok) await markSynced(supabase2, bundle.documentIds);
        else console.warn('[import-url] gateway push failed:', push.error);
      } catch (err) {
        console.warn('[import-url] auto-sync failed:', err instanceof Error ? err.message : err);
      }
    });

    return NextResponse.json({
      document: data,
      extracted: { chars: content.length, title },
    });
  } catch (err: any) {
    console.error('[knowledge/import-url] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
