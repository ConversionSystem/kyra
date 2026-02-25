/**
 * GET /api/agency/pipeline/activity
 * Activity feed: recent pipeline lead stage changes across all campaigns
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Get agency
  const svc = createServiceClientWithoutCookies();
  const { data: member } = await svc.from('agency_members').select('agency_id').eq('user_id', user.id).single();
  if (!member) return NextResponse.json({ error: 'No agency' }, { status: 404 });

  const hours = parseInt(req.nextUrl.searchParams.get('hours') || '24');
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  // Get recently changed leads — using messaged_at and replied_at as activity markers
  const { data: leads } = await svc
    .from('pipeline_leads')
    .select('id, full_name, company, stage, messaged_at, replied_at, created_at, campaign_id')
    .eq('agency_id', member.agency_id)
    .or(`messaged_at.gte.${since},replied_at.gte.${since},created_at.gte.${since}`)
    .not('stage', 'eq', 'found')
    .order('replied_at', { ascending: false, nullsFirst: false })
    .limit(50);

  // Build activity items
  type ActivityItem = {
    id: string;
    type: 'messaged' | 'replied' | 'interested' | 'booked' | 'closed' | 'researched';
    leadId: string;
    name: string;
    company: string;
    timestamp: string;
    message: string;
    icon: string;
  };

  const activities: ActivityItem[] = [];

  for (const lead of leads || []) {
    if (lead.replied_at && lead.replied_at >= since) {
      const stageMsg: Record<string, { msg: string; icon: string; type: ActivityItem['type'] }> = {
        replied: { msg: `replied to your outreach`, icon: '📩', type: 'replied' },
        interested: { msg: `is interested — AI qualifying`, icon: '🔥', type: 'interested' },
        booked: { msg: `booked a demo!`, icon: '📅', type: 'booked' },
        closed: { msg: `deal closed!`, icon: '🎉', type: 'closed' },
      };
      const info = stageMsg[lead.stage] || { msg: `moved to ${lead.stage}`, icon: '📋', type: lead.stage as ActivityItem['type'] };
      activities.push({
        id: `${lead.id}-${lead.stage}`,
        type: info.type,
        leadId: lead.id,
        name: lead.full_name || 'Unknown',
        company: lead.company || '',
        timestamp: lead.replied_at,
        message: info.msg,
        icon: info.icon,
      });
    }

    if (lead.messaged_at && lead.messaged_at >= since && !lead.replied_at) {
      activities.push({
        id: `${lead.id}-messaged`,
        type: 'messaged',
        leadId: lead.id,
        name: lead.full_name || 'Unknown',
        company: lead.company || '',
        timestamp: lead.messaged_at,
        message: `outreach sent`,
        icon: '🚀',
      });
    }
  }

  // Sort by timestamp desc
  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return NextResponse.json({ activities: activities.slice(0, 30) });
}
