/**
 * POST /api/cron/crm-autopilot
 *
 * Daily CRM autonomous operations:
 * 1. Score all contacts (cold/warm/hot)
 * 2. Detect stale deals + draft follow-ups
 * 3. Run Deal Autopilot (AI works deals forward)
 * 4. Execute automation rules
 * 5. Store digest as Command Feed activities
 *
 * Runs daily at 8 AM UTC via Vercel cron.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { scoreContacts } from '@/lib/crm/scoring';
import { detectStaleDeals } from '@/lib/crm/stale-deals';
import { runDealAutopilot } from '@/lib/crm/deal-autopilot';
import { getRules, executeRule } from '@/lib/crm/rules';
import { logActivity } from '@/lib/crm/activities';
import { scanForAutoDeals } from '@/lib/crm/auto-deal';
import { sendDigestEmail } from '@/lib/email/sender';
import { requireCron } from '@/lib/auth/cron';

export async function POST(req: NextRequest) {
  const unauthorized = requireCron(req);
  if (unauthorized) return unauthorized;

  const svc = createServiceClientWithoutCookies();
  const results: Record<string, unknown>[] = [];

  try {
    // Get all active agencies
    const { data: agencies } = await svc
      .from('agencies')
      .select('id, name')
      .eq('status', 'active');

    if (!agencies?.length) {
      return NextResponse.json({ message: 'No active agencies', results: [] });
    }

    for (const agency of agencies) {
      const agencyResult: Record<string, unknown> = { agency: agency.name, agency_id: agency.id };

      try {
        // 1. Score contacts
        const scoring = await scoreContacts(agency.id);
        agencyResult.scoring = scoring;

        // 2. Detect stale deals
        const stale = await detectStaleDeals(agency.id);
        agencyResult.stale_deals = stale;

        // 3. Run Deal Autopilot
        const autopilot = await runDealAutopilot(agency.id);
        agencyResult.autopilot = {
          deals_worked: autopilot.deals_worked,
          follow_ups_drafted: autopilot.follow_ups_drafted,
          deals_progressed: autopilot.deals_progressed,
        };

        // 4. Execute automation rules
        const rules = await getRules(agency.id);
        const enabledRules = rules.filter((r) => r.enabled);
        let rulesExecuted = 0;
        for (const rule of enabledRules) {
          try {
            const result = await executeRule(agency.id, rule);
            if (result.executed) rulesExecuted++;
          } catch (err) {
            console.error(`[crm-autopilot] Rule "${rule.name}" failed:`, err);
          }
        }
        agencyResult.rules = { total: enabledRules.length, executed: rulesExecuted };

        // 5. Auto-deal creation from conversation signals
        const autoDeals = await scanForAutoDeals(agency.id);
        agencyResult.auto_deals = autoDeals;

        // 6. Log daily digest to Command Feed
        const totalActions =
          (scoring.scored || 0) +
          (stale.drafted || 0) +
          autopilot.deals_worked +
          rulesExecuted +
          (autoDeals.created || 0);

        if (totalActions > 0) {
          const summaryParts: string[] = [];
          if (scoring.scored > 0) summaryParts.push(`Scored ${scoring.scored} contacts`);
          if (stale.stale > 0) summaryParts.push(`${stale.stale} stale deals detected, ${stale.drafted} follow-ups drafted`);
          if (autopilot.deals_worked > 0) summaryParts.push(`Worked ${autopilot.deals_worked} deals (${autopilot.follow_ups_drafted} follow-ups, ${autopilot.deals_progressed} progressed)`);
          if (rulesExecuted > 0) summaryParts.push(`Executed ${rulesExecuted} automation rules`);
          if (autoDeals.created > 0) summaryParts.push(`Auto-created ${autoDeals.created} deals from conversation signals`);

          await logActivity(agency.id, {
            type: 'system',
            subject: '🤖 Daily AI CRM Digest',
            body: `**AI handled automatically today:**\n\n${summaryParts.map((s) => `• ${s}`).join('\n')}\n\n${autopilot.summary || ''}`,
            actor: 'system',
            actor_name: 'CRM Autopilot',
            needs_attention: false,
            metadata: {
              digest_type: 'daily_autopilot',
              scoring,
              stale_deals: stale,
              autopilot: {
                deals_worked: autopilot.deals_worked,
                follow_ups_drafted: autopilot.follow_ups_drafted,
              },
              rules_executed: rulesExecuted,
            },
          });

          // Log individual autopilot actions that need attention
          for (const action of autopilot.actions) {
            if (action.priority === 'high') {
              await logActivity(agency.id, {
                type: 'ai_message',
                subject: `Deal: ${action.deal_name}`,
                body: `${action.description}${action.ai_draft ? `\n\n**AI Draft:**\n${action.ai_draft}` : ''}`,
                actor: 'ai',
                actor_name: 'Deal Autopilot',
                needs_attention: true,
                attention_type: 'approval_needed',
                metadata: {
                  deal_id: action.deal_id,
                  action_type: action.action_type,
                  priority: action.priority,
                },
              });
            }
          }
        }

        agencyResult.total_actions = totalActions;

        // 7. Send digest email to agency owner (if any actions happened)
        if (totalActions > 0) {
          try {
            const { data: owner } = await svc
              .from('agency_members')
              .select('user_id')
              .eq('agency_id', agency.id)
              .eq('role', 'owner')
              .limit(1)
              .single();

            if (owner?.user_id) {
              const { data: profile } = await svc.auth.admin.getUserById(owner.user_id);
              const ownerEmail = profile?.user?.email;
              if (ownerEmail) {
                const emailParts: string[] = [];
                if (scoring.scored > 0) emailParts.push(`Scored ${scoring.scored} contacts`);
                if (stale.stale > 0) emailParts.push(`${stale.stale} stale deals, ${stale.drafted} follow-ups drafted`);
                if (autopilot.deals_worked > 0) emailParts.push(`Worked ${autopilot.deals_worked} deals`);
                if (rulesExecuted > 0) emailParts.push(`Executed ${rulesExecuted} automation rules`);
                if (autoDeals.created > 0) emailParts.push(`Auto-created ${autoDeals.created} deals`);
                const digestBody = emailParts.map((s: string) => `• ${s}`).join('\n');
                await sendDigestEmail(ownerEmail, agency.name, digestBody);
                agencyResult.digest_emailed = true;
              }
            }
          } catch (emailErr) {
            // Non-fatal — digest email is nice-to-have
            agencyResult.digest_email_error = String(emailErr);
          }
        }
      } catch (err) {
        agencyResult.error = String(err);
        console.error(`[crm-autopilot] Agency ${agency.name} failed:`, err);
      }

      results.push(agencyResult);
    }

    console.log(`[crm-autopilot] Completed for ${agencies.length} agencies`);
    return NextResponse.json({ ok: true, agencies: agencies.length, results });
  } catch (err) {
    console.error('[crm-autopilot] Fatal error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// Also support GET for manual testing
export async function GET(req: NextRequest) {
  return POST(req);
}
