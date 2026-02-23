import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser } from '@/lib/agency/queries';
import { LeadsPipelineClient } from './leads-client';

export const metadata = { title: 'Sales Pipeline — Kyra' };
export const dynamic = 'force-dynamic';

const MASTER_EMAILS = ['hello@conversionsystem.com', 'angel@conversionsystem.com'];

export default async function LeadsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  if (!MASTER_EMAILS.includes(user.email ?? '')) redirect('/agency');

  const result = await getAgencyForUser(user.id);
  if (!result) redirect('/signup/agency');

  // Load pipeline state from agency settings JSONB
  const settings = (result.agency.settings as Record<string, unknown>) ?? {};
  const pipelineState = (settings.sales_pipeline as Record<string, string>) ?? {};

  return <LeadsPipelineClient initialPipelineState={pipelineState} />;
}
