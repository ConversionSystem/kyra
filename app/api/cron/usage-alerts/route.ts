import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { sendEmailViaResend } from '@/lib/email/sender';
import { PLANS } from '@/lib/billing/plans';
import type { Plan } from '@/lib/billing/plans';
import { requireCron } from '@/lib/auth/cron';

/**
 * GET /api/cron/usage-alerts
 *
 * Daily cron job — runs at 08:00 UTC.
 * Checks every agency's credit balance and web scrape usage.
 * Sends a warning email when an agency hits 80% of their monthly allowance.
 *
 * Deduplication: stores `usage_alert_sent_month` in agency settings so the
 * email fires at most once per calendar month per agency.
 *
 * Secured by Vercel's CRON_SECRET header.
 */
export async function GET(request: NextRequest) {
  const unauthorized = requireCron(request);
  if (unauthorized) return unauthorized;

  const supabase = createServiceClientWithoutCookies();
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // ── Fetch all agencies ──────────────────────────────────────────────────────
  const { data: agencies, error } = await supabase
    .from('agencies')
    .select(`
      id,
      name,
      plan,
      settings,
      agency_members(user_id, role)
    `);

  if (error || !agencies) {
    console.error('[cron/usage-alerts] Failed to fetch agencies:', error);
    return NextResponse.json({ error: 'Failed to load agencies' }, { status: 500 });
  }

  let emailsSent = 0;
  let emailsSkipped = 0;
  const results: Array<{ agencyId: string; agencyName: string; reason: string; sent: boolean }> = [];

  for (const agency of agencies) {
    const settings = (agency.settings ?? {}) as Record<string, unknown>;
    const plan = (agency.plan as Plan) ?? 'free';
    const planConfig = PLANS[plan];

    // ── Dedup: only fire once per calendar month ──────────────────────────────
    const alertSentMonth = settings.usage_alert_sent_month as string | undefined;
    if (alertSentMonth === currentMonth) {
      emailsSkipped++;
      results.push({ agencyId: agency.id, agencyName: agency.name, reason: 'already_sent_this_month', sent: false });
      continue;
    }

    // ── Resolve owner email ───────────────────────────────────────────────────
    const owner = (agency.agency_members as Array<{ user_id: string; role: string }>)
      ?.find(m => m.role === 'owner');
    if (!owner) {
      results.push({ agencyId: agency.id, agencyName: agency.name, reason: 'no_owner_member', sent: false });
      continue;
    }

    const { data: userData } = await supabase.auth.admin.getUserById(owner.user_id);
    const ownerEmail = userData?.user?.email;
    if (!ownerEmail) {
      results.push({ agencyId: agency.id, agencyName: agency.name, reason: 'no_owner_email', sent: false });
      continue;
    }

    const ownerName = (settings.owner_name as string) || ownerEmail.split('@')[0];

    // ── Check credit balance (80% used) ──────────────────────────────────────
    let creditAlert: { used: number; limit: number } | null = null;

    const { data: creditRow } = await supabase
      .from('agency_credits')
      .select('balance, lifetime_purchased')
      .eq('agency_id', agency.id)
      .maybeSingle();

    if (creditRow) {
      const lifetimePurchased = creditRow.lifetime_purchased ?? 0;
      const balance = creditRow.balance ?? 0;
      // Calculate used credits: lifetime_purchased - current balance
      // For agencies with monthly credits, we approximate monthly usage
      const monthlyCredits = planConfig?.monthlyCredits ?? 0;
      if (monthlyCredits > 0) {
        // Check if used >= 80% of monthly included credits
        const usedThisMonth = monthlyCredits - Math.max(0, balance);
        const pct = usedThisMonth / monthlyCredits;
        if (pct >= 0.8) {
          creditAlert = { used: usedThisMonth, limit: monthlyCredits };
        }
      } else if (lifetimePurchased > 0) {
        // PAYG: alert when balance < 20% of lifetime_purchased
        const pct = balance / lifetimePurchased;
        if (pct <= 0.2 && balance < 200) {
          creditAlert = { used: lifetimePurchased - balance, limit: lifetimePurchased };
        }
      }
    }

    // ── Check web scrape usage (80% of monthly allowance) ────────────────────
    let scrapeAlert: { used: number; limit: number } | null = null;

    const monthlyWebScrapes = planConfig?.monthlyWebScrapes ?? 0;
    if (monthlyWebScrapes > 0) {
      const { data: fcUsage } = await supabase
        .from('firecrawl_usage')
        .select('scrapes_used')
        .eq('agency_id', agency.id)
        .eq('year_month', currentMonth)
        .maybeSingle();

      if (fcUsage) {
        const used = fcUsage.scrapes_used ?? 0;
        const pct = used / monthlyWebScrapes;
        if (pct >= 0.8) {
          scrapeAlert = { used, limit: monthlyWebScrapes };
        }
      }
    }

    // ── Skip if nothing to alert ──────────────────────────────────────────────
    if (!creditAlert && !scrapeAlert) {
      results.push({ agencyId: agency.id, agencyName: agency.name, reason: 'below_threshold', sent: false });
      continue;
    }

    // ── Build alert email ─────────────────────────────────────────────────────
    const alertItems: string[] = [];
    const alertHtmlItems: string[] = [];

    if (creditAlert) {
      const pct = Math.round((creditAlert.used / creditAlert.limit) * 100);
      alertItems.push(`⚠️ AI Credits: ${pct}% used (${creditAlert.used.toLocaleString()} / ${creditAlert.limit.toLocaleString()})`);
      alertHtmlItems.push(`
        <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:16px;margin-bottom:12px;">
          <strong style="color:#92400e;">⚠️ AI Credits Running Low</strong><br/>
          <span style="color:#78350f;font-size:14px;">
            You've used <strong>${pct}%</strong> of your monthly credits
            (${creditAlert.used.toLocaleString()} / ${creditAlert.limit.toLocaleString()}).
            Resets on the 1st of next month.
          </span>
        </div>
      `);
    }

    if (scrapeAlert) {
      const pct = Math.round((scrapeAlert.used / scrapeAlert.limit) * 100);
      alertItems.push(`⚠️ Web Intelligence: ${pct}% used (${scrapeAlert.used.toLocaleString()} / ${scrapeAlert.limit.toLocaleString()} scrapes)`);
      alertHtmlItems.push(`
        <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:16px;margin-bottom:12px;">
          <strong style="color:#92400e;">⚠️ Web Intelligence Scrapes Running Low</strong><br/>
          <span style="color:#78350f;font-size:14px;">
            You've used <strong>${pct}%</strong> of your monthly web scrapes
            (${scrapeAlert.used.toLocaleString()} / ${scrapeAlert.limit.toLocaleString()}).
            Resets on the 1st of next month.
          </span>
        </div>
      `);
    }

    const subject = `⚠️ ${agency.name} — You're at 80%+ usage on Kyra`;
    const textBody = `Hi ${ownerName},\n\nYour Kyra workspace is approaching its monthly limits:\n\n${alertItems.join('\n')}\n\nTop up or upgrade at: https://kyra.conversionsystem.com/agency/credits\n\n— Kyra`;

    const htmlBody = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);color:white;padding:24px;border-radius:12px;margin-bottom:20px;">
          <h1 style="margin:0 0 4px 0;font-size:20px;">⚠️ Usage Alert</h1>
          <p style="margin:0;opacity:0.85;font-size:14px;">${agency.name}</p>
        </div>

        <p style="color:#374151;font-size:15px;">Hi ${ownerName},</p>
        <p style="color:#374151;font-size:14px;line-height:1.6;">
          Your Kyra workspace is approaching its monthly limits. Here's what needs attention:
        </p>

        ${alertHtmlItems.join('')}

        <div style="margin-top:24px;text-align:center;">
          <a href="https://kyra.conversionsystem.com/agency/credits"
             style="display:inline-block;background:#4f46e5;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
            Top Up Credits →
          </a>
          &nbsp;&nbsp;
          <a href="https://kyra.conversionsystem.com/agency/settings/billing"
             style="display:inline-block;background:#f3f4f6;color:#374151;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
            Upgrade Plan →
          </a>
        </div>

        <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:24px;">
          Kyra AI — Your AI Workforce Platform<br/>
          <a href="https://kyra.conversionsystem.com/agency/settings" style="color:#9ca3af;">Manage notification preferences</a>
        </p>
      </div>
    `;

    // ── Send email ────────────────────────────────────────────────────────────
    const sendResult = await sendEmailViaResend({
      to: ownerEmail,
      subject,
      body: textBody,
      html: htmlBody,
      fromName: 'Kyra',
    });

    if (sendResult.ok) {
      // Mark alert as sent for this calendar month
      await supabase
        .from('agencies')
        .update({
          settings: { ...settings, usage_alert_sent_month: currentMonth },
        })
        .eq('id', agency.id);

      emailsSent++;
      results.push({ agencyId: agency.id, agencyName: agency.name, reason: 'sent', sent: true });
      console.log(`[cron/usage-alerts] ✅ Alert sent → ${agency.name} (${ownerEmail})`);
    } else {
      results.push({ agencyId: agency.id, agencyName: agency.name, reason: `send_failed: ${sendResult.error}`, sent: false });
      console.error(`[cron/usage-alerts] ❌ Failed → ${agency.name}: ${sendResult.error}`);
    }
  }

  console.log(`[cron/usage-alerts] Done: ${emailsSent} sent, ${emailsSkipped} skipped (already sent this month)`);

  return NextResponse.json({
    ok: true,
    timestamp: now.toISOString(),
    month: currentMonth,
    agenciesChecked: agencies.length,
    emailsSent,
    emailsSkipped,
    results,
  });
}
