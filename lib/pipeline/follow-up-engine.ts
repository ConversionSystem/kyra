/**
 * Follow-Up Engine — Automated Multi-Touch Sales Sequences
 *
 * The #1 reason pipelines fail: one message, no follow-up.
 * 80% of sales require 5+ follow-ups, but 44% of salespeople give up after 1.
 *
 * This engine:
 * 1. Schedules follow-ups when outreach is first sent
 * 2. Generates contextual, varied messages using AI (different angle each time)
 * 3. Sends via GHL on the scheduled date
 * 4. Auto-cancels when a lead replies
 * 5. Tracks everything in pipeline_follow_ups + activity log
 *
 * Each follow-up uses a different strategy:
 * - Follow-up 1: Gentle bump ("just checking in")
 * - Follow-up 2: New value angle (different pain point)
 * - Follow-up 3: Social proof / case study mention
 * - Follow-up 4: Time-sensitive / scarcity
 * - Follow-up 5: Breakup email ("last message")
 */

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { getGhlIntegration } from '@/lib/pipeline/crm-sync';
import { logAndFire, PipelineEvent } from '@/lib/pipeline/webhooks';
import { requireCredits, deductCredits } from '@/lib/billing/credit-engine';
import { resolveAgencyApiKey } from '@/lib/billing/byok';

const GHL_API = 'https://services.leadconnectorhq.com';
const GHL_VERSION = '2021-04-15';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FollowUpRecord {
  id: string;
  agency_id: string;
  campaign_id: string;
  lead_id: string;
  follow_up_number: number;
  scheduled_at: string;
  sent_at: string | null;
  cancelled_at: string | null;
  status: string;
  channel: string;
  subject: string | null;
  message: string | null;
  error: string | null;
}

interface LeadWithCampaign {
  id: string;
  agency_id: string;
  campaign_id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  industry: string | null;
  location: string | null;
  stage: string;
  ghl_contact_id: string | null;
  personalized_subject: string | null;
  personalized_email: string | null;
  personalized_opener: string | null;
  enrichment_data: Record<string, unknown>;
  messaged_at: string | null;
  pipeline_campaigns: {
    id: string;
    name: string;
    target_industry: string | null;
    target_pain_points: string | null;
    value_prop: string | null;
    follow_up_count: number;
    follow_up_delay_days: number;
    follow_up_channel: string;
  };
}

// ─── Follow-Up Strategies ─────────────────────────────────────────────────────

const FOLLOW_UP_STRATEGIES = [
  {
    number: 1,
    name: 'gentle_bump',
    instruction: `Write a brief, friendly follow-up. Reference the original message casually ("wanted to circle back on my note"). Keep it to 2-3 sentences. Don't repeat the original pitch — just show you're a real person following up.`,
  },
  {
    number: 2,
    name: 'new_angle',
    instruction: `Take a completely different angle. Mention a specific pain point or industry trend that's relevant to THEIR business. Share a quick insight or stat. Make them think "hmm, that's interesting." 3-4 sentences max.`,
  },
  {
    number: 3,
    name: 'social_proof',
    instruction: `Lead with social proof. Mention a result you've achieved for a similar business (keep it vague but believable — "a [industry] company in [location]" style). Focus on the specific outcome (time saved, revenue gained, etc). 2-3 sentences.`,
  },
  {
    number: 4,
    name: 'urgency',
    instruction: `Create gentle urgency. Mention a limited offer, upcoming changes, or capacity limits. NOT fake scarcity — frame it as "we're taking on X new clients this month" or "this pricing is available through [timeframe]". 2-3 sentences.`,
  },
  {
    number: 5,
    name: 'breakup',
    instruction: `This is the "breakup" email — your last follow-up. Be direct and respectful: "I don't want to keep bothering you. If [value prop] isn't a priority right now, totally understand." Give them an easy out AND an easy yes. This counterintuitively gets the highest response rate. 2-3 sentences.`,
  },
];

// ─── Schedule Follow-Ups ──────────────────────────────────────────────────────

/**
 * Schedule follow-up sequence for a batch of leads after outreach is sent.
 * Called from the launch route after initial messages go out.
 */
export async function scheduleFollowUps(
  agencyId: string,
  campaignId: string,
  leadIds: string[],
  sentChannels: Record<string, string[]>, // leadId → ['email', 'sms']
): Promise<{ scheduled: number; errors: number }> {
  const svc = createServiceClientWithoutCookies();

  // Get campaign follow-up settings
  const { data: campaign } = await svc
    .from('pipeline_campaigns')
    .select('follow_up_count, follow_up_delay_days, follow_up_channel')
    .eq('id', campaignId)
    .single();

  if (!campaign || campaign.follow_up_count === 0) {
    return { scheduled: 0, errors: 0 };
  }

  const { follow_up_count, follow_up_delay_days, follow_up_channel } = campaign;
  let scheduled = 0;
  let errors = 0;

  for (const leadId of leadIds) {
    try {
      const leadChannels = sentChannels[leadId] || ['email'];

      // Determine which channels to follow up on
      let followUpChannels: string[];
      if (follow_up_channel === 'same') {
        followUpChannels = leadChannels;
      } else if (follow_up_channel === 'both') {
        followUpChannels = ['email', 'sms'];
      } else {
        followUpChannels = [follow_up_channel];
      }

      const rows = [];
      const baseDate = new Date();

      for (let i = 1; i <= follow_up_count; i++) {
        // Schedule each follow-up: delay_days * follow_up_number from now
        const scheduledAt = new Date(baseDate);
        scheduledAt.setDate(scheduledAt.getDate() + (follow_up_delay_days * i));

        // Skip weekends — push to Monday
        const day = scheduledAt.getDay();
        if (day === 0) scheduledAt.setDate(scheduledAt.getDate() + 1); // Sunday → Monday
        if (day === 6) scheduledAt.setDate(scheduledAt.getDate() + 2); // Saturday → Monday

        // Set to a reasonable send time (10am in the lead's timezone, approx UTC)
        scheduledAt.setHours(10, 0, 0, 0);

        // Create a follow-up for each channel
        for (const channel of followUpChannels) {
          rows.push({
            agency_id: agencyId,
            campaign_id: campaignId,
            lead_id: leadId,
            follow_up_number: i,
            scheduled_at: scheduledAt.toISOString(),
            status: 'pending',
            channel,
          });
        }
      }

      if (rows.length > 0) {
        const { error } = await svc.from('pipeline_follow_ups').insert(rows);
        if (error) {
          console.error(`[follow-up] Failed to schedule for lead ${leadId}:`, error.message);
          errors++;
        } else {
          scheduled += rows.length;
        }
      }
    } catch (err) {
      console.error(`[follow-up] Error scheduling for lead ${leadId}:`, err);
      errors++;
    }
  }

  console.log(`[follow-up] Scheduled ${scheduled} follow-ups for ${leadIds.length} leads in campaign ${campaignId}`);
  return { scheduled, errors };
}

// ─── Cancel Follow-Ups ────────────────────────────────────────────────────────

/**
 * Cancel all pending follow-ups for a lead (called when they reply or are skipped).
 */
export async function cancelFollowUps(leadId: string): Promise<number> {
  const svc = createServiceClientWithoutCookies();

  const { data, error } = await svc
    .from('pipeline_follow_ups')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('lead_id', leadId)
    .eq('status', 'pending')
    .select('id');

  if (error) {
    console.error(`[follow-up] Failed to cancel for lead ${leadId}:`, error.message);
    return 0;
  }

  const count = data?.length || 0;
  if (count > 0) {
    console.log(`[follow-up] Cancelled ${count} pending follow-ups for lead ${leadId}`);
  }
  return count;
}

// ─── Process Due Follow-Ups ───────────────────────────────────────────────────

/**
 * Main cron job function. Finds and sends all due follow-ups.
 * Called by /api/cron/follow-ups every hour.
 */
export async function processDueFollowUps(): Promise<{
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
}> {
  const svc = createServiceClientWithoutCookies();
  const now = new Date().toISOString();

  // Find all pending follow-ups that are due
  const { data: dueFollowUps, error } = await svc
    .from('pipeline_follow_ups')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_at', now)
    .order('scheduled_at', { ascending: true })
    .limit(50); // Process max 50 per run to avoid timeouts

  if (error || !dueFollowUps?.length) {
    return { processed: 0, sent: 0, failed: 0, skipped: 0 };
  }

  console.log(`[follow-up] Processing ${dueFollowUps.length} due follow-ups`);

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const followUp of dueFollowUps as FollowUpRecord[]) {
    try {
      // Load lead + campaign
      const { data: lead } = await svc
        .from('pipeline_leads')
        .select('*, pipeline_campaigns!inner(*)')
        .eq('id', followUp.lead_id)
        .single();

      if (!lead) {
        await markFollowUp(svc, followUp.id, 'failed', 'Lead not found');
        failed++;
        continue;
      }

      // Skip if lead has already replied or moved past messaged stage
      if (['replied', 'interested', 'booked', 'closed', 'skipped'].includes(lead.stage)) {
        await cancelFollowUps(followUp.lead_id);
        skipped++;
        continue;
      }

      // Credit check (skip if BYOK)
      const resolvedKey = await resolveAgencyApiKey(followUp.agency_id);
      const followUpIsByok = resolvedKey.isByok;
      if (!followUpIsByok) {
        const creditCheck = await requireCredits(followUp.agency_id, 'pipeline.follow_up');
        if (!creditCheck.allowed) {
          await markFollowUp(svc, followUp.id, 'failed', 'Insufficient credits');
          failed++;
          continue;
        }
      }

      // Get GHL integration
      const ghlIntegration = await getGhlIntegration(followUp.agency_id);
      if (!ghlIntegration?.access_token || !lead.ghl_contact_id) {
        await markFollowUp(svc, followUp.id, 'failed', 'GHL not connected or no contact ID');
        failed++;
        continue;
      }

      // Mark as generating
      await svc.from('pipeline_follow_ups')
        .update({ status: 'generating', updated_at: new Date().toISOString() })
        .eq('id', followUp.id);

      const campaign = (lead as unknown as LeadWithCampaign).pipeline_campaigns;

      // Generate the follow-up message
      const strategy = FOLLOW_UP_STRATEGIES[Math.min(followUp.follow_up_number - 1, FOLLOW_UP_STRATEGIES.length - 1)];
      const generated = await generateFollowUpMessage(
        lead as unknown as LeadWithCampaign,
        followUp.follow_up_number,
        followUp.channel,
        strategy.instruction,
      );

      if (!generated.message) {
        await markFollowUp(svc, followUp.id, 'failed', 'AI generation failed');
        failed++;
        continue;
      }

      // Send via GHL
      const sendResult = await sendFollowUp(
        ghlIntegration.access_token,
        lead.ghl_contact_id,
        generated.message,
        generated.subject,
        followUp.channel,
      );

      if (!sendResult.ok) {
        await markFollowUp(svc, followUp.id, 'failed', sendResult.error || 'Send failed');
        failed++;
        continue;
      }

      // Success — update follow-up record
      await svc.from('pipeline_follow_ups').update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        subject: generated.subject,
        message: generated.message,
        updated_at: new Date().toISOString(),
      }).eq('id', followUp.id);

      // Deduct credit (skip if BYOK)
      if (!followUpIsByok) {
        await deductCredits(followUp.agency_id, 'pipeline.follow_up', {
          description: `Follow-up #${followUp.follow_up_number} to ${lead.full_name || 'lead'} (${lead.company || '?'})`,
        });
      }

      // Log activity
      await logAndFire(
        followUp.agency_id,
        'lead.messaged' as PipelineEvent,
        { id: campaign.id, name: campaign.name },
        {
          id: lead.id,
          full_name: lead.full_name,
          company: lead.company,
          email: lead.email,
          phone: lead.phone,
          website: lead.website,
          industry: lead.industry,
          location: lead.location,
          stage: lead.stage,
        },
        'follow-up-engine',
        {
          follow_up_number: followUp.follow_up_number,
          channel: followUp.channel,
          strategy: strategy.name,
        },
      );

      sent++;
      console.log(
        `[follow-up] Sent #${followUp.follow_up_number} (${strategy.name}) to ${lead.full_name || lead.id} via ${followUp.channel}`,
      );

      // Rate limit: 1 second between sends
      await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      console.error(`[follow-up] Error processing ${followUp.id}:`, err);
      await markFollowUp(svc, followUp.id, 'failed', err instanceof Error ? err.message : 'Unknown error');
      failed++;
    }
  }

  console.log(`[follow-up] Done: ${sent} sent, ${failed} failed, ${skipped} skipped`);
  return { processed: dueFollowUps.length, sent, failed, skipped };
}

// ─── AI Message Generation ────────────────────────────────────────────────────

async function generateFollowUpMessage(
  lead: LeadWithCampaign,
  followUpNumber: number,
  channel: string,
  strategyInstruction: string,
): Promise<{ message: string; subject: string | null }> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    console.error('[follow-up] No OPENAI_API_KEY');
    return { message: '', subject: null };
  }

  const campaign = lead.pipeline_campaigns;
  const enrichment = (lead.enrichment_data || {}) as Record<string, string>;
  const isEmail = channel === 'email';

  const systemPrompt = `You are a skilled sales professional writing a follow-up message (#${followUpNumber}) to a prospect who hasn't replied to your outreach.

## YOUR STRATEGY FOR THIS FOLLOW-UP
${strategyInstruction}

## CONTEXT
- Prospect: ${lead.full_name || 'Unknown'} at ${lead.company || 'Unknown Company'}
- Their role: ${lead.title || 'Decision-maker'}
- Industry: ${lead.industry || 'Unknown'}
- Location: ${lead.location || 'Unknown'}
${enrichment.company_context ? `- About them: ${enrichment.company_context}` : ''}
${enrichment.likely_pain_points ? `- Their pain points: ${enrichment.likely_pain_points}` : ''}
${campaign.value_prop ? `- What we offer: ${campaign.value_prop}` : ''}

## ORIGINAL OUTREACH THAT WAS SENT
${lead.personalized_subject ? `Subject: ${lead.personalized_subject}` : ''}
${isEmail && lead.personalized_email ? `Email: ${lead.personalized_email}` : ''}
${!isEmail && lead.personalized_opener ? `SMS: ${lead.personalized_opener}` : ''}

## RULES
1. ${isEmail ? 'Write a short email (3-6 sentences max). Include a subject line on the first line as "Subject: ..."' : 'Write a short SMS (2-3 sentences max). No subject line.'}
2. Sound human. No corporate buzzwords. No "I hope this email finds you well."
3. Reference the original outreach naturally ("my note last week" not "my previous communication").
4. DO NOT repeat the same pitch. Use the strategy above.
5. End with a clear but low-pressure CTA (question, not demand).
6. Sign with a first name only.
7. NEVER reveal you are AI.
8. Don't use emojis unless it fits the tone.
9. This is follow-up #${followUpNumber} — adjust your tone accordingly (more casual as the sequence progresses).`;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Fast + cheap for follow-ups
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Write follow-up #${followUpNumber} for ${lead.full_name || 'the prospect'} at ${lead.company || 'their company'} via ${channel}.` },
        ],
        temperature: 0.8, // Slightly higher for variety
        max_tokens: 400,
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!res.ok) {
      console.error(`[follow-up] AI generation failed: HTTP ${res.status}`);
      return { message: '', subject: null };
    }

    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content || '';

    // Parse subject from email follow-ups
    let subject: string | null = null;
    let message = raw.trim();

    if (isEmail) {
      const subjectMatch = message.match(/^Subject:\s*(.+)/i);
      if (subjectMatch) {
        subject = subjectMatch[1].trim();
        message = message.replace(/^Subject:\s*.+\n*/i, '').trim();
      } else {
        // Default subject for follow-ups
        subject = `Re: ${lead.personalized_subject || 'Quick question'}`;
      }
    }

    return { message, subject };
  } catch (err) {
    console.error('[follow-up] AI generation error:', err);
    return { message: '', subject: null };
  }
}

// ─── GHL Send ─────────────────────────────────────────────────────────────────

async function sendFollowUp(
  token: string,
  contactId: string,
  message: string,
  subject: string | null,
  channel: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const isEmail = channel === 'email';

    const body: Record<string, unknown> = {
      type: isEmail ? 'Email' : 'SMS',
      contactId,
      message,
    };

    if (isEmail && subject) {
      body.subject = subject;
      body.html = `<p>${message.replace(/\n/g, '</p><p>')}</p>`;
    }

    const res = await fetch(`${GHL_API}/conversations/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Version: GHL_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { ok: false, error: `GHL HTTP ${res.status}: ${text.slice(0, 200)}` };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function markFollowUp(svc: any, id: string, status: string, error?: string): Promise<void> {
  await svc.from('pipeline_follow_ups').update({
    status,
    error: error || null,
    updated_at: new Date().toISOString(),
  }).eq('id', id);
}

// ─── Get Follow-Up Stats ──────────────────────────────────────────────────────

/**
 * Get follow-up stats for a campaign (for UI display).
 */
export async function getFollowUpStats(campaignId: string): Promise<{
  total: number;
  pending: number;
  sent: number;
  cancelled: number;
  failed: number;
}> {
  const svc = createServiceClientWithoutCookies();

  const { data } = await svc
    .from('pipeline_follow_ups')
    .select('status')
    .eq('campaign_id', campaignId);

  const stats = { total: 0, pending: 0, sent: 0, cancelled: 0, failed: 0 };
  for (const row of data || []) {
    stats.total++;
    if (row.status === 'pending') stats.pending++;
    else if (row.status === 'sent') stats.sent++;
    else if (row.status === 'cancelled') stats.cancelled++;
    else if (row.status === 'failed') stats.failed++;
  }
  return stats;
}

/**
 * Get follow-up details for a specific lead (for lead detail modal).
 */
export async function getLeadFollowUps(leadId: string): Promise<FollowUpRecord[]> {
  const svc = createServiceClientWithoutCookies();

  const { data } = await svc
    .from('pipeline_follow_ups')
    .select('*')
    .eq('lead_id', leadId)
    .order('follow_up_number', { ascending: true });

  return (data || []) as FollowUpRecord[];
}
