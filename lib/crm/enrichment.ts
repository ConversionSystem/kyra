/**
 * CRM AI Auto-Enrichment
 *
 * When a contact is created, spend 2 credits to enrich via GPT-4o:
 * - Company research (website scrape)
 * - AI-generated relationship summary
 * - Suggested next action
 * - Score estimation
 */

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { logActivity } from './activities';
import { deductCredits, getAgencyCredits, CREDIT_COSTS } from '@/lib/billing/credit-engine';

const ENRICHMENT_COST = CREDIT_COSTS?.crm_enrichment ?? 2;

export async function enrichContact(agencyId: string, contactId: string): Promise<boolean> {
  try {
    const svc = createServiceClientWithoutCookies();

    // Check credits
    const creditBalance = await getAgencyCredits(agencyId);
    if (creditBalance.balance < ENRICHMENT_COST) {
      console.log('[crm/enrichment] Insufficient credits for enrichment:', creditBalance.balance);
      return false;
    }

    // Get contact
    const { data: contact } = await svc
      .from('crm_contacts')
      .select('*, crm_companies!crm_contacts_company_id_fkey(name, website, industry)')
      .eq('id', contactId)
      .eq('agency_id', agencyId)
      .single();

    if (!contact) return false;

    const company = (contact as Record<string, unknown>).crm_companies as Record<string, unknown> | null;
    const existingEnrichment = contact.enrichment_data || {};

    // Build enrichment prompt
    const prompt = buildEnrichmentPrompt(contact, company, existingEnrichment);

    // Call GPT-4o
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('[crm/enrichment] No OPENAI_API_KEY');
      return false;
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a CRM enrichment AI. Return valid JSON only, no markdown.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 800,
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      console.error('[crm/enrichment] OpenAI error:', res.status, await res.text());
      return false;
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return false;

    let enriched: EnrichmentResult;
    try {
      enriched = JSON.parse(content);
    } catch {
      console.error('[crm/enrichment] Failed to parse response:', content);
      return false;
    }

    // Deduct credits
    await deductCredits(agencyId, 'crm_enrichment', {
      description: `Enriched contact: ${contact.first_name || ''} ${contact.last_name || ''}`,
    });

    // Update contact
    const updates: Record<string, unknown> = {
      ai_summary: enriched.summary || null,
      ai_next_action: enriched.next_action || null,
      ai_last_analyzed_at: new Date().toISOString(),
      enrichment_data: {
        ...existingEnrichment,
        ai_enriched: true,
        ai_enriched_at: new Date().toISOString(),
        ...(enriched.company_info || {}),
        ...(enriched.contact_info || {}),
      },
    };

    // Update score if AI suggests one
    if (enriched.estimated_score && enriched.estimated_score > 0) {
      updates.score = Math.min(100, Math.max(0, enriched.estimated_score));
      updates.score_label = enriched.estimated_score >= 70 ? 'hot' :
        enriched.estimated_score >= 40 ? 'warm' :
        enriched.estimated_score >= 10 ? 'cold' : 'new';
    }

    await svc
      .from('crm_contacts')
      .update(updates)
      .eq('id', contactId)
      .eq('agency_id', agencyId);

    // Update company if we got info
    if (company && enriched.company_info) {
      const companyUpdates: Record<string, unknown> = {};
      if (enriched.company_info.industry && !company.industry) companyUpdates.industry = enriched.company_info.industry;
      if (enriched.company_info.size && !company.size) companyUpdates.size = enriched.company_info.size;
      if (enriched.company_info.description) companyUpdates.description = enriched.company_info.description;
      if (Object.keys(companyUpdates).length > 0) {
        await svc.from('crm_companies').update(companyUpdates).eq('id', company.id as string);
      }
    }

    // Log activity
    await logActivity(agencyId, {
      contact_id: contactId,
      type: 'enrichment',
      subject: 'AI auto-enrichment complete',
      body: enriched.summary || 'Contact enriched with AI analysis.',
      actor: 'ai',
      actor_name: 'AI Enrichment',
      metadata: { credits_used: ENRICHMENT_COST },
    });

    return true;
  } catch (err) {
    console.error('[crm/enrichment] Error:', err);
    return false;
  }
}

interface EnrichmentResult {
  summary: string;
  next_action: string;
  estimated_score: number;
  company_info?: {
    industry?: string;
    size?: string;
    description?: string;
    tech_stack?: string[];
    social_profiles?: Record<string, string>;
  };
  contact_info?: {
    likely_role?: string;
    seniority?: string;
    linkedin_url?: string;
    talking_points?: string[];
  };
}

function buildEnrichmentPrompt(
  contact: Record<string, unknown>,
  company: Record<string, unknown> | null,
  existingData: Record<string, unknown>,
): string {
  return `Analyze this CRM contact and provide enrichment data.

CONTACT:
- Name: ${contact.first_name || ''} ${contact.last_name || ''}
- Email: ${contact.email || 'unknown'}
- Phone: ${contact.phone || 'unknown'}
- Title: ${contact.title || 'unknown'}
- Source: ${contact.source || 'unknown'}

COMPANY:
- Name: ${company?.name || 'unknown'}
- Website: ${company?.website || existingData?.website || 'unknown'}
- Industry: ${company?.industry || existingData?.industry || 'unknown'}

EXISTING DATA:
${JSON.stringify(existingData, null, 2).slice(0, 500)}

Return JSON with:
{
  "summary": "2-3 sentence relationship brief. Who is this person, what do they likely need, why are they valuable.",
  "next_action": "Specific recommended next step (e.g., 'Send intro email about agency AI solutions')",
  "estimated_score": 0-100 (how likely to convert: 0=unknown, 10=cold, 40=warm, 70=hot, 90=very hot),
  "company_info": {
    "industry": "...",
    "size": "1-10 | 11-50 | 51-200 | 200+",
    "description": "1 sentence about the company",
    "tech_stack": ["..."],
    "social_profiles": {"linkedin": "...", "twitter": "..."}
  },
  "contact_info": {
    "likely_role": "decision-maker | influencer | end-user | unknown",
    "seniority": "c-level | vp | director | manager | individual | unknown",
    "talking_points": ["2-3 conversation starters based on their background"]
  }
}`;
}
