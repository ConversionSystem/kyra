import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import OrphanedUsersClient from '../orphaned-users-client';

const ADMIN_EMAILS = ['hello@conversionsystem.com', 'angel@conversionsystem.com'];

export const metadata = { title: 'Orphaned Users — Kyra Admin' };
export const dynamic = 'force-dynamic';

export default async function OrphanedUsersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !ADMIN_EMAILS.includes(user.email || '')) redirect('/agency');
  return <OrphanedUsersClient />;
}
