import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { ModelPreference } from '@/types';

const VALID_MODELS: ModelPreference[] = ['auto', 'claude-sonnet-4', 'claude-haiku'];

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceClient = await createServiceClient();
  const { data: profile } = await serviceClient
    .from('users')
    .select('settings')
    .eq('id', user.id)
    .single();

  return NextResponse.json({
    preferred_model: profile?.settings?.preferred_model || 'auto',
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { preferred_model } = (await request.json()) as { preferred_model: string };

  if (!VALID_MODELS.includes(preferred_model as ModelPreference)) {
    return NextResponse.json({ error: 'Invalid model' }, { status: 400 });
  }

  const serviceClient = await createServiceClient();

  // Get current settings to merge
  const { data: profile } = await serviceClient
    .from('users')
    .select('settings')
    .eq('id', user.id)
    .single();

  const currentSettings = profile?.settings || {};

  const { error: updateError } = await serviceClient
    .from('users')
    .update({
      settings: { ...currentSettings, preferred_model },
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (updateError) {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }

  return NextResponse.json({ preferred_model });
}
