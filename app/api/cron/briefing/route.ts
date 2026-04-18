/**
 * GET /api/cron/briefing
 *
 * Daily cron (08:00 UTC). Sends briefings to every agency that has a gateway
 * and hasn't disabled `daily_briefing` in settings.
 *
 * Auth: Vercel CRON_SECRET (Bearer token).
 *
 * Previously this was wired as POST /api/briefing?secret=CRON_SECRET_PLACEHOLDER
 * in vercel.json — which was broken (Vercel cron sends GET, not POST, and
 * the placeholder was never substituted). This route moves the work onto a
 * proper GET-based cron path with header-based auth.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { generateBriefingData, formatBriefing } from '@/lib/briefing/daily-briefing';
import { deductCredits } from '@/lib/billing/credit-engine';
import { requireCron } from '@/lib/auth/cron';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const unauthorized = requireCron(req);
  if (unauthorized) return unauthorized;

  const supabase = createServiceClientWithoutCookies();

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
    if (settings.daily_briefing === false) continue;

    try {
      const data = await generateBriefingData(agency.id);
      if (!data) {
        results.push({ agencyId: agency.id, name: agency.name, status: 'skip-no-data' });
        continue;
      }

      if (data.conversationsTotal === 0 && data.hotLeads.length === 0) {
        results.push({ agencyId: agency.id, name: agency.name, status: 'skip-inactive' });
        continue;
      }

      const briefingText = formatBriefing(data);

      if (agency.gateway_url && agency.gateway_token) {
        try {
          const gwUrl = agency.gateway_url.replace(/\/$/, '');
          await fetch(`${gwUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${agency.gateway_token}`,
            },
            body: JSON.stringify({
              model: 'openrouter/anthropic/claude-haiku-4.5',
              messages: [
                {
                  role: 'system',
                  content:
                    'You are a business briefing assistant. Deliver the following briefing to the user exactly as formatted. Do not add commentary or change the content.',
                },
                { role: 'user', content: `Please deliver this morning briefing:\n\n${briefingText}` },
              ],
              stream: false,
            }),
            signal: AbortSignal.timeout(15_000),
          });
          try {
            await deductCredits(agency.id, 'chat.message', { description: 'Daily briefing delivery' });
          } catch { /* non-fatal */ }
          results.push({ agencyId: agency.id, name: agency.name, status: 'sent' });
        } catch (err) {
          results.push({
            agencyId: agency.id,
            name: agency.name,
            status: `gateway-error: ${(err as Error).message}`,
          });
        }
      } else {
        results.push({ agencyId: agency.id, name: agency.name, status: 'skip-no-gateway' });
      }
    } catch (err) {
      results.push({
        agencyId: agency.id,
        name: agency.name,
        status: `error: ${(err as Error).message}`,
      });
    }
  }

  const sent = results.filter((r) => r.status === 'sent').length;
  return NextResponse.json({ sent, total: results.length, results });
}
