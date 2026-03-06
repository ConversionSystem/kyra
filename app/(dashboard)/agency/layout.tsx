import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser } from '@/lib/agency/queries';
import { AgencySidebar } from './agency-sidebar';
import { VoiceCommandButton } from '@/components/agency/VoiceCommandButton';
import { GuidedTour } from '@/components/onboarding/guided-tour';

export default async function AgencyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const result = await getAgencyForUser(user.id);
  if (!result) redirect('/signup/agency');

  const { agency, role } = result;
  const isMaster = ['hello@conversionsystem.com', 'angel@conversionsystem.com'].includes(user.email ?? '');

  return (
    <div className="min-h-screen bg-gray-50 lg:flex">
      <AgencySidebar agencyName={agency.name} plan={agency.plan} settings={agency.settings} isMaster={isMaster} />
      <main className="flex-1 min-h-screen overflow-y-auto overflow-x-hidden bg-gray-50 pt-14 lg:pt-0">
        {children}
      </main>
      <VoiceCommandButton />
      <GuidedTour autoStart />
    </div>
  );
}
