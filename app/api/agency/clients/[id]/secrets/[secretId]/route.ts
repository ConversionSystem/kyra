import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { deleteSecret, updateSecret } from '@/lib/secrets';
import { syncAllSecretsForClient } from '@/lib/secrets/sync';

interface RouteContext {
  params: Promise<{ id: string; secretId: string }>;
}

function toMetadataResponse(secret: {
  id: string;
  key_name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}) {
  return {
    ...secret,
    value: '••••••••••••',
  };
}

function mapSecretError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Unexpected error';

  if (message.includes('Client not found')) return { status: 404, message };
  if (message.includes('Secret not found')) return { status: 404, message };
  if (message.includes('Secret value') || message.includes('No updates provided')) {
    return { status: 400, message };
  }

  return { status: 500, message: 'Failed to process secret request' };
}

/**
 * PUT /api/agency/clients/[id]/secrets/[secretId]
 * Body: { value?, description? }
 */
export async function PUT(request: NextRequest, { params }: RouteContext) {
  const { id: clientId, secretId } = await params;

  const auth = await requireAgencyMember();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  let body: { value?: string; description?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof body.value === 'undefined' && typeof body.description === 'undefined') {
    return NextResponse.json({ error: 'Provide value and/or description to update' }, { status: 400 });
  }

  try {
    const updated = await updateSecret(
      auth.data.agency.id,
      clientId,
      secretId,
      body.value,
      body.description
    );

    // Fire-and-forget: sync all secrets to the client's container
    syncAllSecretsForClient(clientId).catch(() => {});

    return NextResponse.json({
      secret: toMetadataResponse(updated),
    });
  } catch (error) {
    const mapped = mapSecretError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
}

/**
 * DELETE /api/agency/clients/[id]/secrets/[secretId]
 * Confirmation required via query (?confirm=true) or body ({ confirm: true }).
 */
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const { id: clientId, secretId } = await params;

  const auth = await requireAgencyMember();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  let confirmed = request.nextUrl.searchParams.get('confirm') === 'true';

  if (!confirmed) {
    try {
      const body = (await request.json()) as { confirm?: boolean };
      confirmed = body.confirm === true;
    } catch {
      // No JSON body provided — keep current confirmed value.
    }
  }

  if (!confirmed) {
    return NextResponse.json(
      { error: 'Delete confirmation required. Pass confirm=true.' },
      { status: 400 }
    );
  }

  try {
    const deleted = await deleteSecret(auth.data.agency.id, clientId, secretId);
    if (!deleted) {
      return NextResponse.json({ error: 'Secret not found' }, { status: 404 });
    }

    // Fire-and-forget: sync all secrets to the client's container
    syncAllSecretsForClient(clientId).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (error) {
    const mapped = mapSecretError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
}
