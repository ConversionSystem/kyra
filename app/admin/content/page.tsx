import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ContentCalendarClient from './content-client';

const ADMIN_EMAILS = [
  'hello@conversionsystem.com',
  'angel@conversionsystem.com',
  'steve@conversionsystem.com',
  'webblex10@gmail.com',
];

export const metadata = { title: 'Content Calendar — Kyra' };
export const dynamic = 'force-dynamic';

export default async function ContentCalendarPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !ADMIN_EMAILS.includes(user.email || '')) redirect('/agency');
  return <ContentCalendarClient />;
}
