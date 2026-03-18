import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { sendEmailViaResend } from '@/lib/email/sender';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_NOTIFY_CHAT_ID = process.env.TELEGRAM_NOTIFY_CHAT_ID; // Angel's personal chat ID

const WORKER_LABELS: Record<string, string> = {
  'lead-generation': 'Lead Generation',
  'b2b-outreach': 'B2B Outreach',
  'appointment-booking': 'Appointment Booking',
  'sales-assistant': 'Sales Assistant',
  'geo-optimization': 'GEO Optimization',
  'social-media': 'Social Media Manager',
  'comment-marketing': 'Comment Marketing',
  'email-marketing': 'Email Strategist',
  'content-writer': 'Content Writer',
  'ad-manager': 'Ad Campaign Manager',
  'customer-support': 'Customer Support',
  'review-manager': 'Review & Reputation Manager',
  'ecommerce-optimizer': 'E-Commerce Optimizer',
  'inventory-ops': 'Inventory & Operations',
  'analytics-reporter': 'Analytics & Reporting',
  'research-analyst': 'Research Analyst',
  'workflow-automation': 'Workflow Automation',
  'data-security': 'Data & Compliance Monitor',
};

async function sendTelegramNotification(name: string, email: string, workerTypes: string[], budget: string | null) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_NOTIFY_CHAT_ID) return;

  const workerLabels = workerTypes.length > 0
    ? workerTypes.map(w => WORKER_LABELS[w] || w).join(', ')
    : 'Not specified';
  const budgetText = budget || 'Not specified';

  const message = `🤖 New Build Request!\n\n👤 ${name}\n📧 ${email}\n🛠️ ${workerLabels}\n💰 ${budgetText}\n\n→ kyra.conversionsystem.com/agency/build-requests`;

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

async function sendConfirmationEmail(
  name: string,
  email: string,
  workerTypes: string[],
  budget: string | null,
  businessUrl: string | null,
) {
  const firstName = name.split(' ')[0];
  const workerLabels = workerTypes.map(w => WORKER_LABELS[w] || w);

  const workerListHtml = workerLabels.length > 0
    ? workerLabels.map(label => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #1e293b;">
          <span style="display:inline-block;width:8px;height:8px;background:#10b981;border-radius:50%;margin-right:8px;vertical-align:middle;"></span>
          <span style="color:#e2e8f0;font-size:14px;">${label}</span>
        </td>
      </tr>`).join('')
    : `<tr><td style="padding:8px 12px;color:#94a3b8;font-size:14px;">No workers selected — we'll discuss what fits best</td></tr>`;

  const workerListText = workerLabels.length > 0
    ? workerLabels.map(l => `  • ${l}`).join('\n')
    : '  • To be determined in our consultation';

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:40px auto;padding:0 20px;">

    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-flex;align-items:center;gap:10px;margin-bottom:8px;">
        <div style="width:36px;height:36px;background:#4f46e5;border-radius:8px;display:flex;align-items:center;justify-content:center;">
          <span style="color:white;font-weight:900;font-size:18px;font-family:monospace;">K</span>
        </div>
        <span style="color:#e2e8f0;font-size:20px;font-weight:700;letter-spacing:-0.3px;">Kyra</span>
      </div>
    </div>

    <!-- Card -->
    <div style="background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155;">

      <!-- Top accent -->
      <div style="height:4px;background:linear-gradient(90deg,#4f46e5,#10b981);"></div>

      <!-- Body -->
      <div style="padding:32px;">
        <h1 style="margin:0 0 8px;color:#f1f5f9;font-size:22px;font-weight:700;">
          We've got your request, ${firstName}! 🤖
        </h1>
        <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;line-height:1.6;">
          Thanks for reaching out. We'll review your requirements and follow up
          within <strong style="color:#e2e8f0;">24 hours</strong> with a custom plan for your business.
        </p>

        <!-- What you requested -->
        <div style="background:#0f172a;border-radius:12px;overflow:hidden;margin-bottom:24px;">
          <div style="padding:12px 16px;border-bottom:1px solid #1e293b;">
            <span style="color:#64748b;font-size:11px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;">AI Workers Requested</span>
          </div>
          <table style="width:100%;border-collapse:collapse;">
            <tbody>
              ${workerListHtml}
            </tbody>
          </table>
        </div>

        ${budget ? `
        <div style="background:#0f172a;border-radius:12px;padding:12px 16px;margin-bottom:24px;display:flex;align-items:center;gap:10px;">
          <span style="color:#64748b;font-size:13px;">Budget range:</span>
          <span style="color:#10b981;font-weight:600;font-size:13px;">${budget}</span>
        </div>` : ''}

        <!-- What happens next -->
        <div style="border-left:2px solid #4f46e5;padding-left:16px;margin-bottom:28px;">
          <p style="margin:0 0 10px;color:#64748b;font-size:11px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;">What Happens Next</p>
          <p style="margin:0 0 6px;color:#cbd5e1;font-size:14px;">📞 <strong>Discovery call</strong> — We'll map out exactly what your AI workers will do</p>
          <p style="margin:0 0 6px;color:#cbd5e1;font-size:14px;">⚙️ <strong>Custom build</strong> — Tailored to your business, not a generic template</p>
          <p style="margin:0;color:#cbd5e1;font-size:14px;">🚀 <strong>Live in 1–2 weeks</strong> — Your workers start delivering results fast</p>
        </div>

        <!-- CTA -->
        <div style="text-align:center;">
          <a href="https://kyra.conversionsystem.com/solo"
             style="display:inline-block;background:#10b981;color:white;font-weight:700;font-size:14px;padding:12px 28px;border-radius:10px;text-decoration:none;letter-spacing:0.2px;">
            Start Free While You Wait →
          </a>
          <p style="margin:12px 0 0;color:#475569;font-size:12px;">
            No credit card required — try Kyra Solo free
          </p>
        </div>
      </div>

      <!-- Footer -->
      <div style="padding:20px 32px;border-top:1px solid #334155;background:#0f172a;text-align:center;">
        <p style="margin:0;color:#475569;font-size:12px;">
          Questions? Reply to this email or reach us at
          <a href="mailto:angel@conversionsystem.com" style="color:#6366f1;text-decoration:none;">angel@conversionsystem.com</a>
        </p>
        <p style="margin:8px 0 0;color:#334155;font-size:11px;">
          Conversion System · 30 N Gould St Ste R, Sheridan, WY 82801
        </p>
      </div>
    </div>

  </div>
</body>
</html>`;

  const text = `Hey ${firstName},

We've received your Kyra AI Worker build request!

AI Workers Requested:
${workerListText}
${budget ? `\nBudget Range: ${budget}\n` : ''}
What happens next:
  📞 Discovery call — We'll map out exactly what your AI workers will do
  ⚙️ Custom build — Tailored to your business, not a generic template
  🚀 Live in 1–2 weeks — Your workers start delivering results fast

We'll follow up within 24 hours.

In the meantime, you can start free at: https://kyra.conversionsystem.com/solo

Questions? Reply to this email or reach us at angel@conversionsystem.com

— Angel & the Kyra Team
Conversion System · 30 N Gould St Ste R, Sheridan, WY 82801`;

  void businessUrl; // captured in DB, not needed in email body

  await sendEmailViaResend({
    to: email,
    subject: `Your Kyra AI Worker request is confirmed, ${firstName} 🤖`,
    body: text,
    html,
    replyTo: 'angel@conversionsystem.com',
    fromName: 'Angel from Kyra',
  });
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
    sendConfirmationEmail(name, email, worker_types || [], budget_range || null, business_url || null),
  ]);

  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
}
