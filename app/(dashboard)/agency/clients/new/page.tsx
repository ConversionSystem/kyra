import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser, getAgencyTemplates } from '@/lib/agency/queries';
import { NewClientForm } from './new-client-form';

export default async function NewClientPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const result = await getAgencyForUser(user.id);
  if (!result) redirect('/signup/agency');

  const templates = await getAgencyTemplates(result.agency.id);
  const { template: preselectedTemplateId } = await searchParams;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">New Client</h1>
        <p className="text-sm text-gray-500 mt-1">
          Set up a new AI client for your agency
        </p>
      </div>
      <NewClientForm
        agencyId={result.agency.id}
        templates={templates}
        defaultTemplateId={preselectedTemplateId}
      />
    </div>
  );
}
