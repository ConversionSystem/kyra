export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isMasterEmail } from '@/lib/auth/admin';
import MasterDashboard from './master-dashboard';

export default async function MasterPage() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!isMasterEmail(user?.email)) redirect('/agency');

  return <MasterDashboard />;
}
