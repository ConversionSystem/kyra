/**
 * Auto-Outreach Engine — Push lead to GHL workflow
 *
 * POST /api/agency/leads/push-ghl
 *
 * Fires OUTREACH_WEBHOOK_URL with lead data + personalized pitch link.
 * The GHL workflow creates a contact and enrolls them in the niche
 * cold email sequence (5 niches × 3 stages = 15 ready emails).
 *
 * If OUTREACH_WEBHOOK_URL is not set, returns a 200 with a setup hint
 * so the UI can handle it gracefully.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser } from '@/lib/agency/queries';

const MASTER_EMAILS = ['hello@conversionsystem.com', 'angel@conversionsystem.com'];

// Niche → cold email sequence ID in GHL (maps to the 5-niche sequences from PR #152)
const NICHE_TO_SEQUENCE: Record<string, string> = {
  dental:       'dental-cold-sequence',
  medspa:       'medspa-cold-sequence',
  realestate:   'realestate-cold-sequence',
  auto:         'auto-cold-sequence',
  cannabis:     'cannabis-cold-sequence',
  homeservices: 'homeservices-cold-sequence',
  fitness:      'fitness-cold-sequence',
  lawfirm:      'lawfirm-cold-sequence',
  restaurant:   'restaurant-cold-sequence',
  insurance:    'insurance-cold-sequence',
};

function slugifyNiche(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z]/g, '').slice(0, 20);
}

function buildPitchUrl(owner: string, agency: string, niche: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://kyra.conversionsystem.com';
  const params = new URLSearchParams({ name: owner, agency, niche });
  return `${base}/for?${params.toString()}`;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !MASTER_EMAILS.includes(user.email ?? '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await getAgencyForUser(user.id); // ensure agency exists

    const body = await req.json();
    const { leads, bulkMode = false } = body as {
      leads: Array<{
        id: string;
        owner: string;
        agency: string;
        niche: string;
        email?: string;
        linkedin?: string;
        warmth: string;
        angle: string;
        why: string;
        location: string;
        clients: string;
        ghlTier: string;
      }>;
      bulkMode?: boolean;
    };

    if (!leads || leads.length === 0) {
      return NextResponse.json({ error: 'No leads provided' }, { status: 400 });
    }

    const webhookUrl = process.env.OUTREACH_WEBHOOK_URL;
    if (!webhookUrl) {
      // Graceful degradation: return setup instructions
      return NextResponse.json({
        status: 'no_webhook',
        message: 'OUTREACH_WEBHOOK_URL is not set. Add it to Vercel env vars pointing to your GHL outreach workflow.',
        setupUrl: 'https://app.gohighlevel.com/settings/integrations',
        leadsCount: leads.length,
      });
    }

    const results: Array<{ id: string; status: 'enrolled' | 'error'; error?: string }> = [];

    // Fire webhook for each lead (parallel, max 5 at a time to avoid GHL rate limits)
    const batchSize = 5;
    for (let i = 0; i < leads.length; i += batchSize) {
      const batch = leads.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (lead) => {
          const nicheSlug = slugifyNiche(lead.niche);
          const pitchUrl = buildPitchUrl(lead.owner, lead.agency, nicheSlug);
          const sequence = NICHE_TO_SEQUENCE[nicheSlug] ?? 'general-cold-sequence';

          const payload = {
            type: 'outreach_lead',
            lead_id: lead.id,
            // Contact fields for GHL
            full_name: lead.owner,
            company_name: lead.agency,
            email: lead.email || '',
            source: 'kyra-sales-pipeline',
            tags: ['kyra-outreach', `warmth-${lead.warmth}`, `niche-${nicheSlug}`],
            // Outreach context
            niche: lead.niche,
            niche_slug: nicheSlug,
            location: lead.location,
            client_count: lead.clients,
            ghl_tier: lead.ghlTier,
            warmth: lead.warmth,
            // Personalization
            personalized_opener: lead.angle,
            why_fit: lead.why,
            pitch_url: pitchUrl,
            linkedin_url: lead.linkedin || '',
            // Sequence to enroll in
            sequence_id: sequence,
            // Meta
            bulk_mode: bulkMode,
            enrolled_at: new Date().toISOString(),
          };

          try {
            const res = await fetch(webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
              signal: AbortSignal.timeout(8000),
            });

            if (!res.ok) {
              return { id: lead.id, status: 'error' as const, error: `GHL webhook returned ${res.status}` };
            }
            return { id: lead.id, status: 'enrolled' as const };
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            return { id: lead.id, status: 'error' as const, error: msg };
          }
        })
      );
      results.push(...batchResults);
    }

    const enrolled = results.filter(r => r.status === 'enrolled').length;
    const errors = results.filter(r => r.status === 'error').length;

    return NextResponse.json({
      status: 'done',
      enrolled,
      errors,
      results,
      message: `${enrolled} lead${enrolled !== 1 ? 's' : ''} enrolled in GHL campaign${errors > 0 ? `, ${errors} failed` : ''}.`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[leads/push-ghl] error:', msg);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
