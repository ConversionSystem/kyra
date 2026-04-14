import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';

const MASTER_EMAILS = ['hello@conversionsystem.com', 'angel@conversionsystem.com'];

interface RouteContext { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !MASTER_EMAILS.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const service = createServiceClientWithoutCookies();
  const { data: agency } = await service.from('agencies').select('owner_email, name').eq('id', id).single();
  if (!agency) return NextResponse.json({ error: 'Agency not found' }, { status: 404 });
  const { data, error } = await service.auth.admin.generateLink({
    type: 'magiclink',
    email: agency.owner_email,
    options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://kyra.conversionsystem.com'}/agency` },
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, url: data.properties?.action_link, name: agency.name });
}
