import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAgencyAdmin } from '@/lib/agency/middleware';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/agency/clients/[id]/email/campaigns
 * List campaigns for this client.
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  const { id: clientId } = await context.params;
  const result = await requireAgencyAdmin();
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: result.error.status });

  const { agency } = result.data;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('email_campaigns')
    .select('*')
    .eq('agency_id', agency.id)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
  return NextResponse.json({ campaigns: data });
}

/**
 * POST /api/agency/clients/[id]/email/campaigns
 * Create a new draft campaign.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const { id: clientId } = await context.params;
  const result = await requireAgencyAdmin();
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: result.error.status });

  const { agency } = result.data;
  const body = await request.json();

  const { name, subject, from_name, from_email, reply_to, html_body, text_body, template_id, segment_tags } = body;
  if (!name || !subject || !from_name || !from_email || !html_body) {
    return NextResponse.json({ error: 'Missing required fields: name, subject, from_name, from_email, html_body' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('email_campaigns')
    .insert({
      agency_id: agency.id,
      client_id: clientId,
      name,
      subject,
      from_name,
      from_email,
      reply_to: reply_to || null,
      html_body,
      text_body: text_body || null,
      template_id: template_id || null,
      segment_tags: segment_tags || [],
      status: 'draft',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
  return NextResponse.json({ campaign: data }, { status: 201 });
}
