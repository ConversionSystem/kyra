// /invite/[code] — Public invite landing page
// Looks up the inviting agency, increments click count, redirects to signup.

import { redirect } from 'next/navigation';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ code: string }> };

export default async function InvitePage({ params }: Props) {
  const { code } = await params;

  if (!code || code.length < 4) redirect('/signup/agency');

  const db = createServiceClientWithoutCookies();

  // Look up agency by invite code (stored in settings JSONB)
  const { data: agencies } = await db
    .from('agencies')
    .select('id, name, settings')
    .filter('settings->>invite_code', 'eq', code)
    .limit(1);

  const agency = agencies?.[0];

  if (!agency) {
    // Invalid code — send to plain signup
    redirect('/signup/agency');
  }

  // Increment click counter
  const settings = (agency.settings ?? {}) as Record<string, unknown>;
  const clicks = ((settings.invite_clicks as number) ?? 0) + 1;
  await db
    .from('agencies')
    .update({ settings: { ...settings, invite_clicks: clicks } })
    .eq('id', agency.id);

  // Redirect to signup with referral context (7-day trial, friend credit bonus)
  const signupUrl = `/signup/agency?ref=${encodeURIComponent(agency.id)}&from=${encodeURIComponent(agency.name)}&trial=7&bonus=100`;
  redirect(signupUrl);
}
