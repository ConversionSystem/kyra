/**
 * Daily Briefing — Kyra Insights
 * 
 * Generates a morning briefing for business owners with:
 * - Conversations handled yesterday
 * - Appointments booked
 * - Hot leads requiring attention
 * - Overdue follow-ups
 * - New reviews (if integrated)
 * - Week-over-week trends
 * 
 * Delivered via the AI worker's primary channel (SMS, Telegram, email).
 */

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

export interface BriefingData {
  businessName: string;
  agencyId: string;
  clientId: string | null;
  // Yesterday's stats
  conversationsYesterday: number;
  conversationsTotal: number;
  // Appointments
  appointmentsBooked: number;
  // Leads
  hotLeads: Array<{ name: string; reason: string; phone?: string }>;
  // Follow-ups
  overdueFollowUps: number;
  // Escalations
  escalations: number;
  // Trends
  conversationsThisWeek: number;
  conversationsLastWeek: number;
  // Credits
  creditsRemaining: number;
  creditsUsedYesterday: number;
}

export async function generateBriefingData(agencyId: string): Promise<BriefingData | null> {
  const supabase = createServiceClientWithoutCookies();

  // Get agency info
  const { data: agency } = await supabase
    .from('agencies')
    .select('id, name, settings, credits_balance')
    .eq('id', agencyId)
    .single();

  if (!agency) return null;

  // Get first client (for solo) or primary client
  const { data: clients } = await supabase
    .from('agency_clients')
    .select('id, name')
    .eq('agency_id', agencyId)
    .limit(1);

  const clientId = clients?.[0]?.id ?? null;
  const entityId = clientId ?? agencyId;

  // Time ranges
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);
  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  // Conversations yesterday
  const { count: convsYesterday } = await supabase
    .from('client_conversations')
    .select('id', { count: 'exact', head: true })
    .or(`agency_client_id.eq.${entityId},client_id.eq.${entityId}`)
    .gte('created_at', yesterdayStart.toISOString())
    .lt('created_at', todayStart.toISOString());

  // Total conversations
  const { count: convsTotal } = await supabase
    .from('client_conversations')
    .select('id', { count: 'exact', head: true })
    .or(`agency_client_id.eq.${entityId},client_id.eq.${entityId}`);

  // Conversations this week
  const { count: convsThisWeek } = await supabase
    .from('client_conversations')
    .select('id', { count: 'exact', head: true })
    .or(`agency_client_id.eq.${entityId},client_id.eq.${entityId}`)
    .gte('created_at', weekStart.toISOString());

  // Conversations last week
  const { count: convsLastWeek } = await supabase
    .from('client_conversations')
    .select('id', { count: 'exact', head: true })
    .or(`agency_client_id.eq.${entityId},client_id.eq.${entityId}`)
    .gte('created_at', lastWeekStart.toISOString())
    .lt('created_at', weekStart.toISOString());

  // Appointments booked yesterday (from metadata)
  const { data: appointmentConvs } = await supabase
    .from('client_conversations')
    .select('metadata')
    .or(`agency_client_id.eq.${entityId},client_id.eq.${entityId}`)
    .gte('created_at', yesterdayStart.toISOString())
    .lt('created_at', todayStart.toISOString())
    .not('metadata', 'is', null);

  const appointmentsBooked = (appointmentConvs ?? []).filter(c => {
    const meta = c.metadata as Record<string, unknown> | null;
    return meta?.tool_used === 'book_appointment' || meta?.appointment_booked === true;
  }).length;

  // Escalations yesterday
  const { count: escalationCount } = await supabase
    .from('client_conversations')
    .select('id', { count: 'exact', head: true })
    .or(`agency_client_id.eq.${entityId},client_id.eq.${entityId}`)
    .gte('created_at', yesterdayStart.toISOString())
    .lt('created_at', todayStart.toISOString())
    .contains('metadata', { escalated: true } as never);

  // Hot leads — recent conversations with buying intent tags
  const { data: recentConvs } = await supabase
    .from('client_conversations')
    .select('user_message, ai_response, metadata, contact_id, created_at')
    .or(`agency_client_id.eq.${entityId},client_id.eq.${entityId}`)
    .gte('created_at', yesterdayStart.toISOString())
    .order('created_at', { ascending: false })
    .limit(50);

  const hotLeads: Array<{ name: string; reason: string; phone?: string }> = [];
  const seenContacts = new Set<string>();

  for (const conv of (recentConvs ?? [])) {
    const meta = conv.metadata as Record<string, unknown> | null;
    const tags = (meta?.tags as string[]) ?? [];
    const isHot = tags.some(t =>
      ['hot-lead', 'appointment', 'pricing', 'urgent', 'booking', 'interested'].includes(t)
    );

    if (isHot && conv.contact_id && !seenContacts.has(conv.contact_id)) {
      seenContacts.add(conv.contact_id);
      hotLeads.push({
        name: (meta?.contact_name as string) ?? conv.contact_id,
        reason: conv.user_message?.slice(0, 80) ?? 'Showed buying intent',
        phone: meta?.phone as string | undefined,
      });
    }
  }

  // Credits used yesterday
  const { data: creditTxns } = await supabase
    .from('credit_transactions')
    .select('amount, type')
    .eq('agency_id', agencyId)
    .eq('type', 'usage')
    .gte('created_at', yesterdayStart.toISOString())
    .lt('created_at', todayStart.toISOString());

  const creditsUsedYesterday = (creditTxns ?? []).reduce((s, t) => s + Math.abs(t.amount), 0);

  // Follow-up count (from pipeline if exists)
  let overdueFollowUps = 0;
  try {
    const { count } = await supabase
      .from('pipeline_leads')
      .select('id', { count: 'exact', head: true })
      .eq('agency_id', agencyId)
      .eq('status', 'follow_up')
      .lt('next_follow_up_at', now.toISOString());
    overdueFollowUps = count ?? 0;
  } catch { /* table may not exist */ }

  return {
    businessName: agency.name,
    agencyId,
    clientId,
    conversationsYesterday: convsYesterday ?? 0,
    conversationsTotal: convsTotal ?? 0,
    appointmentsBooked,
    hotLeads: hotLeads.slice(0, 5),
    overdueFollowUps: overdueFollowUps ?? 0,
    escalations: escalationCount ?? 0,
    conversationsThisWeek: convsThisWeek ?? 0,
    conversationsLastWeek: convsLastWeek ?? 0,
    creditsRemaining: (agency.credits_balance as number) ?? 0,
    creditsUsedYesterday,
  };
}

/**
 * Format briefing data into a human-readable message.
 */
export function formatBriefing(data: BriefingData): string {
  const lines: string[] = [];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = new Date();
  const dayName = dayNames[today.getDay()];
  const monthDay = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

  lines.push(`☀️ Good morning! Here's your ${dayName} briefing for ${data.businessName}:`);
  lines.push('');

  // Conversations
  if (data.conversationsYesterday > 0) {
    lines.push(`💬 Yesterday: ${data.conversationsYesterday} conversation${data.conversationsYesterday === 1 ? '' : 's'} handled by your AI worker`);
  } else {
    lines.push(`💬 Yesterday: No conversations (quiet day)`);
  }

  // Appointments
  if (data.appointmentsBooked > 0) {
    lines.push(`📅 Appointments booked: ${data.appointmentsBooked}`);
  }

  // Escalations
  if (data.escalations > 0) {
    lines.push(`🚨 ${data.escalations} escalation${data.escalations === 1 ? '' : 's'} — customers who needed a human`);
  }

  // Hot leads
  if (data.hotLeads.length > 0) {
    lines.push('');
    lines.push(`🔥 Hot leads (${data.hotLeads.length}):`);
    for (const lead of data.hotLeads) {
      lines.push(`  • ${lead.name} — ${lead.reason}`);
    }
  }

  // Overdue follow-ups
  if (data.overdueFollowUps > 0) {
    lines.push('');
    lines.push(`⚠️ ${data.overdueFollowUps} overdue follow-up${data.overdueFollowUps === 1 ? '' : 's'} in your pipeline`);
  }

  // Trend
  lines.push('');
  const weekDiff = data.conversationsThisWeek - data.conversationsLastWeek;
  if (weekDiff > 0) {
    lines.push(`📈 This week: ${data.conversationsThisWeek} conversations (+${weekDiff} vs last week)`);
  } else if (weekDiff < 0) {
    lines.push(`📉 This week: ${data.conversationsThisWeek} conversations (${weekDiff} vs last week)`);
  } else {
    lines.push(`📊 This week: ${data.conversationsThisWeek} conversations (same as last week)`);
  }

  // Credits
  if (data.creditsUsedYesterday > 0) {
    lines.push(`🪙 Credits: ${data.creditsUsedYesterday} used yesterday | ${data.creditsRemaining} remaining`);
  }

  // Total
  lines.push('');
  lines.push(`📋 Total conversations handled: ${data.conversationsTotal}`);

  // Sign off
  lines.push('');
  lines.push(`Have a great ${dayName}! Your AI worker is online and ready. 🤖`);

  return lines.join('\n');
}
