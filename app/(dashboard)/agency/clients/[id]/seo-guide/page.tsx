import { notFound } from 'next/navigation';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { createClient } from '@/lib/supabase/server';
import { SEOGuidePrint } from './seo-guide-print';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SEOGuidePage({ params }: PageProps) {
  const { id } = await params;

  const authResult = await requireAgencyMember();
  if (authResult.error) notFound();

  const { agency } = authResult.data;
  const supabase = await createClient();

  const { data: client } = await supabase
    .from('agency_clients')
    .select('id, name, settings')
    .eq('id', id)
    .eq('agency_id', agency.id)
    .single();

  if (!client) notFound();

  const settings = (client.settings as Record<string, unknown>) ?? {};
  // Allow any client with SEO setup (not just vet-seo-worker)
  const seoData = settings.seo_data || settings.premium_template_setup;
  if (!seoData && settings.premium_template !== 'vet-seo-worker') notFound();

  const setup = (settings.premium_template_setup as Record<string, unknown>) ?? {};

  // Agency branding
  const agencyName = (agency.name as string) || 'Your Agency';
  const agencyEmail = (agency.settings as Record<string, unknown>)?.support_email as string | undefined;

  return <SEOGuidePrint clientName={client.name} setup={setup} agencyName={agencyName} agencyEmail={agencyEmail} />;
}
