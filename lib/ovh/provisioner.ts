/**
 * OVH Provisioner Client
 *
 * Replaces lib/fly/provisioner.ts for the new per-client gateway architecture.
 * Each CLIENT (not agency) gets their own isolated OpenClaw container on OVH.
 *
 * Architecture:
 * - OVH VPS runs Docker + Traefik + Provisioner API
 * - Provisioner API manages container lifecycle
 * - Traefik auto-routes {client-id}.gw.kyra.conversionsystem.com → container
 * - Each container: own filesystem, own memory, own config, own process
 *
 * @see projects/kyra/OVH-ARCHITECTURE-SPEC.md
 */

import { createClient } from '@supabase/supabase-js';

const PROVISIONER_URL = process.env.OVH_PROVISIONER_URL || 'https://provisioner.gw.kyra.conversionsystem.com';
const PROVISIONER_SECRET = process.env.OVH_PROVISIONER_SECRET || '';
const GATEWAY_DOMAIN = 'gw.kyra.conversionsystem.com';

import { resolveOcModel } from '@/lib/agency/ai-models';
import { getRouterTierForModel } from '@/lib/billing/model-credits';

/**
 * Given an agencies.api_keys record, return the winning provider + key + model.
 * Priority: anthropic > openrouter > openai > google
 * Respects selected_models override if set.
 */
function resolveWinningKey(
  apiKeys: Record<string, unknown>
): { provider: string; key: string; model: string } | null {
  const selectedModels = (apiKeys.selected_models as Record<string, string>) || {};

  for (const provider of ['anthropic', 'openrouter', 'openai', 'google']) {
    const key = apiKeys[provider] as string | undefined;
    if (key) {
      const selectedModelId = selectedModels[provider];
      return {
        provider,
        key,
        model: resolveOcModel(provider, selectedModelId),
      };
    }
  }
  return null;
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

// ============ Types ============

export interface ProvisionClientResult {
  success: boolean;
  containerId?: string;
  clientId?: string;
  gatewayUrl?: string;
  authToken?: string;
  error?: string;
}

export interface ClientGatewayStatus {
  status: 'running' | 'stopped' | 'starting' | 'error' | 'not_provisioned';
  containerId?: string;
  gatewayUrl?: string;
  healthy?: boolean;
  error?: string;
}

export interface ContainerInfo {
  containerId: string;
  clientId: string;
  agencyId: string;
  status: string;
  gatewayUrl: string;
}

export interface VpsHealth {
  status: string;
  hostname: string;
  docker: string;
  containers: { total: number; running: number; stopped: number };
  memory: { totalMb: number; availableMb: number; usedMb: number; usagePercent: number };
  disk: { totalMb: number; usedMb: number; availableMb: number; usagePercent: number };
  cpus: number;
}

// ============ HTTP Client ============

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

  const res = await fetch(url, {
    ...options,
    headers,
    signal: AbortSignal.timeout(30_000),
  });

  return res;
}

// ============ Provision Client Gateway ============

/**
 * Provision a new isolated gateway for an agency client.
 * Creates a Docker container on OVH with the client's SOUL.md and knowledge base.
 */
export async function provisionClientGateway(
  clientId: string,
  agencyId: string,
  config: {
    soulMd?: string;
    userMd?: string;
    toolsMd?: string;
    agentsMd?: string;
    knowledgeBase?: string[];
  } = {},
  resources: {
    memoryMb?: number;
    cpuShares?: number;
  } = {},
  clientName?: string
): Promise<ProvisionClientResult> {
  const supabase = getSupabase();

  console.log(`[ovh-provisioner] Provisioning gateway for client ${clientId} (agency: ${agencyId})`);

  try {
    // Update client status
    await supabase
      .from('agency_clients')
      .update({
        gateway_status: 'provisioning',
        gateway_error: null,
      })
      .eq('id', clientId);

    // Pull agency's API keys so the new container uses the right key from day 1
    const { data: agencyData } = await supabase
      .from('agencies')
      .select('api_keys')
      .eq('id', agencyId)
      .single();

    const agencyApiKeys = (agencyData?.api_keys as Record<string, string>) || {};
    const winningKey = resolveWinningKey(agencyApiKeys);

    // Build the apiKeys dict to send to provisioner (all configured keys, not just winner)
    const apiKeysForContainer: Record<string, string> = {};
    for (const provider of ['anthropic', 'openrouter', 'openai', 'google']) {
      if (agencyApiKeys[provider]) apiKeysForContainer[provider] = agencyApiKeys[provider];
    }

    // BYOK routing rule:
    // - BYOK with Anthropic/Google key → use their model directly (bypass router)
    // - Platform key or OpenAI BYOK → use openai/gpt-4o-mini + router
    // BYOK routing rule:
    // If the agency has provided ANY key of their own (any provider), bypass kyra-router.
    // The router only saves Kyra money when Kyra's platform keys are in use.
    // If the client is paying with their own key, the router adds zero value — bypass it.
    const hasByok = Object.values(apiKeysForContainer).some(v => typeof v === 'string' && v.length > 0);

    let agentModel: { primary: string; fallbacks: string[] };
    let cleanApiKeys: Record<string, string> | undefined;

    if (hasByok) {
      // BYOK: use their provider's model directly, pass all their keys, no router
      const byokModel = winningKey?.model ?? 'anthropic/claude-sonnet-4-5';
      agentModel = { primary: byokModel, fallbacks: ['openai/gpt-4o-mini'] };
      cleanApiKeys = { ...apiKeysForContainer }; // pass all keys
    } else {
      // Platform key: route through kyra-router, always use openai/gpt-4o-mini
      agentModel = { primary: 'openai/gpt-4o-mini', fallbacks: ['openai/gpt-4o'] };
      cleanApiKeys = undefined; // provisioner injects platform key
    }

    // Resolve model + tier from DB — if user already set a model preference, use it
    const { data: clientData } = await supabase
      .from('agency_clients')
      .select('ai_model')
      .eq('id', clientId)
      .single();
    const routerMaxTier = getRouterTierForModel(clientData?.ai_model);

    // Override agentModel if the client has a saved ai_model in the DB
    if (clientData?.ai_model && typeof clientData.ai_model === 'string') {
      const savedModel = clientData.ai_model;
      // Only override if not already matching (prevents unnecessary changes)
      if (savedModel !== agentModel.primary) {
        console.log(`[ovh-provisioner] Using saved ai_model: ${savedModel} (was: ${agentModel.primary})`);
        agentModel = { primary: savedModel, fallbacks: agentModel.fallbacks };
      }
    }

    // Call OVH provisioner
    const res = await provisionerFetch('/containers', {
      method: 'POST',
      body: JSON.stringify({
        clientId,
        agencyId,
        clientName: clientName || undefined,
        config,
        apiKeys: cleanApiKeys,
        agentModel,
        routerMaxTier,  // passed to provisioner → sets KYRA_MAX_TIER on container
        resources: {
          memoryMb: resources.memoryMb || 1024,  // OpenClaw needs ~350MB min; 256 causes OOM crash
          cpuShares: resources.cpuShares || 256,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || `Provisioner returned ${res.status}`);
    }

    const data = await res.json();

    // Store gateway details in Supabase
    await supabase
      .from('agency_clients')
      .update({
        gateway_url: data.gatewayUrl,
        gateway_token: data.authToken,
        gateway_container_id: data.containerId,
        gateway_status: 'running',
        gateway_provisioned_at: new Date().toISOString(),
        gateway_error: null,
      })
      .eq('id', clientId);

    console.log(`[ovh-provisioner] Client ${clientId} provisioned: ${data.gatewayUrl}`);

    return {
      success: true,
      containerId: data.containerId,
      clientId,
      gatewayUrl: data.gatewayUrl,
      authToken: data.authToken,
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[ovh-provisioner] Failed to provision client ${clientId}:`, errorMessage);

    await supabase
      .from('agency_clients')
      .update({
        gateway_status: 'error',
        gateway_error: errorMessage,
      })
      .eq('id', clientId);

    return { success: false, error: errorMessage };
  }
}

// ============ Gateway Status ============

/**
 * Check the status of a client's gateway.
 */
export async function getClientGatewayStatus(clientId: string): Promise<ClientGatewayStatus> {
  const supabase = getSupabase();

  const { data: client } = await supabase
    .from('agency_clients')
    .select('gateway_url, gateway_token, gateway_container_id, gateway_status, gateway_error')
    .eq('id', clientId)
    .single();

  if (!client?.gateway_url) {
    return { status: 'not_provisioned' };
  }

  const result: ClientGatewayStatus = {
    status: (client.gateway_status as ClientGatewayStatus['status']) || 'not_provisioned',
    containerId: client.gateway_container_id,
    gatewayUrl: client.gateway_url,
    error: client.gateway_error,
  };

  // Health check if supposedly running
  if (client.gateway_status === 'running' && client.gateway_url) {
    try {
      const healthRes = await fetch(`${client.gateway_url}/health`, {
        signal: AbortSignal.timeout(5_000),
      });
      result.healthy = healthRes.ok;

      if (!healthRes.ok && client.gateway_status === 'running') {
        await supabase
          .from('agency_clients')
          .update({
            gateway_status: 'error',
            gateway_error: 'Health check failed — gateway may have crashed',
          })
          .eq('id', clientId);
        result.status = 'error';
        result.error = 'Health check failed';
      }
    } catch {
      result.healthy = false;
    }
  }

  return result;
}

// ============ Start / Stop / Wake ============

export async function startClientGateway(clientId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await provisionerFetch(`/containers/${clientId}/start`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      return { success: false, error: err.error };
    }

    const supabase = getSupabase();
    await supabase
      .from('agency_clients')
      .update({ gateway_status: 'running', gateway_error: null })
      .eq('id', clientId);

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function stopClientGateway(clientId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await provisionerFetch(`/containers/${clientId}/stop`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      return { success: false, error: err.error };
    }

    const supabase = getSupabase();
    await supabase
      .from('agency_clients')
      .update({ gateway_status: 'stopped' })
      .eq('id', clientId);

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function wakeClientGateway(clientId: string): Promise<{ success: boolean; healthy?: boolean; error?: string }> {
  try {
    const res = await provisionerFetch(`/containers/${clientId}/wake`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      return { success: false, error: err.error };
    }

    const data = await res.json();

    const supabase = getSupabase();
    await supabase
      .from('agency_clients')
      .update({ gateway_status: data.healthy ? 'running' : 'starting', gateway_error: null })
      .eq('id', clientId);

    return { success: true, healthy: data.healthy };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// ============ Destroy ============

/**
 * Destroy a client's gateway container. Data is preserved on disk for recovery.
 */
export async function destroyClientGateway(clientId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await provisionerFetch(`/containers/${clientId}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      return { success: false, error: err.error };
    }

    const supabase = getSupabase();
    await supabase
      .from('agency_clients')
      .update({
        gateway_status: null,
        gateway_url: null,
        gateway_token: null,
        gateway_container_id: null,
        gateway_error: null,
        gateway_provisioned_at: null,
      })
      .eq('id', clientId);

    console.log(`[ovh-provisioner] Client ${clientId} gateway destroyed`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// ============ Update Config ============

/**
 * Update a client's gateway workspace files (SOUL.md, knowledge base, etc.)
 * without restarting the container.
 */
export async function updateClientConfig(
  clientId: string,
  config: {
    soulMd?: string;
    userMd?: string;
    toolsMd?: string;
    agentsMd?: string;
    knowledgeBase?: string[];
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await provisionerFetch(`/containers/${clientId}/config`, {
      method: 'PUT',
      body: JSON.stringify(config),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      return { success: false, error: err.error };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// ============ Container Logs ============

export async function getClientLogs(clientId: string, tail: number = 50): Promise<string> {
  try {
    const res = await provisionerFetch(`/containers/${clientId}/logs?tail=${tail}`);
    if (!res.ok) return `Error fetching logs: HTTP ${res.status}`;
    return await res.text();
  } catch (error) {
    return `Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}

// ============ List All Containers ============

export async function listContainers(): Promise<ContainerInfo[]> {
  try {
    const res = await provisionerFetch('/containers');
    if (!res.ok) return [];
    const data = await res.json();
    return data.containers || [];
  } catch {
    return [];
  }
}

// ============ VPS Health ============

export async function getVpsHealth(): Promise<VpsHealth | null> {
  try {
    const res = await fetch(`${PROVISIONER_URL}/health`, {
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ============ Chat via Gateway ============

/**
 * Chat via client's OpenClaw gateway using the OpenAI-compatible endpoint.
 *
 * SESSION PERSISTENCE: Pass options.sessionId for conversation continuity.
 * The sessionId is sent as X-OpenClaw-Session-Key header — OpenClaw stores
 * transcripts at workspace/agents/main/sessions/{sessionId}.jsonl
 *
 * AGENT ROUTING: Pass options.model as "openclaw/{agentId}" to route to a
 * specific agent defined in openclaw.json agents.list, e.g.:
 *   model: "openclaw/front-desk"  → routes to front-desk agent
 *   model: "openclaw/main"        → routes to main (default) agent
 *
 * SYSTEM PROMPT: The systemPrompt is added as extraSystemPrompt ON TOP of
 * the agent's SOUL.md — both are used by OpenClaw for every request.
 */
export async function chatViaGateway(
  clientId: string,
  message: string,
  options: {
    sessionId?: string;
    apiKey?: string;
    model?: string;
    /** Full persona + business context system prompt */
    systemPrompt?: string;
    /** Prior conversation turns (oldest first) */
    history?: Array<{ role: 'user' | 'assistant'; content: string }>;
    /** OpenAI-compatible tool definitions for function calling */
    tools?: Array<{ type: string; function: { name: string; description: string; parameters: unknown } }>;
  } = {}
): Promise<{ reply: string; sessionId: string; toolCalls?: Array<{ name: string; args: Record<string, unknown> }> } | { error: string }> {
  const supabase = getSupabase();

  const { data: client } = await supabase
    .from('agency_clients')
    .select('gateway_url, gateway_token')
    .eq('id', clientId)
    .single();

  if (!client?.gateway_url || !client?.gateway_token) {
    return { error: 'Gateway not provisioned for this client' };
  }

  try {
    // Detect Anthropic model for prompt caching
    const isAnthropicModel = !!(
      options.model?.startsWith('claude') ||
      options.model?.startsWith('anthropic/claude')
    );

    // Build message array: system → history → current user message
    const messages: Array<{ role: string; content: string | Array<{ type: string; text: string; cache_control?: { type: string } }> }> = [];

    if (options.systemPrompt) {
      if (isAnthropicModel) {
        // Anthropic prompt caching: mark system prompt as ephemeral cache
        // Cached tokens cost ~10% of normal — saves 60-90% on repeated system prompts
        messages.push({
          role: 'system',
          content: [{ type: 'text', text: options.systemPrompt, cache_control: { type: 'ephemeral' } }],
        });
      } else {
        messages.push({ role: 'system', content: options.systemPrompt });
      }
    }

    if (options.history && options.history.length > 0) {
      for (const turn of options.history) {
        messages.push({ role: turn.role, content: turn.content });
      }
    }

    messages.push({ role: 'user', content: message });

    const requestBody: Record<string, unknown> = {
      model: options.model || 'openai/gpt-4o-mini',
      messages,
      stream: false,
      ...(options.sessionId ? { user: options.sessionId } : {}),
    };

    // Add tools if provided (function calling)
    if (options.tools && options.tools.length > 0) {
      requestBody.tools = options.tools;
      requestBody.tool_choice = 'auto';
    }

    const res = await fetch(`${client.gateway_url}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${client.gateway_token}`,
        ...(options.sessionId ? { 'X-OpenClaw-Session-Key': options.sessionId } : {}),
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      return { error: err.error || `Gateway returned ${res.status}` };
    }

    const data = await res.json();
    const choice = data?.choices?.[0];
    const reply = choice?.message?.content || '';

    // Return tool calls if present (caller handles execution)
    const toolCalls = choice?.message?.tool_calls;
    if (toolCalls && toolCalls.length > 0) {
      const calls = toolCalls.map((tc: { function: { name: string; arguments: string } }) => ({
        name: tc.function.name,
        args: JSON.parse(tc.function.arguments || '{}'),
        id: (tc as { id?: string }).id,
      }));
      return { reply: reply || '', sessionId: options.sessionId || 'default', toolCalls: calls };
    }

    return { reply, sessionId: options.sessionId || 'default' };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

// ============ Gateway Config (openclaw.json) ============

/**
 * Read the gateway's openclaw.json config for a client.
 */
export async function getGatewayConfig(
  clientId: string
): Promise<{ config: Record<string, unknown> } | null> {
  try {
    const res = await provisionerFetch(`/containers/${clientId}/openclaw-config`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Patch (deep merge) the gateway's openclaw.json config for a client.
 * Restarts the container to apply changes.
 */
export async function patchGatewayConfig(
  clientId: string,
  patch: Record<string, unknown>
): Promise<{ ok: boolean; config?: Record<string, unknown>; error?: string }> {
  try {
    const res = await provisionerFetch(`/containers/${clientId}/openclaw-config`, {
      method: 'PATCH',
      body: JSON.stringify({ patch }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      return { ok: false, error: err.error || `Provisioner returned ${res.status}` };
    }
    const data = await res.json();
    return { ok: true, config: data.config };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Replace the gateway's openclaw.json config entirely for a client.
 * Restarts the container to apply changes.
 */
export async function replaceGatewayConfig(
  clientId: string,
  config: Record<string, unknown>
): Promise<{ ok: boolean; config?: Record<string, unknown>; error?: string }> {
  try {
    const res = await provisionerFetch(`/containers/${clientId}/openclaw-config`, {
      method: 'PUT',
      body: JSON.stringify({ config }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      return { ok: false, error: err.error || `Provisioner returned ${res.status}` };
    }
    const data = await res.json();
    return { ok: true, config: data.config };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Run an OpenClaw CLI command inside a client's container via docker exec.
 * Used for: pairing approvals, diagnostics, etc.
 * Example: execContainerCommand(clientId, ['openclaw', 'pairing', 'approve', 'telegram', code])
 */
export async function execContainerCommand(
  clientId: string,
  cmd: string[]
): Promise<{ ok: boolean; stdout?: string; stderr?: string; exitCode?: number; error?: string }> {
  try {
    const res = await provisionerFetch(`/containers/${clientId}/exec-cmd`, {
      method: 'POST',
      body: JSON.stringify({ cmd }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      return { ok: false, error: err.error || `Provisioner returned ${res.status}` };
    }
    const data = await res.json();
    return { ok: data.ok, stdout: data.stdout, stderr: data.stderr, exitCode: data.exitCode };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// ============ Update Container API Key ============

/**
 * Push new API keys to a running container.
 * The container is stopped, recreated with the new env vars, and restarted.
 * Data is preserved — only the env vars change.
 *
 * @param containerId  The client ID (or agency ID) — used as container suffix
 * @param apiKeys      Map of provider → key (e.g. { openai: 'sk-...' })
 */
export async function updateContainerApiKey(
  containerId: string,
  apiKeys: Record<string, string>
): Promise<{ ok: boolean; error?: string }> {
  const winning = resolveWinningKey(apiKeys);
  try {
    const res = await provisionerFetch(`/containers/${containerId}/api-key`, {
      method: 'PATCH',
      body: JSON.stringify({
        apiKeys,
        model: winning?.model,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      return { ok: false, error: err.error || `Provisioner returned ${res.status}` };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Update KYRA_MAX_TIER + openclaw.json model on a running container
 * when the agency changes the client's AI model in the dashboard.
 * Requires container recreation since Docker env vars can't be changed on running containers.
 */
export async function updateContainerTier(
  clientId: string,
  maxTier: number,
  modelId?: string,
  clearByok?: boolean,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await provisionerFetch(`/containers/${clientId}/update-tier`, {
      method: 'POST',
      body: JSON.stringify({ maxTier, modelId, clearByok: clearByok ?? false }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      return { ok: false, error: err.error || `Provisioner returned ${res.status}` };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// ============ Agency Gateway ============

/**
 * Provision a dedicated OpenClaw gateway for an AGENCY OWNER.
 * This is separate from client containers — the agency owner gets their own
 * isolated AI terminal with agency-level context (not a client's business).
 *
 * Container naming: kyra-ag-{agencyId} (vs kyra-cl-{clientId} for clients)
 * Gateway URL: {agencyId}.gw.kyra.conversionsystem.com
 */
export async function provisionAgencyGateway(
  agencyId: string,
  agencyName: string,
  ownerEmail?: string
): Promise<{ success: boolean; gatewayUrl?: string; authToken?: string; error?: string }> {
  const supabase = getSupabase();

  console.log(`[ovh-provisioner] Provisioning agency gateway for ${agencyId} (${agencyName})`);

  try {
    await supabase
      .from('agencies')
      .update({ gateway_status: 'provisioning', gateway_error: null })
      .eq('id', agencyId);

    // Pull agency's saved API keys
    const { data: agencyData } = await supabase
      .from('agencies')
      .select('api_keys')
      .eq('id', agencyId)
      .single();

    const agencyApiKeys = (agencyData?.api_keys as Record<string, string>) || {};
    const winningKey = resolveWinningKey(agencyApiKeys);

    const apiKeysForContainer: Record<string, string> = {};
    for (const provider of ['anthropic', 'openrouter', 'openai', 'google']) {
      if (agencyApiKeys[provider]) apiKeysForContainer[provider] = agencyApiKeys[provider];
    }

    const soulMd = `# SOUL.md — ${agencyName} Agency AI

You are the dedicated AI assistant for **${agencyName}**, an AI agency built on Kyra.

## Your Role
You help the agency owner manage their AI business:
- Strategic advice on AI deployments for clients
- Business intelligence and market insights
- Managing client relationships and onboarding
- Monitoring performance across all client AIs
- Building systems that scale the agency

## Context
- This is the AGENCY OWNER'S personal AI terminal — not a client's
- You have full context about running an AI agency
- You help with both operational tasks and strategic thinking

## Style
Be direct, strategic, and action-oriented. The agency owner is busy building a business.

## Tool Usage Rules
- When you use web search, ALWAYS summarize the results in your own words. Never show raw JSON, URLs, or search result snippets.
- For weather questions: search for the weather, then tell the user the temperature, conditions, and forecast in a natural sentence.
- For any tool result: extract the relevant information and present it conversationally. Never show raw data, API responses, or technical output.
- If a search returns no useful results, say so honestly and offer to help another way.`;

    const userMd = `# ${agencyName} Agency Owner\n\nThis is the agency owner's personal AI terminal.`;

    const res = await provisionerFetch('/containers', {
      method: 'POST',
      body: JSON.stringify({
        clientId: agencyId,          // agency gateway uses agencyId as the container ID
        agencyId,
        clientName: `${agencyName} Agency AI`,
        // NOTE: uses default kyra-cl- prefix so Traefik/nginx routes it correctly
        config: { soulMd, userMd },
        apiKeys: Object.keys(apiKeysForContainer).length > 0 ? apiKeysForContainer : undefined,
        // BYOK rule: if agency has any key of their own → use it directly (bypass router).
        // Server.js enforces this via hasByok check — agentModel is set to their provider's model.
        agentModel: winningKey
          ? { primary: winningKey.model, fallbacks: ['openai/gpt-4o-mini'] }
          : { primary: 'openai/gpt-4o-mini', fallbacks: ['openai/gpt-4o'] },
        resources: { memoryMb: 1024, cpuShares: 256 },
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok && res.status !== 409) {
      throw new Error(data.error || `Provisioner returned ${res.status}`);
    }

    // 409 = already exists → still record the URL
    const gatewayUrl = data.gatewayUrl || `https://${agencyId}.${GATEWAY_DOMAIN}`;

    await supabase
      .from('agencies')
      .update({
        gateway_url: gatewayUrl,
        gateway_token: data.authToken || null,
        gateway_status: 'running',
        gateway_provisioned_at: new Date().toISOString(),
        gateway_error: null,
      })
      .eq('id', agencyId);

    const authToken = data.authToken || null;
    console.log(`[ovh-provisioner] Agency ${agencyId} gateway live: ${gatewayUrl}`);
    return { success: true, gatewayUrl, authToken };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[ovh-provisioner] Agency gateway provisioning failed for ${agencyId}:`, msg);
    await supabase
      .from('agencies')
      .update({ gateway_status: 'error', gateway_error: msg })
      .eq('id', agencyId);
    return { success: false, error: msg };
  }
}

/**
 * Get the agency's own gateway URL + token. Used by the sidebar terminal link.
 */
export async function resolveAgencyGateway(
  agencyId: string
): Promise<{ url: string; token: string } | null> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('agencies')
    .select('gateway_url, gateway_token, gateway_status')
    .eq('id', agencyId)
    .single();

  if (!data?.gateway_url || !data?.gateway_token) return null;
  if (!['running', 'starting'].includes(data.gateway_status || '')) return null;
  return { url: data.gateway_url, token: data.gateway_token };
}

// ============ Resolve Gateway for Client ============

/**
 * Get gateway URL + token for a client. Used by API routes.
 */
export async function resolveClientGateway(
  clientId: string
): Promise<{ url: string; token: string } | null> {
  const supabase = getSupabase();

  // Try agency_clients first (normal per-client lookup)
  const { data: client } = await supabase
    .from('agency_clients')
    .select('gateway_url, gateway_token, gateway_status, agency_id')
    .eq('id', clientId)
    .single();

  if (client?.gateway_url && client?.gateway_token) {
    if (!['running', 'starting'].includes(client.gateway_status || '')) return null;
    return { url: client.gateway_url, token: client.gateway_token };
  }

  // Fallback: use the agency's own gateway.
  // If we found a client record but it has no gateway, use client.agency_id.
  // If clientId is itself an agencyId (agency-level voice), use it directly.
  const agencyLookupId = (client as { agency_id?: string } | null)?.agency_id ?? clientId;

  const { data: agency } = await supabase
    .from('agencies')
    .select('gateway_url, gateway_token, gateway_status')
    .eq('id', agencyLookupId)
    .single();

  if (!agency?.gateway_url || !agency?.gateway_token) return null;
  if (!['running', 'starting'].includes(agency.gateway_status || '')) return null;

  return { url: agency.gateway_url, token: agency.gateway_token };
}

// ─── Kyra Router ──────────────────────────────────────────────────────────────

export async function getRouterStatus(): Promise<{
  running: boolean;
  url: string;
  started?: string;
} | null> {
  try {
    const res = await provisionerFetch('/router/status');
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/**
 * Push per-client quick-answer templates to kyra-router.
 * Templates are answered at Tier-0 ($0) — no LLM call, no credits consumed.
 */
export async function pushClientTemplates(
  clientId: string,
  templates: Record<string, string>
): Promise<boolean> {
  try {
    const res = await provisionerFetch(`/containers/${clientId}/templates`, {
      method: 'POST',
      body: JSON.stringify({ templates }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function migrateAllContainersToRouter(
  dryRun = false
): Promise<{
  summary: { total: number; migrated: number; skipped: number; failed: number };
  migrated: { name: string }[];
  skipped: { name: string; reason: string }[];
  failed: { name: string; error: string }[];
  dry_run: boolean;
} | null> {
  try {
    const res = await provisionerFetch(
      `/router/migrate-all${dryRun ? '?dry_run=true' : ''}`,
      { method: 'POST' }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
