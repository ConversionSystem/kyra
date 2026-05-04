// ────────────────────────────────────────────────────────────────────────────
// __tests__/knowledge-sync-to-gateway.test.ts
//
// Locks the dashboard ↔ OpenClaw knowledge bridge: composition of the
// KNOWLEDGE_BASE.md bundle, chunk semantics for the provisioner payload,
// and the fail-soft contracts of pushKnowledgeToGateway.
// ────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  loadKnowledgeForAgency,
  loadKnowledgeForClient,
  pushKnowledgeToGateway,
  renderDocChunk,
} from '@/lib/knowledge/sync-to-gateway';

// Minimal Supabase chainable stub. Records the last-built query so tests can
// assert on filters (agency_id, client_id, enabled).
function makeSupabaseStub(rows: Record<string, unknown>[]) {
  const calls: { table: string; filters: Record<string, unknown>; ors: string[] } = {
    table: '',
    filters: {},
    ors: [],
  };
  const chain: Record<string, unknown> = {
    select: (_cols: string) => chain,
    eq: (col: string, val: unknown) => { calls.filters[col] = val; return chain; },
    or: (expr: string) => { calls.ors.push(expr); return chain; },
    order: (_col: string, _opts?: unknown) => chain,
    in: (_col: string, _vals: unknown[]) => chain,
    update: (_payload: Record<string, unknown>) => chain,
    then: (resolve: (v: { data: Record<string, unknown>[]; error: null }) => void) =>
      Promise.resolve({ data: rows, error: null }).then(resolve),
  };
  // Make the chain itself thenable so `await` works on the chain root.
  return {
    _calls: calls,
    from: (table: string) => { calls.table = table; return chain; },
  };
}

describe('renderDocChunk', () => {
  it('formats title + content into markdown', () => {
    const out = renderDocChunk({ title: 'Refund Policy', content: 'No refunds after 30 days.' });
    expect(out).toContain('### Refund Policy');
    expect(out).toContain('No refunds after 30 days.');
    expect(out).not.toContain('Source:');  // no URL → no Source line
  });

  it('includes Source: line when source_url provided', () => {
    const out = renderDocChunk({
      title: 'Hours',
      content: '9-5 M-F',
      source_url: 'https://example.com/hours',
    });
    expect(out).toContain('Source: https://example.com/hours');
  });

  it('trims whitespace from title + content', () => {
    const out = renderDocChunk({ title: '  Spaced  ', content: '\n  body  \n' });
    expect(out).toContain('### Spaced');
    expect(out).toContain('body');
    expect(out).not.toContain('  Spaced  ');
  });
});

describe('loadKnowledgeForClient', () => {
  it('returns empty bundle when no docs', async () => {
    const supabase = makeSupabaseStub([]);
    const bundle = await loadKnowledgeForClient(supabase as never, 'a1', 'c1');
    expect(bundle).toEqual({ content: '', chunks: [], documentCount: 0, documentIds: [], totalChars: 0 });
  });

  it('queries knowledge_documents with correct agency_id + enabled filter', async () => {
    const supabase = makeSupabaseStub([
      { id: 'd1', title: 'Hours', content: '9-5', client_id: null, source_url: null },
    ]);
    await loadKnowledgeForClient(supabase as never, 'agency-A', 'client-X');
    expect(supabase._calls.table).toBe('knowledge_documents');
    expect(supabase._calls.filters.agency_id).toBe('agency-A');
    expect(supabase._calls.filters.enabled).toBe(true);
    // OR includes both client-scoped AND agency-wide docs
    expect(supabase._calls.ors[0]).toMatch(/client_id\.eq\.client-X/);
    expect(supabase._calls.ors[0]).toMatch(/client_id\.is\.null/);
  });

  it('serializes docs into chunks + a single concatenated content string', async () => {
    const supabase = makeSupabaseStub([
      { id: 'd1', title: 'Refund Policy', content: 'No refunds after 30 days.', client_id: null, source_url: null },
      { id: 'd2', title: 'Hours', content: 'Mon-Fri 9-5', client_id: 'c1', source_url: 'https://x.com/h' },
    ]);
    const bundle = await loadKnowledgeForClient(supabase as never, 'a1', 'c1');
    expect(bundle.documentCount).toBe(2);
    expect(bundle.documentIds).toEqual(['d1', 'd2']);
    expect(bundle.chunks).toHaveLength(2);
    expect(bundle.chunks[0]).toContain('### Refund Policy');
    expect(bundle.chunks[1]).toContain('### Hours');
    expect(bundle.chunks[1]).toContain('Source: https://x.com/h');
    // Single content has the file header + agency-wide section + client section
    expect(bundle.content).toContain('# Knowledge Base');
    expect(bundle.content).toContain('## Agency-Wide Knowledge');
    expect(bundle.content).toContain('## Client-Scoped Knowledge');
    expect(bundle.totalChars).toBe(bundle.content.length);
  });

  it('omits sections that have no docs', async () => {
    // Only agency-wide doc — no client-scoped section header should appear.
    const supabase = makeSupabaseStub([
      { id: 'd1', title: 'X', content: 'Y', client_id: null, source_url: null },
    ]);
    const bundle = await loadKnowledgeForClient(supabase as never, 'a1', 'c1');
    expect(bundle.content).toContain('## Agency-Wide Knowledge');
    expect(bundle.content).not.toContain('## Client-Scoped Knowledge');
  });
});

describe('loadKnowledgeForAgency', () => {
  it('does NOT add an OR filter (returns ALL agency docs)', async () => {
    const supabase = makeSupabaseStub([]);
    await loadKnowledgeForAgency(supabase as never, 'a1');
    expect(supabase._calls.filters.agency_id).toBe('a1');
    expect(supabase._calls.filters.enabled).toBe(true);
    expect(supabase._calls.ors).toEqual([]);  // no client_id filter
  });
});

describe('pushKnowledgeToGateway', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it('PUTs to /api/files with KNOWLEDGE_BASE.md path + Bearer auth', async () => {
    let captured: { url?: string; init?: RequestInit } = {};
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      captured = { url, init };
      return { ok: true, status: 200 } as Response;
    }));

    const res = await pushKnowledgeToGateway(
      { url: 'https://gw.example.com', token: 'secret-token' },
      { content: '# KB', chunks: ['x'], documentCount: 1, documentIds: ['d1'], totalChars: 4 },
    );
    expect(res.ok).toBe(true);
    expect(captured.url).toBe('https://gw.example.com/api/files');
    expect(captured.init?.method).toBe('PUT');
    const headers = captured.init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer secret-token');
    const body = JSON.parse(String(captured.init?.body));
    expect(body).toEqual({ path: 'KNOWLEDGE_BASE.md', content: '# KB' });
  });

  it('no-ops on empty bundle (returns ok without firing fetch)', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const res = await pushKnowledgeToGateway(
      { url: 'https://gw.example.com', token: 'tok' },
      { content: '', chunks: [], documentCount: 0, documentIds: [], totalChars: 0 },
    );
    expect(res.ok).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns ok:false on non-2xx without throwing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500 } as Response)));
    const res = await pushKnowledgeToGateway(
      { url: 'https://gw.example.com', token: 'tok' },
      { content: 'x', chunks: ['x'], documentCount: 1, documentIds: ['d1'], totalChars: 1 },
    );
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/500/);
  });

  it('catches fetch errors and returns ok:false (fail-soft)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('ECONNREFUSED'); }));
    const res = await pushKnowledgeToGateway(
      { url: 'https://gw.example.com', token: 'tok' },
      { content: 'x', chunks: ['x'], documentCount: 1, documentIds: ['d1'], totalChars: 1 },
    );
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/ECONNREFUSED/);
  });

  it('fires the wake POST when wakeAi:true', async () => {
    const calls: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      calls.push(String(url));
      return { ok: true, status: 200 } as Response;
    }));
    await pushKnowledgeToGateway(
      { url: 'https://gw.example.com', token: 'tok' },
      { content: 'x', chunks: ['x'], documentCount: 1, documentIds: ['d1'], totalChars: 1 },
      { wakeAi: true },
    );
    expect(calls).toContain('https://gw.example.com/api/files');
    expect(calls).toContain('https://gw.example.com/api/cron');
  });

  it('skips the wake POST when wakeAi is omitted/false (auto-sync default)', async () => {
    const calls: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      calls.push(String(url));
      return { ok: true, status: 200 } as Response;
    }));
    await pushKnowledgeToGateway(
      { url: 'https://gw.example.com', token: 'tok' },
      { content: 'x', chunks: ['x'], documentCount: 1, documentIds: ['d1'], totalChars: 1 },
    );
    expect(calls).toEqual(['https://gw.example.com/api/files']);
  });
});
