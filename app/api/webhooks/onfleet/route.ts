import { NextRequest, NextResponse } from 'next/server';

/**
 * Legacy Onfleet Webhook Handler (query-string clientId)
 *
 * Redirects to the new path-based route: /api/webhooks/onfleet/{clientId}
 * Kept for backward compatibility with any manually registered webhooks.
 *
 * Also handles OnFleet validation directly for the legacy URL format,
 * since OnFleet may append ?check= using & (correct) or ? (breaks if
 * clientId is also a query param).
 */

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const check = searchParams.get('check');

  // OnFleet validation — echo check value as plain text
  if (check) {
    return new NextResponse(check, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  return NextResponse.json({ status: 'ok', service: 'kyra-dispatch' });
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get('clientId');

  if (!clientId) {
    return NextResponse.json({ error: 'Missing clientId parameter' }, { status: 400 });
  }

  // Forward to the path-based handler
  const origin = new URL(req.url).origin;
  const newUrl = `${origin}/api/webhooks/onfleet/${clientId}`;

  const body = await req.text();
  const forwarded = await fetch(newUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  const data = await forwarded.json();
  return NextResponse.json(data, { status: forwarded.status });
}
