import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser } from '@/lib/agency/queries';
import ConversationsClient from './conversations-client';

export default async function ConversationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const result = await getAgencyForUser(user.id);
  if (!result) redirect('/signup/agency');

  // Fetch clients for filter dropdown
  const { data: clients } = await supabase
    .from('agency_clients')
    .select('id, name')
    .eq('agency_id', result.agency.id)
    .in('status', ['active', 'setup'])
    .order('name');

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Conversations</h1>
        <p className="text-sm text-gray-500 mt-1">
          All AI conversations across your clients — live from GHL
        </p>
      </div>

      <ConversationsClient clients={clients || []} />
    </div>
  );
}
