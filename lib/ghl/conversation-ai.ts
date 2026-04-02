// GHL Voice AI API — syncs Kyra knowledge into GHL Voice AI agents
// Uses /voice-ai/agents endpoints (NOT /conversation-ai which is for text bots)
//
// NOTE: Requires the 'Voice AI Agents' scope enabled on your GHL Private Integration Token (PIT).
// If you see 404/403 errors, go to GHL → Settings → Private Integrations → Edit → enable Voice AI scopes.

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { getClientKnowledge } from '@/lib/knowledge/extractor';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const GHL_API_VERSION = '2021-07-28';

// ── Types ─────────────────────────────────────────────────────────────────────

interface GHLAgentConfig {
  name: string;
  prompt: string;
  greeting?: string;
  voice?: string;
  status?: 'active' | 'inactive';
  locationId: string;
}

interface GHLAgent {
  id: string;
  name: string;
  locationId: string;
  status: string;
}

// ── API Functions ─────────────────────────────────────────────────────────────

/**
 * Search for existing Voice AI agents in a GHL sub-account.
 */
export async function searchGHLAgents(
  accessToken: string,
  locationId: string,
): Promise<GHLAgent[]> {
  const res = await fetch(`${GHL_API_BASE}/voice-ai/agents?locationId=${locationId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Version: GHL_API_VERSION,
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GHL searchAgents failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  return (data.agents ?? data.data ?? []) as GHLAgent[];
}

/**
 * Create a new Voice AI agent in GHL.
 */
export async function createGHLAgent(
  accessToken: string,
  config: GHLAgentConfig,
): Promise<GHLAgent> {
  const res = await fetch(`${GHL_API_BASE}/voice-ai/agents`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Version: GHL_API_VERSION,
    },
    body: JSON.stringify(config),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GHL createAgent failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  return (data.agent ?? data) as GHLAgent;
}

/**
 * Update an existing Voice AI agent in GHL.
 */
export async function updateGHLAgent(
  accessToken: string,
  agentId: string,
  config: Partial<GHLAgentConfig>,
): Promise<GHLAgent> {
  const res = await fetch(`${GHL_API_BASE}/voice-ai/agents/${agentId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Version: GHL_API_VERSION,
    },
    body: JSON.stringify(config),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GHL updateAgent failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  return (data.agent ?? data) as GHLAgent;
}

// ── Main Sync Function ────────────────────────────────────────────────────────

/**
 * Sync Kyra's learned knowledge into the GHL Voice AI agent for a location.
 *
 * 1. Fetches client knowledge from Kyra's knowledge engine
 * 2. Combines with the client's persona/business config
 * 3. Finds existing GHL agent or creates a new one
 * 4. Pushes the combined prompt to GHL
 *
 * Always returns null on failure — never throws.
 * Logs a specific warning if 404 (Conversation AI scope not enabled in PIT).
 */
export async function syncKnowledgeToGHLAgent(
  accessToken: string,
  locationId: string,
  clientId: string,
  _agencyId?: string,
): Promise<string | null> {
  try {
    // 1. Get client config for persona/business info
    const supabase = createServiceClientWithoutCookies();
    const { data: client } = await supabase
      .from('agency_clients')
      .select('name, container_config')
      .eq('id', clientId)
      .single();

    if (!client) {
      console.warn(`[ghl/conversation-ai] Client ${clientId} not found — skipping sync`);
      return null;
    }

    const cfg = (client.container_config as Record<string, unknown>) ?? {};
    const aiName = (cfg.ai_name as string) ?? 'Alex';
    const persona = (cfg.persona as string) ?? (cfg.instructions as string) ?? '';

    // 2. Get Kyra's accumulated knowledge for this client
    const knowledge = await getClientKnowledge(clientId);

    // 3. Build voice-optimized prompt
    const prompt = buildGHLAgentPrompt({
      businessName: client.name,
      aiName,
      persona,
      knowledge,
    });

    const agentName = `${aiName} — ${client.name} Voice AI (Kyra)`;

    // 4. Search for existing agent
    let existingAgentId: string | null = null;
    try {
      const agents = await searchGHLAgents(accessToken, locationId);
      // Find agent previously created by Kyra (name contains our suffix)
      const kyraAgent = agents.find((a) => a.name.includes('(Kyra)'));
      if (kyraAgent) existingAgentId = kyraAgent.id;
    } catch (searchErr) {
      // Search failure is handled below — will attempt create
      const errMsg = searchErr instanceof Error ? searchErr.message : String(searchErr);
      if (errMsg.includes('404')) {
        console.warn(
          '[ghl/conversation-ai] 404 on agent search — Voice AI scope may not be enabled on your GHL Private Integration Token. ' +
          'Go to GHL → Settings → Private Integrations → Edit your token → enable "Voice AI Agents" scope.',
        );
        return null;
      }
      console.warn('[ghl/conversation-ai] Agent search failed, will attempt create:', errMsg);
    }

    // 5. Update or create
    let agentId: string;
    if (existingAgentId) {
      const updated = await updateGHLAgent(accessToken, existingAgentId, {
        name: agentName,
        prompt,
        locationId,
      });
      agentId = updated.id;
      console.log(`[ghl/conversation-ai] Updated agent ${agentId} for client ${clientId}`);
    } else {
      const created = await createGHLAgent(accessToken, {
        name: agentName,
        prompt,
        locationId,
        status: 'active',
      });
      agentId = created.id;
      console.log(`[ghl/conversation-ai] Created agent ${agentId} for client ${clientId}`);
    }

    return agentId;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    if (errMsg.includes('404')) {
      console.warn(
        '[ghl/conversation-ai] 404 — Voice AI scope not enabled on GHL PIT. ' +
        'Go to GHL → Settings → Private Integrations → Edit your token → enable "Voice AI Agents" scope.',
      );
    } else {
      console.error('[ghl/conversation-ai] Sync failed for client', clientId, ':', errMsg);
    }
    return null;
  }
}

// ── Prompt Builder ────────────────────────────────────────────────────────────

interface PromptContext {
  businessName: string;
  aiName: string;
  persona?: string;
  knowledge?: string | null;
}

function buildGHLAgentPrompt(ctx: PromptContext): string {
  const parts: string[] = [
    `You are ${ctx.aiName}, an AI voice assistant for ${ctx.businessName}.`,
    '',
    'ROLE: You answer inbound calls, qualify leads, book appointments, and provide helpful information. Be warm, professional, and efficient. Keep responses concise — this is a phone call.',
    '',
  ];

  if (ctx.persona) {
    parts.push('PERSONALITY & INSTRUCTIONS:');
    parts.push(ctx.persona);
    parts.push('');
  }

  if (ctx.knowledge) {
    parts.push('BUSINESS KNOWLEDGE (learned from real conversations):');
    parts.push(ctx.knowledge);
    parts.push('');
  }

  parts.push('CALL HANDLING:');
  parts.push('1. Greet the caller warmly and identify yourself');
  parts.push('2. Listen to understand why they\'re calling');
  parts.push('3. Help them with their immediate need');
  parts.push('4. If they want to book, take their name, preferred time, and contact number');
  parts.push('5. Always end with a warm close and their next steps');
  parts.push('');
  parts.push('IMPORTANT: This is a PHONE CALL — be conversational. Never make up information about pricing or availability. If unsure, say "I\'ll have someone from our team follow up with you."');

  return parts.join('\n');
}
