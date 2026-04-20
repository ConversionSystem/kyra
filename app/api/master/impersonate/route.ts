import { NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { requireMaster } from '@/lib/auth/admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  // 1. Auth — verify caller is a master admin
  const auth = await requireMaster();
  if (!auth.ok) return auth.response;
  const user = auth.user;

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

  // 5. Generate a one-time magic login link (non-destructive — doesn't touch user's password)
  const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://kyra.conversionsystem.com';
  const { data: linkData, error: linkErr } = await db.auth.admin.generateLink({
    type: 'magiclink',
    email: targetEmail,
    options: { redirectTo: `${origin}/agency` },
  });

  if (linkErr || !linkData?.properties?.action_link) {
    console.error('[IMPERSONATE] Failed to generate magic link:', linkErr?.message);
    return NextResponse.json({ error: 'Failed to generate login link' }, { status: 500 });
  }

  // 6. Log impersonation
  console.log(
    `[IMPERSONATE] admin ${user.email} generated login link for ${targetEmail} (agency: ${agency?.name ?? 'unknown'}, id: ${agency?.id ?? userId})`
  );

  // Return magic link — the frontend opens it in a new tab
  return NextResponse.json({
    email: targetEmail,
    loginUrl: linkData.properties.action_link,
    agencyName: agency?.name || 'Unknown',
  });
}
