import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isValidSlug, toSlug } from '@/lib/agency/utils';
import { addCredits } from '@/lib/billing/credit-engine';
import { provisionClientGateway } from '@/lib/ovh/provisioner';
import { buildInjectionDefensePromptSuffix } from '@/lib/security/prompt-injection';
import { syncLeadToCRM } from '@/lib/crm/lead-sync';
import { activateReferral } from '@/lib/billing/referral-activation';
import { isRateLimited } from '@/lib/rate-limit';

const SOLO_WELCOME_CREDITS = 50;
const SOLO_WELCOME_DESCRIPTION = 'Kyra Solo Free — 50 welcome credits';

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/**
 * POST /api/auth/solo-signup
 *
 * One-shot signup for Kyra Solo free tier.
 * Creates: user → agency (account_type=solo) → member → credits → client → container
 */
export async function POST(request: NextRequest) {
  let body: {
    businessName: string;
    fullName: string;
    email: string;
    password: string;
    websiteUrl?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Rate limit signups: 5 per IP per minute
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
  if (await isRateLimited(`signup:${ip}`, 5, 60_000)) {
    return NextResponse.json({ error: 'Too many signup attempts. Please try again later.' }, { status: 429 });
  }

  const { businessName, fullName, email, password, websiteUrl } = body as typeof body & { referralId?: string };
  // Referral: prefer body value (from URL param), fall back to cookie (survives navigation + tab closes)
  const cookieRef = request.cookies.get('kyra_ref')?.value;
  const referralId = (body as typeof body & { referralId?: string }).referralId || cookieRef || undefined;

  // ── Validate ────────────────────────────────────────────────────────────
  if (!businessName || !fullName || !email || !password) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const slug = toSlug(businessName);
  if (!slug || !isValidSlug(slug)) {
    return NextResponse.json(
      { error: 'Business name produces an invalid URL slug. Try a different name.' },
      { status: 400 },
    );
  }

  const supabase = getServiceSupabase();

  // ── Saga tracker — rollback on failure ──────────────────────────────────
  const created = {
    authUser: null as string | null,
    agency: null as string | null,
    member: false,
    credits: false,
    client: null as string | null,
  };

  async function rollback() {
    console.error('[solo-signup] Rolling back created resources...');
    if (created.client) await supabase.from('agency_clients').delete().eq('id', created.client).then(({ error }) => { if (error) console.error('[solo-signup] Rollback failed (client):', error); });
    if (created.credits && created.agency) await supabase.from('agency_credits').delete().eq('agency_id', created.agency).then(({ error }) => { if (error) console.error('[solo-signup] Rollback failed (credits):', error); });
    if (created.credits && created.agency) await supabase.from('credit_transactions').delete().eq('agency_id', created.agency).then(({ error }) => { if (error) console.error('[solo-signup] Rollback failed (credit_transactions):', error); });
    if (created.member && created.agency) await supabase.from('agency_members').delete().eq('agency_id', created.agency).eq('user_id', created.authUser!).then(({ error }) => { if (error) console.error('[solo-signup] Rollback failed (member):', error); });
    if (created.agency) await supabase.from('agencies').delete().eq('id', created.agency).then(({ error }) => { if (error) console.error('[solo-signup] Rollback failed (agency):', error); });
    if (created.authUser) await supabase.auth.admin.deleteUser(created.authUser).catch((err: unknown) => console.error('[solo-signup] Rollback failed (auth):', err));
  }

  let agency: Record<string, unknown>;
  let client: Record<string, unknown> | null = null;

  try {
    // ── 1. Create Supabase auth user ──────────────────────────────────────
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, signup_type: 'solo' },
    });

    if (authError || !authData.user) {
      console.error('[solo-signup] Auth error:', authError?.message);
      if (authError?.message?.toLowerCase().includes('already')) {
        return NextResponse.json(
          { error: 'This email is already registered. Try logging in instead.' },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { error: authError?.message || 'Failed to create account' },
        { status: 500 },
      );
    }

    const userId = authData.user.id;
    created.authUser = userId;

    // ── 2. Check slug uniqueness ──────────────────────────────────────────
    const { data: existingAgency } = await supabase
      .from('agencies')
      .select('id')
      .eq('slug', slug)
      .limit(1)
      .single();

    if (existingAgency) {
      await rollback();
      return NextResponse.json(
        { error: 'This business name is taken. Try a different one.' },
        { status: 409 },
      );
    }

    // ── 3. Create agency with account_type = "solo" ───────────────────────
    const { data: agencyData, error: agencyError } = await supabase
      .from('agencies')
      .insert({
        owner_id: userId,
        name: businessName,
        slug,
        plan: 'free',
        settings: {
          account_type: 'solo',
          owner_name: fullName,
          website_url: websiteUrl || null,
        },
      })
      .select()
      .single();

    if (agencyError || !agencyData) {
      console.error('[solo-signup] Agency creation failed:', agencyError?.message);
      await rollback();
      return NextResponse.json(
        { error: 'Failed to create your workspace. Please try again.' },
        { status: 500 },
      );
    }

    agency = agencyData;
    created.agency = agency.id as string;

    // ── 4. Create owner membership ────────────────────────────────────────
    const { error: memberError } = await supabase.from('agency_members').insert({
      agency_id: agency.id,
      user_id: userId,
      role: 'owner',
    });

    if (memberError) {
      console.error('[solo-signup] Member creation failed:', memberError.message);
      await rollback();
      return NextResponse.json(
        { error: 'Failed to set up your account. Please try again.' },
        { status: 500 },
      );
    }

    created.member = true;

    // ── 5. Add 50 welcome credits ────────────────────────────────────────
    try {
      await addCredits(agency.id as string, SOLO_WELCOME_CREDITS, 'bonus', SOLO_WELCOME_DESCRIPTION);
      created.credits = true;
      console.log(`[solo-signup] Granted ${SOLO_WELCOME_CREDITS} credits to ${agency.id}`);
    } catch (err) {
      console.warn('[solo-signup] Failed to grant credits (non-fatal):', err);
    }

    // ── 6. Create a client record (owner IS the client) ──────────────────
    const { data: clientData, error: clientError } = await supabase
      .from('agency_clients')
      .insert({
        agency_id: agency.id,
        name: businessName,
        slug,
        industry: 'General',
        status: 'setup',
        settings: { is_solo_client: true },
      })
      .select()
      .single();

    if (clientError || !clientData) {
      console.error('[solo-signup] Client creation failed:', clientError?.message);
      // Non-fatal — user can still access dashboard, just no container yet
    } else {
      client = clientData;
      created.client = clientData.id as string;
    }
  } catch (error) {
    console.error('[solo-signup] Unexpected failure, rolling back:', error);
    await rollback();
    return NextResponse.json({ error: 'Signup failed, please try again' }, { status: 500 });
  }

  // ── Fire-and-forget side effects (outside saga — failures don't roll back) ──

  // 5b. Sync lead to master CRM
  void syncLeadToCRM({
    fullName,
    email,
    businessName,
    websiteUrl: websiteUrl || null,
    accountType: 'solo',
    plan: 'free',
    agencyId: agency.id as string,
    referredBy: referralId,
  });

  // 5c. Referral Machine — double-sided rewards
  if (referralId && referralId !== (agency.id as string)) {
    void (async () => {
      try {
        const { data: referrerAgency } = await supabase
          .from('agencies')
          .select('id, created_at, settings')
          .eq('id', referralId)
          .single();

        if (!referrerAgency) {
          console.warn(`[solo-signup] Referral ID not found: ${referralId}`);
          return;
        }

        const hoursElapsed = (Date.now() - new Date(referrerAgency.created_at).getTime()) / 3_600_000;
        const isEarlyBird = hoursElapsed < 48;

        const { data: referralRow } = await supabase.from('agency_referrals').insert({
          referrer_id: referralId,
          referred_id: agency.id,
          referred_email: email,
          status: 'signed_up',
          early_bird: isEarlyBird,
          referrer_credits_granted: 0,
          friend_credits_granted: 0,
        }).select('id').single();

        const referrerSettings = (referrerAgency.settings ?? {}) as Record<string, unknown>;
        const currentSignups = (referrerSettings.invite_signups as number) ?? 0;
        await supabase
          .from('agencies')
          .update({
            settings: {
              ...referrerSettings,
              invite_signups: currentSignups + 1,
            },
          })
          .eq('id', referralId);

        if (referralRow?.id) {
          await activateReferral(referralRow.id, referralId, agency.id as string, isEarlyBird);
        }

        console.log(`[solo-signup] Referral activated: ${referralId} → ${agency.id} (earlyBird: ${isEarlyBird})`);
      } catch (e) {
        console.warn('[solo-signup] Referral reward error:', e);
      }
    })();
  }

  // ── 7. Auto-provision container (fire-and-forget — own try/catch) ───────
  if (client) {
    void (async () => {
      try {
        const soulLines = [
          `# SOUL.md — ${businessName}`,
          '',
          '## Who You Are',
          `You are the AI assistant for **${businessName}**.`,
          `You help the business owner, ${fullName}, manage their business and communicate with customers.`,
          '',
          '## Your Role',
          '- Answer customer questions about the business',
          '- Help schedule appointments and manage inquiries',
          '- Be friendly, professional, and helpful',
          '- If you don\'t know something specific, offer to connect them with the owner',
          '',
          '## Communication Style',
          '- Keep replies concise and clear',
          '- Be warm and professional',
          '- Ask one focused question if you need more info',
        ];

        const soulMd = soulLines.join('\n') + buildInjectionDefensePromptSuffix();
        const userMd = `# ${businessName}\n\nOwner: ${fullName}\nType: Solo business\n${websiteUrl ? `Website: ${websiteUrl}` : ''}`;

        const result = await provisionClientGateway(
          client.id as string,
          agency.id as string,
          { soulMd, userMd },
          { memoryMb: 1024, cpuShares: 256 },
          businessName,
        );
        if (result.success) {
          console.log(`[solo-signup] Container provisioned for ${client.id}: ${result.gatewayUrl}`);
          await supabase
            .from('agencies')
            .update({
              settings: {
                ...((agency.settings as Record<string, unknown>) || {}),
                solo_client_id: client.id,
              },
            })
            .eq('id', agency.id);
        } else {
          console.warn(`[solo-signup] Container provision failed: ${result.error}. Retrying...`);
          await new Promise(r => setTimeout(r, 5000));
          const retry = await provisionClientGateway(
            client.id as string,
            agency.id as string,
            { soulMd, userMd },
            { memoryMb: 1024, cpuShares: 256 },
            businessName,
          );
          if (retry.success) {
            console.log(`[solo-signup] Container provisioned on retry for ${client.id}`);
            await supabase
              .from('agencies')
              .update({
                settings: {
                  ...((agency.settings as Record<string, unknown>) || {}),
                  solo_client_id: client.id,
                },
              })
              .eq('id', agency.id);
          } else {
            console.error(`[solo-signup] Container provision failed after retry: ${retry.error}`);
          }
        }
      } catch (err) {
        console.error('[solo-signup] Container provisioning error:', err);
      }
    })();

    // ── 8. Auto-train from website if URL provided (fire-and-forget) ──────
    if (websiteUrl) {
      void (async () => {
        try {
          await new Promise(r => setTimeout(r, 15000));
          const trainRes = await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL || 'https://kyra.conversionsystem.com'}/api/agency/clients/${client!.id}/knowledge`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-service-key': process.env.SUPABASE_SERVICE_ROLE_KEY || '',
              },
              body: JSON.stringify({ type: 'website', url: websiteUrl }),
            },
          );
          if (trainRes.ok) {
            console.log(`[solo-signup] Started website training for ${client!.id}: ${websiteUrl}`);
          } else {
            console.warn(`[solo-signup] Website training failed: ${trainRes.status}`);
          }
        } catch (err) {
          console.warn('[solo-signup] Website training error (non-fatal):', err);
        }
      })();
    }
  }

  // ── 9. New signup webhook (fire-and-forget) ─────────────────────────────
  const signupWebhook = process.env.SIGNUP_WEBHOOK_URL;
  if (signupWebhook) {
    void fetch(signupWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `New Kyra Solo signup!\n*Business:* ${businessName}\n*Owner:* ${fullName}\n*Email:* ${email}\n*Plan:* Solo Free\n*Website:* ${websiteUrl || 'none'}\n*Time:* ${new Date().toLocaleString('en-US', { timeZone: 'Europe/Bratislava' })} CET`,
        embeds: [{
          title: `New Solo signup: ${businessName}`,
          description: `${fullName} (${email}) signed up for Kyra Solo Free`,
          color: 0x10b981,
          timestamp: new Date().toISOString(),
        }],
      }),
    }).catch(() => {});
  }

  // ── Return success — the client signs in on the frontend ────────────────
  return NextResponse.json(
    {
      success: true,
      agencyId: agency.id as string,
      clientId: (client?.id as string) || null,
      message: 'Account created! Your AI worker is being set up.',
    },
    { status: 201 },
  );
}
