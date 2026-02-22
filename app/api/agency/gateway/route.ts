import { NextResponse } from 'next/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { provisionAgencyGateway } from '@/lib/ovh/provisioner';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/agency/gateway
 * Returns the agency's own gateway URL and status.
 */
export async function GET() {
  const auth = await requireAgencyMember();
  if (auth.error) return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });

  const { agency } = auth.data;
  const supabase = await createClient();

  const { data } = await supabase
    .from('agencies')
    .select('gateway_url, gateway_token, gateway_status, gateway_error, gateway_provisioned_at')
    .eq('id', agency.id)
    .single();

  return NextResponse.json({
    gatewayUrl: data?.gateway_url ?? null,
    gatewayToken: data?.gateway_token ?? null,
    status: data?.gateway_status ?? 'not_provisioned',
    error: data?.gateway_error ?? null,
    provisionedAt: data?.gateway_provisioned_at ?? null,
  });
}

/**
 * POST /api/agency/gateway
 * Provision the agency's own OpenClaw gateway container.
 * Idempotent — safe to call multiple times.
 */
export async function POST() {
  const auth = await requireAgencyMember();
  if (auth.error) return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });

  const { agency, user } = auth.data;

  const result = await provisionAgencyGateway(
    agency.id,
    agency.name,
    user?.email
  );

  if (result.success) {
    return NextResponse.json({ ok: true, gatewayUrl: result.gatewayUrl, gatewayToken: result.authToken });
  }
  return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
}
