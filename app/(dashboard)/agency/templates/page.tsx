import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser, getAgencyTemplates } from '@/lib/agency/queries';
import { TemplatesPageContent } from './templates-page-content';

export default async function AgencyTemplatesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const result = await getAgencyForUser(user.id);
  if (!result) redirect('/signup/agency');

  const templates = await getAgencyTemplates(result.agency.id);

  return <TemplatesPageContent templates={templates} />;
}
