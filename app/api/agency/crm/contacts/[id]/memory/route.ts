import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { getMemories, addMemories } from '@/lib/crm/relationship-memory';
import type { MemoryEntry } from '@/lib/crm/relationship-memory';

async function getAgencyId(userId: string): Promise<string | null> {
  const svc = createServiceClientWithoutCookies();
  const { data } = await svc.from('agency_members').select('agency_id').eq('user_id', userId).single();
  return data?.agency_id ?? null;
}

// GET — list memories for a contact
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agencyId = await getAgencyId(user.id);
  if (!agencyId) return NextResponse.json({ error: 'No agency' }, { status: 404 });

  const { id } = await params;
  const type = req.nextUrl.searchParams.get('type') as MemoryEntry['type'] | null;
  const memories = await getMemories(agencyId, id, type || undefined);
  return NextResponse.json({ memories });
}

// POST — manually add a memory
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agencyId = await getAgencyId(user.id);
  if (!agencyId) return NextResponse.json({ error: 'No agency' }, { status: 404 });

  const { id } = await params;
  const body = await req.json();

  if (!body.content?.trim()) return NextResponse.json({ error: 'content required' }, { status: 400 });

  const memory: MemoryEntry = {
    id: crypto.randomUUID(),
    type: body.type || 'context',
    content: body.content.trim(),
    source: 'manual',
    confidence: 1.0,
    created_at: new Date().toISOString(),
  };

  await addMemories(agencyId, id, [memory]);
  return NextResponse.json({ memory }, { status: 201 });
}
