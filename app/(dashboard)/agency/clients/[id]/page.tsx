import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser, getAgencyClient } from '@/lib/agency/queries';
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

  const client = await getAgencyClient(id);
  if (!client || client.agency_id !== result.agency.id) notFound();

  return <ClientDetailView client={client} role={result.role} />;
}
