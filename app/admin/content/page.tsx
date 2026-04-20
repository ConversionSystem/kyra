import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/auth/admin';
import ContentCalendarClient from './content-client';

// Note: `webblex10@gmail.com` previously hardcoded here now migrates to the
// `ADMIN_EMAILS` env var set in Vercel (see lib/auth/admin.ts).
export const metadata = { title: 'Content Calendar — Kyra' };
export const dynamic = 'force-dynamic';

export default async function ContentCalendarPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdminEmail(user?.email)) redirect('/agency');
  return <ContentCalendarClient />;
}
