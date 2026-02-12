import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    role?: string;
    timezone?: string;
    tone?: string;
  };

  const updates: Record<string, unknown> = {
    onboarding_complete: true,
    updated_at: new Date().toISOString(),
  };

  if (body.name) {
    updates.name = body.name;
  }

  if (body.timezone) {
    updates.timezone = body.timezone;
  }

  // Store tone and role in settings JSONB
  const settings: Record<string, string> = {};
  if (body.tone) settings.tone = body.tone;
  if (body.role) settings.role = body.role;
  if (Object.keys(settings).length > 0) {
    updates.settings = settings;
  }

  const { error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
