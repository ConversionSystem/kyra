// GET /api/agency/clients/[id]/health-score
// Returns the AI health score for a single client.

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { computeHealthScore } from '@/lib/ai-health-score';

type Context = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Context) {
  const { id: clientId } = await ctx.params;
  const sb = await createClient();
  const sbService = await createServiceClient();

  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Get agency via membership (not owner-only)
  const { data: membership } = await sb.from('agency_members').select('agency_id').eq('user_id', user.id).single();
  if (!membership) return NextResponse.json({ error: 'No agency' }, { status: 404 });
  const agency = { id: membership.agency_id };

  // Get client (verify ownership)
  const { data: client } = await sbService.from('agency_clients')
    .select('id, status, container_config, ghl_location_id')
    .eq('id', clientId).eq('agency_id', agency.id).single();
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

  // Conversation stats
  const thirtyAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sevenAgo  = new Date(Date.now() -  7 * 24 * 60 * 60 * 1000).toISOString();

  const [conv30, conv7, esc30] = await Promise.all([
    sbService.from('client_conversations').select('id', { count: 'exact', head: true })
      .eq('client_id', clientId).gte('created_at', thirtyAgo),
    sbService.from('client_conversations').select('id', { count: 'exact', head: true })
      .eq('client_id', clientId).gte('created_at', sevenAgo),
    sbService.from('client_conversations').select('id', { count: 'exact', head: true })
      .eq('client_id', clientId).gte('created_at', thirtyAgo).ilike('ai_response', '%flag this for our team%'),
  ]);

  const config = (client.container_config ?? {}) as Record<string, unknown>;
  const hasPersonality = !!(config.businessName && config.aiName && config.aiRole);
  const businessHours = config.businessHours as { enabled?: boolean } | undefined;

  const result = computeHealthScore({
    ghlConnected: !!client.ghl_location_id,
    hasPersonality,
    hasCalendarLink: !!config.calendarBookingLink,
    conversationsLast7Days: conv7.count ?? 0,
    conversationsLast30Days: conv30.count ?? 0,
    escalationsLast30Days: esc30.count ?? 0,
    optOutEnabled: !!config.optOutEnabled,
    businessHoursEnabled: !!(businessHours?.enabled),
    containerStatus: client.status === 'active' ? 'running' : 'stopped',
  });

  return NextResponse.json(result);
}
