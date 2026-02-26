/**
 * Pipeline → CRM Sync
 *
 * When pipeline leads progress, auto-create CRM contacts and log activities.
 * Called from pipeline approve route and AI Closer.
 */

import { createContact } from './contacts';
import { logActivity } from './activities';
import { enrichContact } from './enrichment';
import { createDeal } from './deals';

interface PipelineLead {
  id: string;
  agency_id: string;
  campaign_id?: string;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  title?: string | null;
  website?: string | null;
  industry?: string | null;
  location?: string | null;
  stage: string;
  enrichment_data?: Record<string, unknown>;
}

/**
 * Sync a pipeline lead to the CRM.
 * Creates contact + company if they don't exist.
 * Logs an activity for the pipeline event.
 * Non-blocking — never throws.
 */
export async function syncPipelineLeadToCrm(
  agencyId: string,
  lead: PipelineLead,
  eventType: string = 'stage_change',
): Promise<string | null> {
  try {
    // Parse name
    const nameParts = (lead.full_name || '').split(' ');
    const firstName = lead.first_name || nameParts[0] || undefined;
    const lastName = lead.last_name || nameParts.slice(1).join(' ') || undefined;

    // Create or find existing contact
    const result = await createContact(agencyId, {
      first_name: firstName,
      last_name: lastName,
      email: lead.email || undefined,
      phone: lead.phone || undefined,
      title: lead.title || undefined,
      company_name: lead.company || undefined,
      source: 'pipeline',
      source_id: lead.id,
      stage: mapPipelineStageTocrm(lead.stage),
      enrichment_data: {
        ...lead.enrichment_data,
        pipeline_lead_id: lead.id,
        pipeline_campaign_id: lead.campaign_id,
        website: lead.website,
        industry: lead.industry,
        location: lead.location,
      },
    });

    const contactId = result.contact?.id;
    if (!contactId) return null;

    // AI auto-enrichment for new contacts (non-blocking)
    if (!result.existing) {
      enrichContact(agencyId, contactId).catch(() => {});
    }

    // Log activity
    const isReply = lead.stage === 'replied';
    await logActivity(agencyId, {
      contact_id: contactId,
      type: isReply ? 'ai_message' : 'stage_change',
      subject: isReply
        ? `Lead replied to outreach`
        : `Pipeline: ${lead.stage}`,
      body: isReply
        ? `${lead.full_name || 'Lead'} from ${lead.company || 'unknown company'} replied to your outreach campaign.`
        : `Lead moved to "${lead.stage}" stage in the AI Sales Pipeline.`,
      direction: isReply ? 'inbound' as const : undefined,
      channel: 'pipeline',
      actor: eventType === 'ai_closer' ? 'ai' : 'system',
      actor_name: eventType === 'ai_closer' ? 'AI Closer' : 'Pipeline',
      needs_attention: isReply || lead.stage === 'interested' || lead.stage === 'booked',
      attention_type: isReply ? 'reply_needed' : lead.stage === 'booked' ? 'review' : undefined,
      metadata: {
        pipeline_lead_id: lead.id,
        pipeline_campaign_id: lead.campaign_id,
        pipeline_stage: lead.stage,
      },
    });

    // Auto-create deal when lead reaches interested or booked
    if (lead.stage === 'interested' || lead.stage === 'booked') {
      const dealStage = lead.stage === 'booked' ? 'qualified' : 'prospect';
      await createDeal(agencyId, {
        name: `${lead.company || lead.full_name || 'Pipeline'} — ${lead.campaign_id ? 'Campaign Lead' : 'Lead'}`,
        contact_id: contactId,
        value: 0,
        stage: dealStage,
        source: 'pipeline',
        source_id: lead.id,
        notes: `Auto-created from pipeline. Lead stage: ${lead.stage}.`,
      }, 'AI Pipeline');
    }

    return contactId;
  } catch (err) {
    console.error('[crm/pipeline-sync] Error:', err);
    return null;
  }
}

function mapPipelineStageTocrm(pipelineStage: string): 'lead' | 'contact' | 'customer' | 'churned' {
  switch (pipelineStage) {
    case 'found':
    case 'approved':
    case 'researched':
    case 'outreach_approved':
    case 'messaged':
      return 'lead';
    case 'replied':
    case 'interested':
      return 'contact';
    case 'booked':
    case 'closed':
      return 'customer';
    case 'skipped':
      return 'churned';
    default:
      return 'lead';
  }
}
