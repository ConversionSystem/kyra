import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { provisionClientGateway } from '@/lib/ovh/provisioner';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/agency/clients/[id]/reprovision
 * Re-provision a client's AI gateway that failed or was never deployed.
 * Safe to call multiple times — provisioner checks for existing containers.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAgencyMember();
  if (auth.error) return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });

  const { agency } = auth.data;
  const { id: clientId } = await params;

  const supabase = await createClient();

  // Verify client belongs to this agency
  const { data: client, error: clientError } = await supabase
    .from('agency_clients')
    .select('id, name, agency_id, status, template_id, container_config, gateway_status')
    .eq('id', clientId)
    .eq('agency_id', agency.id)
    .single();

  if (clientError || !client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  // Build SOUL from container_config or defaults
  const containerConfig = (client.container_config || {}) as Record<string, unknown>;
  const soulMd = containerConfig.soul_template
    ? String(containerConfig.soul_template)
    : `You are an AI assistant for "${client.name}".\nBe helpful, professional, and concise.`;

  const userMd = `# ${client.name}\n\nClient of ${agency.name}.`;

  const result = await provisionClientGateway(client.id, agency.id, { soulMd, userMd });

  if (result.success) {
    return NextResponse.json({ ok: true, gatewayUrl: result.gatewayUrl });
  } else {
    return NextResponse.json({ ok: false, error: result.error || 'Provisioning failed' }, { status: 500 });
  }
}
