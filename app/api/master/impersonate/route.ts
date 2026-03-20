import { NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { randomBytes } from 'crypto';

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

  // 5. Set a temporary password and return login credentials
  // This is the most reliable approach — magic links have redirect issues with PKCE
  const tempPassword = 'KyraAdmin_' + randomBytes(12).toString('hex');
  const { error: pwErr } = await db.auth.admin.updateUserById(userId, {
    password: tempPassword,
  });

  if (pwErr) {
    console.error('[IMPERSONATE] Failed to set temp password:', pwErr.message);
    return NextResponse.json({ error: 'Failed to prepare login' }, { status: 500 });
  }

  // 6. Log impersonation
  console.log(
    `[IMPERSONATE] admin ${user.email} logged in as ${targetEmail} (agency: ${agency?.name ?? 'unknown'}, id: ${agency?.id ?? userId})`
  );

  // Return credentials — the frontend will auto-login
  return NextResponse.json({
    email: targetEmail,
    password: tempPassword,
    agencyName: agency?.name || 'Unknown',
  });
}
