/**
 * fix-templates.mjs
 * Run from project root: cd projects/kyra && node --loader tsx /tmp/fix-templates.mjs
 *
 * Fixes:
 *  1. Updates 13 system email templates with real HTML
 *  2. Inserts 82 agency owners into crm_contacts
 *  3. Creates Kyra Onboarding sequence with 7 steps
 */

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { pathToFileURL } from 'url';
import { join } from 'path';

// ── Config ────────────────────────────────────────────────────────────────────
//
// ⚠ IMPORTANT — DO NOT CONFUSE THESE UUIDS
//
// KYRA_INTERNAL_CLIENT_ID (below) = the ConversionSystem agency's own internal
// client record, used for Kyra's own email templates + CRM contacts + nurture
// sequence. NAME: "Kyra". INDUSTRY: "Market Intelligence". NOT A CANNABIS
// DISPENSARY. NOT PURPLE LOTUS.
//
// Purple Lotus (the live cannabis customer) is a SEPARATE client:
//   968cae23-e978-46bd-8f4f-23ed2e82d7be   (industry: Cannabis Dispensary)
//
// A prior migration (20260421001_cannabis_vertical.sql) mistook THIS internal
// client for Purple Lotus and polluted it with Jane Algolia keys + cannabis
// brand lists. If you're here looking for Purple Lotus, use 968cae23…; if
// you're updating marketing templates for Kyra's own outreach, you're in the
// right place — keep using KYRA_INTERNAL_CLIENT_ID below.

const AGENCY_ID = '1511e077-77ef-4c47-81fd-06a3bc9f1dbb';
const KYRA_INTERNAL_CLIENT_ID = 'f91b28a1-2911-477e-b228-9a21cdbb1dca';
// Legacy alias kept for the queries below so this commit is a pure rename + docs.
const CLIENT_ID = KYRA_INTERNAL_CLIENT_ID;
const SUPABASE_URL = 'https://yaijdtsunxicuphrakcc.supabase.co';

// ── Load env ──────────────────────────────────────────────────────────────────

const envPath = join(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const match = envContent.match(/^SUPABASE_SERVICE_ROLE_KEY=["']?([^"'\n]+)["']?$/m);
if (!match) throw new Error('SUPABASE_SERVICE_ROLE_KEY not found in .env.local');
const SERVICE_KEY = match[1].trim();

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Import nurture sequence ───────────────────────────────────────────────────

const nurtureUrl = pathToFileURL(join(process.cwd(), 'lib/email/nurture-sequence.ts')).href;
const { getNurtureEmail } = await import(nurtureUrl);

const weeklyReportUrl = pathToFileURL(join(process.cwd(), 'lib/email/weekly-report.ts')).href;
const { buildWeeklyReportHtml } = await import(weeklyReportUrl);

// ── HTML helpers for non-nurture templates ───────────────────────────────────

const APP_URL = 'https://kyra.conversionsystem.com';

function wrap(body, extraHead = '') {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${extraHead}</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,-apple-system,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
<tr><td align="center">
<table width="560" style="background:#fff;border-radius:12px;padding:40px;max-width:100%;border:1px solid #e5e7eb;">
<tr><td>
<div style="margin-bottom:24px;">
  <span style="font-size:20px;font-weight:700;color:#4f46e5;">Kyra</span>
</div>
${body}
<hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0 20px;">
<p style="color:#9ca3af;font-size:12px;margin:0;">
  Kyra AI · conversionsystem.com · 30 N Gould St Ste R, Sheridan, WY 82801<br>
  <a href="${APP_URL}" style="color:#9ca3af;">kyra.conversionsystem.com</a>
</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

function btn(text, url) {
  return `<a href="${url}" style="display:inline-block;background:#4f46e5;color:#fff;padding:14px 28px;border-radius:8px;font-weight:700;font-size:15px;text-decoration:none;margin:12px 0;">${text}</a>`;
}

// Template HTML generators

function welcomeHtml() {
  return wrap(`
<div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px;border-radius:8px;text-align:center;margin-bottom:24px;">
  <h1 style="color:#fff;margin:0;font-size:26px;">Welcome to Kyra AI 🎉</h1>
  <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:15px;">Your AI-powered agency platform is ready</p>
</div>
<p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">Hi {{first_name}},</p>
<p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">Welcome to Kyra — you've just unlocked access to an AI agency platform that can run client conversations, book appointments, and grow your business automatically.</p>
<p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px;">To get you started, we've added <strong>50 welcome credits</strong> to your account. Use them to deploy your first AI worker and see what's possible.</p>
<div style="text-align:center;margin:0 0 24px;">
  ${btn('Go to Dashboard →', APP_URL + '/agency')}
</div>
<p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0;">Questions? Reply to this email — we're here to help.</p>
`);
}

function usageAlertHtml() {
  return wrap(`
<div style="background:#fffbeb;border:2px solid #f59e0b;border-radius:8px;padding:20px;margin-bottom:24px;">
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
    <span style="font-size:20px;">⚠️</span>
    <strong style="color:#92400e;font-size:16px;">Usage Alert</strong>
  </div>
  <p style="color:#92400e;margin:0;font-size:14px;">Your AI credit balance is running low. Top up or upgrade to keep your AI workers online.</p>
</div>
<p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">Hi {{first_name}},</p>
<p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">Your Kyra account has used <strong>{{usage_percent}}%</strong> of your monthly AI credits. To avoid service interruption, add more credits or upgrade your plan.</p>
<div style="display:flex;gap:12px;flex-wrap:wrap;margin:0 0 24px;">
  <a href="${APP_URL}/agency/billing?action=topup" style="display:inline-block;background:#f59e0b;color:#fff;padding:12px 24px;border-radius:8px;font-weight:700;font-size:14px;text-decoration:none;">Top Up Credits</a>
  <a href="${APP_URL}/agency/billing?action=upgrade" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 24px;border-radius:8px;font-weight:700;font-size:14px;text-decoration:none;">Upgrade Plan</a>
</div>
<p style="color:#6b7280;font-size:13px;">Current usage: <strong>{{credits_used}}</strong> of <strong>{{credits_total}}</strong> credits this month.</p>
`);
}

function weeklyReportHtml() {
  return buildWeeklyReportHtml({
    agencyName: '{{agency_name}}',
    agencyId: AGENCY_ID,
    reportEmail: '{{report_email}}',
    weekStart: '{{week_start}}',
    weekEnd: '{{week_end}}',
    clients: [
      { id: '1', name: '{{client_name}}', industry: '{{industry}}', usage_this_month: 0, gateway_status: 'running', billing_amount_cents: 0 },
    ],
  });
}

function escalationHtml() {
  return wrap(`
<div style="background:#fef2f2;border:2px solid #ef4444;border-radius:8px;padding:20px;margin-bottom:24px;">
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
    <span style="font-size:20px;">🚨</span>
    <strong style="color:#991b1b;font-size:16px;">Escalation Required</strong>
  </div>
  <p style="color:#991b1b;margin:0;font-size:14px;">A conversation needs your immediate attention.</p>
</div>
<p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">Hi {{agency_name}},</p>
<p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">Your AI worker has escalated a conversation that requires human follow-up:</p>
<table style="width:100%;border-collapse:collapse;margin:0 0 24px;background:#f9fafb;border-radius:8px;">
  <tr style="border-bottom:1px solid #e5e7eb;">
    <td style="padding:10px 14px;color:#6b7280;font-size:13px;font-weight:600;width:35%;">Client</td>
    <td style="padding:10px 14px;color:#374151;font-size:14px;">{{client_name}}</td>
  </tr>
  <tr style="border-bottom:1px solid #e5e7eb;">
    <td style="padding:10px 14px;color:#6b7280;font-size:13px;font-weight:600;">Contact</td>
    <td style="padding:10px 14px;color:#374151;font-size:14px;">{{contact_name}} ({{contact_phone}})</td>
  </tr>
  <tr style="border-bottom:1px solid #e5e7eb;">
    <td style="padding:10px 14px;color:#6b7280;font-size:13px;font-weight:600;">Reason</td>
    <td style="padding:10px 14px;color:#374151;font-size:14px;">{{escalation_reason}}</td>
  </tr>
  <tr>
    <td style="padding:10px 14px;color:#6b7280;font-size:13px;font-weight:600;">Time</td>
    <td style="padding:10px 14px;color:#374151;font-size:14px;">{{escalated_at}}</td>
  </tr>
</table>
<div style="text-align:center;margin:0 0 16px;">
  ${btn('Open Conversation →', APP_URL + '/agency/clients/{{client_id}}')}
</div>
`);
}

function buildRequestHtml() {
  return wrap(`
<div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:24px 32px;border-radius:8px;margin-bottom:24px;">
  <p style="color:rgba(255,255,255,0.9);margin:0 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Build Request Received</p>
  <h2 style="color:#fff;margin:0;font-size:22px;">We've got your request ✅</h2>
</div>
<p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">Hi {{first_name}},</p>
<p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">Thanks for submitting your build request. Our team has received it and will be in touch within 1 business day to schedule your discovery call.</p>
<p style="color:#374151;font-size:15px;font-weight:600;margin:0 0 8px;">What happens next:</p>
<ol style="color:#374151;font-size:15px;line-height:2.2;padding-left:20px;margin:0 0 24px;">
  <li>Discovery call — we learn about your business (30 min)</li>
  <li>Build & configure your AI system</li>
  <li>Review & launch</li>
  <li>Ongoing optimization</li>
</ol>
<div style="background:#f5f3ff;border-left:4px solid #4f46e5;padding:16px;border-radius:0 8px 8px 0;margin:0 0 24px;">
  <p style="color:#4f46e5;font-size:14px;font-weight:600;margin:0 0 4px;">Your request reference</p>
  <p style="color:#6b7280;font-size:13px;margin:0;">{{request_id}}</p>
</div>
<p style="color:#6b7280;font-size:13px;">Questions? Reply to this email or visit <a href="${APP_URL}" style="color:#4f46e5;">kyra.conversionsystem.com</a></p>
`);
}

function crmDigestHtml() {
  return wrap(`
<div style="background:#4f46e5;padding:24px 32px;border-radius:8px;margin-bottom:24px;">
  <p style="color:rgba(255,255,255,0.8);margin:0 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:1px;">CRM Daily Digest</p>
  <h2 style="color:#fff;margin:0;font-size:22px;">{{date}} — Daily Summary</h2>
</div>
<p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">Hi {{first_name}},</p>
<p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px;">Here's what happened in your CRM today:</p>
{{digest_body}}
<div style="text-align:center;margin:24px 0 0;">
  ${btn('View Full CRM →', APP_URL + '/agency/crm')}
</div>
`);
}

// ── Build template map ────────────────────────────────────────────────────────

// Nurture emails use preview@example.com as placeholder
const PREVIEW_EMAIL = 'preview@example.com';

const TEMPLATE_HTML = {
  // Nurture steps — match actual DB names (seeded by previous migration)
  'Nurture 1: Deploy First AI Worker': () => { const e = getNurtureEmail(1, PREVIEW_EMAIL); return { subject: e.subject, html: e.html }; },
  'Nurture 2: Check-in': () => { const e = getNurtureEmail(2, PREVIEW_EMAIL); return { subject: e.subject, html: e.html }; },
  'Nurture 3: HVAC Case Study': () => { const e = getNurtureEmail(3, PREVIEW_EMAIL); return { subject: e.subject, html: e.html }; },
  'Nurture 4: Website Builder': () => { const e = getNurtureEmail(4, PREVIEW_EMAIL); return { subject: e.subject, html: e.html }; },
  'Nurture 5: Connect GHL': () => { const e = getNurtureEmail(5, PREVIEW_EMAIL); return { subject: e.subject, html: e.html }; },
  'Nurture 6: Upgrade Nudge': () => { const e = getNurtureEmail(6, PREVIEW_EMAIL); return { subject: e.subject, html: e.html }; },
  'Nurture 7: Win-back': () => { const e = getNurtureEmail(7, PREVIEW_EMAIL); return { subject: e.subject, html: e.html }; },
  // Non-nurture
  'Welcome Email': () => ({ subject: 'Welcome to Kyra AI — your AI worker is ready', html: welcomeHtml() }),
  'Usage Alert': () => ({ subject: '⚠️ Your AI credits are running low', html: usageAlertHtml() }),
  'Weekly Report': () => ({ subject: '📊 Your weekly performance report', html: weeklyReportHtml() }),
  'Escalation Alert': () => ({ subject: '🚨 Escalation: Conversation needs your attention', html: escalationHtml() }),
  'Build Request Confirmation': () => ({ subject: "We've received your build request ✅", html: buildRequestHtml() }),
  'CRM Daily Digest': () => ({ subject: '📋 Your CRM daily digest — {{date}}', html: crmDigestHtml() }),
};

// ── Issue 1: Update system templates ─────────────────────────────────────────

async function fixTemplates() {
  console.log('\n── Issue 1: Updating system templates ──');

  const { data: templates, error } = await supabase
    .from('email_templates')
    .select('id, name, html_body')
    .eq('agency_id', AGENCY_ID)
    .eq('client_id', CLIENT_ID)
    .eq('is_system', true);

  if (error) throw new Error(`Failed to fetch templates: ${error.message}`);
  console.log(`Found ${templates.length} system templates`);

  for (const t of templates) {
    const gen = TEMPLATE_HTML[t.name];
    if (!gen) {
      console.log(`  SKIP  ${t.name} — no generator found`);
      continue;
    }

    const { subject, html } = gen();
    const { error: updateErr } = await supabase
      .from('email_templates')
      .update({ html_body: html, subject, updated_at: new Date().toISOString() })
      .eq('id', t.id);

    if (updateErr) {
      console.log(`  FAIL  ${t.name}: ${updateErr.message}`);
    } else {
      console.log(`  OK    ${t.name}`);
    }
  }
}

// ── Issue 2: Insert agency owners into crm_contacts ──────────────────────────

async function fixCrmContacts() {
  console.log('\n── Issue 2: Populating crm_contacts ──');

  // Get all users via admin API
  let allUsers = [];
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`Failed to list users: ${error.message}`);
    allUsers = allUsers.concat(data.users);
    if (data.users.length < 1000) break;
    page++;
  }
  console.log(`Fetched ${allUsers.length} users total`);

  // Get all agencies to find plan info
  const { data: agencies, error: agErr } = await supabase
    .from('agencies')
    .select('id, name, owner_id, plan');
  if (agErr) throw new Error(`Failed to fetch agencies: ${agErr.message}`);

  const agencyByOwner = {};
  for (const ag of agencies) {
    agencyByOwner[ag.owner_id] = ag;
  }

  // Clear existing admin-migration records for this agency+client to avoid duplicates
  const { error: delErr } = await supabase
    .from('crm_contacts')
    .delete()
    .eq('agency_id', AGENCY_ID)
    .eq('client_id', CLIENT_ID)
    .eq('source', 'admin-migration');

  if (delErr) throw new Error(`Failed to clear old records: ${delErr.message}`);

  // Build contact rows for agency owners
  const contacts = [];
  for (const user of allUsers) {
    const agency = agencyByOwner[user.id];
    if (!agency) continue; // only agency owners

    const email = user.email;
    if (!email) continue;

    // Parse name from metadata or email
    const meta = user.user_metadata || {};
    let firstName = meta.first_name || meta.full_name?.split(' ')[0] || '';
    let lastName = meta.last_name || meta.full_name?.split(' ').slice(1).join(' ') || '';

    // Fallback: parse from email local part
    if (!firstName) {
      const localPart = email.split('@')[0].replace(/[._+-]/g, ' ');
      const parts = localPart.split(' ').filter(Boolean);
      firstName = parts[0] || '';
      lastName = parts.slice(1).join(' ') || '';
    }

    const planName = agency.plan || 'free';

    contacts.push({
      agency_id: AGENCY_ID,
      client_id: CLIENT_ID,
      first_name: firstName || null,
      last_name: lastName || null,
      email,
      source: 'admin-migration',
      stage: 'contact',
      tags: ['kyra-customer', planName],
      score: 50,
    });
  }

  console.log(`Prepared ${contacts.length} contact records`);
  if (contacts.length === 0) {
    console.log('  No contacts to insert');
    return;
  }

  // Insert in batches of 100
  let inserted = 0;
  for (let i = 0; i < contacts.length; i += 100) {
    const batch = contacts.slice(i, i + 100);
    const { error: insErr } = await supabase.from('crm_contacts').insert(batch);
    if (insErr) {
      console.log(`  FAIL batch ${i}-${i + batch.length}: ${insErr.message}`);
    } else {
      inserted += batch.length;
    }
  }
  console.log(`  Inserted ${inserted} CRM contacts`);
}

// ── Issue 3: Create Kyra Onboarding sequence ──────────────────────────────────

async function fixSequences() {
  console.log('\n── Issue 3: Creating onboarding sequence ──');

  // Check if it already exists
  const { data: existing } = await supabase
    .from('email_sequences')
    .select('id')
    .eq('agency_id', AGENCY_ID)
    .eq('name', 'Kyra Onboarding')
    .single();

  let sequenceId;

  if (existing) {
    console.log(`  Sequence already exists (${existing.id}), recreating steps`);
    sequenceId = existing.id;
    // Delete existing steps
    await supabase.from('email_sequence_steps').delete().eq('sequence_id', sequenceId);
  } else {
    const { data: seq, error: seqErr } = await supabase
      .from('email_sequences')
      .insert({
        agency_id: AGENCY_ID,
        name: 'Kyra Onboarding',
        description: '7-email welcome sequence for new agencies',
        status: 'active',
        trigger_type: 'manual',
      })
      .select('id')
      .single();

    if (seqErr) throw new Error(`Failed to create sequence: ${seqErr.message}`);
    sequenceId = seq.id;
    console.log(`  Created sequence ${sequenceId}`);
  }

  // Define steps
  const DELAY_DAYS = [0, 1, 3, 5, 7, 14, 21];
  const STEP_TYPES = ['intro', 'follow-up', 'value-add', 'value-add', 'value-add', 'closing', 'closing'];

  const steps = [];
  for (let i = 1; i <= 7; i++) {
    const email = getNurtureEmail(i, PREVIEW_EMAIL);
    if (!email) continue;
    steps.push({
      sequence_id: sequenceId,
      position: i,
      subject: email.subject,
      preview_text: email.preview,
      html_body: email.html,
      delay_days: DELAY_DAYS[i - 1],
      delay_hours: 0,
      step_type: STEP_TYPES[i - 1],
      status: 'active',
    });
  }

  const { error: stepsErr } = await supabase.from('email_sequence_steps').insert(steps);
  if (stepsErr) throw new Error(`Failed to insert steps: ${stepsErr.message}`);
  console.log(`  Inserted ${steps.length} sequence steps`);
}

// ── Run all ───────────────────────────────────────────────────────────────────

try {
  await fixTemplates();
  await fixCrmContacts();
  await fixSequences();
  console.log('\n✓ All done\n');
} catch (err) {
  console.error('\n✗ Error:', err.message);
  process.exit(1);
}
