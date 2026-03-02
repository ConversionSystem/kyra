import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser } from '@/lib/agency/queries';
import { UsageDashboard } from './usage-dashboard';

export default async function UsagePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const result = await getAgencyForUser(user.id);
  if (!result) redirect('/signup/agency');
  return <UsageDashboard />;
}
