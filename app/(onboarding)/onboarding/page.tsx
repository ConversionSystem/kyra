import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser } from '@/lib/agency/queries';
import { OnboardingWizard } from './onboarding-wizard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Welcome to Kyra' };

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const result = await getAgencyForUser(user.id);
  if (!result) redirect('/signup/agency');

  const { agency } = result;
  const settings = (agency.settings ?? {}) as Record<string, unknown>;

  // Already completed onboarding → go straight to dashboard
  if (settings.onboarding_complete) redirect('/agency');

  return (
    <OnboardingWizard
      agencyId={agency.id}
      agencyName={agency.name}
      plan={agency.plan}
    />
  );
}
