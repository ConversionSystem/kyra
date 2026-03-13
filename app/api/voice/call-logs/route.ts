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
  const parsedLimit = Number.parseInt(req.nextUrl.searchParams.get('limit') ?? '20', 10);
  const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 20;

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

  // Normalise to the exact shape expected by voice-client.tsx
  const normalized = (calls ?? []).map((c: Record<string, unknown>) => {
    const callSid = typeof c.call_sid === 'string' ? c.call_sid : '';
    const fallbackId = typeof c.id === 'string' ? c.id : callSid;
    const createdAt = (typeof c.updated_at === 'string' ? c.updated_at : undefined)
      ?? (typeof c.created_at === 'string' ? c.created_at : undefined)
      ?? new Date().toISOString();

    const fullTranscript = typeof c.full_transcript === 'string' ? c.full_transcript : '';
    const lastUserMessage = typeof c.last_user_message === 'string' ? c.last_user_message : '';
    const lastAiResponse = typeof c.last_ai_response === 'string' ? c.last_ai_response : '';
    const recordingUrl = typeof c.recording_url === 'string' ? c.recording_url : undefined;
    const durationSeconds = typeof c.recording_duration === 'number'
      ? c.recording_duration
      : Number(c.recording_duration) || undefined;

    return {
      id: callSid || fallbackId,
      created_at: createdAt,
      user_message: fullTranscript ? `Transcript\n\n${fullTranscript}` : lastUserMessage,
      ai_response: lastAiResponse,
      metadata: {
        type: 'voice_call',
        callId: callSid || fallbackId,
        provider: 'twilio',
        callerNumber: typeof c.caller_number === 'string' ? c.caller_number : undefined,
        direction: typeof c.direction === 'string' ? c.direction : 'inbound',
        status: typeof c.status === 'string' ? c.status : 'completed',
        durationSeconds,
        recordingUrl,
        endedReason: typeof c.ended_reason === 'string' ? c.ended_reason : undefined,
      },
    };
  });

  return NextResponse.json({ calls: normalized });
}
