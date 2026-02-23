import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import EmailTemplates from './email-templates-client';

export default async function TemplatesPage() {
  const sb = await createClient();
  const { data: { session } } = await sb.auth.getSession();
  if (!session) redirect('/login');

  return <EmailTemplates />;
}
