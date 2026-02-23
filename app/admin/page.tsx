import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AdminDashboardClient from './admin-client';

const ADMIN_EMAILS = ['hello@conversionsystem.com', 'angel@conversionsystem.com'];

export const metadata = { title: 'Admin — Kyra' };
export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !ADMIN_EMAILS.includes(user.email || '')) redirect('/agency');
  return <AdminDashboardClient />;
}
