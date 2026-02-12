/**
 * Kyra Worker health check utility
 *
 * Pings the Cloudflare Worker's public /sandbox-health endpoint
 * and the authenticated /api/kyra/health endpoint.
 */

const WORKER_URL = process.env.KYRA_WORKER_URL;
const API_SECRET = process.env.KYRA_API_SECRET;

export interface HealthStatus {
  reachable: boolean;
  status?: number;
  data?: Record<string, unknown>;
  error?: string;
  latencyMs: number;
}

/**
 * Ping the public /sandbox-health endpoint (no auth required).
 */
export async function checkSandboxHealth(): Promise<HealthStatus> {
  if (!WORKER_URL) {
    return { reachable: false, error: 'KYRA_WORKER_URL not configured', latencyMs: 0 };
  }

  const start = Date.now();
  try {
    const res = await fetch(`${WORKER_URL}/sandbox-health`, {
      signal: AbortSignal.timeout(10_000),
    });
    const latencyMs = Date.now() - start;
    const data = await res.json().catch(() => ({})) as any;
    return { reachable: res.ok, status: res.status, data, latencyMs };
  } catch (err) {
    return {
      reachable: false,
      error: err instanceof Error ? err.message : String(err),
      latencyMs: Date.now() - start,
    };
  }
}

/**
 * Ping the authenticated /api/kyra/health endpoint.
 */
export async function checkWorkerHealth(userId = 'health-check'): Promise<HealthStatus> {
  if (!WORKER_URL || !API_SECRET) {
    return { reachable: false, error: 'KYRA_WORKER_URL or KYRA_API_SECRET not configured', latencyMs: 0 };
  }

  const start = Date.now();
  try {
    const res = await fetch(`${WORKER_URL}/api/kyra/health`, {
      headers: {
        'Authorization': `Bearer ${API_SECRET}`,
        'X-Kyra-User-Id': userId,
      },
      signal: AbortSignal.timeout(10_000),
    });
    const latencyMs = Date.now() - start;
    const data = await res.json().catch(() => ({})) as any;
    return { reachable: res.ok, status: res.status, data, latencyMs };
  } catch (err) {
    return {
      reachable: false,
      error: err instanceof Error ? err.message : String(err),
      latencyMs: Date.now() - start,
    };
  }
}
