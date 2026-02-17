import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser } from '@/lib/agency/queries';
import { AgencySidebar } from './agency-sidebar';

export default async function AgencyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const result = await getAgencyForUser(user.id);
  if (!result) redirect('/chat');

  const { agency, role } = result;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AgencySidebar agencyName={agency.name} plan={agency.plan} />
      <main className="flex-1 min-h-screen overflow-y-auto bg-gray-50">
        {children}
      </main>
    </div>
  );
}
