import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { sendPlatformEmail } from '@/lib/email/ghl-platform-sender';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/agency/email/sequences/[id]/test-send
 * Send a test email for a specific step to the agency owner.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const { id: sequenceId } = await context.params;
  const result = await requireAgencyMember();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  const { agency, user } = result.data;
  const supabase = await createClient();

  // Verify sequence ownership
  const { data: sequence } = await supabase
    .from('email_sequences')
    .select('id, name')
    .eq('id', sequenceId)
    .eq('agency_id', agency.id)
    .single();

  if (!sequence) {
    return NextResponse.json({ error: 'Sequence not found' }, { status: 404 });
  }

  let body: { stepId: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.stepId) {
    return NextResponse.json({ error: 'stepId is required' }, { status: 400 });
  }

  const { data: step } = await supabase
    .from('email_sequence_steps')
    .select('*')
    .eq('id', body.stepId)
    .eq('sequence_id', sequenceId)
    .single();

  if (!step) {
    return NextResponse.json({ error: 'Step not found' }, { status: 404 });
  }

  if (!step.subject || !step.html_body) {
    return NextResponse.json({ error: 'Step has no content to send' }, { status: 400 });
  }

  const recipientEmail = user.email;
  if (!recipientEmail) {
    return NextResponse.json({ error: 'No email address on your account' }, { status: 400 });
  }

  // Replace merge tags with test values
  const testHtml = (step.html_body as string)
    .replace(/\{\{contact_name\}\}/g, 'Test Contact')
    .replace(/\{\{business_name\}\}/g, agency.name || 'Your Business')
    .replace(/\{\{agent_name\}\}/g, 'AI Agent');

  try {
    const sendResult = await sendPlatformEmail({
      to: recipientEmail,
      subject: `[TEST] ${step.subject}`,
      html: testHtml,
      fromName: agency.name || 'Kyra',
    });

    if (!sendResult.ok) {
      throw new Error(sendResult.error || 'Send failed');
    }

    return NextResponse.json({
      ok: true,
      provider: sendResult.provider,
      sentTo: recipientEmail,
    });
  } catch (err) {
    console.error('Test send failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to send test email' },
      { status: 500 },
    );
  }
}
