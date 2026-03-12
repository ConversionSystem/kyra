/**
 * POST /api/voice/transcribe-recording
 *
 * Downloads a Twilio call recording and runs it through OpenAI Whisper
 * for full post-call transcription. Saves result to voice_call_logs.full_transcript.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { transcribeAudio } from '@/lib/channels/whisper';

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // recordings can be large

interface TranscribeBody {
  callSid: string;
  recordingUrl: string;
  clientId: string;
}

export async function POST(req: NextRequest) {
  try {
    const { callSid, recordingUrl, clientId } = (await req.json()) as TranscribeBody;

    if (!callSid || !recordingUrl) {
      return NextResponse.json({ error: 'Missing callSid or recordingUrl' }, { status: 400 });
    }

    // Download recording from Twilio (wav format for best Whisper accuracy)
    const audioRes = await fetch(`${recordingUrl}.wav`, {
      signal: AbortSignal.timeout(60000),
    });

    if (!audioRes.ok) {
      console.error('[transcribe-recording] Failed to download recording:', audioRes.status);
      return NextResponse.json({ error: 'Failed to download recording' }, { status: 502 });
    }

    const audioBuffer = Buffer.from(await audioRes.arrayBuffer());

    // Transcribe with Whisper
    const transcript = await transcribeAudio(audioBuffer, { filename: 'recording.wav' });

    // Save to voice_call_logs
    const supabase = createServiceClientWithoutCookies();
    await supabase
      .from('voice_call_logs')
      .update({ full_transcript: transcript })
      .eq('call_sid', callSid);

    console.log(`[transcribe-recording] Transcribed ${callSid} (${transcript.length} chars)`);

    return NextResponse.json({ ok: true, callSid, transcriptLength: transcript.length });
  } catch (err) {
    console.error('[transcribe-recording] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Transcription failed' },
      { status: 500 },
    );
  }
}
