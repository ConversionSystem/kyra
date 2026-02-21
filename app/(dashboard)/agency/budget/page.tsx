import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser, getAgencyClients } from '@/lib/agency/queries';
import { BudgetClient } from './budget-client';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Token Budget — Kyra' };

export default async function BudgetPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const result = await getAgencyForUser(user.id);
  if (!result) redirect('/signup/agency');

  const clients = await getAgencyClients(result.agency.id);

  return <BudgetClient clients={clients} />;
}
