import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { requireMaster } from '@/lib/auth/admin';

interface RouteContext { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const auth = await requireMaster();
  if (!auth.ok) return auth.response;
  const user = auth.user;
  const service = createServiceClientWithoutCookies();
  const { data: agency } = await service.from('agencies').select('owner_id, name').eq('id', id).single();
  if (!agency) return NextResponse.json({ error: 'Agency not found' }, { status: 404 });

  // Look up owner email from auth.users
  const { data: ownerUser, error: userErr } = await service.auth.admin.getUserById(agency.owner_id);
  if (userErr || !ownerUser?.user?.email) {
    return NextResponse.json({ error: 'Owner user not found' }, { status: 404 });
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://kyra.conversionsystem.com';

  // Generate magic link for the target user
  const { data, error } = await service.auth.admin.generateLink({
    type: 'magiclink',
    email: ownerUser.user.email,
    options: { redirectTo: `${origin}/agency` },
  });

  if (error || !data?.properties?.action_link) {
    return NextResponse.json({ error: error?.message || 'Failed to generate login link' }, { status: 500 });
  }

  console.log(
    `[LOGIN-AS] admin ${user.email} generated login link for ${ownerUser.user.email} (agency: ${agency.name}, id: ${id})`
  );

  return NextResponse.json({
    ok: true,
    url: data.properties.action_link,
    name: agency.name,
    email: ownerUser.user.email,
  });
}
