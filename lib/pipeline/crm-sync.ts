/**
 * CRM Sync Layer — Abstract interface for native CRM integrations
 *
 * This is the core engine that makes Kyra's AI pipeline operate INSIDE a CRM.
 * Called on every stage change to auto-create contacts, tag leads, move
 * pipeline stages, create opportunities, and book appointments.
 *
 * Currently supports: GoHighLevel
 * Coming soon: HubSpot, Salesforce, Pipedrive
 */
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CrmIntegration {
  id: string;
  agency_id: string;
  provider: 'ghl' | 'hubspot' | 'salesforce' | 'pipedrive' | 'custom';
  status: string;
  access_token: string | null;
  location_id: string | null;
  location_name: string | null;
  config: CrmConfig;
  scopes: string[];
}

export interface CrmConfig {
  pipeline_id?: string;
  calendar_id?: string;
  stage_mapping?: Record<string, string>;
  auto_create_contacts?: boolean;
  auto_tag?: boolean;
  auto_opportunity?: boolean;
  tag_prefix?: string;
  [key: string]: unknown;
}

export interface LeadData {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  title: string | null;
  website: string | null;
  industry: string | null;
  location: string | null;
  stage: string;
  previous_stage?: string;
  campaign_id: string;
  campaign_name?: string;
  personalized_subject?: string | null;
  personalized_email?: string | null;
  personalized_opener?: string | null;
  ghl_contact_id?: string | null;
  enrichment_data?: Record<string, unknown>;
}

interface SyncResult {
  operation: string;
  status: 'success' | 'error' | 'skipped';
  data?: Record<string, unknown>;
  error?: string;
}

// ─── Main Sync Entry Point ────────────────────────────────────────────────────

/**
 * Sync a lead's stage change to all connected CRMs.
 * Called by approve route, launch route, lead PATCH route.
 * Non-blocking — logs errors but never throws.
 */
export async function syncLeadToCrm(
  agencyId: string,
  lead: LeadData,
): Promise<SyncResult[]> {
  const results: SyncResult[] = [];

  try {
    const svc = createServiceClientWithoutCookies();

    // Get all connected integrations for this agency
    const { data: integrations } = await svc
      .from('pipeline_integrations')
      .select('*')
      .eq('agency_id', agencyId)
      .eq('status', 'connected');

    if (!integrations?.length) return results;

    for (const integration of integrations as CrmIntegration[]) {
      const syncResults = await syncToProvider(integration, lead);
      results.push(...syncResults);

      // Log each sync operation
      for (const result of syncResults) {
        await svc.from('pipeline_crm_sync_log').insert({
          agency_id: agencyId,
          integration_id: integration.id,
          lead_id: lead.id,
          operation: result.operation,
          provider: integration.provider,
          status: result.status,
          request_data: { stage: lead.stage, previous_stage: lead.previous_stage },
          response_data: result.data || {},
          error_message: result.error || null,
        }).then(() => {}, () => {});
      }
    }
  } catch (err) {
    console.error('[crm-sync] Error:', err);
    results.push({ operation: 'sync', status: 'error', error: err instanceof Error ? err.message : 'Unknown' });
  }

  return results;
}

// ─── Provider Router ──────────────────────────────────────────────────────────

async function syncToProvider(integration: CrmIntegration, lead: LeadData): Promise<SyncResult[]> {
  switch (integration.provider) {
    case 'ghl':
      return syncToGHL(integration, lead);
    case 'hubspot':
      // TODO: Phase 2
      return [{ operation: 'sync', status: 'skipped', error: 'HubSpot not yet implemented' }];
    case 'salesforce':
      // TODO: Phase 2
      return [{ operation: 'sync', status: 'skipped', error: 'Salesforce not yet implemented' }];
    default:
      return [{ operation: 'sync', status: 'skipped', error: `Unknown provider: ${integration.provider}` }];
  }
}

// ─── GoHighLevel Implementation ───────────────────────────────────────────────

const GHL_API = 'https://services.leadconnectorhq.com';
const GHL_VERSION = '2021-04-15';

function ghlHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Version: GHL_VERSION,
    'Content-Type': 'application/json',
  };
}

async function syncToGHL(integration: CrmIntegration, lead: LeadData): Promise<SyncResult[]> {
  const results: SyncResult[] = [];
  const token = integration.access_token;
  if (!token) return [{ operation: 'sync', status: 'error', error: 'No GHL token' }];

  const locationId = integration.location_id;
  if (!locationId) return [{ operation: 'sync', status: 'error', error: 'No GHL location ID' }];

  const config = integration.config || {};
  const tagPrefix = config.tag_prefix || 'kyra';

  try {
    switch (lead.stage) {
      // ═══ LEAD FOUND / APPROVED — Create contact if auto_create enabled ═══
      case 'found':
      case 'approved': {
        if (config.auto_create_contacts === false) break;
        if (lead.ghl_contact_id) break; // Already exists

        const contactResult = await ghlCreateContact(token, locationId, lead, tagPrefix);
        results.push(contactResult);

        // Update lead with GHL contact ID
        if (contactResult.status === 'success' && contactResult.data?.contactId) {
          const svc = createServiceClientWithoutCookies();
          await svc.from('pipeline_leads').update({
            ghl_contact_id: contactResult.data.contactId as string,
          }).eq('id', lead.id);
        }
        break;
      }

      // ═══ RESEARCHED — Update contact with enrichment data ═══
      case 'researched': {
        if (!lead.ghl_contact_id) break;
        const enrichResult = await ghlUpdateContactEnrichment(token, lead);
        results.push(enrichResult);
        // Tag as researched
        if (config.auto_tag !== false) {
          results.push(await ghlAddTag(token, lead.ghl_contact_id, `${tagPrefix}-researched`));
        }
        break;
      }

      // ═══ OUTREACH APPROVED — Tag + create opportunity ═══
      case 'outreach_approved': {
        if (!lead.ghl_contact_id) break;
        if (config.auto_tag !== false) {
          results.push(await ghlAddTag(token, lead.ghl_contact_id, `${tagPrefix}-outreach-approved`));
        }
        break;
      }

      // ═══ MESSAGED — Update contact, add tag, create opportunity ═══
      case 'messaged': {
        if (!lead.ghl_contact_id) break;

        // Tag as messaged
        if (config.auto_tag !== false) {
          results.push(await ghlAddTag(token, lead.ghl_contact_id, `${tagPrefix}-messaged`));
        }

        // Create opportunity if enabled + pipeline is configured
        if (config.auto_opportunity !== false && config.pipeline_id) {
          const stageId = config.stage_mapping?.messaged;
          results.push(await ghlCreateOpportunity(
            token, locationId, lead, config.pipeline_id, stageId, 'Outreach Sent',
          ));
        }
        break;
      }

      // ═══ REPLIED — Hot lead! Tag + move opportunity ═══
      case 'replied': {
        if (!lead.ghl_contact_id) break;
        if (config.auto_tag !== false) {
          results.push(await ghlAddTag(token, lead.ghl_contact_id, `${tagPrefix}-replied`));
          results.push(await ghlAddTag(token, lead.ghl_contact_id, `${tagPrefix}-hot-lead`));
        }
        if (config.pipeline_id && config.stage_mapping?.replied) {
          results.push(await ghlMoveOpportunityStage(
            token, locationId, lead.ghl_contact_id, config.pipeline_id, config.stage_mapping.replied,
          ));
        }
        break;
      }

      // ═══ INTERESTED — High value, update opportunity ═══
      case 'interested': {
        if (!lead.ghl_contact_id) break;
        if (config.auto_tag !== false) {
          results.push(await ghlAddTag(token, lead.ghl_contact_id, `${tagPrefix}-interested`));
        }
        if (config.pipeline_id && config.stage_mapping?.interested) {
          results.push(await ghlMoveOpportunityStage(
            token, locationId, lead.ghl_contact_id, config.pipeline_id, config.stage_mapping.interested,
          ));
        }
        break;
      }

      // ═══ BOOKED — Book appointment + update opportunity ═══
      case 'booked': {
        if (!lead.ghl_contact_id) break;
        if (config.auto_tag !== false) {
          results.push(await ghlAddTag(token, lead.ghl_contact_id, `${tagPrefix}-booked`));
        }
        // Book appointment if calendar is configured
        if (config.calendar_id) {
          results.push(await ghlBookAppointment(token, locationId, lead, config.calendar_id));
        }
        if (config.pipeline_id && config.stage_mapping?.booked) {
          results.push(await ghlMoveOpportunityStage(
            token, locationId, lead.ghl_contact_id, config.pipeline_id, config.stage_mapping.booked,
          ));
        }
        break;
      }

      // ═══ CLOSED — Won! Update opportunity status ═══
      case 'closed': {
        if (!lead.ghl_contact_id) break;
        if (config.auto_tag !== false) {
          results.push(await ghlAddTag(token, lead.ghl_contact_id, `${tagPrefix}-closed-won`));
        }
        if (config.pipeline_id && config.stage_mapping?.closed) {
          results.push(await ghlMoveOpportunityStage(
            token, locationId, lead.ghl_contact_id, config.pipeline_id, config.stage_mapping.closed,
          ));
        }
        break;
      }

      // ═══ SKIPPED — Remove from active pipeline ═══
      case 'skipped': {
        if (!lead.ghl_contact_id) break;
        if (config.auto_tag !== false) {
          results.push(await ghlAddTag(token, lead.ghl_contact_id, `${tagPrefix}-skipped`));
        }
        break;
      }
    }
  } catch (err) {
    results.push({
      operation: 'ghl_sync',
      status: 'error',
      error: err instanceof Error ? err.message : 'GHL sync failed',
    });
  }

  return results;
}

// ─── GHL API Functions ────────────────────────────────────────────────────────

async function ghlCreateContact(
  token: string, locationId: string, lead: LeadData, tagPrefix: string,
): Promise<SyncResult> {
  try {
    // Check for existing contact first (deduplication)
    if (lead.email) {
      const searchRes = await fetch(`${GHL_API}/contacts/search/duplicate?locationId=${locationId}&email=${encodeURIComponent(lead.email)}`, {
        headers: ghlHeaders(token),
        signal: AbortSignal.timeout(8_000),
      });
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const existing = searchData?.contact;
        if (existing?.id) {
          return {
            operation: 'create_contact',
            status: 'success',
            data: { contactId: existing.id, deduplicated: true },
          };
        }
      }
    }

    // Create new contact
    const enrichment = (lead.enrichment_data || {}) as Record<string, string>;
    const res = await fetch(`${GHL_API}/contacts/`, {
      method: 'POST',
      headers: ghlHeaders(token),
      body: JSON.stringify({
        locationId,
        firstName: lead.first_name || '',
        lastName: lead.last_name || '',
        email: lead.email || '',
        phone: lead.phone || '',
        companyName: lead.company || '',
        website: lead.website || '',
        source: 'Kyra AI Pipeline',
        tags: [
          `${tagPrefix}-pipeline`,
          `${tagPrefix}-${lead.stage}`,
          lead.campaign_name ? `campaign-${lead.campaign_name.toLowerCase().replace(/\s+/g, '-').slice(0, 30)}` : '',
        ].filter(Boolean),
        customFields: [],
      }),
      signal: AbortSignal.timeout(10_000),
    });

    const data = await res.json().catch(() => ({}));
    const contactId = data?.contact?.id || data?.id;

    if (!contactId) {
      return { operation: 'create_contact', status: 'error', error: `GHL ${res.status}: ${JSON.stringify(data).slice(0, 200)}` };
    }

    // Add enrichment note
    if (enrichment.company_context || enrichment.likely_pain_points) {
      await fetch(`${GHL_API}/contacts/${contactId}/notes`, {
        method: 'POST',
        headers: ghlHeaders(token),
        body: JSON.stringify({
          body: [
            '🎯 Kyra AI Pipeline Lead',
            '',
            enrichment.company_context ? `Company: ${enrichment.company_context}` : '',
            enrichment.likely_pain_points ? `Pain Points: ${enrichment.likely_pain_points}` : '',
            enrichment.opportunity_angle ? `Opportunity: ${enrichment.opportunity_angle}` : '',
            enrichment.icebreaker ? `Icebreaker: ${enrichment.icebreaker}` : '',
            '',
            `Campaign: ${lead.campaign_name || 'Unknown'}`,
            `Industry: ${lead.industry || 'Unknown'}`,
            `Location: ${lead.location || 'Unknown'}`,
          ].filter(Boolean).join('\n'),
        }),
        signal: AbortSignal.timeout(8_000),
      }).catch(() => {});
    }

    return { operation: 'create_contact', status: 'success', data: { contactId, deduplicated: false } };
  } catch (err) {
    return { operation: 'create_contact', status: 'error', error: err instanceof Error ? err.message : 'Unknown' };
  }
}

async function ghlUpdateContactEnrichment(token: string, lead: LeadData): Promise<SyncResult> {
  if (!lead.ghl_contact_id) return { operation: 'update_contact', status: 'skipped', error: 'No contact ID' };

  try {
    const updates: Record<string, string> = {};
    if (lead.first_name) updates.firstName = lead.first_name;
    if (lead.last_name) updates.lastName = lead.last_name;
    if (lead.email) updates.email = lead.email;
    if (lead.phone) updates.phone = lead.phone;
    if (lead.title) updates.tags = lead.title; // Title as additional context

    const res = await fetch(`${GHL_API}/contacts/${lead.ghl_contact_id}`, {
      method: 'PUT',
      headers: ghlHeaders(token),
      body: JSON.stringify(updates),
      signal: AbortSignal.timeout(8_000),
    });

    return { operation: 'update_contact', status: res.ok ? 'success' : 'error', error: res.ok ? undefined : `HTTP ${res.status}` };
  } catch (err) {
    return { operation: 'update_contact', status: 'error', error: err instanceof Error ? err.message : 'Unknown' };
  }
}

async function ghlAddTag(token: string, contactId: string, tag: string): Promise<SyncResult> {
  try {
    const res = await fetch(`${GHL_API}/contacts/${contactId}/tags`, {
      method: 'POST',
      headers: ghlHeaders(token),
      body: JSON.stringify({ tags: [tag] }),
      signal: AbortSignal.timeout(5_000),
    });
    return { operation: 'add_tag', status: res.ok ? 'success' : 'error', data: { tag }, error: res.ok ? undefined : `HTTP ${res.status}` };
  } catch (err) {
    return { operation: 'add_tag', status: 'error', data: { tag }, error: err instanceof Error ? err.message : 'Unknown' };
  }
}

async function ghlCreateOpportunity(
  token: string, locationId: string, lead: LeadData,
  pipelineId: string, stageId: string | undefined, stageName: string,
): Promise<SyncResult> {
  try {
    const body: Record<string, unknown> = {
      pipelineId,
      locationId,
      name: `${lead.company || lead.full_name || 'Lead'} — Kyra Pipeline`,
      contactId: lead.ghl_contact_id,
      status: 'open',
      source: 'Kyra AI Pipeline',
    };
    if (stageId) body.pipelineStageId = stageId;

    const res = await fetch(`${GHL_API}/opportunities/`, {
      method: 'POST',
      headers: ghlHeaders(token),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });

    const data = await res.json().catch(() => ({}));
    return {
      operation: 'create_opportunity',
      status: res.ok ? 'success' : 'error',
      data: { opportunityId: data?.opportunity?.id || data?.id, stageName },
      error: res.ok ? undefined : `HTTP ${res.status}`,
    };
  } catch (err) {
    return { operation: 'create_opportunity', status: 'error', error: err instanceof Error ? err.message : 'Unknown' };
  }
}

async function ghlMoveOpportunityStage(
  token: string, locationId: string, contactId: string,
  pipelineId: string, stageId: string,
): Promise<SyncResult> {
  try {
    // Find the opportunity for this contact in this pipeline
    const searchRes = await fetch(
      `${GHL_API}/opportunities/search?location_id=${locationId}&pipeline_id=${pipelineId}&contact_id=${contactId}&limit=1`,
      { headers: ghlHeaders(token), signal: AbortSignal.timeout(8_000) },
    );

    if (!searchRes.ok) {
      return { operation: 'move_stage', status: 'error', error: `Search failed: HTTP ${searchRes.status}` };
    }

    const searchData = await searchRes.json();
    const opportunity = searchData?.opportunities?.[0];
    if (!opportunity?.id) {
      return { operation: 'move_stage', status: 'skipped', error: 'No opportunity found for contact' };
    }

    // Move to new stage
    const res = await fetch(`${GHL_API}/opportunities/${opportunity.id}`, {
      method: 'PUT',
      headers: ghlHeaders(token),
      body: JSON.stringify({ pipelineStageId: stageId }),
      signal: AbortSignal.timeout(8_000),
    });

    return {
      operation: 'move_stage',
      status: res.ok ? 'success' : 'error',
      data: { opportunityId: opportunity.id, stageId },
      error: res.ok ? undefined : `HTTP ${res.status}`,
    };
  } catch (err) {
    return { operation: 'move_stage', status: 'error', error: err instanceof Error ? err.message : 'Unknown' };
  }
}

async function ghlBookAppointment(
  token: string, locationId: string, lead: LeadData, calendarId: string,
): Promise<SyncResult> {
  try {
    // Find next available slot (look 2 days ahead)
    const startDate = new Date();
    const endDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

    const slotsRes = await fetch(
      `${GHL_API}/calendars/${calendarId}/free-slots?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}&timezone=America/New_York`,
      { headers: ghlHeaders(token), signal: AbortSignal.timeout(8_000) },
    );

    if (!slotsRes.ok) {
      return { operation: 'book_appointment', status: 'error', error: `Slots fetch failed: HTTP ${slotsRes.status}` };
    }

    const slotsData = await slotsRes.json();
    // Find first available slot
    let firstSlot: string | null = null;
    const slots = slotsData?.slots || slotsData || {};
    for (const [, daySlots] of Object.entries(slots)) {
      if (Array.isArray(daySlots) && daySlots.length > 0) {
        firstSlot = daySlots[0] as string;
        break;
      }
    }

    if (!firstSlot) {
      return { operation: 'book_appointment', status: 'skipped', error: 'No available slots in next 48h' };
    }

    // Book the appointment
    const appointmentRes = await fetch(`${GHL_API}/calendars/events/appointments`, {
      method: 'POST',
      headers: ghlHeaders(token),
      body: JSON.stringify({
        calendarId,
        locationId,
        contactId: lead.ghl_contact_id,
        startTime: firstSlot,
        title: `Demo — ${lead.company || lead.full_name || 'Pipeline Lead'}`,
        appointmentStatus: 'confirmed',
        assignedUserId: '', // Will use calendar owner
      }),
      signal: AbortSignal.timeout(10_000),
    });

    const apptData = await appointmentRes.json().catch(() => ({}));
    return {
      operation: 'book_appointment',
      status: appointmentRes.ok ? 'success' : 'error',
      data: { appointmentId: apptData?.id, slot: firstSlot },
      error: appointmentRes.ok ? undefined : `HTTP ${appointmentRes.status}`,
    };
  } catch (err) {
    return { operation: 'book_appointment', status: 'error', error: err instanceof Error ? err.message : 'Unknown' };
  }
}

// ─── Public GHL Helpers (for API routes) ──────────────────────────────────────

/**
 * Get the GHL integration for an agency (if connected).
 */
export async function getGhlIntegration(agencyId: string): Promise<CrmIntegration | null> {
  const svc = createServiceClientWithoutCookies();
  const { data } = await svc
    .from('pipeline_integrations')
    .select('*')
    .eq('agency_id', agencyId)
    .eq('provider', 'ghl')
    .eq('status', 'connected')
    .single();
  return data as CrmIntegration | null;
}

/**
 * Validate a GHL Private Integration Token and return location info.
 */
export async function validateGhlToken(token: string): Promise<{
  valid: boolean;
  locationId?: string;
  locationName?: string;
  companyName?: string;
  error?: string;
}> {
  try {
    // Try to get business info with this token
    const res = await fetch(`${GHL_API}/locations/search`, {
      headers: ghlHeaders(token),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      // Try alternative endpoint
      const altRes = await fetch(`${GHL_API}/users/`, {
        headers: ghlHeaders(token),
        signal: AbortSignal.timeout(10_000),
      });
      if (!altRes.ok) {
        return { valid: false, error: `Invalid token (HTTP ${res.status}). Check your Private Integration Token.` };
      }
      const userData = await altRes.json();
      const user = userData?.users?.[0];
      return {
        valid: true,
        locationId: user?.roles?.locationIds?.[0],
        locationName: user?.name || 'Unknown',
      };
    }

    const data = await res.json();
    const location = data?.locations?.[0];
    return {
      valid: true,
      locationId: location?.id,
      locationName: location?.name,
      companyName: location?.business?.name,
    };
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : 'Connection failed' };
  }
}

/**
 * Fetch GHL calendars for an agency's integration.
 */
export async function getGhlCalendars(token: string, locationId: string): Promise<Array<{ id: string; name: string }>> {
  try {
    const res = await fetch(`${GHL_API}/calendars/?locationId=${locationId}`, {
      headers: ghlHeaders(token),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.calendars || []).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }));
  } catch { return []; }
}

/**
 * Fetch GHL pipelines for an agency's integration.
 */
export async function getGhlPipelines(token: string, locationId: string): Promise<Array<{ id: string; name: string; stages: Array<{ id: string; name: string }> }>> {
  try {
    const res = await fetch(`${GHL_API}/opportunities/pipelines?locationId=${locationId}`, {
      headers: ghlHeaders(token),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.pipelines || []).map((p: { id: string; name: string; stages: Array<{ id: string; name: string }> }) => ({
      id: p.id,
      name: p.name,
      stages: (p.stages || []).map(s => ({ id: s.id, name: s.name })),
    }));
  } catch { return []; }
}
