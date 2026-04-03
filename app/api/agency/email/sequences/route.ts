import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAgencyMember } from '@/lib/agency/middleware';

/**
 * GET /api/agency/email/sequences
 * List all email sequences for the agency.
 */
export async function GET() {
  const result = await requireAgencyMember();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  const { agency } = result.data;
  const supabase = await createClient();

  // Fetch sequences with step counts
  const { data: sequences, error } = await supabase
    .from('email_sequences')
    .select('*')
    .eq('agency_id', agency.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch sequences:', error);
    return NextResponse.json({ error: 'Failed to fetch sequences' }, { status: 500 });
  }

  // Fetch step counts and enrollment counts for each sequence
  const sequenceIds = (sequences || []).map(s => s.id);

  let stepCounts: Record<string, number> = {};
  let enrollmentCounts: Record<string, number> = {};

  if (sequenceIds.length > 0) {
    const { data: steps } = await supabase
      .from('email_sequence_steps')
      .select('sequence_id')
      .in('sequence_id', sequenceIds);

    if (steps) {
      stepCounts = steps.reduce((acc: Record<string, number>, s) => {
        acc[s.sequence_id] = (acc[s.sequence_id] || 0) + 1;
        return acc;
      }, {});
    }

    const { data: enrollments } = await supabase
      .from('email_sequence_enrollments')
      .select('sequence_id')
      .in('sequence_id', sequenceIds)
      .eq('status', 'active');

    if (enrollments) {
      enrollmentCounts = enrollments.reduce((acc: Record<string, number>, e) => {
        acc[e.sequence_id] = (acc[e.sequence_id] || 0) + 1;
        return acc;
      }, {});
    }
  }

  const enriched = (sequences || []).map(seq => ({
    ...seq,
    step_count: stepCounts[seq.id] || 0,
    active_enrollments: enrollmentCounts[seq.id] || 0,
  }));

  return NextResponse.json({ sequences: enriched });
}

/**
 * POST /api/agency/email/sequences
 * Create a new email sequence.
 */
export async function POST(request: NextRequest) {
  const result = await requireAgencyMember();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  const { agency } = result.data;

  let body: { name: string; description?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Sequence name is required' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('email_sequences')
    .insert({
      agency_id: agency.id,
      name: body.name.trim(),
      description: body.description?.trim() || null,
      status: 'draft',
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create sequence:', error);
    return NextResponse.json({ error: 'Failed to create sequence' }, { status: 500 });
  }

  return NextResponse.json({ sequence: data }, { status: 201 });
}
