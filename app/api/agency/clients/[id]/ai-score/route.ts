/**
 * POST /api/agency/clients/[id]/ai-score
 * AI-score leads for a client (single or batch).
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireClientAccess } from '@/lib/agency/middleware';
import { scoreLeadWithAI, batchScoreLeads } from '@/lib/crm/ai-lead-scorer';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: clientId } = await params;

  const auth = await requireClientAccess(clientId);
  if (auth.error) return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  const { client } = auth.data;

  const body = await req.json() as {
    mode?: 'single' | 'batch';
    contactId?: string;
    conversationHistory?: string[];
    dealValue?: number;
    responseTime?: number;
    engagementMetrics?: {
      messagesCount: number;
      lastActive: string;
      channelsUsed: string[];
    };
    contactName?: string;
    contactEmail?: string;
  };

  if (body.mode === 'batch') {
    const result = await batchScoreLeads(client.agency_id);
    return NextResponse.json(result);
  }

  // Single score
  if (!body.contactId) {
    return NextResponse.json({ error: 'contactId is required for single scoring.' }, { status: 400 });
  }

  const result = await scoreLeadWithAI({
    contactId: body.contactId,
    conversationHistory: body.conversationHistory || [],
    dealValue: body.dealValue,
    responseTime: body.responseTime,
    engagementMetrics: body.engagementMetrics || {
      messagesCount: 0,
      lastActive: new Date().toISOString(),
      channelsUsed: [],
    },
    contactName: body.contactName,
    contactEmail: body.contactEmail,
  }, client.agency_id);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ score: result.score });
}
