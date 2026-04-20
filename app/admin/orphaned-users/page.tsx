import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isMasterEmail } from '@/lib/auth/admin';
import OrphanedUsersClient from '../orphaned-users-client';

export const metadata = { title: 'Orphaned Users — Kyra Admin' };
export const dynamic = 'force-dynamic';

export default async function OrphanedUsersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isMasterEmail(user?.email)) redirect('/agency');
  return <OrphanedUsersClient />;
}
