import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAgencyMember } from '@/lib/agency/middleware';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/agency/email/sequences/[id]/steps
 * Add a new step to a sequence.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const { id: sequenceId } = await context.params;
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

  let body: {
    subject?: string;
    preview_text?: string;
    html_body?: string;
    delay_days?: number;
    delay_hours?: number;
    step_type?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Get next position
  const { data: existingSteps } = await supabase
    .from('email_sequence_steps')
    .select('position')
    .eq('sequence_id', sequenceId)
    .order('position', { ascending: false })
    .limit(1);

  const nextPosition = existingSteps?.[0]?.position != null
    ? existingSteps[0].position + 1
    : 0;

  // Auto-assign step type based on position if not provided
  const stepType = body.step_type || getDefaultStepType(nextPosition);

  const { data, error } = await supabase
    .from('email_sequence_steps')
    .insert({
      sequence_id: sequenceId,
      position: nextPosition,
      subject: body.subject || '',
      preview_text: body.preview_text || '',
      html_body: body.html_body || '',
      delay_days: body.delay_days ?? (nextPosition === 0 ? 0 : 2),
      delay_hours: body.delay_hours ?? 0,
      step_type: stepType,
      status: 'draft',
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create step:', error);
    return NextResponse.json({ error: 'Failed to create step' }, { status: 500 });
  }

  return NextResponse.json({ step: data }, { status: 201 });
}

function getDefaultStepType(position: number): string {
  if (position === 0) return 'intro';
  if (position <= 2) return 'follow-up';
  if (position <= 4) return 'value-add';
  return 'closing';
}
