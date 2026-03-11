import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface KnowledgeSource {
  id: string;
  type: 'file' | 'url';
  name: string;
  url?: string;
  size?: number;
  addedAt: string;
}

// PATCH — update knowledge sources for a client
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: clientId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { knowledge_sources } = body as { knowledge_sources: KnowledgeSource[] };

  if (!Array.isArray(knowledge_sources)) {
    return NextResponse.json({ error: 'knowledge_sources array required' }, { status: 400 });
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

  const { error: updateError } = await supabase
    .from('agency_clients')
    .update({ settings: { ...settings, knowledge_sources } })
    .eq('id', clientId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ knowledge_sources });
}
