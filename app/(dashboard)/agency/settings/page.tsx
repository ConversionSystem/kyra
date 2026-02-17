import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser } from '@/lib/agency/queries';
import { SettingsForm } from './settings-form';
import type { Agency, AgencyMember, AgencyRole } from '@/lib/agency/types';

export default async function AgencySettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const result = await getAgencyForUser(user.id);
  if (!result) redirect('/chat');

  const { agency, role } = result;

  // Fetch members with user info
  const { data: membersRaw } = await supabase
    .from('agency_members')
    .select('*, user:user_id(id, email)')
    .eq('agency_id', agency.id)
    .order('created_at', { ascending: true });

  const members = (membersRaw ?? []).map((m: Record<string, unknown>) => ({
    id: m.id as string,
    agency_id: m.agency_id as string,
    user_id: m.user_id as string,
    role: m.role as AgencyRole,
    created_at: m.created_at as string,
    user: m.user as { email: string; id: string } | null,
  }));

  return (
    <div className="p-6 md:p-8 max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your agency configuration and team
        </p>
      </div>

      <SettingsForm
        agency={agency as Agency}
        currentRole={role as AgencyRole}
        members={members}
      />
    </div>
  );
}
