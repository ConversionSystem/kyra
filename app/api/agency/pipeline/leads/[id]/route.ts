/**
 * PATCH /api/agency/pipeline/leads/[id]
 * Update a lead (stage, notes, personalized content, etc.)
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { logAndFire, type PipelineEvent } from '@/lib/pipeline/webhooks';

async function getAgencyId(userId: string): Promise<string | null> {
  const svc = createServiceClientWithoutCookies();
  const { data } = await svc.from('agency_members').select('agency_id').eq('user_id', userId).single();
  return data?.agency_id ?? null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agencyId = await getAgencyId(user.id);
  if (!agencyId) return NextResponse.json({ error: 'No agency' }, { status: 404 });

  const { id } = await params;
  const body = await req.json();

  // Only allow updating specific fields
  const allowedFields = [
    'stage', 'notes', 'email', 'phone',
    'personalized_subject', 'personalized_email', 'personalized_opener',
  ];
  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) updates[field] = body[field];
  }

  // Add timestamps for stage changes
  if (updates.stage === 'replied') updates.replied_at = new Date().toISOString();

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const svc = createServiceClientWithoutCookies();

  // Get the lead's current state before update (for webhook)
  const { data: existingLead } = await svc
    .from('pipeline_leads')
    .select('*, pipeline_campaigns!inner(id, name)')
    .eq('id', id)
    .eq('agency_id', agencyId)
    .single();

  const previousStage = existingLead?.stage;

  const { data: lead, error } = await svc
    .from('pipeline_leads')
    .update(updates)
    .eq('id', id)
    .eq('agency_id', agencyId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

  // Fire webhook if stage changed
  if (updates.stage && updates.stage !== previousStage && existingLead) {
    const stageToEvent: Record<string, PipelineEvent> = {
      approved: 'lead.approved',
      researched: 'lead.researched',
      outreach_approved: 'lead.outreach_approved',
      messaged: 'lead.messaged',
      replied: 'lead.replied',
      interested: 'lead.interested',
      booked: 'lead.booked',
      closed: 'lead.closed',
      skipped: 'lead.skipped',
    };
    const webhookEvent = stageToEvent[updates.stage as string];
    if (webhookEvent) {
      const campaign = (existingLead as Record<string, unknown>).pipeline_campaigns as { id: string; name: string };
      await logAndFire(
        agencyId,
        webhookEvent,
        { id: campaign.id, name: campaign.name },
        {
          id: lead.id,
          full_name: lead.full_name,
          company: lead.company,
          email: lead.email,
          phone: lead.phone,
          website: lead.website,
          industry: lead.industry,
          location: lead.location,
          stage: updates.stage as string,
          previous_stage: previousStage,
          personalized_subject: lead.personalized_subject,
          personalized_email: lead.personalized_email,
          personalized_opener: lead.personalized_opener,
          ghl_contact_id: lead.ghl_contact_id,
        },
        'human',
      );
    }
  }

  return NextResponse.json({ lead });
}
