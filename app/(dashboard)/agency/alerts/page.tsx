import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser } from '@/lib/agency/queries';
import { AlertsClient } from './alerts-client';

export default async function AlertsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const result = await getAgencyForUser(user.id);
  if (!result) redirect('/signup/agency');

  const settings = (result.agency.settings as Record<string, unknown>) ?? {};
  const alertRules = (settings.alert_rules as Array<Record<string, unknown>>) || [];

  return <AlertsClient initialRules={alertRules} />;
}
