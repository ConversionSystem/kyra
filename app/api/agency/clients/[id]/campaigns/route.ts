/**
 * POST /api/agency/clients/[id]/campaigns
 * Generate an AI campaign for a client.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { generateCampaign } from '@/lib/campaigns/ai-campaign-engine';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: clientId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const svc = createServiceClientWithoutCookies();
  // Get client + agency
  const { data: client } = await svc
    .from('agency_clients')
    .select('id, name, agency_id, industry, services')
    .eq('id', clientId)
    .single();

  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

  const body = await req.json() as { description?: string };
  if (!body.description?.trim()) {
    return NextResponse.json({ error: 'Campaign description is required.' }, { status: 400 });
  }

  const result = await generateCampaign({
    description: body.description.trim(),
    businessName: client.name || 'Business',
    industry: (client.industry as string) || 'General',
    services: Array.isArray(client.services) ? (client.services as string[]) : [],
  }, client.agency_id);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ campaign: result.campaign });
}
