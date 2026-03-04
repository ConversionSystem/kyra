import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser, getAgencyTemplates } from '@/lib/agency/queries';
import { AISetupClient } from './ai-setup-client';

export const dynamic = 'force-dynamic';

export default async function AISetupPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const result = await getAgencyForUser(user.id);
  if (!result) redirect('/signup/agency');

  let templates: Awaited<ReturnType<typeof getAgencyTemplates>> = [];
  try {
    templates = await getAgencyTemplates(result.agency.id);
  } catch {
    // templates table may not exist yet
  }

  return (
    <AISetupClient
      agencyId={result.agency.id}
      businessName={result.agency.name}
      dbTemplates={templates}
    />
  );
}
