import { Suspense } from 'react';
import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser, getAgencyClient } from '@/lib/agency/queries';
import { sanitizeClientForBrowser } from '@/lib/agency/sensitive-keys';
import { ClientDetailView } from './client-detail-view';

interface ClientDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const result = await getAgencyForUser(user.id);
  if (!result) redirect('/signup/agency');

  // Solo users now use the same client detail view

  const client = await getAgencyClient(id);
  if (!client || client.agency_id !== result.agency.id) notFound();

  // Strip plaintext credentials before crossing the server/client boundary.
  // The full row (with real secrets) already lives in Supabase; server-side
  // handlers refetch when they need them. The UI only ever needs booleans
  // (is-a-value-saved?) and non-sensitive fields.
  const safeClient = sanitizeClientForBrowser(client);

  return (
    <Suspense fallback={<div className="p-4 sm:p-6 lg:p-8 text-gray-400">Loading...</div>}>
      <ClientDetailView client={safeClient} role={result.role} plan={result.agency.plan} accountType={(result.agency.settings as Record<string, unknown>)?.account_type as string | undefined} />
    </Suspense>
  );
}
