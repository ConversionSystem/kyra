/**
 * Daily Briefing API
 * 
 * GET /api/briefing?agencyId=xxx — Generate briefing for a specific agency
 * POST /api/briefing/send-all — Trigger briefings for all agencies (cron)
 * 
 * Secured by CRON_SECRET header for automated runs.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { generateBriefingData, formatBriefing } from '@/lib/briefing/daily-briefing';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// GET — Preview briefing for authenticated user's agency
export async function GET(req: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agencyId = req.nextUrl.searchParams.get('agencyId');
  if (!agencyId) {
    // Find user's agency
    const { data: membership } = await sb
      .from('agency_members')
      .select('agency_id')
      .eq('user_id', user.id)
      .single();
    
    if (!membership) return NextResponse.json({ error: 'No agency found' }, { status: 404 });

    try {
      const data = await generateBriefingData(membership.agency_id);
      if (!data) return NextResponse.json({ error: 'Failed to generate briefing', agencyId: membership.agency_id }, { status: 500 });
      
      return NextResponse.json({
        briefing: formatBriefing(data),
        data,
      });
    } catch (err) {
      return NextResponse.json({ error: 'Briefing generation error', detail: (err as Error).message, agencyId: membership.agency_id }, { status: 500 });
    }
  }

  // Verify user has access to this agency
  const { data: member } = await sb
    .from('agency_members')
    .select('agency_id')
    .eq('user_id', user.id)
    .eq('agency_id', agencyId)
    .single();

  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const data = await generateBriefingData(agencyId);
  if (!data) return NextResponse.json({ error: 'Failed to generate briefing' }, { status: 500 });

  return NextResponse.json({
    briefing: formatBriefing(data),
    data,
  });
}

// POST — Send briefings to all agencies with briefing enabled
export async function POST(req: NextRequest) {
  // Verify cron secret
  const cronSecret = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret');
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Invalid cron secret' }, { status: 403 });
  }

  const supabase = createServiceClientWithoutCookies();

  // Get all agencies with briefing enabled in settings
  const { data: agencies } = await supabase
    .from('agencies')
    .select('id, name, settings, gateway_url, gateway_token')
    .not('gateway_url', 'is', null);

  if (!agencies || agencies.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No agencies with gateways' });
  }

  const results: Array<{ agencyId: string; name: string; status: string }> = [];

  for (const agency of agencies) {
    const settings = (agency.settings ?? {}) as Record<string, unknown>;
    
    // Skip if briefing explicitly disabled
    if (settings.daily_briefing === false) continue;

    try {
      const data = await generateBriefingData(agency.id);
      if (!data) {
        results.push({ agencyId: agency.id, name: agency.name, status: 'skip-no-data' });
        continue;
      }

      // Skip if no conversations at all (inactive account)
      if (data.conversationsTotal === 0 && data.hotLeads.length === 0) {
        results.push({ agencyId: agency.id, name: agency.name, status: 'skip-inactive' });
        continue;
      }

      const briefingText = formatBriefing(data);

      // Send via OpenClaw gateway (it will route to the configured channel)
      if (agency.gateway_url && agency.gateway_token) {
        try {
          const gwUrl = agency.gateway_url.replace(/\/$/, '');
          await fetch(`${gwUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${agency.gateway_token}`,
            },
            body: JSON.stringify({
              model: 'openrouter/anthropic/claude-haiku-4.5',
              messages: [
                { role: 'system', content: 'You are a business briefing assistant. Deliver the following briefing to the user exactly as formatted. Do not add commentary or change the content.' },
                { role: 'user', content: `Please deliver this morning briefing:\n\n${briefingText}` },
              ],
              stream: false,
            }),
            signal: AbortSignal.timeout(15_000),
          });
          results.push({ agencyId: agency.id, name: agency.name, status: 'sent' });
        } catch (err) {
          results.push({ agencyId: agency.id, name: agency.name, status: `gateway-error: ${(err as Error).message}` });
        }
      } else {
        results.push({ agencyId: agency.id, name: agency.name, status: 'skip-no-gateway' });
      }
    } catch (err) {
      results.push({ agencyId: agency.id, name: agency.name, status: `error: ${(err as Error).message}` });
    }
  }

  const sent = results.filter(r => r.status === 'sent').length;
  return NextResponse.json({ sent, total: results.length, results });
}
