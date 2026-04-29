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
    vi.unstubAllEnvs();
    vi.stubEnv('JANE_API_BASE_URL', 'https://demo-api.nonprod-iheartjane.com');
  });
  afterEach(() => {
    clearAccessToken(CREDS);
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

  it('builds the GET url with store_id + ids and Bearer header', async () => {
    let urls: string[] = [];
    let bearer: string | undefined;
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      urls.push(url);
      // First call = token exchange, second = stock lookup
      if (urls.length === 1) {
        return { ok: true, status: 200, text: async () => '',
          json: async () => ({ access_token: 'STOCK-TOK', expires_in: 3600 }) } as unknown as Response;
      }
      bearer = (init?.headers as Record<string, string>)?.Authorization;
      return {
        ok: true, status: 200, text: async () => '',
        json: async () => ({
          products: [
            { product_id: 1, available_for_pickup: true, available_for_delivery: false },
            { product_id: 2, available_for_pickup: false, available_for_delivery: false },
          ],
        }),
      } as unknown as Response;
    }));

    const r = await checkStock(CREDS, [1, 2, 3], 4398);
    expect(urls[1]).toContain('/menu/v1/products?');
    expect(urls[1]).toContain('store_id=4398');
    expect(urls[1]).toContain('ids=1%2C2%2C3'); // url-encoded comma
    expect(bearer).toBe('Bearer STOCK-TOK');
    expect(r.inStock).toEqual({ '1': true, '2': false }); // either: pickup OR delivery
    expect(r.unknown).toEqual(['3']); // not in Jane's response
  });

  it('channel:"pickup" returns true only when available_for_pickup', async () => {
    let i = 0;
    vi.stubGlobal('fetch', vi.fn(async () => {
      i++;
      if (i === 1) {
        return { ok: true, status: 200, text: async () => '',
          json: async () => ({ access_token: 'X', expires_in: 3600 }) } as unknown as Response;
      }
      return { ok: true, status: 200, text: async () => '',
        json: async () => ({ products: [
          { product_id: 1, available_for_pickup: true,  available_for_delivery: false },
          { product_id: 2, available_for_pickup: false, available_for_delivery: true  },
        ] }) } as unknown as Response;
    }));
    const r = await checkStock(CREDS, [1, 2], 4398, 'pickup');
    expect(r.inStock).toEqual({ '1': true, '2': false });
  });

  it('channel:"delivery" returns true only when available_for_delivery', async () => {
    let i = 0;
    vi.stubGlobal('fetch', vi.fn(async () => {
      i++;
      if (i === 1) {
        return { ok: true, status: 200, text: async () => '',
          json: async () => ({ access_token: 'X', expires_in: 3600 }) } as unknown as Response;
      }
      return { ok: true, status: 200, text: async () => '',
        json: async () => ({ products: [
          { product_id: 1, available_for_pickup: true,  available_for_delivery: false },
          { product_id: 2, available_for_pickup: false, available_for_delivery: true  },
        ] }) } as unknown as Response;
    }));
    const r = await checkStock(CREDS, [1, 2], 4398, 'delivery');
    expect(r.inStock).toEqual({ '1': false, '2': true });
  });

  it('on 401, refreshes the token once and retries — succeeds on second attempt', async () => {
    let calls = 0;
    vi.stubGlobal('fetch', vi.fn(async () => {
      calls++;
      // Call 1: token exchange (success)
      if (calls === 1) {
        return { ok: true, status: 200, text: async () => '',
          json: async () => ({ access_token: 'STALE', expires_in: 3600 }) } as unknown as Response;
      }
      // Call 2: stock check w/ stale token → 401
      if (calls === 2) {
        return { ok: false, status: 401, text: async () => 'Unauthorized',
          json: async () => ({}) } as unknown as Response;
      }
      // Call 3: re-exchange token
      if (calls === 3) {
        return { ok: true, status: 200, text: async () => '',
          json: async () => ({ access_token: 'FRESH', expires_in: 3600 }) } as unknown as Response;
      }
      // Call 4: retry stock check w/ fresh token (success)
      return { ok: true, status: 200, text: async () => '',
        json: async () => ({ products: [{ product_id: 99, available_for_pickup: true }] }) } as unknown as Response;
    }));
    const r = await checkStock(CREDS, [99], 4398);
    expect(calls).toBe(4);
    expect(r.inStock).toEqual({ '99': true });
  });
});
