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
  const { data: agency, error: agencyError } = await supabase
    .from('agencies')
    .select('id, name, settings')
    .eq('id', agencyId)
    .single();

  if (agencyError || !agency) {
    console.error('[briefing] Agency fetch error:', agencyError?.message);
    return null;
  }

  // Get credits balance separately (column may not exist)
  let creditsBalance = 0;
  try {
    const { data: creditData } = await supabase
      .from('credit_transactions')
      .select('amount, type')
      .eq('agency_id', agencyId);
    
    if (creditData) {
      creditsBalance = creditData.reduce((sum, t) => {
        if (t.type === 'usage') return sum - Math.abs(t.amount);
        return sum + t.amount;
      }, 0);
    }
  } catch { /* credits table may not exist */ }

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

  // Use agency_id for all queries (works for both solo and agency accounts)
  // Conversations yesterday
  const { count: convsYesterday } = await supabase
    .from('client_conversations')
    .select('id', { count: 'exact', head: true })
    .eq('agency_id', agencyId)
    .gte('created_at', yesterdayStart.toISOString())
    .lt('created_at', todayStart.toISOString());

  // Total conversations
  const { count: convsTotal } = await supabase
    .from('client_conversations')
    .select('id', { count: 'exact', head: true })
    .eq('agency_id', agencyId);

  // Conversations this week
  const { count: convsThisWeek } = await supabase
    .from('client_conversations')
    .select('id', { count: 'exact', head: true })
    .eq('agency_id', agencyId)
    .gte('created_at', weekStart.toISOString());

  // Conversations last week
  const { count: convsLastWeek } = await supabase
    .from('client_conversations')
    .select('id', { count: 'exact', head: true })
    .eq('agency_id', agencyId)
    .gte('created_at', lastWeekStart.toISOString())
    .lt('created_at', weekStart.toISOString());

  // Appointments booked yesterday (from ghl_message_log which has metadata)
  let appointmentsBooked = 0;
  try {
    const { data: appointmentLogs } = await supabase
      .from('ghl_message_log')
      .select('metadata')
      .eq('agency_client_id', entityId)
      .gte('created_at', yesterdayStart.toISOString())
      .lt('created_at', todayStart.toISOString())
      .not('metadata', 'is', null);

    appointmentsBooked = (appointmentLogs ?? []).filter(c => {
      const meta = c.metadata as Record<string, unknown> | null;
      return meta?.tool_used === 'book_appointment' || meta?.appointment_booked === true;
    }).length;
  } catch { /* ghl_message_log may not have metadata column */ }

  // Escalations yesterday
  let escalationCount = 0;
  try {
    const { count } = await supabase
      .from('ghl_message_log')
      .select('id', { count: 'exact', head: true })
      .eq('agency_client_id', entityId)
      .gte('created_at', yesterdayStart.toISOString())
      .lt('created_at', todayStart.toISOString())
      .eq('escalated', true);
    escalationCount = count ?? 0;
  } catch { /* escalated column may not exist */ }

  // Hot leads — recent conversations with contact info
  const { data: recentConvs } = await supabase
    .from('client_conversations')
    .select('user_message, ai_response, contact_id, contact_name, created_at')
    .eq('agency_id', agencyId)
    .gte('created_at', yesterdayStart.toISOString())
    .order('created_at', { ascending: false })
    .limit(50);

  const hotLeads: Array<{ name: string; reason: string; phone?: string }> = [];
  const seenContacts = new Set<string>();

  // Detect hot leads by message content (pricing, booking, urgency keywords)
  const hotKeywords = ['price', 'cost', 'book', 'appointment', 'schedule', 'urgent', 'emergency', 'asap', 'available', 'quote', 'estimate'];

  for (const conv of (recentConvs ?? [])) {
    const msg = (conv.user_message ?? '').toLowerCase();
    const isHot = hotKeywords.some(k => msg.includes(k));
    const contactKey = conv.contact_id ?? conv.contact_name ?? msg.slice(0, 20);

    if (isHot && !seenContacts.has(contactKey)) {
      seenContacts.add(contactKey);
      hotLeads.push({
        name: (conv as Record<string, unknown>).contact_name as string ?? conv.contact_id ?? 'Unknown',
        reason: conv.user_message?.slice(0, 80) ?? 'Showed buying intent',
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
    creditsRemaining: creditsBalance,
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
