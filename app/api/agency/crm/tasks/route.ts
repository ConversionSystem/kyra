import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser } from '@/lib/agency/queries';
import { listTasks, createTask } from '@/lib/crm/tasks';
import type { TaskFilters } from '@/lib/crm/tasks';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await getAgencyForUser(user.id);
  if (!result) return NextResponse.json({ error: 'No agency' }, { status: 403 });

  const url = new URL(req.url);
  const filters: TaskFilters = {
    status: url.searchParams.get('status') || undefined,
    priority: url.searchParams.get('priority') || undefined,
    contact_id: url.searchParams.get('contact_id') || undefined,
    deal_id: url.searchParams.get('deal_id') || undefined,
    client_id: url.searchParams.get('clientId') || undefined,
    overdue: url.searchParams.get('overdue') === 'true',
    sort: (url.searchParams.get('sort') as TaskFilters['sort']) || undefined,
    order: (url.searchParams.get('order') as 'asc' | 'desc') || undefined,
  };

  try {
    const data = await listTasks(result.agency.id, filters);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await getAgencyForUser(user.id);
  if (!result) return NextResponse.json({ error: 'No agency' }, { status: 403 });

  const body = await req.json();
  if (!body.title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 });

  try {
    const task = await createTask(result.agency.id, body);
    return NextResponse.json(task);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
