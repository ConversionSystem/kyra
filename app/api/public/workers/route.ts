import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.trim() || '';
  const industry = searchParams.get('industry')?.trim() || '';

  const supabase = createServiceClientWithoutCookies();

  let query = supabase
    .from('agency_clients')
    .select('id, name, industry, status, created_at, container_config, agency_id, agencies(name)')
    .neq('status', 'deleted');

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  if (industry) {
    query = query.ilike('industry', `%${industry}%`);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch workers' }, { status: 500 });
  }

  const workers = (data || []).map((client: Record<string, unknown>) => {
    const config = (client.container_config || {}) as Record<string, unknown>;
    const channels: string[] = [];
    if (config.channels && Array.isArray(config.channels)) {
      channels.push(...(config.channels as string[]));
    } else if (config.webchat || config.web_chat) {
      channels.push('Web Chat');
    }

    const agency = client.agencies as { name: string } | null;

    return {
      id: client.id,
      name: client.name,
      industry: client.industry || 'General',
      status: client.status,
      created_at: client.created_at,
      channels,
      agency_name: agency?.name || 'Independent',
    };
  });

  return NextResponse.json({ workers });
}
