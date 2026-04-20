import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isMasterEmail } from '@/lib/auth/admin';
import AdminDashboardClient from './admin-client';

export const metadata = { title: 'Admin — Kyra' };
export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isMasterEmail(user?.email)) redirect('/agency');
  return <AdminDashboardClient />;
}
