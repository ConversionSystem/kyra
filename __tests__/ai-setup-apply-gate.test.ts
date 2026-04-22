/**
 * __tests__/ai-setup-apply-gate.test.ts
 *
 * Regression test for the Marketing Worker plan-gate bypass fix.
 *
 * The UI at components/dashboard/client-tabs/ai-workers-tab.tsx locks
 * the AI Marketing Worker to the master agency only (`canUseMarketingWorker
 * = isMaster`). Previously, a non-master agency admin could curl
 *   POST /api/agency/ai-setup/apply  { type: 'role', templateId: 'ai-marketing-worker' }
 * and bypass that UI gate because the route only checked `requireAgencyAdmin()`.
 *
 * These tests pin down the server-side guard added to apply/route.ts:
 *   - Non-master agency applying `ai-marketing-worker` → 403
 *   - Master agency applying `ai-marketing-worker` → NOT 403 (gate passes)
 *   - Any agency applying a public worker → NOT 403 (gate passes)
 */
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MASTER_AGENCY_ID } from '@/lib/agency/constants';

// ── Mock Supabase ──────────────────────────────────────────────────────────
// The gate runs BEFORE the Supabase call for the 403 cases, but the
// pass-through tests need the downstream client-lookup to resolve cleanly.
const mockSingle = vi.fn();
const mockEq = vi.fn().mockReturnThis();
const mockSelect = vi.fn().mockReturnThis();
const mockFrom = vi.fn(() => ({
  select: mockSelect,
  eq: mockEq,
  single: mockSingle,
  update: vi.fn().mockReturnThis(),
}));
mockSelect.mockReturnValue({ eq: mockEq, single: mockSingle });
mockEq.mockReturnValue({ eq: mockEq, single: mockSingle, select: mockSelect });

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ from: mockFrom }),
  createServiceClientWithoutCookies: () => ({ from: mockFrom }),
}));

// ── Mock auth middleware — we're not testing auth, we're testing the gate ──
const mockAgencyId = vi.fn(() => MASTER_AGENCY_ID);
vi.mock('@/lib/agency/middleware', () => ({
  requireAgencyAdmin: async () => ({
    data: {
      user: { id: 'user-1', email: 'test@example.com' },
      agency: { id: mockAgencyId(), name: 'Test Agency', slug: 'test' },
      membership: { role: 'admin' },
    },
    error: null,
  }),
}));

// ── Mock heavy apply-time deps so pass-through tests don't blow up ─────────
vi.mock('@/lib/ovh/provisioner', () => ({
  updateClientConfig: async () => ({ success: true }),
}));
vi.mock('@/lib/ghl/resolve-ghl-config', () => ({
  resolveGHLConfig: async () => ({ apiKey: null, locationId: null }),
}));

// ── Import after mocks ─────────────────────────────────────────────────────
import { POST } from '@/app/api/agency/ai-setup/apply/route';

const NON_MASTER_AGENCY = '00000000-0000-0000-0000-000000000000';

function makeRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/agency/ai-setup/apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/agency/ai-setup/apply — worker plan-gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: client lookup returns "not found" so pass-through tests stop at 404
    // (we only care about asserting NOT 403 — gate passed).
    mockSingle.mockResolvedValue({ data: null, error: { message: 'not found' } });
  });

  test('non-master agency applying ai-marketing-worker → 403', async () => {
    mockAgencyId.mockReturnValue(NON_MASTER_AGENCY);

    const res = await POST(makeRequest({
      clientId: 'client-1',
      type: 'role',
      templateId: 'ai-marketing-worker',
    }) as never);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/private beta/i);
  });

  test('master agency applying ai-marketing-worker → NOT 403 (gate passes)', async () => {
    mockAgencyId.mockReturnValue(MASTER_AGENCY_ID);

    const res = await POST(makeRequest({
      clientId: 'client-1',
      type: 'role',
      templateId: 'ai-marketing-worker',
    }) as never);

    // Gate passed; downstream returns 404 for our stub ("client not found").
    expect(res.status).not.toBe(403);
  });

  test('non-master agency applying a public worker (sales-qualifier) → NOT 403', async () => {
    mockAgencyId.mockReturnValue(NON_MASTER_AGENCY);

    const res = await POST(makeRequest({
      clientId: 'client-1',
      type: 'role',
      templateId: 'sales-qualifier',
    }) as never);

    // Gate passed; downstream returns 404 for our stub.
    expect(res.status).not.toBe(403);
  });

  test('non-master agency applying a private worker they are NOT allowlisted for → 403', async () => {
    // it-operations-specialist is visibility:private, allowlist = TrustedNetworx + Priv7
    mockAgencyId.mockReturnValue(NON_MASTER_AGENCY);

    const res = await POST(makeRequest({
      clientId: 'client-1',
      type: 'role',
      templateId: 'it-operations-specialist',
    }) as never);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/private-beta entitlement/i);
  });

  test('allowlisted agency (TrustedNetworx) applying their private worker → NOT 403', async () => {
    // TrustedNetworx UUID from role-workers.ts allowedAgencies
    mockAgencyId.mockReturnValue('18e6e562-ec29-4652-a38b-58f6be2e533f');

    const res = await POST(makeRequest({
      clientId: 'client-1',
      type: 'role',
      templateId: 'it-operations-specialist',
    }) as never);

    // Gate passed; downstream returns 404 for our stub.
    expect(res.status).not.toBe(403);
  });

  test('missing templateId returns 400, not 403 (order-of-operations check)', async () => {
    mockAgencyId.mockReturnValue(NON_MASTER_AGENCY);

    const res = await POST(makeRequest({
      clientId: 'client-1',
      type: 'role',
    }) as never);

    expect(res.status).toBe(400);
  });
});
