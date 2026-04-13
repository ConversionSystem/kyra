export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser } from '@/lib/agency/queries';
import { SeoPageClient } from './seo-page-client';

export default async function AgencySeoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const result = await getAgencyForUser(user.id);
  if (!result) redirect('/signup/agency');

  // Find the first site for this agency
  const { data: sites } = await supabase
    .from('sites')
    .select('id')
    .eq('agency_id', result.agency.id)
    .limit(1);

  const siteId = sites?.[0]?.id ?? null;

  return <SeoPageClient siteId={siteId} />;
}
