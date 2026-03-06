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

/**
 * POST /api/agency/customers/memory
 * Add a manual fact to a customer's memory profile.
 * Body: { clientId, contactId, fact, source }
 */
export async function POST(req: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { clientId, contactId, fact, source = 'manual' } = await req.json();
  if (!clientId || !contactId || !fact) {
    return NextResponse.json({ error: 'clientId, contactId, and fact are required' }, { status: 400 });
  }

  const supabase = createServiceClientWithoutCookies();

  // Load existing memory
  const { data: existing } = await supabase
    .from('customer_memory')
    .select('*')
    .eq('client_id', clientId)
    .eq('contact_id', contactId)
    .single();

  if (!existing) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  const facts = Array.isArray(existing.facts) ? existing.facts : [];
  facts.push({ fact, source, date: new Date().toISOString().split('T')[0] });

  const { error } = await supabase
    .from('customer_memory')
    .update({ facts, updated_at: new Date().toISOString() })
    .eq('client_id', clientId)
    .eq('contact_id', contactId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
