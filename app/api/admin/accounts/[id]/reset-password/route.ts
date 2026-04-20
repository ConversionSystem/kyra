import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { requireMaster } from '@/lib/auth/admin';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMaster();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const sb = await createClient();
  const admin = createServiceClientWithoutCookies();

  const { data: agency } = await admin
    .from('agencies')
    .select('owner_id')
    .eq('id', id)
    .single();

  if (!agency?.owner_id) return NextResponse.json({ error: 'Agency not found' }, { status: 404 });

  const { data: authUser } = await admin.auth.admin.getUserById(agency.owner_id);
  const email = authUser?.user?.email;
  if (!email) return NextResponse.json({ error: 'No email for user' }, { status: 404 });

  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://kyra.conversionsystem.com'}/reset-password`,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, email });
}
