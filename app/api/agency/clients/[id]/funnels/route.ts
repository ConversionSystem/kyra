/**
 * POST /api/agency/clients/[id]/funnels
 * Generate an AI funnel for a client.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { requireClientAccess } from '@/lib/agency/middleware';
import { generateFunnel } from '@/lib/funnels/ai-funnel-builder';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: clientId } = await params;

  const auth = await requireClientAccess(clientId);
  if (auth.error) return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });

  const svc = createServiceClientWithoutCookies();
  const { data: client } = await svc
    .from('agency_clients')
    .select('id, name, agency_id, industry')
    .eq('id', clientId)
    .eq('agency_id', auth.data.agency.id)
    .single();

  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

  const body = await req.json() as { offerDescription?: string; price?: string };
  if (!body.offerDescription?.trim()) {
    return NextResponse.json({ error: 'Offer description is required.' }, { status: 400 });
  }

  const result = await generateFunnel({
    offerDescription: body.offerDescription.trim(),
    businessName: client.name || 'Business',
    industry: (client.industry as string) || 'General',
    price: body.price,
  }, client.agency_id);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ funnel: result.funnel });
}
