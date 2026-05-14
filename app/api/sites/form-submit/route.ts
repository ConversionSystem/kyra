// ============================================================================
// POST /api/sites/form-submit
//
// Public endpoint that receives form submissions from the live site's
// form-embed CTA. Sprint 5 (2026-05-14).
//
// Body shape (modern, field-driven):
//   {
//     siteId:     string,              // client_sites.id (preferred)
//     clientId?:  string,              // agency_clients.id (legacy callers)
//     pageSlug?:  string,              // page the form was on (for inbox attribution)
//     fields:     Record<string, any>, // agency-defined field map
//     source?:    string,
//   }
//
// What happens:
//   1. Look up site (+ client + agency) for ownership context.
//   2. Insert into `form_submissions` with extracted name/email/phone projections.
//   3. If the agency has CRM wired up, push the submission as a CRM contact.
//   4. If the matching page has `form_webhook_url`, fire-and-forget POST the
//      raw JSON to it. Status code stored back on the submission row.
//
// CORS: this endpoint is hit from arbitrary live-site domains, so we ALWAYS
// send permissive CORS headers — success AND error paths, per CLAUDE.md.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { isRateLimited } from '@/lib/rate-limit';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: CORS });

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  // Rate limit per IP — public endpoint, easy bot target. 20/min is well
  // beyond legitimate human form submissions.
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  if (await isRateLimited(`form-submit:${ip}`, 20, 60)) {
    return json({ ok: false, error: 'Too many submissions — try again in a minute' }, 429);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: 'Invalid JSON body' }, 400);
  }

  const siteId = typeof body.siteId === 'string' ? body.siteId : null;
  const clientId = typeof body.clientId === 'string' ? body.clientId : null;
  const pageSlug = typeof body.pageSlug === 'string' ? body.pageSlug : null;
  const fields = (body.fields && typeof body.fields === 'object' ? body.fields : null) as
    | Record<string, unknown>
    | null;
  const source = typeof body.source === 'string' ? body.source : 'website_form';

  if (!fields || Object.keys(fields).length === 0) {
    return json({ ok: false, error: 'fields required' }, 400);
  }

  const supabase = createServiceClientWithoutCookies();

  // Resolve site — prefer siteId, fall back to client_id lookup so templates
  // built before Sprint 5 (which know clientId, not siteId) keep working.
  let site: { id: string; agency_id: string | null; client_id: string | null } | null = null;
  if (siteId) {
    const { data } = await supabase
      .from('client_sites')
      .select('id, agency_id, client_id')
      .eq('id', siteId)
      .single();
    site = data;
  } else if (clientId) {
    const { data } = await supabase
      .from('client_sites')
      .select('id, agency_id, client_id')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    site = data;
  }

  if (!site) {
    return json({ ok: false, error: 'site not found' }, 404);
  }

  // Look up the page (best-effort) so we can scope the submission to it AND
  // discover any per-page webhook URL configured by the agency.
  let pageId: string | null = null;
  let webhookUrl: string | null = null;
  if (pageSlug) {
    const { data: page } = await supabase
      .from('site_pages')
      .select('id, form_webhook_url')
      .eq('site_id', site.id)
      .eq('slug', pageSlug)
      .maybeSingle();
    if (page) {
      pageId = page.id;
      webhookUrl = page.form_webhook_url ?? null;
    }
  }

  // Extract normalized projections so the inbox can sort/filter without
  // parsing JSON in every query. Keys here are conventional — agencies
  // typically name their fields name/email/phone/message regardless of UI.
  const pickStr = (...keys: string[]): string | null => {
    for (const k of keys) {
      const v = fields[k];
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
    return null;
  };
  const submissionName = pickStr('name', 'full_name', 'fullname', 'first_name');
  const submissionEmail = pickStr('email', 'email_address');
  const submissionPhone = pickStr('phone', 'phone_number', 'tel');

  // Save the submission first so we don't lose data if CRM or webhook fails.
  const { data: submission, error: insertErr } = await supabase
    .from('form_submissions')
    .insert({
      site_id: site.id,
      page_id: pageId,
      page_slug: pageSlug,
      fields,
      email: submissionEmail,
      phone: submissionPhone,
      name: submissionName,
      webhook_status: webhookUrl ? 'pending' : null,
      source_ip: ip.slice(0, 64),
      user_agent: (req.headers.get('user-agent') || '').slice(0, 256),
    })
    .select('id')
    .single();

  if (insertErr || !submission) {
    console.error('[form-submit] insert failed', insertErr);
    return json({ ok: false, error: 'Failed to record submission' }, 500);
  }

  // ── CRM push (best-effort, parallel-safe) ──
  // Pushed only if we can attribute to a client + agency AND we have at
  // least an email or phone (otherwise the contact would be uninsertable
  // under most CRM dedup rules).
  if (site.client_id && site.agency_id && (submissionEmail || submissionPhone)) {
    try {
      const { createContact } = await import('@/lib/crm/contacts');
      const firstName = (submissionName || '').split(' ')[0] || '';
      const lastName = (submissionName || '').split(' ').slice(1).join(' ') || '';
      const res = await createContact(site.agency_id, {
        first_name: firstName,
        last_name: lastName,
        email: submissionEmail || undefined,
        phone: submissionPhone || undefined,
        source,
        stage: 'new',
        tags: ['website-lead'],
        custom_fields: { ...fields, _submission_id: submission.id },
      }, site.client_id);

      if (res?.contact?.id) {
        await supabase
          .from('form_submissions')
          .update({ crm_contact_id: res.contact.id })
          .eq('id', submission.id);
      }
    } catch (err) {
      // CRM failure is logged but doesn't surface to the visitor — they
      // still see "Thanks for your message".
      console.error('[form-submit] CRM push failed', err);
    }
  }

  // ── Webhook forward (fire-and-forget, but capture status for the inbox) ──
  if (webhookUrl) {
    // Spawn the delivery without awaiting on the response path — Vercel will
    // keep this alive briefly. We update the submission row when the fetch
    // settles so the agency can see delivery status in the inbox.
    void (async () => {
      try {
        const wres = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            submission_id: submission.id,
            site_id: site.id,
            page_slug: pageSlug,
            fields,
            received_at: new Date().toISOString(),
          }),
          signal: AbortSignal.timeout(8000),
        });
        await supabase
          .from('form_submissions')
          .update({
            webhook_status: wres.ok ? 'sent' : 'failed',
            webhook_status_code: wres.status,
            webhook_attempts: 1,
          })
          .eq('id', submission.id);
      } catch (err) {
        console.error('[form-submit] webhook delivery failed', err);
        await supabase
          .from('form_submissions')
          .update({ webhook_status: 'failed', webhook_attempts: 1 })
          .eq('id', submission.id);
      }
    })();
  }

  return json({ ok: true, data: { id: submission.id } }, 201);
}
