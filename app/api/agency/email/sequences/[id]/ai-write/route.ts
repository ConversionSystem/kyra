import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { generateEmailContent, type EmailWriterContext } from '@/lib/email/ai-writer';
import { deductCredits, requireCredits } from '@/lib/billing/credit-engine';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/agency/email/sequences/[id]/ai-write
 * AI generates email content for a specific step.
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
    .select('*')
    .eq('id', sequenceId)
    .eq('agency_id', agency.id)
    .single();

  if (!sequence) {
    return NextResponse.json({ error: 'Sequence not found' }, { status: 404 });
  }

  // Check credits
  const creditCheck = await requireCredits(agency.id, 'chat.message', 2);
  if (!creditCheck.allowed) {
    return NextResponse.json({ error: 'Insufficient credits for AI email generation' }, { status: 402 });
  }

  let body: {
    stepId: string;
    businessName?: string;
    industry?: string;
    ctaGoal?: string;
    additionalContext?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.stepId) {
    return NextResponse.json({ error: 'stepId is required' }, { status: 400 });
  }

  // Get all steps for context
  const { data: steps } = await supabase
    .from('email_sequence_steps')
    .select('*')
    .eq('sequence_id', sequenceId)
    .order('position', { ascending: true });

  if (!steps) {
    return NextResponse.json({ error: 'Failed to fetch steps' }, { status: 500 });
  }

  const targetStep = steps.find(s => s.id === body.stepId);
  if (!targetStep) {
    return NextResponse.json({ error: 'Step not found' }, { status: 404 });
  }

  // Get previous subjects for context
  const previousSubjects = steps
    .filter(s => s.position < targetStep.position && s.subject)
    .map(s => s.subject as string);

  const writerContext: EmailWriterContext = {
    businessName: body.businessName || agency.name || 'Our Business',
    industry: body.industry || 'general',
    sequenceName: sequence.name,
    stepPosition: targetStep.position + 1,
    totalSteps: steps.length,
    stepType: (targetStep.step_type as EmailWriterContext['stepType']) || 'custom',
    previousSubjects,
    ctaGoal: body.ctaGoal,
    additionalContext: body.additionalContext,
    contactMergeTags: true,
  };

  try {
    const generated = await generateEmailContent(writerContext);

    // Deduct credits
    await deductCredits(agency.id, 'chat.message', {
      multiplier: 2,
      description: `AI email writer: "${sequence.name}" step ${targetStep.position + 1}`,
    });

    return NextResponse.json({
      subject: generated.subject,
      htmlBody: generated.htmlBody,
      previewText: generated.previewText,
    });
  } catch (err) {
    console.error('AI email generation failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'AI generation failed' },
      { status: 500 },
    );
  }
}
