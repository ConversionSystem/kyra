import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { isValidSlug } from '@/lib/agency/utils';
// Per-client gateways are now provisioned on OVH when clients are created
// No agency-level provisioning needed anymore
import type { CreateAgencyRequest, AgencyWithCounts } from '@/lib/agency/types';
import { addCredits } from '@/lib/billing/credit-engine';
import { WELCOME_CREDITS, WELCOME_CREDIT_DESCRIPTION, getPromoCode } from '@/lib/billing/credits';
import { syncLeadToCRM } from '@/lib/crm/lead-sync';

/**
 * GET /api/agency
 * Return the current user's agency data with member count and client count.
 * Returns { agency: null } if user has no agency (instead of erroring).
 */
export async function GET() {
  const result = await requireAgencyMember();
  if (result.error) {
    // For "no membership" — return null instead of an error so signup pages don't break
    if (result.error.status === 403) {
      return NextResponse.json({ agency: null }, { status: 200 });
    }
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  const { agency } = result.data;
  const supabase = await createClient();

  // Fetch counts in parallel
  const [membersResult, clientsResult] = await Promise.all([
    supabase
      .from('agency_members')
      .select('id', { count: 'exact', head: true })
      .eq('agency_id', agency.id),
    supabase
      .from('agency_clients')
      .select('id', { count: 'exact', head: true })
      .eq('agency_id', agency.id),
  ]);

  const response: AgencyWithCounts = {
    ...agency,
    member_count: membersResult.count ?? 0,
    client_count: clientsResult.count ?? 0,
  };

  return NextResponse.json(response);
}

/**
 * POST /api/agency
 * Create a new agency. Also creates an agency_member record for the user as owner.
 * Uses service client to bypass RLS during initial creation.
 */
export async function POST(request: NextRequest) {
  console.log('[POST /api/agency] Creating agency...');
  
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error('[POST /api/agency] Auth failed:', authError?.message);
    return NextResponse.json({ error: 'Not authenticated. Please log in and try again.' }, { status: 401 });
  }
  
  console.log('[POST /api/agency] User:', user.id, user.email);

  // Parse body
  let body: CreateAgencyRequest;
  try {
    body = (await request.json()) as CreateAgencyRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { name, slug, plan, referralId, promoCode, referralSource } = body as typeof body & {
    referralId?: string;
    promoCode?: string;
    referralSource?: string;
  };

  // Validate required fields
  if (!name || !slug || !plan) {
    return NextResponse.json({ error: 'Missing required fields: name, slug, plan' }, { status: 400 });
  }

  // Validate plan
  const validPlans = ['free', 'starter', 'pro', 'scale', 'beta'];
  if (!validPlans.includes(plan)) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }
  // Map 'beta' → 'pro' for DB storage (legacy beta = full access)
  const dbPlan = plan === 'beta' ? 'pro' : plan;

  // Validate slug
  if (!isValidSlug(slug)) {
    return NextResponse.json(
      { error: 'Invalid slug. Use lowercase letters, numbers, and hyphens only (2-48 chars).' },
      { status: 400 }
    );
  }

  const serviceClient = await createServiceClient();

  // Check if user already has an agency
  const { data: existingMembership } = await serviceClient
    .from('agency_members')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)
    .single();

  if (existingMembership) {
    return NextResponse.json({ error: 'You already belong to an agency' }, { status: 409 });
  }

  // Check slug uniqueness
  const { data: existingAgency } = await serviceClient
    .from('agencies')
    .select('id')
    .eq('slug', slug)
    .limit(1)
    .single();

  if (existingAgency) {
    return NextResponse.json({ error: 'This slug is already taken' }, { status: 409 });
  }

  // Create agency
  const { data: agency, error: createError } = await serviceClient
    .from('agencies')
    .insert({
      owner_id: user.id,
      name,
      slug,
      plan: dbPlan,
    })
    .select()
    .single();

  if (createError || !agency) {
    console.error('[POST /api/agency] Failed to create agency:', createError?.message, createError?.code, createError?.details);
    return NextResponse.json({ error: `Failed to create agency: ${createError?.message || 'unknown error'}` }, { status: 500 });
  }

  console.log('[POST /api/agency] Agency created:', agency.id, agency.name);

  // Create owner membership
  const { error: memberError } = await serviceClient.from('agency_members').insert({
    agency_id: agency.id,
    user_id: user.id,
    role: 'owner',
  });

  if (memberError) {
    console.error('[POST /api/agency] Failed to create member:', memberError?.message, memberError?.code, memberError?.details);
    // Rollback agency creation
    await serviceClient.from('agencies').delete().eq('id', agency.id);
    return NextResponse.json({ error: `Failed to create agency membership: ${memberError?.message || 'unknown error'}` }, { status: 500 });
  }

  console.log('[POST /api/agency] Success! Agency:', agency.id, 'User:', user.id);

  // ── Sync lead to master CRM ──────────────────────────────────────────────
  void syncLeadToCRM({
    fullName: user.user_metadata?.full_name || name,
    email: user.email || '',
    businessName: name,
    websiteUrl: null,
    accountType: 'agency',
    plan: dbPlan,
    agencyId: agency.id,
  });

  // ── Grant welcome credits ($2 free to test the platform) ────────────────
  // 200 credits = $2 worth. Enough to test, not enough to abuse.
  try {
    await addCredits(agency.id, WELCOME_CREDITS, 'bonus', WELCOME_CREDIT_DESCRIPTION);
    console.log(`[POST /api/agency] 🎁 Granted ${WELCOME_CREDITS} welcome credits to agency ${agency.id}`);

    // ── Apply promo code bonus ───────────────────────────────────────────
    const promo = promoCode ? getPromoCode(promoCode) : null;
    if (promo) {
      await addCredits(agency.id, promo.bonusCredits, 'bonus', promo.description);
      console.log(`[POST /api/agency] 🎁 Promo ${promoCode}: +${promo.bonusCredits} bonus credits`);

      // Store promo + referral source in agency settings for analytics
      await serviceClient
        .from('agencies')
        .update({
          settings: {
            promo_code: promoCode?.toUpperCase(),
            referral_source: referralSource ?? null,
            trial_days: promo.trialDays,
          },
        })
        .eq('id', agency.id);
    } else if (referralSource) {
      // Store referral source even without a promo code
      await serviceClient
        .from('agencies')
        .update({ settings: { referral_source: referralSource } })
        .eq('id', agency.id);
    }
  } catch (creditErr) {
    // Non-fatal — don't block signup if credit grant fails
    console.warn('[POST /api/agency] Failed to grant welcome credits (non-fatal):', creditErr);
  }

  // ── Send welcome email (fire-and-forget) ────────────────────────────────
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey && user.email) {
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: 'Kyra AI <welcome@kyra.conversionsystem.com>',
        to: user.email,
        subject: `Welcome to Kyra — your AI worker is ready 🎁`,
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:580px;margin:0 auto;padding:40px 24px;">

    <!-- Logo -->
    <div style="margin-bottom:32px;">
      <div style="display:inline-flex;align-items:center;gap:10px;">
        <div style="width:32px;height:32px;background:#4f46e5;border-radius:8px;display:flex;align-items:center;justify-content:center;">
          <span style="color:white;font-weight:900;font-size:14px;">K</span>
        </div>
        <span style="color:white;font-weight:700;font-size:16px;">Kyra AI</span>
      </div>
    </div>

    <!-- Hero -->
    <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);border-radius:16px;padding:32px;margin-bottom:24px;">
      <h1 style="color:white;font-size:24px;font-weight:900;margin:0 0 8px;">
        ${agency.name} is live. 🎉
      </h1>
      <p style="color:#c7d2fe;font-size:15px;margin:0;line-height:1.6;">
        Your agency dashboard is ready. We've loaded <strong style="color:white;">50 welcome credits</strong> to get you started. Here's how to get live in 10 minutes.
      </p>
    </div>

    <!-- Free credits callout -->
    <div style="background:#1e293b;border-radius:16px;padding:20px 24px;margin-bottom:24px;border:1px solid rgba(99,102,241,0.3);display:flex;align-items:center;gap:16px;">
      <span style="font-size:28px;">🪙</span>
      <div>
        <p style="color:white;font-weight:700;font-size:14px;margin:0 0 4px;">50 welcome credits — already in your account</p>
        <p style="color:#94a3b8;font-size:13px;margin:0;line-height:1.5;">50 welcome credits are already in your account. Add your own API key or top up credits when you're ready to scale.</p>
      </div>
    </div>

    <!-- Steps -->
    <div style="background:#1e293b;border-radius:16px;padding:28px;margin-bottom:24px;border:1px solid rgba(255,255,255,0.08);">
      <p style="color:#94a3b8;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 20px;">3 steps to your first AI worker</p>

      ${[
        { n: '01', title: 'Connect GoHighLevel', desc: 'Go to a client → GHL tab → paste your Private Integration token. Takes 2 minutes.', },
        { n: '02', title: 'Add your first client', desc: 'Pick an industry template (dental, real estate, cannabis, auto + 17 more). The AI personality is pre-built.', },
        { n: '03', title: 'Go live', desc: 'Your AI worker starts responding to SMS within 60 seconds. Watch it in the Conversations feed.', },
      ].map(s => `
        <div style="display:flex;gap:16px;margin-bottom:20px;">
          <div style="width:32px;height:32px;background:#4f46e5;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <span style="color:white;font-weight:900;font-size:12px;">${s.n}</span>
          </div>
          <div>
            <p style="color:white;font-weight:700;font-size:14px;margin:0 0 4px;">${s.title}</p>
            <p style="color:#94a3b8;font-size:13px;margin:0;line-height:1.5;">${s.desc}</p>
          </div>
        </div>
      `).join('')}
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:32px;">
      <a href="https://kyra.conversionsystem.com/agency" style="display:inline-block;background:#4f46e5;color:white;font-weight:700;font-size:15px;text-decoration:none;padding:14px 32px;border-radius:12px;">
        Open Your Dashboard →
      </a>
    </div>

    <!-- Resources -->
    <div style="background:#1e293b;border-radius:16px;padding:24px;margin-bottom:24px;border:1px solid rgba(255,255,255,0.08);">
      <p style="color:#94a3b8;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 16px;">Useful links</p>
      <div style="display:flex;flex-direction:column;gap:10px;">
        ${[
          { label: '📦 Business in a Box', url: 'https://kyra.conversionsystem.com/agency/biz-in-a-box', desc: 'Scripts + templates to sign your first 5 clients' },
          { label: '🎬 Live Demo Pages', url: 'https://kyra.conversionsystem.com/demo/dental', desc: 'Share with prospects — no login required' },
          { label: '💰 ROI Calculator', url: 'https://kyra.conversionsystem.com/roi', desc: 'Show prospects their specific return' },
          { label: '📧 Cold Email Templates', url: 'https://kyra.conversionsystem.com/agency/sales-kit', desc: 'Ready-to-send outreach for every industry' },
        ].map(r => `
          <a href="${r.url}" style="text-decoration:none;">
            <div style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:rgba(255,255,255,0.04);border-radius:8px;">
              <div>
                <p style="color:white;font-size:13px;font-weight:600;margin:0;">${r.label}</p>
                <p style="color:#64748b;font-size:12px;margin:4px 0 0;">${r.desc}</p>
              </div>
              <span style="color:#4f46e5;font-size:14px;">→</span>
            </div>
          </a>
        `).join('')}
      </div>
    </div>

    <!-- Footer -->
    <p style="color:#334155;font-size:12px;text-align:center;line-height:1.6;">
      Kyra AI by Conversion System · <a href="https://kyra.conversionsystem.com" style="color:#475569;">kyra.conversionsystem.com</a><br>
      Reply to this email if you have any questions. We read every one.
    </p>

  </div>
</body>
</html>`,
      }),
    }).catch(err => console.warn('[welcome-email] Failed to send:', err));
  }

  // ── Referral Machine — double-sided rewards + early bird + streak ──────
  if (referralId && referralId !== agency.id) {
    void (async () => {
      try {
        // Determine if referrer is within their 48-hour Early Bird window
        const { data: referrerAgency } = await serviceClient
          .from('agencies')
          .select('created_at')
          .eq('id', referralId)
          .single();

        const hoursElapsed = referrerAgency
          ? (Date.now() - new Date(referrerAgency.created_at).getTime()) / 3_600_000
          : 999;
        const isEarlyBird = hoursElapsed < 48;

        // Log the referral record — referrer_credits_granted = 0 until activation
        // Referrer credits are held until friend sends their FIRST real AI message
        // (prevents fake email abuse — see lib/billing/referral-activation.ts)
        const { error: insertErr } = await serviceClient
          .from('agency_referrals')
          .insert({
            referrer_id: referralId,
            referred_id: agency.id,
            referred_email: user.email,
            status: 'signed_up',
            early_bird: isEarlyBird,
            referrer_credits_granted: 0,   // Granted on activation, not signup
            friend_credits_granted: 100,
          });

        if (insertErr) {
          console.warn('[referral] Failed to log:', insertErr.message);
          return;
        }

        console.log(`[referral] Agency ${agency.id} referred by ${referralId} | earlyBird=${isEarlyBird} | referrer credits PENDING activation`);

        // 🎁 Reward the FRIEND immediately (motivates them to actually use it)
        await addCredits(
          agency.id,
          100,
          'bonus',
          'Welcome referral bonus — a friend referred you to Kyra. Enjoy 100 free AI credits! 🎁',
        );

        // ⏳ Referrer credits are granted when friend sends first AI message
        // See: lib/billing/referral-activation.ts → called from /api/widget/chat
      } catch (e) {
        console.warn('[referral] Reward error:', e);
      }
    })();
  }

  // ── New signup webhook (fire-and-forget) ────────────────────────────────
  const signupWebhook = process.env.SIGNUP_WEBHOOK_URL;
  if (signupWebhook) {
    void fetch(signupWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `🚀 *New Kyra signup!*\n*Agency:* ${agency.name}\n*Email:* ${user.email ?? 'unknown'}\n*Plan:* Free\n*Time:* ${new Date().toLocaleString('en-US', { timeZone: 'Europe/Bratislava' })} CET`,
        embeds: [{
          title: `New agency: ${agency.name}`,
          description: `${user.email} just signed up for Kyra`,
          color: 0x4f46e5,
          timestamp: new Date().toISOString(),
        }],
      }),
    }).catch(() => {});
  }

  // ── Gateway provisioning moved to per-client (OVH architecture) ──────────
  return NextResponse.json(agency, { status: 201 });
}
