import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAgencyMember } from '@/lib/agency/middleware';

type RouteContext = { params: Promise<{ id: string; stepId: string }> };

/**
 * PATCH /api/agency/email/sequences/[id]/steps/[stepId]
 * Update a sequence step.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id: sequenceId, stepId } = await context.params;
  const result = await requireAgencyMember();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  const { agency } = result.data;
  const supabase = await createClient();

  // Verify sequence ownership
  const { data: sequence } = await supabase
    .from('email_sequences')
    .select('id')
    .eq('id', sequenceId)
    .eq('agency_id', agency.id)
    .single();

  if (!sequence) {
    return NextResponse.json({ error: 'Sequence not found' }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const allowedFields = ['subject', 'preview_text', 'html_body', 'delay_days', 'delay_hours', 'step_type', 'status', 'position'];
  const updates: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in body) {
      updates[key] = body[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('email_sequence_steps')
    .update(updates)
    .eq('id', stepId)
    .eq('sequence_id', sequenceId)
    .select()
    .single();

  if (error) {
    console.error('Failed to update step:', error);
    return NextResponse.json({ error: 'Failed to update step' }, { status: 500 });
  }

  return NextResponse.json({ step: data });
}

/**
 * DELETE /api/agency/email/sequences/[id]/steps/[stepId]
 * Delete a sequence step and reorder remaining steps.
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id: sequenceId, stepId } = await context.params;
  const result = await requireAgencyMember();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  const { agency } = result.data;
  const supabase = await createClient();

  // Verify sequence ownership
  const { data: sequence } = await supabase
    .from('email_sequences')
    .select('id')
    .eq('id', sequenceId)
    .eq('agency_id', agency.id)
    .single();

  if (!sequence) {
    return NextResponse.json({ error: 'Sequence not found' }, { status: 404 });
  }

  // Get the step to find its position
  const { data: step } = await supabase
    .from('email_sequence_steps')
    .select('position')
    .eq('id', stepId)
    .eq('sequence_id', sequenceId)
    .single();

  if (!step) {
    return NextResponse.json({ error: 'Step not found' }, { status: 404 });
  }

  // Delete the step
  const { error } = await supabase
    .from('email_sequence_steps')
    .delete()
    .eq('id', stepId);

  if (error) {
    console.error('Failed to delete step:', error);
    return NextResponse.json({ error: 'Failed to delete step' }, { status: 500 });
  }

  // Reorder remaining steps
  const { data: remainingSteps } = await supabase
    .from('email_sequence_steps')
    .select('id, position')
    .eq('sequence_id', sequenceId)
    .order('position', { ascending: true });

  if (remainingSteps) {
    for (let i = 0; i < remainingSteps.length; i++) {
      if (remainingSteps[i].position !== i) {
        await supabase
          .from('email_sequence_steps')
          .update({ position: i })
          .eq('id', remainingSteps[i].id);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
