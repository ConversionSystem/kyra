/**
 * Kyra Gateway health check utility
 *
 * Checks the health of an agency's OpenClaw Gateway.
 * Each agency has its own isolated gateway.
 */

export interface HealthStatus {
  reachable: boolean;
  status?: number;
  data?: Record<string, unknown>;
  error?: string;
  latencyMs: number;
}

/**
 * Check health of a specific gateway URL.
 */
export async function checkGatewayHealth(gatewayUrl: string): Promise<HealthStatus> {
  if (!gatewayUrl) {
    return { reachable: false, error: 'No gateway URL provided', latencyMs: 0 };
  }

  const start = Date.now();
  try {
    const res = await fetch(`${gatewayUrl}/health`, {
      signal: AbortSignal.timeout(10_000),
    });
    const latencyMs = Date.now() - start;
    const data = await res.json().catch(() => ({})) as Record<string, unknown>;
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
 * Legacy: Check health using KYRA_WORKER_URL fallback.
 */
export async function checkWorkerHealth(): Promise<HealthStatus> {
  const workerUrl = process.env.KYRA_WORKER_URL;
  if (!workerUrl) {
    return { reachable: false, error: 'KYRA_WORKER_URL not configured', latencyMs: 0 };
  }
  return checkGatewayHealth(workerUrl);
}
