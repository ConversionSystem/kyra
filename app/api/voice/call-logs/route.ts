/**
 * GET /api/voice/call-logs?entityId=XXX&limit=20
 * Returns voice call history for a client or agency.
 * Reads from voice_call_logs table (written by twilio/gather webhook).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const entityId = req.nextUrl.searchParams.get('entityId');
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '20'), 100);

  if (!entityId) return NextResponse.json({ calls: [] });

  const svc = createServiceClientWithoutCookies();
  // Query by client_id OR agency_id — handles both per-client and agency-level voice
  const { data: calls, error } = await svc
    .from('voice_call_logs')
    .select('*')
    .or(`client_id.eq.${entityId},agency_id.eq.${entityId}`)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) {
    // Table might not exist yet — return empty rather than crashing
    console.warn('[voice/call-logs] query error:', error.message);
    return NextResponse.json({ calls: [] });
  }

  // Normalise to the shape the UI expects
  const normalized = (calls ?? []).map((c: Record<string, unknown>) => ({
    id: c.call_sid,
    callSid: c.call_sid,
    from: c.caller_number,
    direction: 'inbound',
    duration: null,
    status: 'completed',
    createdAt: c.updated_at,
    summary: `${c.turns} turns · Last: "${String(c.last_user_message ?? '').slice(0, 60)}..."`,
    metadata: {
      turns: c.turns,
      lastUserMessage: c.last_user_message,
      lastAiResponse: c.last_ai_response,
    },
  }));

  return NextResponse.json({ calls: normalized });
}
