// ============================================================================
// POST /api/admin/seed-templates
//
// Seeds system email templates into a client account using the actual HTML
// from Kyra's own email generation functions.
// Body: { clientId: string }
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { requireMaster } from '@/lib/auth/admin';
import { getNurtureEmail } from '@/lib/email/nurture-sequence';
import { buildWeeklyReportHtml } from '@/lib/email/weekly-report';

export const dynamic = 'force-dynamic';

const SAMPLE_EMAIL = 'owner@youragency.com';
const APP_URL = 'https://kyra.conversionsystem.com';

// ── Sample HTML generators ────────────────────────────────────────────────────

function getWelcomeHtml(): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:580px;margin:0 auto;padding:40px 24px;">
    <div style="margin-bottom:32px;">
      <div style="display:inline-flex;align-items:center;gap:10px;">
        <div style="width:32px;height:32px;background:#4f46e5;border-radius:8px;display:flex;align-items:center;justify-content:center;">
          <span style="color:white;font-weight:900;font-size:14px;">K</span>
        </div>
        <span style="color:white;font-weight:700;font-size:16px;">Kyra AI</span>
      </div>
    </div>
    <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);border-radius:16px;padding:32px;margin-bottom:24px;">
      <h1 style="color:white;font-size:24px;font-weight:900;margin:0 0 8px;">{{agency_name}} is live. 🎉</h1>
      <p style="color:#c7d2fe;font-size:15px;margin:0;line-height:1.6;">
        Your agency dashboard is ready. We've loaded <strong style="color:white;">50 welcome credits</strong> to get you started.
      </p>
    </div>
    <div style="background:#1e293b;border-radius:16px;padding:20px 24px;margin-bottom:24px;border:1px solid rgba(99,102,241,0.3);">
      <span style="font-size:28px;">🪙</span>
      <div style="margin-top:8px;">
        <p style="color:white;font-weight:700;font-size:14px;margin:0 0 4px;">50 welcome credits — already in your account</p>
        <p style="color:#94a3b8;font-size:13px;margin:0;line-height:1.5;">Add your own API key or top up credits when you're ready to scale.</p>
      </div>
    </div>
    <div style="text-align:center;margin-bottom:32px;">
      <a href="${APP_URL}/agency" style="display:inline-block;background:#4f46e5;color:white;font-weight:700;font-size:15px;text-decoration:none;padding:14px 32px;border-radius:12px;">
        Open Your Dashboard →
      </a>
    </div>
    <p style="color:#334155;font-size:12px;text-align:center;line-height:1.6;">
      Kyra AI by Conversion System · <a href="${APP_URL}" style="color:#475569;">kyra.conversionsystem.com</a>
    </p>
  </div>
</body>
</html>`;
}

function getUsageAlertHtml(): string {
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);color:white;padding:24px;border-radius:12px;margin-bottom:20px;">
    <h1 style="margin:0 0 4px 0;font-size:20px;">⚠️ Usage Alert</h1>
    <p style="margin:0;opacity:0.85;font-size:14px;">{{agency_name}}</p>
  </div>
  <p style="color:#374151;font-size:15px;">Hi {{first_name}},</p>
  <p style="color:#374151;font-size:14px;line-height:1.6;">
    Your Kyra workspace is approaching its monthly limits. Here's what needs attention:
  </p>
  <div style="margin:20px 0;padding:16px;background:#fef3c7;border-left:4px solid #f59e0b;border-radius:4px;">
    <p style="margin:0;font-size:14px;color:#92400e;font-weight:600;">AI Credits at 80%+ usage</p>
    <p style="margin:4px 0 0;font-size:13px;color:#78350f;">Top up to keep your AI workers running smoothly.</p>
  </div>
  <div style="margin-top:24px;text-align:center;">
    <a href="${APP_URL}/agency/credits" style="display:inline-block;background:#4f46e5;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Top Up Credits →</a>
    &nbsp;&nbsp;
    <a href="${APP_URL}/agency/settings/billing" style="display:inline-block;background:#f3f4f6;color:#374151;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Upgrade Plan →</a>
  </div>
  <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:24px;">
    Kyra AI — Your AI Workforce Platform<br/>
    <a href="${APP_URL}/agency/settings" style="color:#9ca3af;">Manage notification preferences</a>
  </p>
</div>`;
}

function getEscalationAlertHtml(): string {
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;">
  <div style="background:linear-gradient(135deg,#dc2626,#b91c1c);color:white;padding:20px 24px;border-radius:10px 10px 0 0;">
    <h2 style="margin:0;font-size:18px;font-weight:700;">🚨 Human takeover needed</h2>
    <p style="margin:4px 0 0;opacity:0.85;font-size:13px;">{{client_name}} · {{agency_name}}</p>
  </div>
  <div style="border:1px solid #fca5a5;border-top:none;padding:24px;border-radius:0 0 10px 10px;background:#fff;">
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px;">
      <tr>
        <td style="padding:8px 0;color:#6b7280;font-weight:600;width:120px;">Contact</td>
        <td style="padding:8px 0;color:#111827;font-weight:700;">{{contact_name}} · {{contact_phone}}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#6b7280;font-weight:600;">Reason</td>
        <td style="padding:8px 0;color:#374151;">{{escalation_reason}}</td>
      </tr>
    </table>
    <div style="background:#fef2f2;border-left:3px solid #ef4444;border-radius:4px;padding:12px 16px;margin-bottom:20px;">
      <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#7f1d1d;text-transform:uppercase;letter-spacing:0.5px;">Last message snippet</p>
      <p style="margin:0;font-size:14px;color:#374151;line-height:1.5;">{{conversation_summary}}</p>
    </div>
    <div style="text-align:center;margin-bottom:16px;">
      <a href="${APP_URL}/agency/conversations" style="display:inline-block;background:#4f46e5;color:white;text-decoration:none;font-weight:600;font-size:14px;padding:11px 24px;border-radius:8px;">Open Conversation →</a>
    </div>
    <p style="margin:0;color:#9ca3af;font-size:11px;text-align:center;">
      This contact has been tagged <em>needs-human</em> in GHL.<br/>Kyra AI — Your AI Workforce Platform
    </p>
  </div>
</div>`;
}

function getBuildRequestHtml(): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:40px auto;padding:0 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-flex;align-items:center;gap:10px;margin-bottom:8px;">
        <div style="width:36px;height:36px;background:#4f46e5;border-radius:8px;display:flex;align-items:center;justify-content:center;">
          <span style="color:white;font-weight:900;font-size:18px;font-family:monospace;">K</span>
        </div>
        <span style="color:#e2e8f0;font-size:20px;font-weight:700;letter-spacing:-0.3px;">Kyra</span>
      </div>
    </div>
    <div style="background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155;">
      <div style="height:4px;background:linear-gradient(90deg,#4f46e5,#10b981);"></div>
      <div style="padding:32px;">
        <h1 style="margin:0 0 8px;color:#f1f5f9;font-size:22px;font-weight:700;">We've got your request, {{first_name}}! 🤖</h1>
        <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;line-height:1.6;">
          Thanks for reaching out. We'll review your requirements and follow up within <strong style="color:#e2e8f0;">24 hours</strong>.
        </p>
        <div style="border-left:2px solid #4f46e5;padding-left:16px;margin-bottom:28px;">
          <p style="margin:0 0 10px;color:#64748b;font-size:11px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;">What Happens Next</p>
          <p style="margin:0 0 6px;color:#cbd5e1;font-size:14px;">📞 <strong>Discovery call</strong> — We'll map out exactly what your AI workers will do</p>
          <p style="margin:0 0 6px;color:#cbd5e1;font-size:14px;">⚙️ <strong>Custom build</strong> — Tailored to your business, not a generic template</p>
          <p style="margin:0;color:#cbd5e1;font-size:14px;">🚀 <strong>Live in 1–2 weeks</strong> — Your workers start delivering results fast</p>
        </div>
        <div style="text-align:center;">
          <a href="${APP_URL}/solo" style="display:inline-block;background:#10b981;color:white;font-weight:700;font-size:14px;padding:12px 28px;border-radius:10px;text-decoration:none;">Start Free While You Wait →</a>
        </div>
      </div>
      <div style="padding:20px 32px;border-top:1px solid #334155;background:#0f172a;text-align:center;">
        <p style="margin:0;color:#475569;font-size:12px;">
          Questions? Reply to this email or reach us at <a href="mailto:angel@conversionsystem.com" style="color:#6366f1;text-decoration:none;">angel@conversionsystem.com</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function getCrmDigestHtml(): string {
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);color:white;padding:24px;border-radius:12px;margin-bottom:20px;">
    <h1 style="margin:0 0 4px 0;font-size:20px;">🤖 Daily CRM Digest</h1>
    <p style="margin:0;opacity:0.85;font-size:14px;">{{agency_name}}</p>
  </div>
  <div style="background:#f9fafb;padding:20px;border-radius:12px;font-size:14px;line-height:1.6;color:#374151;">
    {{digest_body}}
  </div>
  <p style="text-align:center;margin-top:20px;">
    <a href="${APP_URL}/agency/crm" style="display:inline-block;background:#4f46e5;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Open CRM Dashboard →</a>
  </p>
  <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:16px;">Kyra AI — Your AI Workforce Platform</p>
</div>`;
}

function getWeeklyReportHtml(): string {
  return buildWeeklyReportHtml({
    agencyName: 'Your Agency',
    agencyId: 'sample',
    reportEmail: SAMPLE_EMAIL,
    weekStart: 'Mar 31',
    weekEnd: 'Apr 6',
    clients: [
      { id: '1', name: 'Sample Client', industry: 'Real Estate', usage_this_month: 42, gateway_status: 'running', billing_amount_cents: 29700 },
      { id: '2', name: 'Another Client', industry: 'Dental', usage_this_month: 8, gateway_status: 'running', billing_amount_cents: 19700 },
    ],
  });
}

// ── Template definitions ──────────────────────────────────────────────────────

function buildTemplates() {
  const n1 = getNurtureEmail(1, SAMPLE_EMAIL);
  const n2 = getNurtureEmail(2, SAMPLE_EMAIL);
  const n3 = getNurtureEmail(3, SAMPLE_EMAIL);
  const n4 = getNurtureEmail(4, SAMPLE_EMAIL);
  const n5 = getNurtureEmail(5, SAMPLE_EMAIL);
  const n6 = getNurtureEmail(6, SAMPLE_EMAIL);
  const n7 = getNurtureEmail(7, SAMPLE_EMAIL);

  return [
    { name: 'Welcome Email', subject: 'Welcome to Kyra — your AI worker is ready 🎁', html_body: getWelcomeHtml(), category: 'onboarding' },
    { name: 'Nurture 1: Deploy First AI Worker', subject: n1?.subject ?? 'Deploy your first AI worker', html_body: n1?.html ?? '', category: 'onboarding' },
    { name: 'Nurture 2: Check-in', subject: n2?.subject ?? 'Quick check-in', html_body: n2?.html ?? '', category: 'onboarding' },
    { name: 'Nurture 3: HVAC Case Study', subject: n3?.subject ?? 'How HVAC agencies use Kyra', html_body: n3?.html ?? '', category: 'onboarding' },
    { name: 'Nurture 4: Website Builder Spotlight', subject: n4?.subject ?? 'Website Builder + Growth Engine', html_body: n4?.html ?? '', category: 'onboarding' },
    { name: 'Nurture 5: Connect GHL Guide', subject: n5?.subject ?? 'How to connect GoHighLevel', html_body: n5?.html ?? '', category: 'onboarding' },
    { name: 'Nurture 6: Trial Recap + Upgrade', subject: n6?.subject ?? 'Your trial recap — ready to upgrade?', html_body: n6?.html ?? '', category: 'onboarding' },
    { name: 'Nurture 7: Win-back', subject: n7?.subject ?? 'Still thinking it over?', html_body: n7?.html ?? '', category: 'onboarding' },
    { name: 'Usage Alert', subject: '⚠️ {{agency_name}} — You\'re at 80%+ usage on Kyra', html_body: getUsageAlertHtml(), category: 'transactional' },
    { name: 'Weekly Report', subject: '📊 {{agency_name}} — Weekly Performance Report', html_body: getWeeklyReportHtml(), category: 'report' },
    { name: 'Escalation Alert', subject: '🚨 {{client_name}}: {{contact_name}} needs a human', html_body: getEscalationAlertHtml(), category: 'alert' },
    { name: 'Build Request Confirmation', subject: 'Your Kyra AI Worker request is confirmed, {{first_name}} 🤖', html_body: getBuildRequestHtml(), category: 'transactional' },
    { name: 'CRM Digest', subject: '🤖 {{agency_name}} — Daily CRM Digest', html_body: getCrmDigestHtml(), category: 'report' },
  ];
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const auth = await requireMaster();
  if (!auth.ok) return auth.response;

  const body = await request.json() as { clientId?: string };
  const { clientId } = body;

  if (!clientId) {
    return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
  }

  const admin = createServiceClientWithoutCookies();

  // Resolve agency_id from client
  const { data: client, error: clientErr } = await admin
    .from('agency_clients')
    .select('agency_id')
    .eq('id', clientId)
    .single();

  if (clientErr || !client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const templates = buildTemplates().map(t => ({
    ...t,
    agency_id: client.agency_id,
    client_id: clientId,
    is_system: true,
  }));

  const { data: inserted, error: insertErr } = await admin
    .from('email_templates')
    .insert(templates)
    .select('id, name');

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    created: inserted?.length ?? 0,
    templates: inserted?.map(t => ({ id: t.id, name: t.name })) ?? [],
  });
}
