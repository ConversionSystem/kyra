import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';

const MASTER_EMAILS = ['hello@conversionsystem.com', 'angel@conversionsystem.com'];

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user || !MASTER_EMAILS.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = createServiceClientWithoutCookies();

  // Get owner_id from agency
  const { data: agency } = await admin
    .from('agencies')
    .select('owner_id')
    .eq('id', params.id)
    .single();

  if (!agency?.owner_id) return NextResponse.json({ error: 'Agency not found' }, { status: 404 });

  // Get email
  const { data: authUser } = await admin.auth.admin.getUserById(agency.owner_id);
  const email = authUser?.user?.email;
  if (!email) return NextResponse.json({ error: 'No email for user' }, { status: 404 });

  // Send password reset email
  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://kyra.conversionsystem.com'}/auth/callback?next=/agency/billing`,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, email });
}
