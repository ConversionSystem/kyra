/**
 * POST /api/agency/clients/[id]/seo/run
 *
 * Manually trigger a SEO worker task for a client.
 * Runs in Vercel serverless — no container required.
 *
 * Body: { task: 'geo_test' | 'nap_audit' }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyAdmin } from '@/lib/agency/middleware';
import { createClient } from '@/lib/supabase/server';
import { runGeoTest } from '@/templates/vet-seo-worker/skills/geo-tester/run';
import { runNAPAudit } from '@/templates/vet-seo-worker/skills/nap-auditor/run';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

interface PageParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: PageParams) {
  const { id: clientId } = await params;

  const authResult = await requireAgencyAdmin();
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error.message }, { status: authResult.error.status });
  }

  const { agency } = authResult.data;
  const supabase = await createClient();

  // Fetch client + verify ownership
  const { data: client } = await supabase
    .from('agency_clients')
    .select('id, name, settings')
    .eq('id', clientId)
    .eq('agency_id', agency.id)
    .single();

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const settings = (client.settings as Record<string, unknown>) ?? {};
  if (settings.premium_template !== 'vet-seo-worker') {
    return NextResponse.json({ error: 'Client does not have SEO worker' }, { status: 400 });
  }

  const setup = (settings.premium_template_setup as Record<string, unknown>) ?? {};
  const body = await request.json();
  const { task } = body as { task: string };

  if (!task) {
    return NextResponse.json({ error: 'Missing task' }, { status: 400 });
  }

  // ── Check API keys before running ─────────────────────────────────────
  const openaiKey = process.env.OPENAI_API_KEY;
  const perplexityKey = process.env.PERPLEXITY_API_KEY;
  const firecrawlKey = process.env.FIRECRAWL_API_KEY;

  if (task === 'geo_test' && (!openaiKey || !perplexityKey)) {
    const missing = [!openaiKey && 'OPENAI_API_KEY', !perplexityKey && 'PERPLEXITY_API_KEY'].filter(Boolean);
    return NextResponse.json({
      error: `Missing API keys: ${missing.join(', ')}. Add them in Vercel → Settings → Environment Variables.`,
      missing_keys: missing,
    }, { status: 422 });
  }

  if (task === 'nap_audit' && !firecrawlKey) {
    return NextResponse.json({
      error: 'Missing API key: FIRECRAWL_API_KEY. Add it in Vercel → Settings → Environment Variables.',
      missing_keys: ['FIRECRAWL_API_KEY'],
    }, { status: 422 });
  }

  // Build clinic config from setup wizard data
  const clinic = {
    clinic_name: (setup.clinic_name as string) || client.name,
    city: (setup.city as string) || '',
    state: (setup.state as string) || '',
    address: (setup.address as string) || '',
    address_area: (setup.city as string) || '',
    phone: (setup.phone as string) || '',
    website: (setup.website as string) || '',
    services: (setup.services as string[]) || [],
  };

  try {
    let result: unknown;

    if (task === 'geo_test') {
      console.log(`[seo/run] GEO test starting for ${clinic.clinic_name} in ${clinic.city}`);
      const existing = (settings.seo_data as Record<string, unknown>) ?? {};
      const geoHistory = ((existing.geo_history as unknown[]) ?? []) as Array<{ overall_score: number }>;
      const previousScore = geoHistory[0]?.overall_score ?? null;
      result = await runGeoTest(clinic, previousScore, openaiKey!, perplexityKey!);

      // Persist to seo_data
      const updatedHistory = [result, ...geoHistory];
      if (updatedHistory.length > 12) updatedHistory.splice(12);

      await supabase
        .from('agency_clients')
        .update({
          settings: {
            ...settings,
            seo_data: {
              ...existing,
              geo_history: updatedHistory,
              geo_last_run: new Date().toISOString(),
            },
          },
        })
        .eq('id', clientId);

    } else if (task === 'nap_audit') {
      console.log(`[seo/run] NAP audit starting for ${clinic.clinic_name}`);
      const masterNAP = {
        name: clinic.clinic_name,
        address: clinic.address,
        phone: clinic.phone,
        website: clinic.website,
      };
      result = await runNAPAudit(masterNAP, clinic.city, firecrawlKey!);

      // Persist to seo_data
      const existing = (settings.seo_data as Record<string, unknown>) ?? {};
      await supabase
        .from('agency_clients')
        .update({
          settings: {
            ...settings,
            seo_data: {
              ...existing,
              nap_audit_last: result,
              nap_last_run: new Date().toISOString(),
            },
          },
        })
        .eq('id', clientId);

    } else {
      return NextResponse.json({ error: `Unknown task: ${task}` }, { status: 400 });
    }

    return NextResponse.json({ ok: true, task, result });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[seo/run] ${task} failed for ${clientId}:`, msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
