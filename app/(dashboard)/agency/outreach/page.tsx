import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import OutreachClient from './outreach-client';

const MASTER_EMAILS = ['hello@conversionsystem.com', 'angel@conversionsystem.com'];

export default async function OutreachPage() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user || !MASTER_EMAILS.includes(user.email ?? '')) redirect('/agency');
  return <OutreachClient />;
}
