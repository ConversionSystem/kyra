/**
 * __tests__/require-client-access.test.ts
 *
 * Regression test for the cross-tenant bypass fix added in
 * `lib/agency/middleware.ts:requireClientAccess()`.
 *
 * Scenarios we pin down:
 *   - Missing/empty clientId → 400
 *   - Unauthenticated caller → 401 (bubbled from requireAgencyMember)
 *   - Caller with no agency membership → 403
 *   - Client not found → 404
 *   - Cross-tenant: caller's agency_id ≠ client.agency_id → 403
 *   - Happy path: caller IS a member of the client's agency → full context
 */
import { describe, test, expect, vi, beforeEach } from 'vitest';

// ── Mock Supabase ──────────────────────────────────────────────────────────
const mockMaybeSingle = vi.fn();
const mockEq = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));

// Auth-side single() for agency_members + agencies lookups used by requireAgencyMember
const mockAuthSingle = vi.fn();
const mockAuthLimit = vi.fn(() => ({ single: mockAuthSingle }));
const mockAuthEq = vi.fn(() => ({ limit: mockAuthLimit, single: mockAuthSingle }));
const mockAuthSelect = vi.fn(() => ({ eq: mockAuthEq }));
const mockAuthFrom = vi.fn(() => ({ select: mockAuthSelect }));

const mockGetUser = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: mockGetUser },
    from: mockAuthFrom,
  }),
  createServiceClientWithoutCookies: () => ({ from: mockFrom }),
}));

// ── Import AFTER mocks ─────────────────────────────────────────────────────
import { requireClientAccess } from '@/lib/agency/middleware';

const CALLER_AGENCY = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const OTHER_AGENCY  = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const CLIENT_ID     = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const USER_ID       = 'user-1';

function stubAuthenticatedCaller() {
  mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
  // agency_members lookup
  mockAuthSingle
    .mockResolvedValueOnce({
      data: { user_id: USER_ID, agency_id: CALLER_AGENCY, role: 'admin' },
      error: null,
    })
    // agencies lookup
    .mockResolvedValueOnce({
      data: { id: CALLER_AGENCY, name: 'Caller Agency' },
      error: null,
    });
}

describe('requireClientAccess — cross-tenant guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('missing clientId → 400', async () => {
    const result = await requireClientAccess(undefined);
    expect(result.error?.status).toBe(400);
    expect(result.error?.message).toMatch(/clientId/i);
  });

  test('empty string clientId → 400', async () => {
    const result = await requireClientAccess('');
    expect(result.error?.status).toBe(400);
  });

  test('unauthenticated caller → 401', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await requireClientAccess(CLIENT_ID);
    expect(result.error?.status).toBe(401);
  });

  test('caller with no agency membership → 403', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
    mockAuthSingle.mockResolvedValueOnce({ data: null, error: { message: 'no rows' } });

    const result = await requireClientAccess(CLIENT_ID);
    expect(result.error?.status).toBe(403);
  });

  test('client not found → 404', async () => {
    stubAuthenticatedCaller();
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await requireClientAccess(CLIENT_ID);
    expect(result.error?.status).toBe(404);
  });

  test('cross-tenant: client belongs to DIFFERENT agency → 403', async () => {
    stubAuthenticatedCaller();
    mockMaybeSingle.mockResolvedValue({
      data: { id: CLIENT_ID, agency_id: OTHER_AGENCY, name: 'Other Client' },
      error: null,
    });

    const result = await requireClientAccess(CLIENT_ID);
    expect(result.error?.status).toBe(403);
    expect(result.error?.message).toMatch(/do not have access/i);
  });

  test('happy path: caller IS a member of the client\'s agency → data returned', async () => {
    stubAuthenticatedCaller();
    mockMaybeSingle.mockResolvedValue({
      data: { id: CLIENT_ID, agency_id: CALLER_AGENCY, name: 'My Client' },
      error: null,
    });

    const result = await requireClientAccess(CLIENT_ID);
    expect(result.error).toBeNull();
    expect(result.data?.client.id).toBe(CLIENT_ID);
    expect(result.data?.client.agency_id).toBe(CALLER_AGENCY);
    expect(result.data?.agency.id).toBe(CALLER_AGENCY);
  });

  test('supabase error during client lookup → 404 (treated as not-found)', async () => {
    stubAuthenticatedCaller();
    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: { message: 'db error' },
    });

    const result = await requireClientAccess(CLIENT_ID);
    expect(result.error?.status).toBe(404);
  });
});
