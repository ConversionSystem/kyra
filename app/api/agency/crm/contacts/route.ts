import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { getContacts, createContact } from '@/lib/crm/contacts';
import { logActivity } from '@/lib/crm/activities';
import { enrichContact } from '@/lib/crm/enrichment';
import type { ContactFilters } from '@/lib/crm/types';

async function getAgencyId(userId: string): Promise<string | null> {
  const svc = createServiceClientWithoutCookies();
  const { data } = await svc.from('agency_members').select('agency_id').eq('user_id', userId).single();
  return data?.agency_id ?? null;
}

// GET /api/agency/crm/contacts — List + search + filter
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agencyId = await getAgencyId(user.id);
  if (!agencyId) return NextResponse.json({ error: 'No agency' }, { status: 404 });

  const url = req.nextUrl;
  const clientId = url.searchParams.get('clientId') || undefined;

  const filters: ContactFilters = {
    search: url.searchParams.get('search') || undefined,
    stage: url.searchParams.get('stage') || undefined,
    score_label: url.searchParams.get('score_label') || undefined,
    tag: url.searchParams.get('tag') || undefined,
    sort: (url.searchParams.get('sort') as ContactFilters['sort']) || 'created',
    order: (url.searchParams.get('order') as ContactFilters['order']) || 'desc',
    page: Number(url.searchParams.get('page')) || 1,
    limit: Number(url.searchParams.get('limit')) || 50,
  };

  const result = await getContacts(agencyId, filters, clientId);
  return NextResponse.json(result);
}

// POST /api/agency/crm/contacts — Create contact
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agencyId = await getAgencyId(user.id);
  if (!agencyId) return NextResponse.json({ error: 'No agency' }, { status: 404 });

  const body = await req.json();

  const clientId = typeof body?.clientId === 'string' ? body.clientId : undefined;
  const result = await createContact(agencyId, body, clientId);

  if (result.existing) {
    return NextResponse.json({ contact: result.contact, existing: true, message: 'Contact already exists' });
  }

  if (!result.contact) {
    return NextResponse.json({ error: result.error || 'Failed to create contact' }, { status: 500 });
  }

  // Log activity for new contact
  await logActivity(agencyId, {
    contact_id: result.contact.id,
    type: 'system',
    subject: 'Contact created',
    body: `New contact added${body.company_name ? ` from ${body.company_name}` : ''}.`,
    actor: 'human',
    actor_name: user.email || 'Team member',
  });

  // AI auto-enrichment (non-blocking, 2 credits)
  enrichContact(agencyId, result.contact.id).catch(err =>
    console.error('[crm/contacts] enrichment error:', err)
  );

  return NextResponse.json({ contact: result.contact, existing: false }, { status: 201 });
}
