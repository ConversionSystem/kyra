import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAgencyMember } from '@/lib/agency/middleware';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/agency/email/sequences/[id]
 * Get a single sequence with its steps.
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const result = await requireAgencyMember();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  const { agency } = result.data;
  const supabase = await createClient();

  const { data: sequence, error } = await supabase
    .from('email_sequences')
    .select('*')
    .eq('id', id)
    .eq('agency_id', agency.id)
    .single();

  if (error || !sequence) {
    return NextResponse.json({ error: 'Sequence not found' }, { status: 404 });
  }

  const { data: steps } = await supabase
    .from('email_sequence_steps')
    .select('*')
    .eq('sequence_id', id)
    .order('position', { ascending: true });

  const { count: enrollmentCount } = await supabase
    .from('email_sequence_enrollments')
    .select('id', { count: 'exact', head: true })
    .eq('sequence_id', id)
    .eq('status', 'active');

  return NextResponse.json({
    sequence: {
      ...sequence,
      steps: steps || [],
      active_enrollments: enrollmentCount || 0,
    },
  });
}

/**
 * PATCH /api/agency/email/sequences/[id]
 * Update a sequence (name, status, description, settings).
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const result = await requireAgencyMember();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  const { agency } = result.data;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const allowedFields = ['name', 'description', 'status', 'settings', 'trigger_type', 'trigger_config'];
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

  const supabase = await createClient();

  // Verify ownership
  const { data: existing } = await supabase
    .from('email_sequences')
    .select('id')
    .eq('id', id)
    .eq('agency_id', agency.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: 'Sequence not found' }, { status: 404 });
  }

  const { data, error } = await supabase
    .from('email_sequences')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Failed to update sequence:', error);
    return NextResponse.json({ error: 'Failed to update sequence' }, { status: 500 });
  }

  return NextResponse.json({ sequence: data });
}

/**
 * DELETE /api/agency/email/sequences/[id]
 * Delete a sequence and all its steps.
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const result = await requireAgencyMember();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  const { agency } = result.data;
  const supabase = await createClient();

  // Verify ownership
  const { data: existing } = await supabase
    .from('email_sequences')
    .select('id')
    .eq('id', id)
    .eq('agency_id', agency.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: 'Sequence not found' }, { status: 404 });
  }

  const { error } = await supabase
    .from('email_sequences')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Failed to delete sequence:', error);
    return NextResponse.json({ error: 'Failed to delete sequence' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
