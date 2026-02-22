import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser } from '@/lib/agency/queries';
import PitchGeneratorClient from './pitch-generator-client';

export const metadata = { title: 'Pitch Generator — Kyra' };

export default async function PitchGeneratorPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const result = await getAgencyForUser(user.id);
  if (!result) redirect('/signup/agency');

  return <PitchGeneratorClient agencyId={result.agency.id} agencyName={result.agency.name} />;
}
