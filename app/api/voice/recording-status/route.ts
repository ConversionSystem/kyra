/**
 * POST /api/voice/recording-status?clientId=XXX
 *
 * Twilio recording status callback. Fired when a recording is ready.
 * Updates voice_call_logs and triggers Whisper transcription asynchronously.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { verifyTwilioRequest } from '@/lib/voice/twilio-verify';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const verified = await verifyTwilioRequest(req);
  if (!verified.ok) return verified.response;

  try {
    const clientId = req.nextUrl.searchParams.get('clientId') ?? '';
    const recordingUrl = verified.params.RecordingUrl ?? '';
    const callSid = verified.params.CallSid ?? '';
    const recordingDuration = parseInt(verified.params.RecordingDuration ?? '0', 10);

    if (!callSid || !recordingUrl) {
      return NextResponse.json({ error: 'Missing CallSid or RecordingUrl' }, { status: 400 });
    }

    // Update voice_call_logs with recording info
    const supabase = createServiceClientWithoutCookies();
    await supabase
      .from('voice_call_logs')
      .update({
        recording_url: recordingUrl,
        recording_duration: recordingDuration,
        updated_at: new Date().toISOString(),
      })
      .eq('call_sid', callSid);

    // Fire-and-forget Whisper transcription
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, '') ?? '';
    if (appUrl) {
      fetch(`${appUrl}/api/voice/transcribe-recording`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callSid, recordingUrl, clientId }),
      }).catch(err => {
        console.error('[recording-status] Failed to trigger transcription:', err);
      });
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[recording-status] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
