import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser } from '@/lib/agency/queries';
import { WebhookSettingsClient } from './webhook-settings-client';

export default async function WebhookSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const result = await getAgencyForUser(user.id);
  if (!result) redirect('/signup/agency');

  const settings = (result.agency.settings as Record<string, unknown>) ?? {};
  const webhookConfig = (settings.webhook_config as Array<Record<string, unknown>>) || [];

  return (
    <WebhookSettingsClient
      agencyId={result.agency.id}
      initialConfig={webhookConfig}
    />
  );
}
