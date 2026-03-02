import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getAgencyForUser, getAgencyTemplates } from '@/lib/agency/queries';
import { NewClientForm } from './new-client-form';
import { getPlanClientLimit } from '@/lib/billing/plans';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Zap } from 'lucide-react';

export default async function NewClientPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string; role?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const result = await getAgencyForUser(user.id);
  if (!result) redirect('/signup/agency');

  // Solo users don't manage clients
  const settings = (result.agency.settings as Record<string, unknown>) ?? {};
  if (settings.account_type === 'solo') redirect('/agency');

  const plan = result.agency.plan || 'free';
  const clientLimit = getPlanClientLimit(plan);

  // Count existing clients
  const serviceClient = await createServiceClient();
  const { count: clientCount } = await serviceClient
    .from('agency_clients')
    .select('*', { count: 'exact', head: true })
    .eq('agency_id', result.agency.id);

  const atLimit = (clientCount ?? 0) >= clientLimit;

  const templates = await getAgencyTemplates(result.agency.id);
  const { template: preselectedTemplateId, role: preselectedRole } = await searchParams;

  // Hard gate — if at limit, redirect to plans
  if (atLimit) {
    return (
      <div className="p-4 sm:p-6 md:p-8 max-w-2xl">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-8 text-center">
          <Zap className="h-10 w-10 text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Plan limit reached</h1>
          <p className="text-sm text-gray-600 mb-1">
            Your <strong className="capitalize">{plan}</strong> plan allows up to{' '}
            <strong>{clientLimit} client{clientLimit === 1 ? '' : 's'}</strong>.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            You currently have {clientCount} client{(clientCount ?? 0) !== 1 ? 's' : ''}. Upgrade to add more.
          </p>
          <div className="flex gap-3 justify-center">
            <Button asChild>
              <Link href="/agency/plans">
                <ArrowRight className="h-4 w-4 mr-2" />
                Upgrade Plan
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/agency/clients">← Back to Clients</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">New Client</h1>
        <p className="text-sm text-gray-500 mt-1">
          Set up a new AI client for your agency
          {' '}·{' '}
          <span className="text-indigo-600 font-medium">
            {(clientCount ?? 0)} / {clientLimit} slots used
          </span>
        </p>
      </div>
      <NewClientForm
        agencyId={result.agency.id}
        templates={templates}
        defaultTemplateId={preselectedTemplateId}
        defaultRole={preselectedRole}
      />
    </div>
  );
}
