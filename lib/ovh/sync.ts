/**
 * Container Sync Module
 * 
 * Syncs dashboard data to OpenClaw containers via the provisioner.
 * Each function reads from Supabase and writes to the container workspace.
 */

const PROVISIONER_URL = process.env.OVH_PROVISIONER_URL || 'http://15.204.91.157:9090';
const PROVISIONER_SECRET = process.env.OVH_PROVISIONER_SECRET || '';

// ============ Provisioner HTTP Client ============

async function provisionerFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${PROVISIONER_URL}${path}`;
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${PROVISIONER_SECRET}`,
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  return fetch(url, {
    ...options,
    headers,
    signal: AbortSignal.timeout(30_000),
  });
}

// ============ Write Arbitrary Workspace File ============

export async function writeWorkspaceFile(
  clientId: string,
  filePath: string,
  content: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await provisionerFetch(`/containers/${clientId}/workspace-file`, {
      method: 'PUT',
      body: JSON.stringify({ path: filePath, content }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      return { ok: false, error: (err as { error?: string }).error || `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// ============ Read Arbitrary Workspace File ============

export async function readWorkspaceFile(
  clientId: string,
  filePath: string
): Promise<{ ok: boolean; content?: string; error?: string }> {
  try {
    const res = await provisionerFetch(
      `/containers/${clientId}/workspace-file?path=${encodeURIComponent(filePath)}`
    );
    if (!res.ok) {
      if (res.status === 404) return { ok: false, error: 'not found' };
      return { ok: false, error: `HTTP ${res.status}` };
    }
    const data = await res.json() as { content: string };
    return { ok: true, content: data.content };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// ============ Sync Secrets to Container ============

export async function syncSecretsToContainer(
  clientId: string,
  secrets: Array<{ key: string; value: string }>
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await provisionerFetch(`/containers/${clientId}/sync-secrets`, {
      method: 'POST',
      body: JSON.stringify({ secrets }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      return { ok: false, error: (err as { error?: string }).error || `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// ============ Wake Container AI ============

/**
 * Send a wake event to the container's gateway so the AI re-reads workspace files.
 * Requires the gateway URL and token (from Supabase agency_clients row).
 */
export async function wakeContainerAI(
  gatewayUrl: string,
  gatewayToken: string,
  message: string
): Promise<void> {
  try {
    await fetch(`${gatewayUrl}/api/cron`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${gatewayToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'wake',
        text: message,
      }),
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    // Wake is best-effort — don't fail the sync if wake fails
  }
}
