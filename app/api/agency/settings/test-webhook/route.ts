// POST /api/agency/settings/test-webhook
// Sends a test escalation payload to the configured webhook URL.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const sb = await createClient();
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { url } = await req.json();
  if (!url || typeof url !== 'string' || !url.startsWith('http')) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  const payload = {
    text: '🔔 *[Test Escalation]* Kyra webhook is configured correctly!',
    attachments: [
      {
        color: '#4f46e5',
        fields: [
          { title: 'Customer', value: 'Test Customer', short: true },
          { title: 'Client', value: 'Demo Client', short: true },
          { title: 'Channel', value: 'SMS', short: true },
          { title: 'Status', value: '✅ Webhook working', short: true },
          { title: 'Message', value: 'This is a test escalation from your Kyra dashboard. Your webhook is configured correctly!' },
        ],
        footer: 'Kyra AI · kyra.conversionsystem.com',
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return NextResponse.json({ error: `Webhook returned ${res.status}: ${body.slice(0, 200)}` }, { status: 422 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Request failed';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
