/**
 * __tests__/sensitive-keys.test.ts
 *
 * Regression test for the server/client-boundary credential strip added in
 * `lib/agency/sensitive-keys.ts`. The ClientDetailView server component used
 * to ship `client.container_config` raw (incl. plaintext API keys, GHL
 * tokens, app passwords) into the client bundle as React props. We now run
 * the row through `sanitizeClientForBrowser()` first.
 */
import { describe, test, expect } from 'vitest';
import {
  SENSITIVE_SENTINEL,
  stripSensitiveConfig,
  sanitizeClientForBrowser,
} from '@/lib/agency/sensitive-keys';

describe('stripSensitiveConfig — allowlist + pattern matching', () => {
  test('returns empty object for null/undefined input', () => {
    expect(stripSensitiveConfig(null)).toEqual({});
    expect(stripSensitiveConfig(undefined)).toEqual({});
  });

  test('replaces explicitly-known sensitive keys with sentinel', () => {
    const result = stripSensitiveConfig({
      heygen_api_key: 'sk-live-real-secret',
      github_token: 'ghp_realtoken',
      email_password: 'pw123',
      fathom_api_key: 'fat_xyz',
      google_service_account_key: '{"type":"service_account",...}',
      wordpress_app_password: 'xxxx xxxx xxxx xxxx',
    });
    expect(result.heygen_api_key).toBe(SENSITIVE_SENTINEL);
    expect(result.github_token).toBe(SENSITIVE_SENTINEL);
    expect(result.email_password).toBe(SENSITIVE_SENTINEL);
    expect(result.fathom_api_key).toBe(SENSITIVE_SENTINEL);
    expect(result.google_service_account_key).toBe(SENSITIVE_SENTINEL);
    expect(result.wordpress_app_password).toBe(SENSITIVE_SENTINEL);
  });

  test('replaces pattern-matched keys (future-proofing)', () => {
    const result = stripSensitiveConfig({
      some_future_api_key: 'secret',
      custom_oauth_token: 'tok',
      third_party_secret: 'sec',
      vendor_password: 'pw',
    });
    expect(result.some_future_api_key).toBe(SENSITIVE_SENTINEL);
    expect(result.custom_oauth_token).toBe(SENSITIVE_SENTINEL);
    expect(result.third_party_secret).toBe(SENSITIVE_SENTINEL);
    expect(result.vendor_password).toBe(SENSITIVE_SENTINEL);
  });

  test('passes non-sensitive keys through unchanged', () => {
    const result = stripSensitiveConfig({
      persona: 'Friendly AI',
      industry: 'HVAC',
      active_worker_id: 'sales-qualifier',
      voice_config: { enabled: true, provider: 'openclaw' },
      instructions: 'Be helpful.',
    });
    expect(result.persona).toBe('Friendly AI');
    expect(result.industry).toBe('HVAC');
    expect(result.active_worker_id).toBe('sales-qualifier');
    expect(result.voice_config).toEqual({ enabled: true, provider: 'openclaw' });
    expect(result.instructions).toBe('Be helpful.');
  });

  test('preserves empty/null sensitive values (keeps "not saved" semantics)', () => {
    const result = stripSensitiveConfig({
      heygen_api_key: '',
      github_token: null,
      fathom_api_key: undefined,
    });
    // Empty/null means no saved value — should NOT be replaced with sentinel
    // (otherwise the UI would show "Saved" for fields that are blank).
    expect(result.heygen_api_key).toBe('');
    expect(result.github_token).toBe(null);
    expect(result.fathom_api_key).toBe(undefined);
  });
});

describe('sanitizeClientForBrowser — top-level + nested sanitization', () => {
  test('strips GHL token columns on the client row', () => {
    const client = {
      id: 'client-1',
      name: 'Acme',
      ghl_access_token: 'real_access_token',
      ghl_refresh_token: 'real_refresh_token',
      ghl_private_token: 'real_private_token',
      ghl_client_secret: 'real_client_secret',
      ghl_location_id: 'loc_123', // NOT sensitive — keep
      container_config: {},
    };
    const result = sanitizeClientForBrowser(client);
    expect(result.ghl_access_token).toBe(SENSITIVE_SENTINEL);
    expect(result.ghl_refresh_token).toBe(SENSITIVE_SENTINEL);
    expect(result.ghl_private_token).toBe(SENSITIVE_SENTINEL);
    expect(result.ghl_client_secret).toBe(SENSITIVE_SENTINEL);
    expect(result.ghl_location_id).toBe('loc_123');
    expect(result.id).toBe('client-1');
    expect(result.name).toBe('Acme');
  });

  test('strips nested container_config secrets', () => {
    const client = {
      id: 'client-1',
      container_config: {
        persona: 'Helpful AI',
        heygen_api_key: 'sk-real',
        email_password: 'pw',
      },
    };
    const result = sanitizeClientForBrowser(client);
    const cfg = result.container_config as Record<string, unknown>;
    expect(cfg.persona).toBe('Helpful AI');
    expect(cfg.heygen_api_key).toBe(SENSITIVE_SENTINEL);
    expect(cfg.email_password).toBe(SENSITIVE_SENTINEL);
  });

  test('empty/missing sensitive columns stay falsy (presence check still works)', () => {
    const client = {
      id: 'client-1',
      ghl_access_token: null,
      ghl_private_token: '',
      container_config: null,
    };
    const result = sanitizeClientForBrowser(client);
    // UI code like `!!client.ghl_private_token` should still evaluate to false
    expect(result.ghl_access_token).toBeFalsy();
    expect(result.ghl_private_token).toBeFalsy();
    // container_config of null passes through as null — still falsy, which
    // matches what callers expect for the "no config yet" case.
    expect(result.container_config).toBeFalsy();
  });

  test('does not mutate the input object', () => {
    const client = {
      id: 'client-1',
      ghl_access_token: 'real_token',
      container_config: { heygen_api_key: 'real_key' },
    };
    const originalCc = client.container_config;
    sanitizeClientForBrowser(client);
    // Original object untouched — important because server code later in the
    // request may still need the real value.
    expect(client.ghl_access_token).toBe('real_token');
    expect(originalCc.heygen_api_key).toBe('real_key');
  });
});
