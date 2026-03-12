/**
 * Email Marketing Service
 *
 * Handles campaign sending, contact management, and unsubscribe processing.
 * Uses Resend batch API for bulk email delivery.
 */

import { Resend } from 'resend';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const BATCH_SIZE = 100; // Resend limit per batch call
const UNSUBSCRIBE_BASE = 'https://kyra.conversionsystem.com/unsubscribe';
const PHYSICAL_ADDRESS = '30 N Gould St Ste R, Sheridan, WY 82801';

function getResend(): Resend {
  if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured');
  return new Resend(RESEND_API_KEY);
}

function makeUnsubscribeToken(agencyId: string, email: string): string {
  return Buffer.from(`${agencyId}:${email}`).toString('base64');
}

function buildCanSpamFooter(agencyId: string, recipientEmail: string): string {
  const token = makeUnsubscribeToken(agencyId, recipientEmail);
  return `
    <div style="margin-top:40px;padding-top:20px;border-top:1px solid #e5e7eb;text-align:center;font-size:12px;color:#9ca3af;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <p style="margin:0 0 8px;">You received this email because you are subscribed to our mailing list.</p>
      <p style="margin:0 0 8px;"><a href="${UNSUBSCRIBE_BASE}?token=${token}" style="color:#6366f1;text-decoration:underline;">Unsubscribe</a> from future emails</p>
      <p style="margin:0;color:#d1d5db;">${PHYSICAL_ADDRESS}</p>
    </div>`;
}

/**
 * Send a campaign to all eligible contacts.
 */
export async function sendCampaign(campaignId: string): Promise<{ ok: boolean; sent: number; error?: string }> {
  const supabase = createServiceClientWithoutCookies();

  // Fetch campaign
  const { data: campaign, error: cErr } = await supabase
    .from('email_campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();

  if (cErr || !campaign) return { ok: false, sent: 0, error: 'Campaign not found' };
  if (campaign.status === 'sent') return { ok: false, sent: 0, error: 'Campaign already sent' };

  // Mark as sending
  await supabase.from('email_campaigns').update({ status: 'sending' }).eq('id', campaignId);

  // Build contacts query — active contacts not globally unsubscribed
  let contactsQuery = supabase
    .from('email_contacts')
    .select('id, email, first_name, last_name')
    .eq('agency_id', campaign.agency_id)
    .eq('client_id', campaign.client_id)
    .eq('status', 'active');

  // Segment by tags if specified
  if (campaign.segment_tags && campaign.segment_tags.length > 0) {
    contactsQuery = contactsQuery.overlaps('tags', campaign.segment_tags);
  }

  const { data: contacts, error: contactsErr } = await contactsQuery;
  if (contactsErr || !contacts) {
    await supabase.from('email_campaigns').update({ status: 'draft' }).eq('id', campaignId);
    return { ok: false, sent: 0, error: 'Failed to fetch contacts' };
  }

  // Filter out globally unsubscribed emails
  const { data: unsubs } = await supabase
    .from('email_unsubscribes')
    .select('email')
    .eq('agency_id', campaign.agency_id);

  const unsubSet = new Set((unsubs || []).map(u => u.email.toLowerCase()));
  const eligible = contacts.filter(c => !unsubSet.has(c.email.toLowerCase()));

  if (eligible.length === 0) {
    await supabase.from('email_campaigns').update({ status: 'draft' }).eq('id', campaignId);
    return { ok: false, sent: 0, error: 'No eligible recipients' };
  }

  const resend = getResend();
  let totalSent = 0;

  // Send in batches of 100
  for (let i = 0; i < eligible.length; i += BATCH_SIZE) {
    const batch = eligible.slice(i, i + BATCH_SIZE);
    const emails = batch.map(contact => {
      const firstName = contact.first_name || '';
      const htmlWithFooter = (campaign.html_body || '') + buildCanSpamFooter(campaign.agency_id, contact.email);
      const personalizedHtml = htmlWithFooter
        .replace(/\{\{first_name\}\}/g, firstName)
        .replace(/\{\{email\}\}/g, contact.email);

      return {
        from: `${campaign.from_name} <${campaign.from_email}>`,
        to: [contact.email],
        subject: campaign.subject.replace(/\{\{first_name\}\}/g, firstName),
        html: personalizedHtml,
        text: campaign.text_body || undefined,
        reply_to: campaign.reply_to || undefined,
      };
    });

    try {
      const result = await resend.batch.send(emails as Parameters<typeof resend.batch.send>[0]);
      const batchData = result.data;

      // Record analytics for each sent email
      const analyticsRows = batch.map((contact, idx) => ({
        campaign_id: campaignId,
        contact_id: contact.id,
        email: contact.email,
        event: 'sent',
        resend_email_id: batchData?.data?.[idx]?.id || null,
      }));

      await supabase.from('email_analytics').insert(analyticsRows);
      totalSent += batch.length;
    } catch (err) {
      console.error(`[email-marketing] Batch send error:`, err);
    }
  }

  // Update campaign stats
  await supabase
    .from('email_campaigns')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      total_recipients: eligible.length,
      total_sent: totalSent,
    })
    .eq('id', campaignId);

  return { ok: true, sent: totalSent };
}

/**
 * Count eligible recipients for a campaign audience.
 */
export async function getAudienceCount(
  agencyId: string,
  clientId: string,
  segmentTags?: string[],
): Promise<number> {
  const supabase = createServiceClientWithoutCookies();

  let query = supabase
    .from('email_contacts')
    .select('id', { count: 'exact', head: true })
    .eq('agency_id', agencyId)
    .eq('client_id', clientId)
    .eq('status', 'active');

  if (segmentTags && segmentTags.length > 0) {
    query = query.overlaps('tags', segmentTags);
  }

  const { count } = await query;

  // Subtract unsubscribed
  const { count: unsubCount } = await supabase
    .from('email_unsubscribes')
    .select('id', { count: 'exact', head: true })
    .eq('agency_id', agencyId);

  return Math.max(0, (count || 0) - (unsubCount || 0));
}

/**
 * Bulk import contacts with deduplication.
 */
export async function importContacts(
  agencyId: string,
  clientId: string,
  contacts: { email: string; first_name?: string; last_name?: string; phone?: string; tags?: string[] }[],
): Promise<{ imported: number; skipped: number }> {
  const supabase = createServiceClientWithoutCookies();

  let imported = 0;
  let skipped = 0;

  for (const contact of contacts) {
    const { error } = await supabase.from('email_contacts').upsert(
      {
        agency_id: agencyId,
        client_id: clientId,
        email: contact.email.toLowerCase().trim(),
        first_name: contact.first_name || null,
        last_name: contact.last_name || null,
        phone: contact.phone || null,
        tags: contact.tags || [],
        source: 'import',
      },
      { onConflict: 'agency_id,client_id,email' },
    );

    if (error) {
      skipped++;
    } else {
      imported++;
    }
  }

  return { imported, skipped };
}

/**
 * Unsubscribe a contact globally for an agency.
 */
export async function unsubscribeContact(
  agencyId: string,
  email: string,
  reason: string = 'link',
  campaignId?: string,
): Promise<{ ok: boolean }> {
  const supabase = createServiceClientWithoutCookies();

  // Add to global unsubscribe list
  await supabase.from('email_unsubscribes').upsert(
    {
      agency_id: agencyId,
      email: email.toLowerCase().trim(),
      reason,
      campaign_id: campaignId || null,
    },
    { onConflict: 'agency_id,email' },
  );

  // Update contact status
  await supabase
    .from('email_contacts')
    .update({ status: 'unsubscribed', unsubscribed_at: new Date().toISOString() })
    .eq('agency_id', agencyId)
    .eq('email', email.toLowerCase().trim());

  return { ok: true };
}
