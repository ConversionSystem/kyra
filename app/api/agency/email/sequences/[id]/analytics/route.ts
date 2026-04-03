import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAgencyMember } from '@/lib/agency/middleware';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/agency/email/sequences/[id]/analytics
 * Get analytics for a sequence (per-step open/click/send stats).
 */
export async function GET(_request: NextRequest, context: RouteContext) {
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
    .select('id, name, total_enrolled, total_completed')
    .eq('id', sequenceId)
    .eq('agency_id', agency.id)
    .single();

  if (!sequence) {
    return NextResponse.json({ error: 'Sequence not found' }, { status: 404 });
  }

  // Get step-level stats
  const { data: steps } = await supabase
    .from('email_sequence_steps')
    .select('id, position, subject, step_type, total_sent, total_opened, total_clicked')
    .eq('sequence_id', sequenceId)
    .order('position', { ascending: true });

  // Get enrollment stats
  const { data: enrollments } = await supabase
    .from('email_sequence_enrollments')
    .select('status')
    .eq('sequence_id', sequenceId);

  const enrollmentStats = {
    active: 0,
    completed: 0,
    paused: 0,
    unsubscribed: 0,
    total: enrollments?.length || 0,
  };

  enrollments?.forEach(e => {
    const status = e.status as keyof typeof enrollmentStats;
    if (status in enrollmentStats) {
      enrollmentStats[status]++;
    }
  });

  // Aggregate stats
  const totalSent = steps?.reduce((sum, s) => sum + ((s.total_sent as number) || 0), 0) || 0;
  const totalOpened = steps?.reduce((sum, s) => sum + ((s.total_opened as number) || 0), 0) || 0;
  const totalClicked = steps?.reduce((sum, s) => sum + ((s.total_clicked as number) || 0), 0) || 0;

  return NextResponse.json({
    sequence: {
      id: sequence.id,
      name: sequence.name,
    },
    overview: {
      totalSent,
      totalOpened,
      totalClicked,
      openRate: totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0,
      clickRate: totalSent > 0 ? Math.round((totalClicked / totalSent) * 100) : 0,
    },
    enrollments: enrollmentStats,
    steps: (steps || []).map(s => ({
      id: s.id,
      position: s.position,
      subject: s.subject,
      stepType: s.step_type,
      sent: s.total_sent || 0,
      opened: s.total_opened || 0,
      clicked: s.total_clicked || 0,
      openRate: (s.total_sent as number) > 0
        ? Math.round(((s.total_opened as number) / (s.total_sent as number)) * 100)
        : 0,
      clickRate: (s.total_sent as number) > 0
        ? Math.round(((s.total_clicked as number) / (s.total_sent as number)) * 100)
        : 0,
    })),
  });
}
