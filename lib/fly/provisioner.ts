/**
 * OpenClaw Gateway Provisioner
 *
 * Handles the full lifecycle of per-agency OpenClaw Gateways:
 *   1. Provision — Create Fly app, volume, machine
 *   2. Status   — Check if gateway is running
 *   3. Destroy  — Tear down all resources
 *   4. Update   — Update machine image (for deployments)
 *
 * Each agency gets a completely isolated OpenClaw instance.
 * No shared sessions, no shared memory, no shared config.
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import * as fly from './client';

const TEMPLATE_APP = 'kyra-gateway';
const DEFAULT_REGION = 'fra'; // Frankfurt — closest to Angel in Slovakia

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

/**
 * Generate a unique, URL-safe app name for a Fly.io app.
 * Format: kyra-gw-{8 random hex chars}
 */
function generateAppName(): string {
  return `kyra-gw-${crypto.randomBytes(4).toString('hex')}`;
}

/**
 * Generate a secure gateway auth token.
 */
function generateGatewayToken(): string {
  return `kgw-${crypto.randomBytes(32).toString('hex')}`;
}

export interface ProvisionResult {
  success: boolean;
  appName?: string;
  machineId?: string;
  gatewayUrl?: string;
  gatewayToken?: string;
  error?: string;
}

export interface GatewayStatus {
  status: 'pending' | 'provisioning' | 'starting' | 'running' | 'stopped' | 'error' | 'destroying' | 'not_provisioned';
  appName?: string;
  machineId?: string;
  gatewayUrl?: string;
  machineState?: string;
  error?: string;
  healthCheck?: {
    bridgeUp: boolean;
    gatewayConnected: boolean;
    activeSessions: number;
    uptime: number;
  };
}

/**
 * Provision a new OpenClaw Gateway for an agency.
 *
 * Flow:
 * 1. Generate unique app name and token
 * 2. Update agency status to 'provisioning'
 * 3. Create Fly app
 * 4. Create persistent volume
 * 5. Get Docker image from template
 * 6. Create machine with config
 * 7. Wait for machine to start
 * 8. Update agency with gateway details
 */
export async function provisionGateway(agencyId: string): Promise<ProvisionResult> {
  const supabase = getSupabase();
  const appName = generateAppName();
  const gatewayToken = generateGatewayToken();
  const region = DEFAULT_REGION;

  console.log(`[provisioner] Starting provision for agency ${agencyId}: app=${appName}`);

  try {
    // Mark as provisioning
    await supabase
      .from('agencies')
      .update({
        gateway_status: 'provisioning',
        gateway_app_name: appName,
        gateway_token: gatewayToken,
        gateway_region: region,
        gateway_error: null,
      })
      .eq('id', agencyId);

    // 1. Create Fly app
    console.log(`[provisioner] Creating Fly app: ${appName}`);
    await fly.createApp(appName);

    // 2. Allocate IPs — best effort, Fly auto-allocates when machines have services
    console.log(`[provisioner] Allocating IPs for ${appName}`);
    try {
      await fly.allocateSharedIpv4(appName);
      console.log(`[provisioner] IPv4 allocated for ${appName}`);
    } catch (e) {
      console.warn(`[provisioner] Shared IPv4 allocation skipped (Fly auto-allocates with services):`, e instanceof Error ? e.message : e);
    }
    try {
      await fly.allocateIpv6(appName);
      console.log(`[provisioner] IPv6 allocated for ${appName}`);
    } catch (e) {
      console.warn(`[provisioner] IPv6 allocation skipped (Fly auto-allocates with services):`, e instanceof Error ? e.message : e);
    }

    // 3. Create persistent volume
    console.log(`[provisioner] Creating volume for ${appName}`);
    const volume = await fly.createVolume(appName, 'openclaw_data', region, 1);

    await supabase
      .from('agencies')
      .update({ gateway_volume_id: volume.id })
      .eq('id', agencyId);

    // 4. Get Docker image from template
    console.log(`[provisioner] Getting template image from ${TEMPLATE_APP}`);
    const image = await fly.getTemplateImage(TEMPLATE_APP);
    console.log(`[provisioner] Using image: ${image}`);

    // 5. Build env vars
    const env: Record<string, string> = {
      NODE_ENV: 'production',
      NODE_OPTIONS: '--max-old-space-size=1024',
      BRIDGE_PORT: '3100',
      GATEWAY_PORT: '18789',
      OPENCLAW_GATEWAY_TOKEN: gatewayToken,
    };

    // Add platform API keys (or agency BYOK keys in the future)
    // For beta: use platform keys from Fly secrets or env
    const platformKeys: Record<string, string | undefined> = {
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
      PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY,
    };

    for (const [key, value] of Object.entries(platformKeys)) {
      if (value) env[key] = value;
    }

    // 6. Create machine
    console.log(`[provisioner] Creating machine in ${appName}`);
    await supabase
      .from('agencies')
      .update({ gateway_status: 'starting' })
      .eq('id', agencyId);

    const machine = await fly.createMachine(appName, {
      name: 'gateway',
      region,
      image,
      env,
      volumeId: volume.id,
      memoryMb: 2048,
      cpuKind: 'shared',
      cpus: 1,
    });

    const gatewayUrl = `https://${appName}.fly.dev`;

    // 7. Update agency with all gateway details
    await supabase
      .from('agencies')
      .update({
        gateway_machine_id: machine.id,
        gateway_url: gatewayUrl,
        gateway_status: 'starting',
        gateway_provisioned_at: new Date().toISOString(),
      })
      .eq('id', agencyId);

    console.log(`[provisioner] Machine created: ${machine.id} — waiting for startup...`);

    // 8. Wait for machine to start (don't block — let client poll)
    // The machine takes ~140-150s to fully boot (OpenClaw + Chromium)
    // We'll mark it as 'starting' and the status endpoint will check health

    return {
      success: true,
      appName,
      machineId: machine.id,
      gatewayUrl,
      gatewayToken,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[provisioner] Failed to provision ${appName}:`, errorMessage);

    // Update agency with error
    await supabase
      .from('agencies')
      .update({
        gateway_status: 'error',
        gateway_error: errorMessage,
      })
      .eq('id', agencyId);

    // Attempt cleanup
    try {
      await fly.deleteApp(appName);
    } catch {
      // Best effort cleanup
    }

    return { success: false, error: errorMessage };
  }
}

/**
 * Check the status of an agency's gateway.
 * Includes a health check to the actual gateway if it should be running.
 */
export async function getGatewayStatus(agencyId: string): Promise<GatewayStatus> {
  const supabase = getSupabase();
  const { data: agency } = await supabase
    .from('agencies')
    .select('gateway_app_name, gateway_machine_id, gateway_url, gateway_token, gateway_status, gateway_error')
    .eq('id', agencyId)
    .single();

  if (!agency || !agency.gateway_app_name) {
    return { status: 'not_provisioned' };
  }

  const result: GatewayStatus = {
    status: agency.gateway_status || 'pending',
    appName: agency.gateway_app_name,
    machineId: agency.gateway_machine_id,
    gatewayUrl: agency.gateway_url,
    error: agency.gateway_error,
  };

  // If status is starting or running, check actual machine state + health
  if (agency.gateway_status === 'starting' || agency.gateway_status === 'running') {
    try {
      // Check machine state via Fly API
      if (agency.gateway_machine_id) {
        const machine = await fly.getMachine(agency.gateway_app_name, agency.gateway_machine_id);
        result.machineState = machine.state;
      }

      // Health check the bridge
      if (agency.gateway_url) {
        const healthRes = await fetch(`${agency.gateway_url}/health`, {
          signal: AbortSignal.timeout(10_000),
        });
        if (healthRes.ok) {
          const health = await healthRes.json();
          result.healthCheck = {
            bridgeUp: true,
            gatewayConnected: health.gatewayConnected || false,
            activeSessions: health.activeSessions || 0,
            uptime: health.uptime || 0,
          };

          // If bridge is up and gateway is connected, mark as running
          if (health.gatewayConnected && agency.gateway_status !== 'running') {
            await supabase
              .from('agencies')
              .update({ gateway_status: 'running', gateway_error: null })
              .eq('id', agencyId);
            result.status = 'running';
          }

          // If bridge is up but gateway process is NOT connected, and status claims 'running' — downgrade to error
          if (!health.gatewayConnected && agency.gateway_status === 'running') {
            await supabase
              .from('agencies')
              .update({
                gateway_status: 'error',
                gateway_error: 'Gateway bridge is up but OpenClaw process is not connected. Try restarting.',
              })
              .eq('id', agencyId);
            result.status = 'error';
            result.error = 'Gateway bridge is up but OpenClaw process is not connected. Try restarting.';
          }
        }
      }
    } catch (err) {
      // Health check failed — machine might still be starting
      console.warn(`[provisioner] Health check failed for ${agency.gateway_app_name}:`, err);

      // If status was 'running' (not 'starting'), the gateway has likely crashed — downgrade to error
      if (agency.gateway_status === 'running') {
        await supabase
          .from('agencies')
          .update({
            gateway_status: 'error',
            gateway_error: 'Gateway health check failed — process may have crashed. Try restarting.',
          })
          .eq('id', agencyId);
        result.status = 'error';
        result.error = 'Gateway health check failed — process may have crashed. Try restarting.';
      }
    }
  }

  return result;
}

/**
 * Destroy an agency's gateway and clean up all Fly resources.
 */
export async function destroyGateway(agencyId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  const { data: agency } = await supabase
    .from('agencies')
    .select('gateway_app_name, gateway_machine_id')
    .eq('id', agencyId)
    .single();

  if (!agency?.gateway_app_name) {
    return { success: true }; // Nothing to destroy
  }

  console.log(`[provisioner] Destroying gateway for agency ${agencyId}: app=${agency.gateway_app_name}`);

  try {
    await supabase
      .from('agencies')
      .update({ gateway_status: 'destroying' })
      .eq('id', agencyId);

    // Delete the entire Fly app (destroys machines + volumes)
    await fly.deleteApp(agency.gateway_app_name);

    // Clear gateway columns
    await supabase
      .from('agencies')
      .update({
        gateway_status: 'pending',
        gateway_app_name: null,
        gateway_machine_id: null,
        gateway_url: null,
        gateway_token: null,
        gateway_volume_id: null,
        gateway_error: null,
        gateway_provisioned_at: null,
      })
      .eq('id', agencyId);

    console.log(`[provisioner] Gateway destroyed for agency ${agencyId}`);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[provisioner] Failed to destroy gateway:`, errorMessage);

    await supabase
      .from('agencies')
      .update({
        gateway_status: 'error',
        gateway_error: `Destroy failed: ${errorMessage}`,
      })
      .eq('id', agencyId);

    return { success: false, error: errorMessage };
  }
}

/**
 * Update all agency gateways to a new Docker image.
 * Used after deploying a new version of the template.
 */
export async function updateAllGateways(): Promise<{
  updated: string[];
  failed: { appName: string; error: string }[];
}> {
  const supabase = getSupabase();

  // Get the latest image from the template
  const image = await fly.getTemplateImage(TEMPLATE_APP);
  console.log(`[provisioner] Updating all gateways to image: ${image}`);

  // Get all agencies with running gateways
  const { data: agencies } = await supabase
    .from('agencies')
    .select('id, gateway_app_name, gateway_machine_id')
    .in('gateway_status', ['running', 'starting', 'stopped'])
    .not('gateway_app_name', 'is', null);

  const updated: string[] = [];
  const failed: { appName: string; error: string }[] = [];

  for (const agency of agencies || []) {
    try {
      if (!agency.gateway_app_name || !agency.gateway_machine_id) continue;

      await fly.updateMachine(agency.gateway_app_name, agency.gateway_machine_id, { image });
      updated.push(agency.gateway_app_name);
      console.log(`[provisioner] Updated ${agency.gateway_app_name}`);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      failed.push({ appName: agency.gateway_app_name!, error });
      console.error(`[provisioner] Failed to update ${agency.gateway_app_name}:`, error);
    }
  }

  return { updated, failed };
}

/**
 * Restart an agency's gateway machine.
 */
export async function restartGateway(agencyId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  const { data: agency } = await supabase
    .from('agencies')
    .select('gateway_app_name, gateway_machine_id')
    .eq('id', agencyId)
    .single();

  if (!agency?.gateway_app_name || !agency?.gateway_machine_id) {
    return { success: false, error: 'Gateway not provisioned' };
  }

  try {
    await fly.stopMachine(agency.gateway_app_name, agency.gateway_machine_id);
    await new Promise(r => setTimeout(r, 2000));
    await fly.startMachine(agency.gateway_app_name, agency.gateway_machine_id);

    await supabase
      .from('agencies')
      .update({ gateway_status: 'starting', gateway_error: null })
      .eq('id', agencyId);

    return { success: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return { success: false, error };
  }
}
