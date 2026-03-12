import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAgencyAdmin } from '@/lib/agency/middleware';

type RouteContext = { params: Promise<{ id: string; campaignId: string }> };

/**
 * GET /api/agency/clients/[id]/email/campaigns/[campaignId]
 * Get campaign details + stats.
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  const { id: clientId, campaignId } = await context.params;
  const result = await requireAgencyAdmin();
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: result.error.status });

  const { agency } = result.data;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('email_campaigns')
    .select('*')
    .eq('id', campaignId)
    .eq('agency_id', agency.id)
    .eq('client_id', clientId)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  return NextResponse.json({ campaign: data });
}

/**
 * PATCH /api/agency/clients/[id]/email/campaigns/[campaignId]
 * Update campaign (subject, body, schedule, etc.)
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id: clientId, campaignId } = await context.params;
  const result = await requireAgencyAdmin();
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: result.error.status });

  const { agency } = result.data;
  const body = await request.json();
  const supabase = await createClient();

  // Only allow updates on draft/scheduled campaigns
  const { data: existing } = await supabase
    .from('email_campaigns')
    .select('status')
    .eq('id', campaignId)
    .eq('agency_id', agency.id)
    .eq('client_id', clientId)
    .single();

  if (!existing) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  if (existing.status !== 'draft' && existing.status !== 'scheduled') {
    return NextResponse.json({ error: 'Can only edit draft or scheduled campaigns' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  const allowed = ['name', 'subject', 'from_name', 'from_email', 'reply_to', 'html_body', 'text_body', 'template_id', 'segment_tags', 'scheduled_at', 'status'];
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('email_campaigns')
    .update(updates)
    .eq('id', campaignId)
    .eq('agency_id', agency.id)
    .eq('client_id', clientId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 });
  return NextResponse.json({ campaign: data });
}

/**
 * DELETE /api/agency/clients/[id]/email/campaigns/[campaignId]
 * Delete campaign (only if draft).
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id: clientId, campaignId } = await context.params;
  const result = await requireAgencyAdmin();
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: result.error.status });

  const { agency } = result.data;
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from('email_campaigns')
    .select('status')
    .eq('id', campaignId)
    .eq('agency_id', agency.id)
    .eq('client_id', clientId)
    .single();

  if (!existing) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  if (existing.status !== 'draft') {
    return NextResponse.json({ error: 'Can only delete draft campaigns' }, { status: 400 });
  }

  const { error } = await supabase
    .from('email_campaigns')
    .delete()
    .eq('id', campaignId)
    .eq('agency_id', agency.id);

  if (error) return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 });
  return NextResponse.json({ success: true });
}
