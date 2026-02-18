/**
 * Fly.io Machines API Client
 *
 * Low-level client for the Fly Machines REST API.
 * Used by the provisioner to create/manage per-agency OpenClaw Gateways.
 *
 * Docs: https://fly.io/docs/machines/api/
 * Base: https://api.machines.dev/v1
 */

const FLY_API_BASE = 'https://api.machines.dev/v1';

function getToken(): string {
  const token = process.env.FLY_API_TOKEN;
  if (!token) throw new Error('FLY_API_TOKEN not configured');
  return token;
}

function getOrg(): string {
  return process.env.FLY_ORG_SLUG || 'personal';
}

interface FlyApiOptions {
  method: string;
  path: string;
  body?: unknown;
  timeoutMs?: number;
}

async function flyApi<T = unknown>({ method, path, body, timeoutMs = 30_000 }: FlyApiOptions): Promise<T> {
  const url = `${FLY_API_BASE}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(timeoutMs),
  });

  // Some endpoints return 204 No Content
  if (res.status === 204) return {} as T;

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Fly API ${method} ${path} → ${res.status}: ${text}`);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

// ── App Management ────────────────────────────────────────────────────────────

export interface FlyApp {
  id: string;
  name: string;
  organization: { slug: string };
  status: string;
}

export async function createApp(appName: string): Promise<FlyApp> {
  return flyApi<FlyApp>({
    method: 'POST',
    path: '/apps',
    body: {
      app_name: appName,
      org_slug: getOrg(),
    },
  });
}

export async function deleteApp(appName: string): Promise<void> {
  await flyApi({ method: 'DELETE', path: `/apps/${appName}` });
}

export async function getApp(appName: string): Promise<FlyApp> {
  return flyApi<FlyApp>({ method: 'GET', path: `/apps/${appName}` });
}

// ── Volume Management ─────────────────────────────────────────────────────────

export interface FlyVolume {
  id: string;
  name: string;
  size_gb: number;
  region: string;
  state: string;
}

export async function createVolume(
  appName: string,
  name: string,
  region: string,
  sizeGb: number = 1
): Promise<FlyVolume> {
  return flyApi<FlyVolume>({
    method: 'POST',
    path: `/apps/${appName}/volumes`,
    body: {
      name,
      region,
      size_gb: sizeGb,
      encrypted: true,
    },
  });
}

export async function listVolumes(appName: string): Promise<FlyVolume[]> {
  return flyApi<FlyVolume[]>({ method: 'GET', path: `/apps/${appName}/volumes` });
}

// ── Machine Management ────────────────────────────────────────────────────────

export interface FlyMachine {
  id: string;
  name: string;
  state: string;
  region: string;
  instance_id: string;
  config: {
    image: string;
    env: Record<string, string>;
    services: unknown[];
    mounts: unknown[];
    guest: { memory_mb: number; cpu_kind: string; cpus: number };
    checks: Record<string, unknown>;
  };
  created_at: string;
  updated_at: string;
}

export interface CreateMachineConfig {
  name?: string;
  region: string;
  image: string;
  env: Record<string, string>;
  volumeId?: string;
  memoryMb?: number;
  cpuKind?: string;
  cpus?: number;
}

export async function createMachine(
  appName: string,
  config: CreateMachineConfig
): Promise<FlyMachine> {
  const machineConfig: Record<string, unknown> = {
    image: config.image,
    env: config.env,
    guest: {
      memory_mb: config.memoryMb || 2048,
      cpu_kind: config.cpuKind || 'shared',
      cpus: config.cpus || 1,
    },
    services: [
      {
        internal_port: 3100,
        protocol: 'tcp',
        ports: [
          { port: 443, handlers: ['tls', 'http'] },
          { port: 80, handlers: ['http'] },
        ],
        checks: [
          {
            type: 'http',
            port: 3100,
            method: 'GET',
            path: '/health',
            interval: '30s',
            timeout: '10s',
            grace_period: '120s',
          },
        ],
        autostart: true,
        autostop: 'stop',
        min_machines_running: 1,
      },
    ],
  };

  // Mount volume if provided
  if (config.volumeId) {
    machineConfig.mounts = [
      {
        volume: config.volumeId,
        path: '/root/.openclaw',
      },
    ];
  }

  return flyApi<FlyMachine>({
    method: 'POST',
    path: `/apps/${appName}/machines`,
    body: {
      name: config.name || 'gateway',
      region: config.region,
      config: machineConfig,
    },
    timeoutMs: 60_000, // Machine creation can be slow
  });
}

export async function getMachine(appName: string, machineId: string): Promise<FlyMachine> {
  return flyApi<FlyMachine>({
    method: 'GET',
    path: `/apps/${appName}/machines/${machineId}`,
  });
}

export async function listMachines(appName: string): Promise<FlyMachine[]> {
  return flyApi<FlyMachine[]>({
    method: 'GET',
    path: `/apps/${appName}/machines`,
  });
}

export async function startMachine(appName: string, machineId: string): Promise<void> {
  await flyApi({
    method: 'POST',
    path: `/apps/${appName}/machines/${machineId}/start`,
    timeoutMs: 60_000,
  });
}

export async function stopMachine(appName: string, machineId: string): Promise<void> {
  await flyApi({
    method: 'POST',
    path: `/apps/${appName}/machines/${machineId}/stop`,
    timeoutMs: 30_000,
  });
}

export async function destroyMachine(appName: string, machineId: string, force = false): Promise<void> {
  await flyApi({
    method: 'DELETE',
    path: `/apps/${appName}/machines/${machineId}${force ? '?force=true' : ''}`,
  });
}

export async function updateMachine(
  appName: string,
  machineId: string,
  config: Partial<CreateMachineConfig> & { image?: string }
): Promise<FlyMachine> {
  // Get current machine config
  const current = await getMachine(appName, machineId);
  const updatedConfig = { ...current.config };

  if (config.image) updatedConfig.image = config.image;
  if (config.env) updatedConfig.env = { ...updatedConfig.env, ...config.env };

  return flyApi<FlyMachine>({
    method: 'POST',
    path: `/apps/${appName}/machines/${machineId}`,
    body: { config: updatedConfig },
    timeoutMs: 60_000,
  });
}

/**
 * Wait for a machine to reach a target state.
 */
export async function waitForMachine(
  appName: string,
  machineId: string,
  targetState: string = 'started',
  timeoutMs: number = 180_000
): Promise<FlyMachine> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const machine = await getMachine(appName, machineId);
    if (machine.state === targetState) return machine;
    if (machine.state === 'destroyed' || machine.state === 'failed') {
      throw new Error(`Machine entered ${machine.state} state`);
    }
    await new Promise(r => setTimeout(r, 5000));
  }
  throw new Error(`Machine did not reach ${targetState} state within ${timeoutMs}ms`);
}

// ── IP Allocation ─────────────────────────────────────────────────────────────

export interface FlyIp {
  id: string;
  address: string;
  type: string;
  region: string;
}

export async function allocateSharedIpv4(appName: string): Promise<FlyIp> {
  return flyApi<FlyIp>({
    method: 'POST',
    path: `/apps/${appName}/ips`,
    body: { type: 'shared_v4' },
  });
}

export async function allocateIpv6(appName: string): Promise<FlyIp> {
  return flyApi<FlyIp>({
    method: 'POST',
    path: `/apps/${appName}/ips`,
    body: { type: 'v6' },
  });
}

// ── Utility ───────────────────────────────────────────────────────────────────

/**
 * Get the Docker image reference from the template app (kyra-gateway).
 * All agency gateways use the same image.
 */
export async function getTemplateImage(templateApp: string = 'kyra-gateway'): Promise<string> {
  const machines = await listMachines(templateApp);
  if (machines.length === 0) {
    throw new Error(`No machines found in template app ${templateApp}`);
  }
  return machines[0].config.image;
}
