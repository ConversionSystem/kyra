// ============================================================================
// lib/knowledge/sync-to-gateway.ts
//
// Bridge between the dashboard's training-document store
// (`knowledge_documents` table) and the OpenClaw runtime workspace files.
//
// Two consumers today:
//   1. The embedded chat widget at /api/widget/chat — reads via lib/knowledge/rag.ts
//      `getKnowledgeContext()` (in-memory at request time)
//   2. The OpenClaw autonomous runtime — reads workspace files (KNOWLEDGE_BASE.md)
//      that the dashboard pushes via either the OVH provisioner (full container
//      config) or the direct gateway HTTP /api/files endpoint (lightweight
//      runtime updates).
//
// Before this module, only path (1) was wired automatically. Path (2)
// existed (see /api/agency/knowledge/sync POST handler) but only fired on
// a manual sync button — so when a customer added a training doc via the
// Training tab, the widget got it instantly but OpenClaw stayed blind until
// someone clicked sync. Same for new clients: their gateway provisioned
// without the agency's knowledge base.
//
// This helper centralizes the load + serialize logic so all sync paths
// (manual button, doc CRUD, client provisioning) share one source of truth.
// ============================================================================
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * One serialized knowledge bundle ready to ship to a gateway.
 *
 * - `content`     — the full KNOWLEDGE_BASE.md as a single string
 *                   (what /api/files PUT writes when the gateway is hot)
 * - `chunks`      — the same content split into per-document markdown
 *                   sections (what the OVH provisioner expects in its
 *                   `config.knowledgeBase` array)
 * - `documentCount` — how many enabled docs went into the bundle
 * - `documentIds` — IDs of every doc in the bundle, used by the caller
 *                   to mark `synced_at` after a successful push
 */
export interface KnowledgeBundle {
  content: string;
  chunks: string[];
  documentCount: number;
  documentIds: string[];
  totalChars: number;
}

interface KnowledgeRow {
  id: string;
  title: string;
  content: string;
  client_id: string | null;
  source_url: string | null;
}

/**
 * Load + serialize the knowledge base for a specific client.
 *
 * Includes:
 *   - All AGENCY-WIDE docs (`client_id IS NULL`) — every client gets these
 *   - Docs scoped to THIS client (`client_id = clientId`)
 *
 * Excludes disabled docs. Returns an empty bundle if there's nothing to ship —
 * callers can no-op without an extra existence check.
 */
export async function loadKnowledgeForClient(
  supabase: SupabaseClient,
  agencyId: string,
  clientId: string,
): Promise<KnowledgeBundle> {
  const { data, error } = await supabase
    .from('knowledge_documents')
    .select('id, title, content, client_id, source_url')
    .eq('agency_id', agencyId)
    .eq('enabled', true)
    .or(`client_id.eq.${clientId},client_id.is.null`)
    .order('client_id', { ascending: true, nullsFirst: true })  // agency-wide first
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`[knowledge/sync] load failed: ${error.message}`);
  }

  return serializeBundle((data || []) as KnowledgeRow[]);
}

/**
 * Load + serialize ALL agency knowledge (agency-wide + every client's docs).
 * Used by the "sync all" path that pushes the same bundle to the agency's
 * primary gateway. Mirrors the existing /api/agency/knowledge/sync behaviour.
 */
export async function loadKnowledgeForAgency(
  supabase: SupabaseClient,
  agencyId: string,
): Promise<KnowledgeBundle> {
  const { data, error } = await supabase
    .from('knowledge_documents')
    .select('id, title, content, client_id, source_url')
    .eq('agency_id', agencyId)
    .eq('enabled', true)
    .order('client_id', { ascending: true, nullsFirst: true })
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`[knowledge/sync] load failed: ${error.message}`);
  }

  return serializeBundle((data || []) as KnowledgeRow[]);
}

/**
 * Format a single doc as a markdown chunk. Used by `serializeBundle` and
 * exported so the chunked payload to the provisioner is reproducible.
 */
export function renderDocChunk(doc: { title: string; content: string; source_url?: string | null }): string {
  const parts: string[] = [`### ${doc.title.trim()}`];
  if (doc.source_url) parts.push(`Source: ${doc.source_url}`);
  parts.push('', doc.content.trim(), '');
  return parts.join('\n');
}

function serializeBundle(rows: KnowledgeRow[]): KnowledgeBundle {
  if (rows.length === 0) {
    return { content: '', chunks: [], documentCount: 0, documentIds: [], totalChars: 0 };
  }

  // Single-document chunks — what the provisioner wants.
  const chunks = rows.map((r) =>
    renderDocChunk({ title: r.title, content: r.content, source_url: r.source_url }),
  );

  // Single concatenated KNOWLEDGE_BASE.md — what the direct gateway file
  // write expects. Keeps a header + section dividers between agency-wide
  // and per-client docs so the OpenClaw model can scope its references.
  const sections: string[] = ['# Knowledge Base', `Last synced: ${new Date().toISOString()}`, ''];

  const agencyWide = rows.filter((r) => !r.client_id);
  const clientScoped = rows.filter((r) => r.client_id);

  if (agencyWide.length) {
    sections.push('## Agency-Wide Knowledge', '');
    for (const r of agencyWide) {
      sections.push(renderDocChunk(r));
    }
  }
  if (clientScoped.length) {
    sections.push('## Client-Scoped Knowledge', '');
    for (const r of clientScoped) {
      sections.push(renderDocChunk(r));
    }
  }

  const content = sections.join('\n');

  return {
    content,
    chunks,
    documentCount: rows.length,
    documentIds: rows.map((r) => r.id),
    totalChars: content.length,
  };
}

/**
 * Mark documents as freshly synced. Best-effort — don't block the sync flow
 * if this fails; the doc just stays "unsynced" in the dashboard until the
 * next successful round-trip.
 */
export async function markSynced(
  supabase: SupabaseClient,
  documentIds: string[],
): Promise<void> {
  if (!documentIds.length) return;
  await supabase
    .from('knowledge_documents')
    .update({ synced_at: new Date().toISOString() })
    .in('id', documentIds);
}

/**
 * Push a knowledge bundle to a single client's gateway via the direct HTTP
 * file-write API. Used by the manual sync endpoint and by the auto-sync
 * triggers that fire after a knowledge document CRUD operation.
 *
 * Fail-soft: returns an error rather than throwing so callers can decide
 * whether to surface it. Designed to be invoked fire-and-forget from
 * dashboard CRUD handlers (the customer shouldn't wait for the gateway
 * round-trip just to save a training doc).
 */
export async function pushKnowledgeToGateway(
  gateway: { url: string; token: string },
  bundle: KnowledgeBundle,
  options: { wakeAi?: boolean } = {},
): Promise<{ ok: boolean; error?: string }> {
  if (bundle.documentCount === 0) {
    // Nothing to push but not an error — caller may still want to clear the
    // gateway's KNOWLEDGE_BASE.md by writing an empty header. For now we
    // no-op so re-sync after deleting all docs leaves stale content; that's
    // acceptable since OpenClaw treats missing knowledge as "no extra info".
    return { ok: true };
  }

  try {
    const writeRes = await fetch(`${gateway.url}/api/files`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${gateway.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: 'KNOWLEDGE_BASE.md',
        content: bundle.content,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!writeRes.ok) {
      return { ok: false, error: `gateway write HTTP ${writeRes.status}` };
    }

    // Best-effort wake so the AI re-reads on the next interaction. Lightweight,
    // 5s timeout, errors are swallowed because the file write IS the sync.
    if (options.wakeAi) {
      try {
        await fetch(`${gateway.url}/api/cron`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${gateway.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'wake',
            text: `[System] Knowledge base updated with ${bundle.documentCount} documents (${Math.round(bundle.totalChars / 1024)}KB). Read KNOWLEDGE_BASE.md for the latest business knowledge.`,
          }),
          signal: AbortSignal.timeout(5_000),
        });
      } catch {
        // wake is best-effort
      }
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
