import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_NOTIFY_CHAT_ID = process.env.TELEGRAM_NOTIFY_CHAT_ID; // Angel's personal chat ID

async function sendTelegramNotification(name: string, email: string, workerTypes: string[], budget: string | null) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_NOTIFY_CHAT_ID) return;

  const workers = workerTypes.length > 0 ? workerTypes.join(', ') : 'Not specified';
  const budgetText = budget || 'Not specified';

  const message = `🤖 New Build Request!\n\n👤 ${name}\n📧 ${email}\n🛠️ ${workers}\n💰 ${budgetText}\n\n→ kyra.conversionsystem.com/agency/build-requests`;

  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_NOTIFY_CHAT_ID,
        text: message,
        parse_mode: 'HTML',
      }),
    });
  } catch {
    // Don't block submission if notification fails
  }
}

async function sendEmailNotification(name: string, email: string, workerTypes: string[], budget: string | null, description: string | null) {
  // Future: integrate with email service
  // For now, Telegram handles notifications
  void name; void email; void workerTypes; void budget; void description;
}

export async function POST(request: NextRequest) {
  let body: {
    name?: string;
    email?: string;
    business_url?: string;
    worker_types?: string[];
    description?: string;
    budget_range?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { name, email, business_url, worker_types, description, budget_range } = body;

  if (!name || !email) {
    return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
  }

  // Basic email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
  }

  const supabase = createServiceClientWithoutCookies();

  const { data, error } = await supabase
    .from('build_requests')
    .insert({
      name,
      email,
      business_url: business_url || null,
      worker_types: worker_types || [],
      description: description || null,
      budget_range: budget_range || null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[build-request] Insert failed:', error);
    return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 });
  }

  // Send notifications (non-blocking)
  await Promise.allSettled([
    sendTelegramNotification(name, email, worker_types || [], budget_range || null),
    sendEmailNotification(name, email, worker_types || [], budget_range || null, description || null),
  ]);

  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
}
