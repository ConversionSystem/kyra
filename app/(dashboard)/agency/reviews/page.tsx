import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser } from '@/lib/agency/queries';
import { ReviewsClient } from './reviews-client';

export default async function ReviewsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const result = await getAgencyForUser(user.id);
  if (!result) redirect('/signup/agency');

  const { data: clients } = await supabase
    .from('agency_clients')
    .select('id, name')
    .eq('agency_id', result.agency.id)
    .limit(1);

  const client = clients?.[0] ?? null;
  const settings = (result.agency.settings ?? {}) as Record<string, unknown>;
  const reviewSettings = (settings.reviews ?? {}) as Record<string, unknown>;
  const isSolo = settings.account_type === 'solo';

  return (
    <ReviewsClient
      agencyId={result.agency.id}
      clientId={client?.id ?? null}
      businessName={result.agency.name}
      reviewConfig={reviewSettings}
      isSolo={isSolo}
    />
  );
}
