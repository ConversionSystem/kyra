import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import {
  createSecret,
  listSecrets,
  SECRET_KEY_NAME_REGEX,
} from '@/lib/secrets';
import { syncAllSecretsForClient } from '@/lib/secrets/sync';

interface RouteContext {
  params: Promise<{ id: string }>;
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
  if (message.includes('Invalid key_name') || message.includes('Secret value')) {
    return { status: 400, message };
  }
  if (message.includes('already exists')) return { status: 409, message };

  return { status: 500, message: 'Failed to process secret request' };
}

/**
 * GET /api/agency/clients/[id]/secrets
 * Returns metadata only (never decrypted values).
 */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id: clientId } = await params;

  const auth = await requireAgencyMember();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  try {
    const secrets = await listSecrets(auth.data.agency.id, clientId);
    return NextResponse.json({
      secrets: secrets.map(toMetadataResponse),
    });
  } catch (error) {
    const mapped = mapSecretError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
}

/**
 * POST /api/agency/clients/[id]/secrets
 * Body: { key_name, value, description? }
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id: clientId } = await params;

  const auth = await requireAgencyMember();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  let body: { key_name?: string; value?: string; description?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const keyName = body.key_name?.trim().toUpperCase() ?? '';
  const value = body.value;

  if (!keyName || !SECRET_KEY_NAME_REGEX.test(keyName)) {
    return NextResponse.json(
      { error: 'Invalid key_name. Use uppercase letters, numbers, and underscores only.' },
      { status: 400 }
    );
  }

  if (!value || value.trim().length === 0) {
    return NextResponse.json({ error: 'value is required' }, { status: 400 });
  }

  try {
    const created = await createSecret(
      auth.data.agency.id,
      clientId,
      keyName,
      value,
      body.description
    );

    // Fire-and-forget: sync all secrets to the client's container
    syncAllSecretsForClient(clientId).catch(() => {});

    return NextResponse.json(
      {
        secret: toMetadataResponse(created),
      },
      { status: 201 }
    );
  } catch (error) {
    const mapped = mapSecretError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
}
