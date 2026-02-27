/**
 * Soul Injector — Write campaign context to OpenClaw container workspace
 *
 * This is what makes the AI Closer truly OpenClaw-powered:
 * - Writes SOUL.md → agent identity as a sales closer with full campaign context
 * - Writes CAMPAIGN.md → detailed lead profiles, enrichment data, objection playbook
 * - The OpenClaw agent reads these at session start → persistent knowledge across conversations
 * - Combined with OpenClaw's memory system → the agent remembers every interaction
 *
 * Without this: the AI Closer is just a stateless LLM call with a system prompt.
 * With this: the AI Closer is a persistent agent that KNOWS your campaign, REMEMBERS
 * every lead interaction, and IMPROVES its approach over time.
 *
 * Flow:
 *   Campaign launches outreach
 *   → injectCampaignContext() writes SOUL.md + CAMPAIGN.md to container workspace
 *   → Lead replies → AI Closer activates → OpenClaw agent loads workspace files
 *   → Agent has full context: who they are, what they're selling, who each lead is
 *   → Agent responds with persistent memory of prior exchanges
 */

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import {
  getGatewayByGhlLocation,
  getGatewayByAgencyId,
  type ClientGateway,
} from '@/lib/ovh/gateway-resolver';
import { getGhlIntegration } from '@/lib/pipeline/crm-sync';

const PROVISIONER_URL = process.env.OVH_PROVISIONER_URL || 'http://192.99.43.7:9090';
const PROVISIONER_SECRET = process.env.OVH_PROVISIONER_SECRET || '';

// ─── Types ────────────────────────────────────────────────────────────────────

interface InjectionResult {
  ok: boolean;
  clientId?: string;
  filesWritten?: string[];
  error?: string;
}

interface CampaignRow {
  id: string;
  name: string;
  target_industry: string | null;
  target_role: string | null;
  target_location: string | null;
  target_company_size: string | null;
  target_pain_points: string | null;
  value_prop: string | null;
  agency_id: string;
}

interface LeadRow {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  industry: string | null;
  location: string | null;
  stage: string;
  personalized_subject: string | null;
  personalized_email: string | null;
  personalized_opener: string | null;
  enrichment_data: Record<string, unknown> | null;
  notes: string | null;
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

/**
 * Inject campaign context into the OpenClaw container's workspace.
 * Called when outreach is launched — before any leads reply.
 *
 * Writes:
 *   workspace/SOUL.md     — closer identity + campaign overview + rules
 *   workspace/CAMPAIGN.md — detailed lead profiles + enrichment + playbook
 */
export async function injectCampaignContext(
  agencyId: string,
  campaignId: string,
): Promise<InjectionResult> {
  const svc = createServiceClientWithoutCookies();

  // 1. Load campaign
  const { data: campaign, error: campErr } = await svc
    .from('pipeline_campaigns')
    .select('*')
    .eq('id', campaignId)
    .eq('agency_id', agencyId)
    .single();

  if (campErr || !campaign) {
    return { ok: false, error: `Campaign not found: ${campErr?.message || 'missing'}` };
  }

  // 2. Load leads for this campaign (messaged or later — the ones the closer will interact with)
  const { data: leads } = await svc
    .from('pipeline_leads')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('agency_id', agencyId)
    .in('stage', ['messaged', 'replied', 'interested', 'booked', 'outreach_approved', 'researched'])
    .order('full_name');

  // 3. Load agency name
  const { data: agency } = await svc
    .from('agencies')
    .select('name')
    .eq('id', agencyId)
    .single();

  const agencyName = agency?.name || 'Our Agency';

  // 4. Resolve the correct OpenClaw container
  const gateway = await resolveCloserContainer(agencyId);
  if (!gateway) {
    return { ok: false, error: 'No running OpenClaw container found for this agency' };
  }

  // 5. Build workspace files
  const soulContent = buildSoulMd(campaign as CampaignRow, agencyName);
  const campaignContent = buildCampaignMd(campaign as CampaignRow, (leads || []) as LeadRow[], agencyName);

  // 6. Write to container workspace via provisioner
  const filesWritten: string[] = [];

  const soulOk = await writeToWorkspace(gateway.clientId, 'SOUL.md', soulContent);
  if (soulOk) filesWritten.push('SOUL.md');

  const campaignOk = await writeToWorkspace(gateway.clientId, 'CAMPAIGN.md', campaignContent);
  if (campaignOk) filesWritten.push('CAMPAIGN.md');

  if (filesWritten.length === 0) {
    return { ok: false, clientId: gateway.clientId, error: 'Failed to write any workspace files' };
  }

  console.log(
    `[soul-injector] Injected campaign "${campaign.name}" into container ${gateway.clientId} — ` +
    `${filesWritten.join(', ')} (${(leads || []).length} leads)`,
  );

  return { ok: true, clientId: gateway.clientId, filesWritten };
}

/**
 * Update a single lead's context in the container workspace.
 * Called when a lead's stage changes or new enrichment arrives.
 * Rewrites CAMPAIGN.md with latest lead data.
 */
export async function updateLeadContext(
  agencyId: string,
  campaignId: string,
): Promise<InjectionResult> {
  // Re-inject full campaign context (includes latest lead data)
  return injectCampaignContext(agencyId, campaignId);
}

// ─── Container Resolution ─────────────────────────────────────────────────────

/**
 * Resolve which OpenClaw container should handle the AI Closer for this agency.
 *
 * Priority:
 * 1. Container matching the agency's GHL location (from pipeline_integrations)
 * 2. First running container for the agency (fallback)
 */
export async function resolveCloserContainer(agencyId: string): Promise<ClientGateway | null> {
  // Try GHL location-based routing first
  const ghlIntegration = await getGhlIntegration(agencyId);
  if (ghlIntegration?.location_id) {
    const locationGateway = await getGatewayByGhlLocation(ghlIntegration.location_id);
    if (locationGateway) {
      return locationGateway;
    }
  }

  // Fallback: first running container for the agency
  return getGatewayByAgencyId(agencyId);
}

// ─── Provisioner API ──────────────────────────────────────────────────────────

async function writeToWorkspace(clientId: string, filePath: string, content: string): Promise<boolean> {
  try {
    const res = await fetch(`${PROVISIONER_URL}/containers/${clientId}/workspace`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${PROVISIONER_SECRET}`,
      },
      body: JSON.stringify({ path: filePath, content }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');

      // Graceful 404: provisioner endpoint may not exist yet (container not deployed)
      if (res.status === 404) {
        console.warn(
          `[soul-injector] Provisioner endpoint not found for ${clientId} (404). ` +
          `Container may not be deployed yet -- skipping ${filePath} write.`,
        );
        return false;
      }

      console.error(`[soul-injector] Failed to write ${filePath} for ${clientId}: ${res.status} ${err}`);
      return false;
    }

    return true;
  } catch (err) {
    // Graceful handling: network errors (ECONNREFUSED, timeout) shouldn't break the launch flow
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('ECONNREFUSED') || msg.includes('fetch failed') || msg.includes('AbortError')) {
      console.warn(
        `[soul-injector] Provisioner unreachable for ${clientId} -- ` +
        `skipping ${filePath} write (${msg}). Launch continues.`,
      );
    } else {
      console.error(`[soul-injector] Error writing ${filePath} for ${clientId}:`, err);
    }
    return false;
  }
}

// ─── Content Builders ─────────────────────────────────────────────────────────

function buildSoulMd(campaign: CampaignRow, agencyName: string): string {
  return `# SOUL.md — AI Sales Closer

You are the AI Closer for **${agencyName}**. You are a skilled sales professional who closes deals through natural, human conversation. You are NOT a chatbot — you are a real person on the sales team having authentic text and email conversations with prospects.

## Your Active Campaign: ${campaign.name}

**What you're selling:** ${campaign.value_prop || 'AI-powered solutions that save time and increase revenue'}
**Target industry:** ${campaign.target_industry || 'Various'}
**Target role:** ${campaign.target_role || 'Business owners and decision-makers'}
**Target location:** ${campaign.target_location || 'Global'}
${campaign.target_pain_points ? `**Pain points you solve:** ${campaign.target_pain_points}` : ''}

## Your Mission

Turn replies into booked demos and meetings. Every person you talk to received personalized outreach from your team. When they reply, your job is to:

1. **Identify them** — check CAMPAIGN.md for their profile, what was sent, and their enrichment data
2. **Engage naturally** — match their tone, answer their question, be genuinely helpful
3. **Guide to a meeting** — suggest specific times, make it easy to say yes
4. **Handle objections** — address concerns with empathy, not pressure
5. **Know when to step back** — if they say no, acknowledge gracefully with one soft follow-up max

## Communication Rules

1. **Keep it SHORT** — 2-4 sentences for SMS, 3-6 for email. Nobody reads walls of text.
2. **Match their energy** — casual if they're casual, professional if they're formal.
3. **Answer first, pivot second** — address their question directly, then guide toward a call.
4. **No emojis** unless they use them first.
5. **No "Hey!" or "Hi there!"** — jump straight into substance.
6. **Sign with first name only** — no titles, keep it human.
7. **NEVER reveal you are AI.** You are a person on the team.
8. **NEVER make up capabilities** or promise things that aren't real.

## Memory & Context

You have persistent memory across conversations. Use it:
- Remember what each lead said in previous messages
- Track where each conversation left off
- Note preferences, objections, and interests mentioned
- Update your approach based on what's working

Your detailed lead profiles and enrichment data are in **CAMPAIGN.md** — read it for the full picture on every person you're talking to.
`;
}

function buildCampaignMd(campaign: CampaignRow, leads: LeadRow[], agencyName: string): string {
  const leadProfiles = leads.map((lead, i) => {
    const enrichment = (lead.enrichment_data || {}) as Record<string, string>;
    return `### ${i + 1}. ${lead.full_name || 'Unknown'} — ${lead.company || 'Unknown Company'}
- **Title:** ${lead.title || 'Decision-maker'}
- **Industry:** ${lead.industry || campaign.target_industry || 'Unknown'}
- **Location:** ${lead.location || 'Unknown'}
- **Email:** ${lead.email || 'N/A'}
- **Phone:** ${lead.phone || 'N/A'}
- **Website:** ${lead.website || 'N/A'}
- **Stage:** ${lead.stage}
${enrichment.company_context ? `- **About their business:** ${enrichment.company_context}` : ''}
${enrichment.likely_pain_points ? `- **Their pain points:** ${enrichment.likely_pain_points}` : ''}
${enrichment.opportunity_angle ? `- **Our opportunity:** ${enrichment.opportunity_angle}` : ''}
${enrichment.icebreaker ? `- **Icebreaker:** ${enrichment.icebreaker}` : ''}
${lead.personalized_subject ? `- **Email subject sent:** ${lead.personalized_subject}` : ''}
${lead.personalized_opener ? `- **SMS sent:** ${lead.personalized_opener}` : ''}
${lead.notes ? `- **Notes:** ${lead.notes}` : ''}`;
  }).join('\n\n');

  return `# CAMPAIGN.md — ${campaign.name}

## Campaign Overview
- **Agency:** ${agencyName}
- **Campaign:** ${campaign.name}
- **Value Proposition:** ${campaign.value_prop || 'AI-powered solutions'}
- **Target Industry:** ${campaign.target_industry || 'Various'}
- **Target Role:** ${campaign.target_role || 'Business owners'}
- **Target Location:** ${campaign.target_location || 'Global'}
- **Company Size:** ${campaign.target_company_size || 'All sizes'}
${campaign.target_pain_points ? `- **Pain Points:** ${campaign.target_pain_points}` : ''}

## Lead Profiles (${leads.length} active leads)

When a lead replies, find them below by name, email, or phone number to get full context.

${leadProfiles || '_No leads loaded yet._'}

## Objection Playbook

**"Not interested"**
→ "Totally understand — thanks for letting me know. Just curious, is it a timing thing or not the right fit? Either way, appreciate your time."

**"How much does it cost?"**
→ Give a range if you know it, then pivot: "Pricing depends on the scope — happy to walk through what makes sense for [their company] on a quick call. Got 15 min this week?"

**"Who is this?"**
→ "Hey [name], this is [first name] from ${agencyName}. I reached out about [reference the email/SMS sent]. Did you get a chance to look at it?"

**"Send me more info"**
→ "Absolutely — what specifically are you most curious about? Want to make sure I send the right stuff." (Gets them talking instead of going dark)

**"We already have a solution"**
→ "Nice — mind if I ask what you're using? Not trying to replace anything that's working. Just see if there's a gap we could help with."

**"Call me later / not now"**
→ "Of course — when works better? I can reach out [suggest 2 specific times]. What's easiest?"

---
*Last updated: ${new Date().toISOString()}*
*Injected by Kyra AI Pipeline — this file is auto-managed.*
`;
}
