import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { provisionClientGateway, destroyClientGateway } from '@/lib/ovh/provisioner';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/agency/clients/[id]/reprovision
 *
 * "Redeploy AI" — idempotent fresh deploy of the client's AI worker container.
 *
 * Flow (always safe to call, regardless of current state):
 *   1. Destroy any existing container for this clientId. Data directory
 *      (SOUL.md, knowledge, memory, conversation history at
 *      /opt/kyra/data/clients/<id>/) is preserved on the VPS — only the
 *      Docker container is removed.
 *   2. Fresh `POST /containers` — rebuilds the container with current SOUL,
 *      knowledge, and API keys. Because the data dir survives, the AI retains
 *      its memory across redeploys.
 *
 * Previously this route called `provisionClientGateway` directly, which
 * returned 409 "Container already exists" if the container had been created
 * at any point — leaving the user in a dead-end loop (the error told them
 * to click Redeploy, which they were already clicking).
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

  // Step 1 — destroy any existing container. The provisioner's DELETE handler
  // is 404-tolerant (returns 200 if container doesn't exist), so this is a
  // safe no-op on first-time deploys. We swallow errors here rather than
  // abort because the most common failure mode ("container already gone") is
  // exactly what we want anyway.
  const destroy = await destroyClientGateway(client.id);
  if (!destroy.success) {
    // Only block if the destroy failed for a reason other than 404. The
    // provisioner returns 500 when Docker itself is unreachable — that WILL
    // block create too, so fail fast with a clear message.
    const msg = destroy.error ?? '';
    const looksLikeNotFound = /not found|404/i.test(msg);
    if (!looksLikeNotFound) {
      console.warn(`[reprovision] destroy failed (non-404): ${msg}`);
      return NextResponse.json(
        { ok: false, error: `Could not clear the existing container: ${msg}. Please contact support.` },
        { status: 502 },
      );
    }
  }

  // Brief pause so Docker fully releases the container name before we try
  // to create a fresh one with the same name.
  await new Promise((r) => setTimeout(r, 500));

  // Step 2 — create fresh container. Data dir is preserved, so memory +
  // knowledge + conversation history survive the redeploy.
  const result = await provisionClientGateway(client.id, agency.id, { soulMd, userMd }, {}, client.name);

  if (result.success) {
    return NextResponse.json({ ok: true, gatewayUrl: result.gatewayUrl });
  } else {
    return NextResponse.json(
      { ok: false, error: result.error || 'Provisioning failed' },
      { status: 500 },
    );
  }
}
