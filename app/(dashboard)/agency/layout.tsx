import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser } from '@/lib/agency/queries';
import { AgencySidebar } from './agency-sidebar';
// VoiceCommandButton removed — not functional, just UI noise
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

  // Block dashboard access for unpaid agency accounts.
  // Solo accounts (account_type === 'solo') are exempt — they have a free tier.
  // Master emails are exempt.
  const accountType = (agency.settings as Record<string, unknown>)?.account_type as string | undefined;
  const isSolo = accountType === 'solo';
  // Free plan is now a valid agency plan — no redirect needed

  return (
    <div className="min-h-screen bg-gray-50 lg:flex">
      <AgencySidebar agencyName={agency.name} plan={agency.plan} settings={agency.settings} isMaster={isMaster} />
      <main className="flex-1 min-h-screen overflow-y-auto overflow-x-hidden bg-gray-50 pt-14 lg:pt-0">
        {children}
      </main>
      <GuidedTour autoStart />
    </div>
  );
}
