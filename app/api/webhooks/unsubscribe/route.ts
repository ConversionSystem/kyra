import { NextRequest, NextResponse } from 'next/server';
import { unsubscribeContact } from '@/lib/email/marketing';

/**
 * POST /api/webhooks/unsubscribe
 * Public endpoint — processes unsubscribe requests from email links.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { agency_id, email } = body;

  if (!agency_id || !email) {
    return NextResponse.json({ error: 'Missing agency_id or email' }, { status: 400 });
  }

  const result = await unsubscribeContact(agency_id, email, 'link');
  return NextResponse.json(result);
}
