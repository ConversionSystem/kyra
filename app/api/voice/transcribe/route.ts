import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { transcribeAudio } from '@/lib/channels/whisper';
import { getCreditCost } from '@/lib/billing/plans';
import { createClient as createServiceClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

/**
 * POST /api/voice/transcribe
 * Transcribe audio to text. Accepts multipart form data with an audio file.
 * Returns { text: string }.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('audio') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Audio file is required (field: "audio")' }, { status: 400 });
    }

    // Deduct credits
    const serviceClient = getServiceClient();
    const { data: userData } = await serviceClient
      .from('users')
      .select('usage_this_month')
      .eq('id', user.id)
      .single();

    const currentUsage = userData?.usage_this_month || 0;
    const cost = getCreditCost('voice_transcribe');

    await serviceClient
      .from('users')
      .update({ usage_this_month: currentUsage + cost })
      .eq('id', user.id);

    // Transcribe
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const language = formData.get('language') as string | null;

    const text = await transcribeAudio(buffer, {
      filename: file.name || 'audio.webm',
      language: language || undefined,
    });

    return NextResponse.json({ text });
  } catch (err: any) {
    console.error('Transcription error:', err);
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 });
  }
}
