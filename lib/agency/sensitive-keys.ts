/**
 * Server-side helper to strip sensitive credential values from a client record
 * BEFORE it crosses the wire to the browser. Keeps truthy semantics so UI
 * code that does `!!(cfg.email_password)` still reports "connected" correctly,
 * without sending the real plaintext secret into the rendered HTML / React
 * props / client-side state.
 *
 * The root problem: ClientDetailView is a server component that fetches the
 * full agency_clients row via `select('*')` and passes `client.container_config`
 * (a JSONB bag that contains things like GHL tokens, API keys, app passwords,
 * service-account JSON) straight into a client component. That entire JSON
 * blob ends up in the HTML payload the browser receives. Any extension, any
 * XSS, any local-dev debug print, any Sentry event that captures React props
 * can exfiltrate plaintext credentials.
 *
 * We replace those values with a sentinel string `'__SAVED__'` — truthy, a
 * string (so TypeScript stays happy), and visually recognizable if it ever
 * slips into a placeholder or display by mistake.
 *
 * DO NOT use this sentinel as if it were the actual secret. The backing
 * value is already in Supabase and every server-only handler that needs it
 * should re-fetch via the service-role client.
 */

export const SENSITIVE_SENTINEL = '__SAVED__' as const;

/** container_config keys that must never reach the browser as plaintext. */
const SENSITIVE_CONTAINER_CONFIG_KEYS = new Set<string>([
  'email_password',
  'microsoft_client_secret',
  'google_service_account_key',
  'fathom_api_key',
  'github_token',
  'wordpress_app_password',
  'heygen_api_key',
  'openai_api_key',
  'anthropic_api_key',
  'elevenlabs_api_key',
  'twilio_auth_token',
  'stripe_secret_key',
  'pinecone_api_key',
  'retell_api_key',
  'vapi_api_key',
]);

/**
 * Regex patterns — any container_config key matching one of these is treated
 * as sensitive. Catches future keys without requiring the allowlist above
 * to be kept in sync.
 */
const SENSITIVE_KEY_PATTERNS: RegExp[] = [
  /_api_?key$/i,
  /_secret$/i,
  /_token$/i,
  /_password$/i,
  /_private_key$/i,
];

function isSensitiveConfigKey(key: string): boolean {
  if (SENSITIVE_CONTAINER_CONFIG_KEYS.has(key)) return true;
  return SENSITIVE_KEY_PATTERNS.some(re => re.test(key));
}

/**
 * Returns a shallow copy of `config` where sensitive values are replaced with
 * the `SENSITIVE_SENTINEL` string. Non-sensitive keys pass through unchanged.
 * If `config` is null/undefined, returns an empty object.
 *
 * Nested objects are NOT recursed — the existing schema stores secrets at the
 * top level only. Revisit if nested config is added.
 */
export function stripSensitiveConfig(
  config: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!config || typeof config !== 'object') return {};

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(config)) {
    if (isSensitiveConfigKey(key) && value != null && value !== '') {
      out[key] = SENSITIVE_SENTINEL;
    } else {
      out[key] = value;
    }
  }
  return out;
}

/** Top-level column names on `agency_clients` that hold plaintext secrets. */
const SENSITIVE_CLIENT_COLUMNS = [
  'ghl_access_token',
  'ghl_refresh_token',
  'ghl_private_token',
  'ghl_client_secret',
] as const;

/**
 * Given a full agency_clients row, returns a copy safe to ship to the
 * browser. Sensitive top-level columns (GHL tokens) are replaced with the
 * sentinel; container_config is passed through `stripSensitiveConfig`.
 *
 * `select('*')` stays in the server query so the server code that assembles
 * the page still has access to everything — only what we PASS AS A PROP is
 * sanitized. Subsequent server-only API calls refetch from Supabase.
 *
 * The generic is `T extends object` (not `Record<string, unknown>`) so that
 * concrete interfaces like `AgencyClient` satisfy the constraint — an
 * interface without an index signature is NOT assignable to
 * `Record<string, unknown>` in strict mode.
 */
export function sanitizeClientForBrowser<T extends object>(client: T): T {
  const copy = { ...(client as unknown as Record<string, unknown>) };
  for (const col of SENSITIVE_CLIENT_COLUMNS) {
    if (copy[col] != null && copy[col] !== '') {
      copy[col] = SENSITIVE_SENTINEL;
    }
  }
  if (copy.container_config && typeof copy.container_config === 'object') {
    copy.container_config = stripSensitiveConfig(copy.container_config as Record<string, unknown>);
  }
  return copy as unknown as T;
}
