import { NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';

const MASTER_EMAILS = ['hello@conversionsystem.com', 'angel@conversionsystem.com'];

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  // 1. Auth — verify caller is a master admin
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user || !MASTER_EMAILS.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 2. Parse request
  const body = await request.json().catch(() => null);
  const userId = body?.userId;
  if (!userId || typeof userId !== 'string') {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  const db = createServiceClientWithoutCookies();

  // 3. Look up target user's email
  const { data: targetUser, error: userErr } = await db.auth.admin.getUserById(userId);
  if (userErr || !targetUser?.user?.email) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const targetEmail = targetUser.user.email;

  // 4. Look up target user's agency for logging
  const { data: agency } = await db
    .from('agencies')
    .select('id, name')
    .eq('owner_id', userId)
    .single();

  // 5. Generate magic link
  const { data: linkData, error: linkErr } = await db.auth.admin.generateLink({
    type: 'magiclink',
    email: targetEmail,
    options: { redirectTo: '/agency' },
  });

  if (linkErr || !linkData?.properties?.action_link) {
    console.error('[IMPERSONATE] Failed to generate link:', linkErr?.message);
    return NextResponse.json({ error: 'Failed to generate login link' }, { status: 500 });
  }

  // 6. Log impersonation
  console.log(
    `[IMPERSONATE] admin ${user.email} logged in as ${targetEmail} (agency: ${agency?.name ?? 'unknown'}, id: ${agency?.id ?? userId})`
  );

  return NextResponse.json({ url: linkData.properties.action_link });
}
