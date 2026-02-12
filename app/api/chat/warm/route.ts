/**
 * Pre-warm the Kyra worker container.
 * Fires a request to the worker's user status endpoint (which triggers sandbox init)
 * and returns immediately without waiting for the response.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const WORKER_URL = process.env.KYRA_WORKER_URL;
const API_SECRET = process.env.KYRA_API_SECRET;

export async function POST(request: NextRequest) {
  if (!WORKER_URL || !API_SECRET) {
    return NextResponse.json({ status: 'not_configured' }, { status: 200 });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ status: 'unauthorized' }, { status: 401 });
    }

    // Fire-and-forget: warm the container by hitting user status endpoint
    // This goes through the kyra auth middleware which initializes the sandbox
    fetch(`${WORKER_URL}/api/kyra/user/${user.id}/status`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${API_SECRET}`,
        'X-Kyra-User-Id': user.id,
      },
    }).catch(() => {
      // Ignore errors — this is best-effort warming
    });

    return NextResponse.json({ status: 'warming' });
  } catch {
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}
