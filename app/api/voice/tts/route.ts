import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { textToSpeech, VoiceId } from '@/lib/channels/voice';

/**
 * POST /api/voice/tts
 * Convert text to speech. Returns audio/mpeg stream.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { text, voice, speed } = (await request.json()) as any;
    
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }
    
    const audioBuffer = await textToSpeech(text, {
      voice: voice as VoiceId,
      speed,
    });
    
    return new Response(new Uint8Array(audioBuffer), {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(audioBuffer.length),
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err: any) {
    console.error('TTS error:', err);
    return NextResponse.json({ error: 'TTS failed' }, { status: 500 });
  }
}
