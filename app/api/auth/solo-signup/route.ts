import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isValidSlug, toSlug } from '@/lib/agency/utils';
import { addCredits } from '@/lib/billing/credit-engine';
import { provisionClientGateway } from '@/lib/ovh/provisioner';
import { buildInjectionDefensePromptSuffix } from '@/lib/security/prompt-injection';

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

  const { businessName, fullName, email, password, websiteUrl, referralId } = body as typeof body & { referralId?: string };

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

  // ── 1. Create Supabase auth user ────────────────────────────────────────
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm for solo — no email verification friction
    user_metadata: { full_name: fullName, signup_type: 'solo' },
  });

  if (authError || !authData.user) {
    console.error('[solo-signup] Auth error:', authError?.message);
    // Supabase returns "User already registered" for duplicates
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

  // ── 2. Check slug uniqueness ────────────────────────────────────────────
  const { data: existingAgency } = await supabase
    .from('agencies')
    .select('id')
    .eq('slug', slug)
    .limit(1)
    .single();

  if (existingAgency) {
    // Cleanup: delete the just-created auth user
    await supabase.auth.admin.deleteUser(userId);
    return NextResponse.json(
      { error: 'This business name is taken. Try a different one.' },
      { status: 409 },
    );
  }

  // ── 3. Create agency with account_type = "solo" ─────────────────────────
  const { data: agency, error: agencyError } = await supabase
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

  if (agencyError || !agency) {
    console.error('[solo-signup] Agency creation failed:', agencyError?.message);
    await supabase.auth.admin.deleteUser(userId);
    return NextResponse.json(
      { error: 'Failed to create your workspace. Please try again.' },
      { status: 500 },
    );
  }

  // ── 4. Create owner membership ──────────────────────────────────────────
  const { error: memberError } = await supabase.from('agency_members').insert({
    agency_id: agency.id,
    user_id: userId,
    role: 'owner',
  });

  if (memberError) {
    console.error('[solo-signup] Member creation failed:', memberError.message);
    await supabase.from('agencies').delete().eq('id', agency.id);
    await supabase.auth.admin.deleteUser(userId);
    return NextResponse.json(
      { error: 'Failed to set up your account. Please try again.' },
      { status: 500 },
    );
  }

  // ── 5. Add 50 welcome credits ──────────────────────────────────────────
  try {
    await addCredits(agency.id, SOLO_WELCOME_CREDITS, 'bonus', SOLO_WELCOME_DESCRIPTION);
    console.log(`[solo-signup] 🎁 Granted ${SOLO_WELCOME_CREDITS} credits to ${agency.id}`);
  } catch (err) {
    console.warn('[solo-signup] Failed to grant credits (non-fatal):', err);
  }

  // ── 5b. Referral Machine — double-sided rewards ─────────────────────────
  if (referralId && referralId !== agency.id) {
    void (async () => {
      try {
        const { data: referrerAgency } = await supabase
          .from('agencies')
          .select('created_at')
          .eq('id', referralId)
          .single();

        const hoursElapsed = referrerAgency
          ? (Date.now() - new Date(referrerAgency.created_at).getTime()) / 3_600_000
          : 999;
        const isEarlyBird = hoursElapsed < 48;

        // Log referral — referrer credits held at 0 until friend activates
        await supabase.from('agency_referrals').insert({
          referrer_id: referralId,
          referred_id: agency.id,
          referred_email: email,
          status: 'signed_up',
          early_bird: isEarlyBird,
          referrer_credits_granted: 0,   // Granted on first AI message (activation gate)
          friend_credits_granted: 100,
        });

        // 🎁 Friend gets credits immediately (motivates real usage)
        await addCredits(
          agency.id,
          100,
          'bonus',
          'Welcome referral bonus — a friend referred you to Kyra. Enjoy 100 free AI credits! 🎁',
        );

        // ⏳ Referrer credits granted when friend sends first AI message
        // See: lib/billing/referral-activation.ts → called from /api/widget/chat
      } catch (e) {
        console.warn('[solo-signup] Referral reward error:', e);
      }
    })();
  }

  // ── 6. Create a client record (owner IS the client) ────────────────────
  const { data: client, error: clientError } = await supabase
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

  if (clientError || !client) {
    console.error('[solo-signup] Client creation failed:', clientError?.message);
    // Non-fatal — user can still access dashboard, just no container yet
  }

  // ── 7. Auto-provision container (fire-and-forget) ───────────────────────
  if (client) {
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

    // Provision with retry (fire-and-forget — don't block signup response)
    void (async () => {
      try {
        const result = await provisionClientGateway(
          client.id,
          agency.id,
          { soulMd, userMd },
          { memoryMb: 1024, cpuShares: 256 },
          businessName,
        );
        if (result.success) {
          console.log(`[solo-signup] ✅ Container provisioned for ${client.id}: ${result.gatewayUrl}`);

          // Store clientId in agency settings for quick lookup
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
            client.id,
            agency.id,
            { soulMd, userMd },
            { memoryMb: 1024, cpuShares: 256 },
            businessName,
          );
          if (retry.success) {
            console.log(`[solo-signup] ✅ Container provisioned on retry for ${client.id}`);
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
            console.error(`[solo-signup] ❌ Container provision failed after retry: ${retry.error}`);
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
          // Wait a bit for the container to start
          await new Promise(r => setTimeout(r, 15000));

          // Use the knowledge base training endpoint if it exists
          const trainRes = await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL || 'https://kyra.conversionsystem.com'}/api/agency/clients/${client.id}/knowledge`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                // Use service-level auth — internal call
                'x-service-key': process.env.SUPABASE_SERVICE_ROLE_KEY || '',
              },
              body: JSON.stringify({
                type: 'website',
                url: websiteUrl,
              }),
            },
          );
          if (trainRes.ok) {
            console.log(`[solo-signup] 📚 Started website training for ${client.id}: ${websiteUrl}`);
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
        text: `🚀 *New Kyra Solo signup!*\n*Business:* ${businessName}\n*Owner:* ${fullName}\n*Email:* ${email}\n*Plan:* Solo Free\n*Website:* ${websiteUrl || 'none'}\n*Time:* ${new Date().toLocaleString('en-US', { timeZone: 'Europe/Bratislava' })} CET`,
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
      agencyId: agency.id,
      clientId: client?.id || null,
      message: 'Account created! Your AI worker is being set up.',
    },
    { status: 201 },
  );
}
