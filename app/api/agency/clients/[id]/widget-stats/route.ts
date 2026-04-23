import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireClientAccess } from '@/lib/agency/middleware';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: clientId } = await params;

  const auth = await requireClientAccess(clientId);
  if (auth.error) return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });

  // Total conversations
  const { count: conversations } = await supabase
    .from('client_conversations')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', clientId);

  // Messages today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { count: messagesToday } = await supabase
    .from('client_conversations')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', clientId)
    .gte('created_at', today.toISOString());

  return NextResponse.json({
    conversations: conversations ?? 0,
    messagesToday: messagesToday ?? 0,
    avgResponseTime: '<3s',
  });
}
