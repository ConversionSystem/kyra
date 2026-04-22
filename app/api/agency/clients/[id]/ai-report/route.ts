/**
 * POST /api/agency/clients/[id]/ai-report
 * Generate a natural language analytics report for a client.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { requireClientAccess } from '@/lib/agency/middleware';
import { generateReport, type ClientAnalyticsData } from '@/lib/analytics/ai-reporter';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: clientId } = await params;

  const auth = await requireClientAccess(clientId);
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  const svc = createServiceClientWithoutCookies();
  const { data: client } = await svc
    .from('agency_clients')
    .select('id, name, agency_id')
    .eq('id', clientId)
    .single();

  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

  const body = await req.json() as { question?: string; data?: ClientAnalyticsData };
  if (!body.question?.trim()) {
    return NextResponse.json({ error: 'Question is required.' }, { status: 400 });
  }

  // Use provided data or build empty defaults
  const analyticsData: ClientAnalyticsData = body.data || {
    conversationsCount: 0,
    conversationsChange: 0,
    avgResponseTime: 0,
    leadCount: 0,
    leadsChange: 0,
    dealPipelineValue: 0,
    dealsWon: 0,
    dealsLost: 0,
    bookingCount: 0,
    emailsSent: 0,
    emailOpenRate: 0,
    emailClickRate: 0,
    messagesHandled: 0,
    creditsUsed: 0,
    topChannels: [],
    period: 'last_30_days',
  };

  const result = await generateReport({
    clientId,
    question: body.question.trim(),
    data: analyticsData,
    businessName: client.name || 'Client',
    agencyId: client.agency_id,
  });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ report: result.report });
}
