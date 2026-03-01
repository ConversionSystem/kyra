/**
 * Customer Memory API
 * 
 * GET /api/agency/customers/memory?clientId=xxx — List all customer memories
 * GET /api/agency/customers/memory?clientId=xxx&contactId=yyy — Get specific customer
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const clientId = req.nextUrl.searchParams.get('clientId');
  const contactId = req.nextUrl.searchParams.get('contactId');

  if (!clientId) {
    // Get user's agency and find their client
    const { data: membership } = await sb
      .from('agency_members')
      .select('agency_id')
      .eq('user_id', user.id)
      .single();
    
    if (!membership) return NextResponse.json({ error: 'No agency' }, { status: 404 });

    const supabase = createServiceClientWithoutCookies();
    
    // For solo users, use agencyId as clientId
    const { data: clients } = await supabase
      .from('agency_clients')
      .select('id')
      .eq('agency_id', membership.agency_id)
      .limit(1);

    const entityId = clients?.[0]?.id ?? membership.agency_id;

    const { data: memories } = await supabase
      .from('customer_memory')
      .select('*')
      .eq('client_id', entityId)
      .order('last_contact', { ascending: false })
      .limit(100);

    return NextResponse.json({ memories: memories ?? [] });
  }

  // Specific customer
  if (contactId) {
    const supabase = createServiceClientWithoutCookies();
    const { data: memory } = await supabase
      .from('customer_memory')
      .select('*')
      .eq('client_id', clientId)
      .eq('contact_id', contactId)
      .single();

    return NextResponse.json({ memory: memory ?? null });
  }

  // All customers for a client
  const supabase = createServiceClientWithoutCookies();
  const { data: memories } = await supabase
    .from('customer_memory')
    .select('*')
    .eq('client_id', clientId)
    .order('last_contact', { ascending: false })
    .limit(100);

  return NextResponse.json({ memories: memories ?? [] });
}
