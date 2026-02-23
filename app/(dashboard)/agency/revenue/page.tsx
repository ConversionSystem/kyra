import { redirect } from 'next/navigation';
import { TrendingUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser, getAgencyClients } from '@/lib/agency/queries';
import RevenueCalculator, { ActualMrrCard } from './revenue-calculator';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Revenue — Kyra' };

export default async function RevenuePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const result = await getAgencyForUser(user.id);
  if (!result) redirect('/signup/agency');

  const clients = await getAgencyClients(result.agency.id);

  // Build client rate list from settings.monthly_rate
  const clientRates = clients.map((c) => ({
    id: c.id,
    name: c.name,
    status: c.status,
    monthlyRate: ((c.settings as Record<string, unknown>)?.monthly_rate as number) ?? 0,
  }));

  const activeClientCount = clients.filter((c) => c.status === 'active').length;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="h-5 w-5 text-green-500" />
          <h1 className="text-2xl font-bold text-gray-900">Revenue</h1>
        </div>
        <p className="text-sm text-gray-500">
          Track your actual MRR from client subscriptions, and model future growth.
        </p>
      </div>

      {/* Actual MRR card — real data from client settings */}
      <ActualMrrCard clients={clientRates} />

      {/* Hypothetical calculator — pre-filled with real client count */}
      <RevenueCalculator realClientCount={activeClientCount} />
    </div>
  );
}
