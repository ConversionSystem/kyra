import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSecret, SECRET_KEY_NAME_REGEX } from '@/lib/secrets';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 10;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function parseBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

function safeTokenEqual(expected: string, provided: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  if (expectedBuffer.length !== providedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, providedBuffer);
}

function checkRateLimit(clientId: string) {
  const now = Date.now();
  const existing = rateLimitMap.get(clientId);

  if (!existing || now > existing.resetAt) {
    rateLimitMap.set(clientId, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (existing.count >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return { allowed: false, retryAfterSeconds };
  }

  existing.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * Runtime API for AI agents to fetch decrypted secrets.
 * GET /api/secrets/[key]?clientId=...
 * Auth: Bearer <client OpenClaw auth token>
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  const clientId = request.nextUrl.searchParams.get('clientId');

  if (!clientId) {
    return NextResponse.json({ error: 'clientId query parameter is required' }, { status: 400 });
  }

  const normalizedKey = decodeURIComponent(key).trim().toUpperCase();
  if (!SECRET_KEY_NAME_REGEX.test(normalizedKey)) {
    return NextResponse.json(
      { error: 'Invalid secret key format' },
      { status: 400 }
    );
  }

  const bearerToken = parseBearerToken(request);
  if (!bearerToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClientWithoutCookies();
  const { data: client, error: clientError } = await supabase
    .from('agency_clients')
    .select('id, agency_id, gateway_token, container_config')
    .eq('id', clientId)
    .maybeSingle();

  if (clientError) {
    return NextResponse.json({ error: 'Failed to validate client' }, { status: 500 });
  }

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  // OpenClaw container auth token (persisted as gateway_token in Kyra DB).
  const config = (client.container_config ?? {}) as Record<string, unknown>;
  const expectedToken =
    (client.gateway_token as string | null) ||
    (config.authToken as string | undefined) ||
    ((config.meta as Record<string, unknown> | undefined)?.authToken as string | undefined) ||
    null;

  if (!expectedToken || !safeTokenEqual(expectedToken, bearerToken)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limit = checkRateLimit(clientId);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded (max 10 requests per minute per client)' },
      {
        status: 429,
        headers: {
          'Retry-After': String(limit.retryAfterSeconds),
        },
      }
    );
  }

  try {
    const value = await getSecret(client.agency_id as string, clientId, normalizedKey);

    if (value === null) {
      return NextResponse.json({ error: 'Secret not found' }, { status: 404 });
    }

    return NextResponse.json({
      key: normalizedKey,
      value,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve secret';

    if (message.includes('Client not found')) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Failed to retrieve secret' }, { status: 500 });
  }
}
