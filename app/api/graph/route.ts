import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

/**
 * GET /api/graph — Get user's knowledge graph (entities + relationships)
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = await createServiceClient();

  const [{ data: entities }, { data: relationships }] = await Promise.all([
    serviceClient
      .from('entities')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(200),
    serviceClient
      .from('relationships')
      .select('*')
      .eq('user_id', user.id)
      .limit(500),
  ]);

  return NextResponse.json({
    entities: entities || [],
    relationships: relationships || [],
    stats: {
      totalEntities: entities?.length || 0,
      totalRelationships: relationships?.length || 0,
      entityTypes: Array.from(new Set((entities || []).map(e => e.type))),
    },
  });
}
