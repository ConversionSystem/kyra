// ============================================================================
// Knowledge Sync — Push generated site content into the Knowledge Base
//
// After content generation completes, this module:
// 1. Reads key pages (homepage, services, FAQ) from site_pages
// 2. Inserts them into knowledge_documents with source_type: 'website'
// 3. Calls the knowledge sync endpoint if the client has an active container
// ============================================================================

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import type { ContentSection, FaqItem } from './types';

// ---------- Public API ----------

export async function syncSiteToKnowledgeBase(siteId: string): Promise<void> {
  const supabase = createServiceClientWithoutCookies();

  // 1. Get the site config
  const { data: site, error: siteErr } = await supabase
    .from('client_sites')
    .select('id, client_id, agency_id, business_name, site_domain, site_subdomain')
    .eq('id', siteId)
    .single();

  if (siteErr || !site) {
    console.error('[knowledge-sync] Site not found:', siteId, siteErr?.message);
    return;
  }

  if (!site.client_id || !site.agency_id) {
    console.warn('[knowledge-sync] Site missing client_id or agency_id, skipping sync');
    return;
  }

  // 2. Get key pages (homepage, service pages, FAQ, about)
  const { data: pages, error: pagesErr } = await supabase
    .from('site_pages')
    .select('slug, page_type, title, hero_h1, hero_subtitle, content_sections, faq')
    .eq('site_id', siteId)
    .in('page_type', ['homepage', 'service', 'utility']);

  if (pagesErr || !pages?.length) {
    console.error('[knowledge-sync] No pages to sync:', pagesErr?.message);
    return;
  }

  // 3. Delete any existing website knowledge docs for this client
  //    (so we don't accumulate stale content on regeneration)
  await supabase
    .from('knowledge_documents')
    .delete()
    .eq('client_id', site.client_id)
    .eq('source_type', 'website');

  // 4. Build knowledge documents from page content
  const domain = site.site_domain || site.site_subdomain || '';
  const baseUrl = domain ? `https://${domain}` : '';

  const docs: Array<{
    agency_id: string;
    client_id: string;
    title: string;
    content: string;
    source_type: string;
    source_url: string | null;
    char_count: number;
    enabled: boolean;
  }> = [];

  for (const page of pages) {
    const content = buildKnowledgeContent(page);
    if (content.length < 50) continue; // Skip nearly-empty pages

    docs.push({
      agency_id: site.agency_id,
      client_id: site.client_id,
      title: page.title || page.hero_h1 || page.slug,
      content,
      source_type: 'website',
      source_url: baseUrl ? `${baseUrl}${page.slug}` : null,
      char_count: content.length,
      enabled: true,
    });
  }

  if (!docs.length) {
    console.warn('[knowledge-sync] No substantive content to sync');
    return;
  }

  // 5. Insert knowledge documents (batch)
  const { error: insertErr } = await supabase
    .from('knowledge_documents')
    .insert(docs);

  if (insertErr) {
    console.error('[knowledge-sync] Failed to insert knowledge docs:', insertErr.message);
    return;
  }

  console.log(
    `[knowledge-sync] Synced ${docs.length} knowledge docs for site ${siteId}`,
  );

  // 6. Update site record
  await supabase
    .from('client_sites')
    .update({ knowledge_synced: true })
    .eq('id', siteId);

  // 7. Trigger knowledge sync on the client's container (if active)
  await triggerContainerSync(site.client_id);
}

// ---------- Helpers ----------

function buildKnowledgeContent(page: {
  title: string;
  hero_h1: string | null;
  hero_subtitle: string | null;
  content_sections: unknown;
  faq: unknown;
}): string {
  const parts: string[] = [];

  if (page.hero_h1) parts.push(page.hero_h1);
  if (page.hero_subtitle) parts.push(page.hero_subtitle);

  const sections = page.content_sections as ContentSection[] | null;
  if (Array.isArray(sections)) {
    for (const section of sections) {
      if (section.heading) parts.push(`\n${section.heading}`);
      if (section.body) parts.push(section.body);
      if (section.bullets?.length) {
        parts.push(section.bullets.map((b) => `- ${b}`).join('\n'));
      }
    }
  }

  const faq = page.faq as FaqItem[] | null;
  if (Array.isArray(faq)) {
    parts.push('\nFrequently Asked Questions');
    for (const item of faq) {
      parts.push(`Q: ${item.question}`);
      parts.push(`A: ${item.answer}`);
    }
  }

  return parts.join('\n').trim();
}

async function triggerContainerSync(clientId: string): Promise<void> {
  const supabase = createServiceClientWithoutCookies();

  // Check if the client has an active container
  const { data: client } = await supabase
    .from('agency_clients')
    .select('gateway_url, gateway_token, gateway_status')
    .eq('id', clientId)
    .single();

  if (!client?.gateway_url || client.gateway_status !== 'running') {
    console.log('[knowledge-sync] No active container for client, skipping container sync');
    return;
  }

  // Trigger the knowledge sync endpoint on the container
  try {
    const res = await fetch(`${client.gateway_url}/api/knowledge/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${client.gateway_token}`,
      },
      body: JSON.stringify({ source: 'website' }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      console.warn(
        `[knowledge-sync] Container sync returned ${res.status}:`,
        await res.text().catch(() => ''),
      );
    } else {
      console.log('[knowledge-sync] Container knowledge sync triggered');
    }
  } catch (err) {
    console.warn('[knowledge-sync] Failed to reach container:', err);
    // Non-fatal: knowledge is still in the DB, container will pick it up on next query
  }
}
