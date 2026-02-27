/**
 * GET /api/agency/pipeline/analytics
 * 
 * Pipeline analytics — aggregates campaign performance, conversion funnel,
 * follow-up effectiveness, channel performance, and AI closer stats.
 * 
 * Query params:
 *   days=30     — lookback window (default 30)
 *   campaign=X  — filter to specific campaign (optional)
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';

async function getAgencyId(userId: string): Promise<string | null> {
  const svc = createServiceClientWithoutCookies();
  const { data } = await svc.from('agency_members').select('agency_id').eq('user_id', userId).single();
  return data?.agency_id ?? null;
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agencyId = await getAgencyId(user.id);
  if (!agencyId) return NextResponse.json({ error: 'No agency' }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get('days') || '30');
  const campaignFilter = searchParams.get('campaign') || null;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const svc = createServiceClientWithoutCookies();

  // ── 1. Load all campaigns ───────────────────────────────────────────────
  let campaignQuery = svc
    .from('pipeline_campaigns')
    .select('id, name, status, target_industry, target_location, created_at')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false });

  if (campaignFilter) {
    campaignQuery = campaignQuery.eq('id', campaignFilter);
  }

  const { data: campaigns } = await campaignQuery;

  const campaignIds = (campaigns || []).map(c => c.id);
  if (campaignIds.length === 0) {
    return NextResponse.json({
      overview: { total_campaigns: 0, active_campaigns: 0, total_leads: 0, total_messaged: 0, total_replied: 0, total_booked: 0, total_closed: 0, response_rate: 0, booking_rate: 0 },
      funnel: [],
      campaigns: [],
      follow_up_effectiveness: [],
      channel_performance: { sms: { sent: 0, replied: 0, rate: 0 }, email: { sent: 0, replied: 0, rate: 0 } },
      closer_stats: { total_responses: 0, openclaw_powered: 0, direct_llm: 0, stages_updated: 0 },
      daily_activity: [],
    });
  }

  // ── 2. Load all leads for these campaigns ───────────────────────────────
  const { data: leads } = await svc
    .from('pipeline_leads')
    .select('id, campaign_id, stage, created_at, messaged_at, replied_at, enrichment_data')
    .eq('agency_id', agencyId)
    .in('campaign_id', campaignIds);

  const allLeads = leads || [];

  // ── 3. Stage counts (conversion funnel) ─────────────────────────────────
  const stageOrder = ['found', 'approved', 'researched', 'outreach_approved', 'messaged', 'replied', 'interested', 'booked', 'closed', 'skipped'];
  const stageCounts: Record<string, number> = {};
  for (const s of stageOrder) stageCounts[s] = 0;
  for (const lead of allLeads) {
    stageCounts[lead.stage] = (stageCounts[lead.stage] || 0) + 1;
  }

  // Calculate cumulative funnel (leads that reached AT LEAST this stage)
  const stageIndex: Record<string, number> = {};
  stageOrder.forEach((s, i) => stageIndex[s] = i);

  const funnelStages = ['found', 'approved', 'researched', 'messaged', 'replied', 'interested', 'booked', 'closed'];
  const funnel = funnelStages.map(stage => {
    const idx = stageIndex[stage];
    // Count leads that are AT or PAST this stage (excluding skipped for forward stages)
    const count = allLeads.filter(l => {
      if (l.stage === 'skipped') return false;
      return stageIndex[l.stage] >= idx;
    }).length;
    return { stage, count, label: formatStageLabel(stage) };
  });

  // ── 4. Per-campaign metrics ─────────────────────────────────────────────
  const campaignMetrics = (campaigns || []).map(c => {
    const cLeads = allLeads.filter(l => l.campaign_id === c.id);
    const messaged = cLeads.filter(l => stageIndex[l.stage] >= stageIndex['messaged']).length;
    const replied = cLeads.filter(l => stageIndex[l.stage] >= stageIndex['replied']).length;
    const interested = cLeads.filter(l => stageIndex[l.stage] >= stageIndex['interested']).length;
    const booked = cLeads.filter(l => stageIndex[l.stage] >= stageIndex['booked']).length;
    const closed = cLeads.filter(l => l.stage === 'closed').length;
    const skipped = cLeads.filter(l => l.stage === 'skipped').length;

    return {
      id: c.id,
      name: c.name,
      status: c.status,
      industry: c.target_industry,
      location: c.target_location,
      created_at: c.created_at,
      total_leads: cLeads.length,
      messaged,
      replied,
      interested,
      booked,
      closed,
      skipped,
      response_rate: messaged > 0 ? Math.round((replied / messaged) * 100) : 0,
      booking_rate: messaged > 0 ? Math.round((booked / messaged) * 100) : 0,
    };
  });

  // ── 5. Follow-up effectiveness ──────────────────────────────────────────
  // Check if the follow-ups table exists and query it
  let followUpEffectiveness: Array<{ follow_up_number: number; sent: number; replied: number; rate: number }> = [];
  try {
    const { data: followUps } = await svc
      .from('pipeline_follow_ups')
      .select('follow_up_number, status, lead_id')
      .eq('agency_id', agencyId)
      .in('campaign_id', campaignIds);

    if (followUps && followUps.length > 0) {
      // Group by follow_up_number
      const byNumber: Record<number, { sent: number; leads: Set<string> }> = {};
      for (const fu of followUps) {
        if (!byNumber[fu.follow_up_number]) {
          byNumber[fu.follow_up_number] = { sent: 0, leads: new Set() };
        }
        if (fu.status === 'sent') {
          byNumber[fu.follow_up_number].sent++;
          byNumber[fu.follow_up_number].leads.add(fu.lead_id);
        }
      }

      // Check which leads replied after receiving follow-ups
      const sentLeadIds = [...new Set(followUps.filter(f => f.status === 'sent').map(f => f.lead_id))];
      const repliedLeadIds = new Set(
        allLeads
          .filter(l => sentLeadIds.includes(l.id) && stageIndex[l.stage] >= stageIndex['replied'])
          .map(l => l.id)
      );

      // For each follow-up number, count how many leads replied
      // (Attribution: lead replied after receiving follow-up N = attributed to highest N sent)
      const leadMaxFollowUp: Record<string, number> = {};
      for (const fu of followUps) {
        if (fu.status === 'sent') {
          leadMaxFollowUp[fu.lead_id] = Math.max(leadMaxFollowUp[fu.lead_id] || 0, fu.follow_up_number);
        }
      }

      for (let n = 1; n <= 5; n++) {
        const sent = byNumber[n]?.sent || 0;
        // Leads that replied AND whose last follow-up sent was this number
        const repliedFromThis = Object.entries(leadMaxFollowUp)
          .filter(([leadId, maxN]) => maxN === n && repliedLeadIds.has(leadId))
          .length;

        if (sent > 0 || n <= 3) {
          followUpEffectiveness.push({
            follow_up_number: n,
            sent,
            replied: repliedFromThis,
            rate: sent > 0 ? Math.round((repliedFromThis / sent) * 100) : 0,
          });
        }
      }
    }
  } catch {
    // Table might not exist yet (migration pending)
  }

  // ── 6. Channel performance (from enrichment data / outreach channel) ────
  // Try to get channel data from follow-ups or activity log
  let channelPerf = { sms: { sent: 0, replied: 0, rate: 0 }, email: { sent: 0, replied: 0, rate: 0 } };
  try {
    const { data: followUps } = await svc
      .from('pipeline_follow_ups')
      .select('channel, status, lead_id')
      .eq('agency_id', agencyId)
      .in('campaign_id', campaignIds);

    if (followUps && followUps.length > 0) {
      const smsSent = followUps.filter(f => f.channel === 'sms' && f.status === 'sent').length;
      const emailSent = followUps.filter(f => f.channel === 'email' && f.status === 'sent').length;

      // Include initial outreach as SMS (most are SMS first)
      const totalMessaged = allLeads.filter(l => stageIndex[l.stage] >= stageIndex['messaged']).length;
      const totalReplied = allLeads.filter(l => stageIndex[l.stage] >= stageIndex['replied']).length;

      channelPerf = {
        sms: {
          sent: totalMessaged + smsSent,
          replied: totalReplied,
          rate: (totalMessaged + smsSent) > 0 ? Math.round((totalReplied / (totalMessaged + smsSent)) * 100) : 0,
        },
        email: {
          sent: emailSent,
          replied: 0,
          rate: 0,
        },
      };
    } else {
      // No follow-ups data — use lead stages
      const totalMessaged = allLeads.filter(l => stageIndex[l.stage] >= stageIndex['messaged']).length;
      const totalReplied = allLeads.filter(l => stageIndex[l.stage] >= stageIndex['replied']).length;
      channelPerf.sms = {
        sent: totalMessaged,
        replied: totalReplied,
        rate: totalMessaged > 0 ? Math.round((totalReplied / totalMessaged) * 100) : 0,
      };
    }
  } catch {
    // Fallback to lead stage data
    const totalMessaged = allLeads.filter(l => stageIndex[l.stage] >= stageIndex['messaged']).length;
    const totalReplied = allLeads.filter(l => stageIndex[l.stage] >= stageIndex['replied']).length;
    channelPerf.sms = {
      sent: totalMessaged,
      replied: totalReplied,
      rate: totalMessaged > 0 ? Math.round((totalReplied / totalMessaged) * 100) : 0,
    };
  }

  // ── 7. AI Closer stats (from activity log) ─────────────────────────────
  let closerStats = { total_responses: 0, openclaw_powered: 0, direct_llm: 0, stages_updated: 0 };
  try {
    const { data: closerLogs } = await svc
      .from('pipeline_activity_log')
      .select('event, details')
      .eq('agency_id', agencyId)
      .eq('event', 'closer.responded')
      .gte('created_at', since);

    if (closerLogs && closerLogs.length > 0) {
      closerStats.total_responses = closerLogs.length;
      closerStats.openclaw_powered = closerLogs.filter(l => {
        const d = l.details as Record<string, unknown>;
        return d?.powered_by === 'openclaw';
      }).length;
      closerStats.direct_llm = closerLogs.filter(l => {
        const d = l.details as Record<string, unknown>;
        return d?.powered_by === 'direct-llm';
      }).length;
      closerStats.stages_updated = closerLogs.filter(l => {
        const d = l.details as Record<string, unknown>;
        return !!d?.stage_update;
      }).length;
    }
  } catch {
    // Activity log may not have closer events yet
  }

  // ── 8. Daily activity (leads created, messaged, replied per day) ────────
  const dailyMap: Record<string, { date: string; created: number; messaged: number; replied: number }> = {};
  const cutoff = new Date(since);

  for (const lead of allLeads) {
    const createdDate = new Date(lead.created_at).toISOString().split('T')[0];
    if (new Date(lead.created_at) >= cutoff) {
      if (!dailyMap[createdDate]) dailyMap[createdDate] = { date: createdDate, created: 0, messaged: 0, replied: 0 };
      dailyMap[createdDate].created++;
    }

    if (lead.messaged_at) {
      const msgDate = new Date(lead.messaged_at).toISOString().split('T')[0];
      if (new Date(lead.messaged_at) >= cutoff) {
        if (!dailyMap[msgDate]) dailyMap[msgDate] = { date: msgDate, created: 0, messaged: 0, replied: 0 };
        dailyMap[msgDate].messaged++;
      }
    }

    if (lead.replied_at) {
      const repDate = new Date(lead.replied_at).toISOString().split('T')[0];
      if (new Date(lead.replied_at) >= cutoff) {
        if (!dailyMap[repDate]) dailyMap[repDate] = { date: repDate, created: 0, messaged: 0, replied: 0 };
        dailyMap[repDate].replied++;
      }
    }
  }

  const dailyActivity = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

  // ── 9. Overview ─────────────────────────────────────────────────────────
  const totalLeads = allLeads.length;
  const totalMessaged = allLeads.filter(l => stageIndex[l.stage] >= stageIndex['messaged']).length;
  const totalReplied = allLeads.filter(l => stageIndex[l.stage] >= stageIndex['replied']).length;
  const totalBooked = allLeads.filter(l => stageIndex[l.stage] >= stageIndex['booked']).length;
  const totalClosed = allLeads.filter(l => l.stage === 'closed').length;
  const activeCampaigns = (campaigns || []).filter(c => c.status === 'active' || c.status === 'running').length;

  return NextResponse.json({
    overview: {
      total_campaigns: campaignIds.length,
      active_campaigns: activeCampaigns,
      total_leads: totalLeads,
      total_messaged: totalMessaged,
      total_replied: totalReplied,
      total_booked: totalBooked,
      total_closed: totalClosed,
      response_rate: totalMessaged > 0 ? Math.round((totalReplied / totalMessaged) * 100) : 0,
      booking_rate: totalMessaged > 0 ? Math.round((totalBooked / totalMessaged) * 100) : 0,
    },
    funnel,
    campaigns: campaignMetrics,
    follow_up_effectiveness: followUpEffectiveness,
    channel_performance: channelPerf,
    closer_stats: closerStats,
    daily_activity: dailyActivity,
  });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatStageLabel(stage: string): string {
  const labels: Record<string, string> = {
    found: 'Leads Found',
    approved: 'Approved',
    researched: 'Researched',
    outreach_approved: 'Outreach Ready',
    messaged: 'Messaged',
    replied: 'Replied',
    interested: 'Interested',
    booked: 'Booked',
    closed: 'Closed Won',
  };
  return labels[stage] || stage;
}
