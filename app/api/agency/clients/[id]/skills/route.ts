import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// PATCH — toggle a skill on/off for a client
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: clientId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { skillId, enabled } = body;

  if (!skillId || typeof enabled !== 'boolean') {
    return NextResponse.json({ error: 'skillId and enabled (boolean) required' }, { status: 400 });
  }

  // Get current client settings
  const { data: client, error: fetchError } = await supabase
    .from('agency_clients')
    .select('settings')
    .eq('id', clientId)
    .single();

  if (fetchError || !client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const settings = (client.settings as Record<string, unknown>) || {};
  const enabledSkills = (settings.enabled_skills as string[]) || [];

  let updated: string[];
  if (enabled) {
    updated = enabledSkills.includes(skillId) ? enabledSkills : [...enabledSkills, skillId];
  } else {
    updated = enabledSkills.filter((s: string) => s !== skillId);
  }

  const { error: updateError } = await supabase
    .from('agency_clients')
    .update({ settings: { ...settings, enabled_skills: updated } })
    .eq('id', clientId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ enabled_skills: updated });
}
