// ────────────────────────────────────────────────────────────────────────────
// jane-api-token-and-stock.test.ts
//
// Locks the OAuth2 token cache + Menu API V1 stock-check shape. Mocks fetch
// so we never hit Jane in CI but the wire format is verified.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getAccessToken,
  clearAccessToken,
  checkStock,
  clearStockCache,
  type JaneApiCredentials,
} from '@/lib/integrations/jane-api';

const CREDS: JaneApiCredentials = {
  uid: 'test-uid',
  secret: 'test-secret',
  clientSlug: 'TESTCLNT',
};

describe('getAccessToken — OAuth2 client_credentials flow', () => {
  beforeEach(() => {
    clearAccessToken(CREDS);
    vi.unstubAllEnvs();
    vi.stubEnv('JANE_API_BASE_URL', 'https://demo-api.nonprod-iheartjane.com');
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    clearAccessToken(CREDS);
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('POSTs to /oauth/token with Basic auth header + creds in body (compat for proxy gateways)', async () => {
    let captured: { url?: string; init?: RequestInit } = {};
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      captured = { url, init };
      return {
        ok: true,
        status: 200,
        text: async () => '',
        json: async () => ({ access_token: 'TOKEN-A', expires_in: 3600 }),
      } as unknown as Response;
    }));

    const t = await getAccessToken(CREDS);
    expect(t).toBe('TOKEN-A');
    // Production diagnostic: /oauth2/token → 404 (path absent), /oauth/token → exists.
    expect(captured.url).toBe('https://demo-api.nonprod-iheartjane.com/oauth/token');
    expect(captured.init?.method).toBe('POST');
    const headers = captured.init?.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/x-www-form-urlencoded');
    // Basic auth header — what Cognito expects for confidential clients with a secret.
    const expectedBasic = Buffer.from('test-uid:test-secret').toString('base64');
    expect(headers.Authorization).toBe(`Basic ${expectedBasic}`);
    const body = String(captured.init?.body);
    expect(body).toContain('grant_type=client_credentials');
    // Belt-and-suspenders: also send creds in body for non-Cognito proxy handlers.
    expect(body).toContain('client_id=test-uid');
    expect(body).toContain('client_secret=test-secret');
  });

  it('caches the token across calls until near-expiry', async () => {
    const fetchSpy = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => '',
      json: async () => ({ access_token: 'CACHED', expires_in: 3600 }),
    }) as unknown as Response);
    vi.stubGlobal('fetch', fetchSpy);

    const t1 = await getAccessToken(CREDS);
    const t2 = await getAccessToken(CREDS);
    const t3 = await getAccessToken(CREDS);
    expect([t1, t2, t3]).toEqual(['CACHED', 'CACHED', 'CACHED']);
    expect(fetchSpy).toHaveBeenCalledTimes(1); // 2nd + 3rd hit cache
  });

  it('throws a helpful error on non-2xx (so callers can fail-open + log)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 401,
      text: async () => 'Invalid client',
      json: async () => ({}),
    } as unknown as Response)));
    await expect(getAccessToken(CREDS)).rejects.toThrow(/token exchange 401/);
  });

  it('throws when response is missing access_token', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => '',
      json: async () => ({ token_type: 'Bearer' }), // no access_token
    } as unknown as Response)));
    await expect(getAccessToken(CREDS)).rejects.toThrow(/missing access_token/);
  });
});

describe('checkStock — Menu API V1 freshness check', () => {
  beforeEach(() => {
    clearAccessToken(CREDS);
    clearStockCache();
    vi.unstubAllEnvs();
    vi.stubEnv('JANE_API_BASE_URL', 'https://demo-api.nonprod-iheartjane.com');
  });
  afterEach(() => {
    clearAccessToken(CREDS);
    clearStockCache();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('returns empty result for empty product list (no fetch fired)', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const r = await checkStock(CREDS, [], 4398);
    expect(r).toEqual({ inStock: {}, unknown: [] });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('paginates the LIST endpoint and resolves stock from set membership', async () => {
    const urls: string[] = [];
    let bearer: string | undefined;
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      urls.push(url);
      // 1st call: token exchange.
      if (urls.length === 1) {
        return { ok: true, status: 200, text: async () => '',
          json: async () => ({ access_token: 'STOCK-TOK', expires_in: 3600 }) } as unknown as Response;
      }
      bearer = (init?.headers as Record<string, string>)?.Authorization;
      // 2nd call: page 1 (returns 2 items + a pagination_id cursor).
      if (urls.length === 2) {
        return { ok: true, status: 200, text: async () => '',
          json: async () => ({
            data: { menu_products: [
              { id: 100, product_id: 1 },
              { id: 200, product_id: 2 },
            ] },
            metadata: { count: 2, total: 3, pagination_id: 200 },
          }) } as unknown as Response;
      }
      // 3rd call: page 2 (returns last item, null cursor → stop).
      return { ok: true, status: 200, text: async () => '',
        json: async () => ({
          data: { menu_products: [{ id: 300, product_id: 4 }] },
          metadata: { count: 1, total: 3, pagination_id: null },
        }) } as unknown as Response;
    }));

    const r = await checkStock(CREDS, [1, 2, 3, 4], 4398);
    // Path discovered via Jane's Swagger UI 2026-05-05:
    // GET /roots/menu_api/v1/menu_products?store_id=…&page_size=…&include_invisible_and_out_of_stock=false
    expect(urls[1]).toContain('/roots/menu_api/v1/menu_products?');
    expect(urls[1]).toContain('store_id=4398');
    expect(urls[1]).toContain('include_invisible_and_out_of_stock=false');
    expect(urls[1]).not.toContain('ids='); // unsupported, must not be sent
    // Page 2 follows the cursor returned in page 1's metadata.
    expect(urls[2]).toContain('pagination_id=200');
    expect(bearer).toBe('Bearer STOCK-TOK');
    // 1, 2, 4 are in the set; 3 is not.
    expect(r.inStock).toEqual({ '1': true, '2': true, '3': false, '4': true });
    expect(r.unknown).toEqual([]); // no "unknown" bucket — full-store walk is definitive
  });

  it('caches the in-stock snapshot — second call within TTL fires zero fetches', async () => {
    let calls = 0;
    vi.stubGlobal('fetch', vi.fn(async () => {
      calls++;
      if (calls === 1) {
        return { ok: true, status: 200, text: async () => '',
          json: async () => ({ access_token: 'TOK', expires_in: 3600 }) } as unknown as Response;
      }
      return { ok: true, status: 200, text: async () => '',
        json: async () => ({
          data: { menu_products: [{ id: 10, product_id: 1 }] },
          metadata: { count: 1, total: 1, pagination_id: null },
        }) } as unknown as Response;
    }));
    const a = await checkStock(CREDS, [1], 4398);
    expect(a.inStock).toEqual({ '1': true });
    const callsAfterFirst = calls;
    const b = await checkStock(CREDS, [1, 99], 4398);
    expect(b.inStock).toEqual({ '1': true, '99': false });
    expect(calls).toBe(callsAfterFirst); // cache hit — no new network calls
  });

  it('matches on either `id` or `product_id` (Algolia keys vary)', async () => {
    let calls = 0;
    vi.stubGlobal('fetch', vi.fn(async () => {
      calls++;
      if (calls === 1) {
        return { ok: true, status: 200, text: async () => '',
          json: async () => ({ access_token: 'TOK', expires_in: 3600 }) } as unknown as Response;
      }
      return { ok: true, status: 200, text: async () => '',
        json: async () => ({
          data: { menu_products: [{ id: 16947559, product_id: 18717 }] },
          metadata: { count: 1, total: 1, pagination_id: null },
        }) } as unknown as Response;
    }));
    // Caller can pass either id form and get a hit.
    const r = await checkStock(CREDS, [16947559, 18717, 99999], 4398);
    expect(r.inStock).toEqual({ '16947559': true, '18717': true, '99999': false });
  });

  it('on 401 mid-walk, refreshes the token once and retries the same page', async () => {
    let calls = 0;
    vi.stubGlobal('fetch', vi.fn(async () => {
      calls++;
      // Call 1: token exchange.
      if (calls === 1) {
        return { ok: true, status: 200, text: async () => '',
          json: async () => ({ access_token: 'STALE', expires_in: 3600 }) } as unknown as Response;
      }
      // Call 2: page 1 → 401 (stale token).
      if (calls === 2) {
        return { ok: false, status: 401, text: async () => 'Unauthorized',
          json: async () => ({}) } as unknown as Response;
      }
      // Call 3: re-exchange.
      if (calls === 3) {
        return { ok: true, status: 200, text: async () => '',
          json: async () => ({ access_token: 'FRESH', expires_in: 3600 }) } as unknown as Response;
      }
      // Call 4: retry page 1 with fresh token.
      return { ok: true, status: 200, text: async () => '',
        json: async () => ({
          data: { menu_products: [{ id: 99, product_id: 99 }] },
          metadata: { count: 1, total: 1, pagination_id: null },
        }) } as unknown as Response;
    }));
    const r = await checkStock(CREDS, [99], 4398);
    expect(calls).toBe(4);
    expect(r.inStock).toEqual({ '99': true });
  });

  it('stops paging on empty page (defensive guard against infinite cursor loops)', async () => {
    let calls = 0;
    vi.stubGlobal('fetch', vi.fn(async () => {
      calls++;
      if (calls === 1) {
        return { ok: true, status: 200, text: async () => '',
          json: async () => ({ access_token: 'TOK', expires_in: 3600 }) } as unknown as Response;
      }
      // Page 1: returns one row but a non-null cursor (would loop).
      if (calls === 2) {
        return { ok: true, status: 200, text: async () => '',
          json: async () => ({
            data: { menu_products: [{ id: 1, product_id: 1 }] },
            metadata: { count: 1, total: 99, pagination_id: 1 },
          }) } as unknown as Response;
      }
      // Page 2: empty — must terminate the walk even though total > seen.
      return { ok: true, status: 200, text: async () => '',
        json: async () => ({
          data: { menu_products: [] },
          metadata: { count: 0, total: 99, pagination_id: 1 },
        }) } as unknown as Response;
    }));
    const r = await checkStock(CREDS, [1], 4398);
    expect(calls).toBe(3); // token + page 1 + page 2 (empty), then break
    expect(r.inStock).toEqual({ '1': true });
  });
});
